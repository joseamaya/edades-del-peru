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

interface Animal {
  species: SpeciesId;
  group: THREE.Group;
  template: FaunaTemplate;
  rig: RigInstance | null;
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

  constructor(private readonly scene: THREE.Scene) {}

  spawn(spawns: WildlifeSpawn[], heightAt: (x: number, z: number) => number): void {
    // Freeze the limit: `this.animals.length` grows inside the loop, so
    // recomputing it would stop at half the cap when starting from zero.
    const limit = Math.min(spawns.length, MAX_ANIMALS - this.animals.length);
    for (let i = 0; i < limit; i++) {
      const s = spawns[i];
      const n = this.animals.length;
      const t = faunaTemplate(s.id);
      const choice = wildlifeModelChoice(s.id);
      const rig = choice ? acquireRig(choice.asset, choice.variant) : null;
      const group = rig ? rig.root : new THREE.Group();
      group.scale.setScalar(s.scale);
      group.name = `fauna_${s.id}`;

      const legs: THREE.Group[] = [];
      const wings: { pivot: THREE.Group; side: number }[] = [];
      if (!rig) {
        const body = new THREE.Mesh(t.body, this.material);
        body.castShadow = t.ground;
        body.receiveShadow = true;
        group.add(body);

        if (t.leg) {
          for (const sx of [-1, 1]) {
            for (const sz of [t.legZFront, t.legZBack]) {
              const pivot = new THREE.Group();
              pivot.position.set(sx * t.legX, t.hipY, sz);
              const mesh = new THREE.Mesh(t.leg, this.material);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              pivot.add(mesh);
              group.add(pivot);
              legs.push(pivot);
            }
          }
        }

        if (t.wing) {
          for (const side of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(side * t.shoulderX, t.shoulderY, t.shoulderZ);
            const mesh = new THREE.Mesh(t.wing, this.material);
            mesh.scale.x = side; // mirror the left wing
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            pivot.add(mesh);
            group.add(pivot);
            wings.push({ pivot, side });
          }
        }
      }

      this.scene.add(group);
      this.animals.push({
        species: s.id,
        group,
        template: t,
        rig,
        legs,
        wings,
        homeX: s.x,
        homeZ: s.z,
        phase: n * 2.399, // golden angle: spread the herd apart
        angle: n * 2.399,
        radius: t.ground ? 4 + (n % 4) : 12 + (n % 5) * 2,
        angSpeed: rig ? 0.16 + (n % 3) * 0.04 : t.ground ? 0.08 + (n % 3) * 0.03 : 0.2 + (n % 2) * 0.1,
        bobPhase: n * 1.7,
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
        : Math.sin(this.time * 1.6 + a.bobPhase) * 0.25;
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
    for (const a of this.animals) {
      a.group.removeFromParent();
      a.rig?.dispose();
    }
    this.animals.length = 0;
    this.material.dispose();
  }
}
