import * as THREE from 'three';
import {
  WALK_CLIP_RATE_MAX,
  WALK_CLIP_RATE_MIN,
  WALK_CLIP_REFERENCE_SPEED,
  type RigClipState,
} from '../model/defs/modelAssets';
import { clamp } from '../util/math';
import { wildlifeModelChoice, type SpeciesId, type WildlifeSpawn } from '../model/defs/wildlife';
import { faunaTemplate, type FaunaTemplate } from './faunaModels';
import { acquireRig } from './ModelAssets';
import type { RigInstance } from './RigInstance';

/** Hard cap on live animals, regardless of planner output. */
const MAX_ANIMALS = 16;
/** Diagonal gait: front-left + back-right vs front-right + back-left. */
const GAIT_OFFSETS = [0, Math.PI, Math.PI, 0];
/** Deterministic grazing cycle (period ~21 s, roughly a third of it eating). */
const GRAZE_RATE = 0.3;
const GRAZE_THRESHOLD = 0.55;

/** Geometry from the Blender fauna kit that replaces a species' procedural body and limb. */
export interface FaunaKitParts {
  body: THREE.BufferGeometry;
  leg?: THREE.BufferGeometry;
  wing?: THREE.BufferGeometry;
}

type PartRole = 'body' | 'leg' | 'wingR' | 'wingL';

/**
 * One InstancedMesh per species and part: the animals keep their transform hierarchy (hidden part
 * meshes under pivots) and only their world matrices are drawn, so a flock is a few draw calls
 * instead of one per body, leg and wing.
 */
interface Batch {
  mesh: THREE.InstancedMesh;
  parts: THREE.Mesh[];
  /** Left wings draw a pre-mirrored geometry, so their mirror is cancelled in the instance matrix. */
  mirrored: boolean;
}

/** Mirror across X with the triangle winding restored, so it renders front-facing unmirrored. */
function mirrorX(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geometry.clone().scale(-1, 1, 1);
  const index = out.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
  } else {
    const pos = out.getAttribute('position');
    for (const attr of Object.values(out.attributes)) {
      const a = attr as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 3) {
        for (let c = 0; c < a.itemSize; c++) {
          const t = a.getComponent(i + 1, c);
          a.setComponent(i + 1, c, a.getComponent(i + 2, c));
          a.setComponent(i + 2, c, t);
        }
      }
    }
  }
  return out;
}

const _mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
const _m = new THREE.Matrix4();

interface Animal {
  species: SpeciesId;
  group: THREE.Group;
  template: FaunaTemplate;
  rig: RigInstance | null;
  body: THREE.Mesh | null;
  legs: THREE.Group[];
  wings: { pivot: THREE.Group; side: number }[];
  homeX: number;
  homeZ: number;
  phase: number;
  angle: number;
  radius: number;
  angSpeed: number;
  bobPhase: number;
  heightAt: (x: number, z: number) => number;
}

export interface WildlifeDebugEntry {
  species: SpeciesId;
  rigged: boolean;
  state: RigClipState | null;
  x: number;
  y: number;
  z: number;
}

/**
 * Ambient fauna (visual only): llamas/vicuñas graze, condors/pelicans soar.
 * The llama pilot uses a rigged CC0 camelid with idle/walk/eat clips; other
 * species and any asset-load failure keep the procedural body/legs/wings.
 * Motion is a deterministic orbit of the spawn point.
 */
export class Wildlife {
  private readonly animals: Animal[] = [];
  private readonly material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  private time = 0;
  private readonly kits = new Map<SpeciesId, FaunaKitParts>();
  private readonly batches = new Map<string, Batch>();
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {}

  hasKit(species: SpeciesId): boolean {
    return this.kits.has(species);
  }

  /** Species currently alive (the fauna kit only loads what is on the map). */
  species(): Set<SpeciesId> {
    return new Set(this.animals.map((a) => a.species));
  }

  /**
   * Swap a species' procedural geometry for the Blender kit (same pivots, vertex colours). Applies to
   * the animals already spawned and to later spawns; a kit arriving after dispose is freed.
   */
  attachKit(species: SpeciesId, kit: FaunaKitParts): void {
    if (this.disposed || this.kits.has(species)) {
      disposeKit(kit);
      return;
    }
    this.kits.set(species, kit);
    for (const a of this.animals) {
      if (a.species !== species || a.rig || !a.body) continue;
      a.body.geometry = kit.body;
      for (const pivot of a.legs) if (kit.leg) (pivot.children[0] as THREE.Mesh).geometry = kit.leg;
      for (const w of a.wings) if (kit.wing) (w.pivot.children[0] as THREE.Mesh).geometry = kit.wing;
    }
    const swap = (role: PartRole, geometry: THREE.BufferGeometry | undefined): void => {
      const batch = this.batches.get(`${species}:${role}`);
      if (!batch || !geometry) return;
      const old = batch.mesh.geometry;
      batch.mesh.geometry = batch.mirrored ? mirrorX(geometry) : geometry;
      if (batch.mirrored) old.dispose();
    };
    swap('body', kit.body);
    swap('leg', kit.leg);
    swap('wingR', kit.wing);
    swap('wingL', kit.wing);
  }

  /** Register a part mesh with its species' batch (the part itself is hidden). */
  private batch(species: SpeciesId, role: PartRole, part: THREE.Mesh): void {
    const key = `${species}:${role}`;
    let batch = this.batches.get(key);
    if (!batch) {
      const mirrored = role === 'wingL';
      const perAnimal = role === 'leg' ? 4 : 1;
      const mesh = new THREE.InstancedMesh(
        mirrored ? mirrorX(part.geometry) : part.geometry,
        this.material,
        MAX_ANIMALS * perAnimal,
      );
      mesh.name = `fauna_${species}_${role}`;
      mesh.count = 0;
      mesh.castShadow = part.castShadow;
      mesh.receiveShadow = part.receiveShadow;
      // Instances orbit across the map; their union is not worth a bounding sphere per frame.
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
      batch = { mesh, parts: [], mirrored };
      this.batches.set(key, batch);
    }
    part.visible = false;
    batch.parts.push(part);
  }

  spawn(spawns: WildlifeSpawn[], heightAt: (x: number, z: number) => number): void {
    // Freeze the limit: `this.animals.length` grows inside the loop, so
    // recomputing it would stop at half the cap when starting from zero.
    const limit = Math.min(spawns.length, MAX_ANIMALS - this.animals.length);
    for (let i = 0; i < limit; i++) {
      const s = spawns[i];
      const n = this.animals.length;
      const t = faunaTemplate(s.id);
      const kit = this.kits.get(s.id);
      const choice = wildlifeModelChoice(s.id);
      const rig = choice ? acquireRig(choice.asset, choice.variant) : null;
      const group = rig ? rig.root : new THREE.Group();
      group.scale.setScalar(s.scale);
      group.name = `fauna_${s.id}`;

      const legs: THREE.Group[] = [];
      const wings: { pivot: THREE.Group; side: number }[] = [];
      let body: THREE.Mesh | null = null;
      if (!rig) {
        body = new THREE.Mesh(kit?.body ?? t.body, this.material);
        body.castShadow = t.ground;
        body.receiveShadow = t.ground;
        group.add(body);
        this.batch(s.id, 'body', body);

        if (t.leg) {
          for (const sx of [-1, 1]) {
            for (const sz of [t.legZFront, t.legZBack]) {
              const pivot = new THREE.Group();
              pivot.position.set(sx * t.legX, t.hipY, sz);
              const mesh = new THREE.Mesh(kit?.leg ?? t.leg, this.material);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              pivot.add(mesh);
              group.add(pivot);
              legs.push(pivot);
              this.batch(s.id, 'leg', mesh);
            }
          }
        }

        if (t.wing) {
          for (const side of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(side * t.shoulderX, t.shoulderY, t.shoulderZ);
            const mesh = new THREE.Mesh(kit?.wing ?? t.wing, this.material);
            mesh.scale.x = side; // mirror the left wing
            // Fliers neither cast nor receive shadows: under VSM a receiver is also drawn into the
            // shadow map, i.e. two extra draws per wing for a speck in the sky.
            mesh.castShadow = t.ground;
            mesh.receiveShadow = t.ground;
            pivot.add(mesh);
            group.add(pivot);
            wings.push({ pivot, side });
            this.batch(s.id, side < 0 ? 'wingL' : 'wingR', mesh);
          }
        }
      }

      this.scene.add(group);
      this.animals.push({
        species: s.id,
        group,
        template: t,
        rig,
        body,
        legs,
        wings,
        homeX: s.x,
        homeZ: s.z,
        phase: n * 2.399, // golden angle: spread the herd apart
        angle: n * 2.399,
        radius: t.orbit !== undefined ? t.orbit + (n % 3) * 0.8 : t.ground ? 4 + (n % 4) : 12 + (n % 5) * 2,
        angSpeed: rig ? 0.16 + (n % 3) * 0.04 : t.ground ? 0.08 + (n % 3) * 0.03 : 0.2 + (n % 2) * 0.1,
        // A flock (same roost) lifts and settles together; other animals are desynchronised.
        bobPhase: t.bobAmp !== undefined ? Math.floor(s.x) * 0.37 + Math.floor(s.z) * 0.61 : n * 1.7,
        heightAt,
      });
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (const a of this.animals) {
      if (a.rig) {
        const grazing = Math.sin(this.time * GRAZE_RATE + a.bobPhase) > GRAZE_THRESHOLD;
        if (!grazing) a.angle += a.angSpeed * dt;
        const x = a.homeX + Math.cos(a.angle) * a.radius;
        const z = a.homeZ + Math.sin(a.angle) * a.radius;
        a.group.position.set(x, a.heightAt(x, z), z);
        // Orbit derivative is (-sin, cos); a +Z-facing model needs yaw = -angle.
        a.group.rotation.y = -a.angle;
        a.rig.play(grazing ? 'eat' : 'walk', 0.25);
        const speed = a.angSpeed * a.radius;
        a.rig.setPlaybackRate(
          grazing ? 1 : clamp(speed / WALK_CLIP_REFERENCE_SPEED, WALK_CLIP_RATE_MIN, WALK_CLIP_RATE_MAX),
        );
        a.rig.update(dt);
        continue;
      }

      const angle = a.phase + this.time * a.angSpeed;
      const x = a.homeX + Math.cos(angle) * a.radius;
      const z = a.homeZ + Math.sin(angle) * a.radius;
      const y = a.heightAt(x, z);
      const bob = a.template.ground
        ? Math.abs(Math.sin(this.time * 3 + a.bobPhase)) * 0.03
        : Math.sin(this.time * (a.template.bobRate ?? 1.6) + a.bobPhase) * (a.template.bobAmp ?? 0.25);
      a.group.position.set(x, y + a.template.flyHeight + bob, z);
      // Orbit derivative is (-sin, cos); a +Z-facing model needs yaw = -angle.
      a.group.rotation.y = -angle;

      if (a.legs.length) {
        const phase = this.time * a.template.stride + a.bobPhase;
        for (let i = 0; i < a.legs.length; i++) {
          a.legs[i].rotation.x = Math.sin(phase + GAIT_OFFSETS[i % GAIT_OFFSETS.length]) * 0.45;
        }
      }
      for (const w of a.wings) {
        const base = 0.12; // slight dihedral so the wings read as wings
        w.pivot.rotation.z = w.side * (base + Math.sin(this.time * a.template.flap + a.bobPhase) * 0.5);
      }
      a.group.updateMatrixWorld(true);
    }
    for (const batch of this.batches.values()) {
      batch.parts.forEach((part, i) => {
        if (batch.mirrored) batch.mesh.setMatrixAt(i, _m.multiplyMatrices(part.matrixWorld, _mirror));
        else batch.mesh.setMatrixAt(i, part.matrixWorld);
      });
      batch.mesh.count = batch.parts.length;
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Snapshot for the fauna E2E (states and terrain-relative positions). */
  debugSnapshot(): WildlifeDebugEntry[] {
    return this.animals.map((a) => ({
      species: a.species,
      rigged: !!a.rig,
      state: a.rig?.currentState ?? null,
      x: a.group.position.x,
      y: a.group.position.y,
      z: a.group.position.z,
    }));
  }

  dispose(): void {
    this.disposed = true;
    for (const kit of this.kits.values()) disposeKit(kit);
    this.kits.clear();
    for (const a of this.animals) {
      a.group.removeFromParent();
      a.rig?.dispose();
    }
    this.animals.length = 0;
    for (const batch of this.batches.values()) {
      batch.mesh.removeFromParent();
      if (batch.mirrored) batch.mesh.geometry.dispose();
    }
    this.batches.clear();
    this.material.dispose();
  }
}

function disposeKit(kit: FaunaKitParts): void {
  kit.body.dispose();
  kit.leg?.dispose();
  kit.wing?.dispose();
}
