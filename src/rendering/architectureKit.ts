import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadStaticGltf } from './StaticModel';
import { getGeneratedMaterial } from './Biomes';
import { dequantize } from './mergeStatic';
import { CARAL_MAYOR_PHASE_ASSET, type CaralArchPlacement } from '../model/defs/caralCity';
import { CARAL_PHASE_PLAN, type CaralMayorPhase } from '../model/defs/caralPhases';
import { standsIn, type SitePhasePlan } from '../model/defs/sitePhases';

/**
 * Blender architecture kits (scripts/blender/build_*_architecture_kit.py,
 * docs/design/art-direction.md §9). Every piece ships a LOD0 and a LOD1 GLB with flat Principled
 * materials and a COLOR_0 tint.
 */
import type { ArchAssetId, ArchPlacement, ArchitectureKitId } from '../model/defs/architectureKit';

export type { ArchAssetId, ArchPlacement, ArchitectureKitId } from '../model/defs/architectureKit';

const caralUrls = import.meta.glob('../assets/architecture/caral/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const chavinUrls = import.meta.glob('../assets/architecture/chavin/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const KIT_URLS: Record<ArchitectureKitId, Record<string, string>> = {
  caral: caralUrls,
  chavin: chavinUrls,
};

export function archKitUrl(kit: ArchitectureKitId, id: ArchAssetId, lod: 0 | 1): string | undefined {
  return KIT_URLS[kit][`../assets/architecture/${kit}/${kit}_${id}_lod${lod}.glb`];
}

/** One merged geometry per material name (all kit GLBs share the same material names). */
export type ArchParts = Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material }>;

export interface ArchModel {
  id: ArchAssetId;
  lods: [ArchParts, ArchParts];
}

export function archPartsFromScene(root: THREE.Object3D): ArchParts {
  root.updateMatrixWorld(true);
  const byName = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const geometry = dequantize(mesh.geometry).applyMatrix4(mesh.matrixWorld);
    const entry = byName.get(mesh.material.name) ?? { material: mesh.material, geometries: [] };
    entry.geometries.push(geometry);
    byName.set(mesh.material.name, entry);
  });
  const parts: ArchParts = new Map();
  for (const [name, { material, geometries }] of byName) {
    const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (geometries.length > 1) geometries.forEach((g) => g.dispose());
    if (geometry) parts.set(name, { geometry, material });
  }
  return parts;
}

/** Prepared models are kept for the session, like the vegetation kit; a failed load is retried. */
const modelCache = new Map<string, Promise<ArchModel>>();

export function loadArchModel(kit: ArchitectureKitId, id: ArchAssetId): Promise<ArchModel> {
  const key = `${kit}:${id}`;
  let model = modelCache.get(key);
  if (!model) {
    const lod0 = archKitUrl(kit, id, 0);
    const lod1 = archKitUrl(kit, id, 1);
    if (!lod0 || !lod1) return Promise.reject(new Error(`architecture kit ${kit} has no GLB for ${id}`));
    model = Promise.all([loadStaticGltf(lod0), loadStaticGltf(lod1)]).then(([a, b]): ArchModel => ({
      id,
      lods: [archPartsFromScene(a), archPartsFromScene(b)],
    }));
    model.catch(() => modelCache.delete(key));
    modelCache.set(key, model);
  }
  return model;
}

const footprints = new WeakMap<ArchModel, THREE.Box3>();

/** Local bounds of a model's LOD0 (cached). */
function footprint(model: ArchModel): THREE.Box3 {
  let box = footprints.get(model);
  if (!box) {
    box = new THREE.Box3();
    for (const part of model.lods[0].values()) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox!);
    }
    footprints.set(model, box);
  }
  return box;
}

/**
 * Surface detail per kit material from shared, tileable PBR sets in src/assets/textures/materials (the
 * GLBs carry no textures; the only set added for the kit is the 9 KB `plaster_detail`). The kit's UVs
 * are box-projected at world scale (TILE in the Blender script). `keepColor` keeps the material's
 * documented paint colour under a near-white detail map; otherwise `tint` (times `lift`) colours the set.
 */
const ARCH_SURFACES: Record<
  string,
  { set: string; tint?: number; normal: number; keepColor?: boolean; lift?: number }
> = {
  // Set stone: the light, coursed dry-stone tile, warmed towards the local granodiorite.
  'MAT-Arch_Stone': { set: 'wall_drystone', tint: 0xf2e4cf, normal: 0.8, lift: 1.5 },
  // Plaster, floors and earth keep their documented colour, multiplied by the near-white, tileable
  // plaster detail set (scripts/art/make_plaster_detail.py): trowel swirls, grit and hairline cracks.
  'MAT-Arch_PlasterWhite': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_PlasterOchre': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_PlasterRed': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_Earth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_Shicra': { set: 'roof_thatch', tint: 0xa8957a, normal: 0.9 },
  'MAT-Arch_Wood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_CaneMat': { set: 'roof_thatch', tint: 0xcdbd9e, normal: 0.8 },
  // Chavín: grey Andean stone with the gallery interiors kept darker than the facades.
  'MAT-Arch_ChavinStone': { set: 'plaster_detail', normal: 0.7, keepColor: true },
  'MAT-Arch_ChavinDark': { set: 'plaster_detail', normal: 0.7, keepColor: true },
  'MAT-Arch_ChavinPlaster': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_ChavinEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
};

export function applyArchSurface(material: THREE.MeshStandardMaterial, name: string): void {
  const surface = ARCH_SURFACES[name];
  const set = surface && getGeneratedMaterial(surface.set);
  if (!surface || !set) return;
  material.map = set.diffuse;
  if (!surface.keepColor) material.color.set(surface.tint ?? 0xffffff);
  // The dry-stone tile is dark (mean ~0.42); lift it towards the light local stone.
  if (surface.lift) material.color.multiplyScalar(surface.lift);
  if (set.normal) {
    material.normalMap = set.normal;
    material.normalScale = new THREE.Vector2(surface.normal, surface.normal);
  }
  if (set.roughness) {
    material.roughnessMap = set.roughness;
    material.roughness = 1;
  }
  material.needsUpdate = true;
}

/** The camera is this far from the city centre before the far (LOD1) city is drawn. */
export const CITY_LOD1_DISTANCE = 150;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * An authored city assembled from a Blender architecture kit. Every placement is baked into one mesh
 * per material and LOD (the city is static, so the whole of it is a handful of draw calls per pass
 * instead of one per building and material). Pieces follow the site's construction phase.
 */
export class ArchitectureCity {
  readonly group = new THREE.Group();
  private readonly lodGroups: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  protected phase: string;
  private models = new Map<ArchAssetId, ArchModel>();
  /** Per-city material clones: the cached kit materials are shared by every match, while fog of war
   * patches a material's shader with this match's uniforms. */
  private readonly materials = new Map<string, THREE.Material>();
  private readonly center = new THREE.Vector3();

  constructor(
    readonly name: string,
    private readonly kit: ArchitectureKitId,
    private readonly placements: readonly ArchPlacement[],
    private readonly heightAt: (x: number, z: number) => number,
    private readonly plan: SitePhasePlan,
  ) {
    this.phase = plan.initial;
    this.group.name = name;
    this.lodGroups.forEach((g, lod) => {
      g.name = `${name}_lod${lod}`;
      this.group.add(g);
    });
    this.lodGroups[1].visible = false;
    const xs = placements.map((p) => p.x);
    const zs = placements.map((p) => p.z);
    this.center.set((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  }

  /** The kit pieces this city needs (all phase assets, so phase changes need no new load). */
  assets(): ArchAssetId[] {
    const ids = new Set<ArchAssetId>();
    for (const p of this.placements) {
      ids.add(p.asset);
      for (const id of Object.values(p.phaseAssets ?? {})) if (id) ids.add(id);
    }
    return [...ids];
  }

  /**
   * Load the kit and bake the city; resolves false when a piece the layout needs right now failed to
   * load (the other phase assets are optional until a phase change asks for them).
   */
  async load(): Promise<boolean> {
    const results = await Promise.allSettled(this.assets().map((id) => loadArchModel(this.kit, id)));
    for (const r of results) {
      if (r.status === 'fulfilled') this.models.set(r.value.id, r.value);
      else console.warn('[architecture-kit] model failed to load', r.reason);
    }
    if (this.placements.some((p) => !this.models.has(this.assetFor(p)))) return false;
    this.bake();
    return true;
  }

  /** Dwellings standing in the current phase (cooking smoke rises behind them). */
  standingHouses(): { x: number; z: number }[] {
    return this.placements
      .filter((p) => p.asset.startsWith('house_') && standsIn(p.since, p.until, this.phase, this.plan))
      .map((p) => ({ x: p.x, z: p.z }));
  }

  get currentPhase(): string {
    return this.phase;
  }

  setPhase(phase: string): void {
    if (phase === this.phase) return;
    this.phase = phase;
    if (this.models.size) this.bake();
  }

  /** Draw the near or far city from the camera position. */
  update(camera: THREE.Vector3): void {
    const far = camera.distanceTo(this.center) > CITY_LOD1_DISTANCE;
    this.lodGroups[0].visible = !far;
    this.lodGroups[1].visible = far;
  }

  private assetFor(p: ArchPlacement): ArchAssetId {
    if (!p.phaseAssets) return p.asset;
    let asset = p.asset;
    const current = this.plan.phases.indexOf(this.phase);
    for (let i = 0; i <= current; i++) {
      const id = p.phaseAssets[this.plan.phases[i]!];
      if (id) asset = id;
    }
    return asset;
  }

  private bake(): void {
    for (let lod = 0; lod < 2; lod++) {
      const target = this.lodGroups[lod];
      for (const child of [...target.children]) {
        (child as THREE.Mesh).geometry.dispose();
        target.remove(child);
      }
      const byName = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
      for (const p of this.placements) {
        if (!standsIn(p.since, p.until, this.phase, this.plan)) continue;
        const model = this.models.get(this.assetFor(p));
        if (!model) continue;
        // Buildings sit on the lowest ground under their footprint (slightly sunk, never floating);
        // lifted pieces (a plaza seated by its floor) on the highest, so the floor clears the terrain.
        const y = p.lift
          ? this.groundUnder(p, model, Math.max) + p.lift * p.scale[1]
          : this.groundUnder(p, model, Math.min) - 0.08;
        _q.setFromAxisAngle(_up, p.rotY);
        _m.compose(_pos.set(p.x, y, p.z), _q, _scale.set(p.scale[0], p.scale[1], p.scale[2]));
        for (const [name, part] of model.lods[lod]) {
          const entry = byName.get(name) ?? { material: this.material(name, part.material), geometries: [] };
          entry.geometries.push(part.geometry.clone().applyMatrix4(_m));
          byName.set(name, entry);
        }
      }
      for (const [name, { material, geometries }] of byName) {
        const geometry = mergeGeometries(geometries, false);
        geometries.forEach((g) => g.dispose());
        if (!geometry) continue;
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${this.name}_${name}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        target.add(mesh);
      }
    }
  }

  private material(name: string, source: THREE.Material): THREE.Material {
    let material = this.materials.get(name);
    if (!material) {
      material = source.clone();
      applyArchSurface(material as THREE.MeshStandardMaterial, name);
      this.materials.set(name, material);
    }
    return material;
  }

  /** Ground height under the placed model's footprint: its centre, corners and edge midpoints. */
  private groundUnder(p: ArchPlacement, model: ArchModel, pick: (a: number, b: number) => number): number {
    const box = footprint(model);
    const cos = Math.cos(p.rotY);
    const sin = Math.sin(p.rotY);
    let y = this.heightAt(p.x, p.z);
    for (const u of [0, 0.5, 1]) {
      for (const v of [0, 0.5, 1]) {
        const lx = (box.min.x + (box.max.x - box.min.x) * u) * p.scale[0];
        const lz = (box.min.z + (box.max.z - box.min.z) * v) * p.scale[2];
        // Same yaw as Matrix4.compose with a +Y rotation: x' = x cos + z sin, z' = -x sin + z cos.
        y = pick(y, this.heightAt(p.x + lx * cos + lz * sin, p.z - lx * sin + lz * cos));
      }
    }
    return y;
  }

  dispose(): void {
    for (const g of this.lodGroups) for (const child of g.children) (child as THREE.Mesh).geometry.dispose();
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}

/** The Caral Sacred City in use, built from the Caral architecture kit. */
export class CaralCity extends ArchitectureCity {
  constructor(placements: readonly CaralArchPlacement[], heightAt: (x: number, z: number) => number) {
    super(
      'caral_city',
      'caral',
      placements.map((p) => (p.mayor ? { ...p, phaseAssets: CARAL_MAYOR_PHASE_ASSET } : p)),
      heightAt,
      CARAL_PHASE_PLAN,
    );
  }

  get mayorPhase(): CaralMayorPhase {
    return this.phase as CaralMayorPhase;
  }

  setMayorPhase(phase: CaralMayorPhase): void {
    this.setPhase(phase);
  }
}
