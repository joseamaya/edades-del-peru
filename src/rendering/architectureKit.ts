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

const cuscoUrls = import.meta.glob('../assets/architecture/cusco/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const colonialUrls = import.meta.glob('../assets/architecture/colonial/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const republicUrls = import.meta.glob('../assets/architecture/republic/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const independenceUrls = import.meta.glob('../assets/architecture/independence/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const mocheUrls = import.meta.glob('../assets/architecture/moche/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const wariUrls = import.meta.glob('../assets/architecture/wari/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const killkeUrls = import.meta.glob('../assets/architecture/killke/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const KIT_URLS: Record<ArchitectureKitId, Record<string, string>> = {
  caral: caralUrls,
  chavin: chavinUrls,
  cusco: cuscoUrls,
  colonial: colonialUrls,
  republic: republicUrls,
  independence: independenceUrls,
  moche: mocheUrls,
  wari: wariUrls,
  killke: killkeUrls,
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

function loadArchModel(kit: ArchitectureKitId, id: ArchAssetId): Promise<ArchModel> {
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

/** Fired-clay roofs shared by the colonial and independence kits: the same photographed tile map. */
const TILE_SURFACE = { set: 'tile', tint: 0xf2d3a6, normal: 0.7, saturation: 0.5, hue: 12, lift: 1.15 };

/**
 * Surface detail per kit material from shared, tileable PBR sets in src/assets/textures/materials (the
 * GLBs carry no textures; the only set added for the kit is the 9 KB `plaster_detail`). The kit's UVs
 * are box-projected at world scale (TILE in the Blender script). `keepColor` keeps the material's
 * documented paint colour under a near-white detail map; otherwise `tint` (times `lift`) colours the set.
 */
export const ARCH_SURFACES: Record<
  string,
  {
    set: string;
    tint?: number;
    normal: number;
    keepColor?: boolean;
    lift?: number;
    saturation?: number;
    /** Hue rotation in degrees around the grey axis, before the saturation mix. */
    hue?: number;
  }
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
  // Cusco: each cut stone is modelled, so the stones keep their colour under the fine grit of the plaster
  // set (a coursed-stone texture would draw a second set of joints across them).
  'MAT-Arch_IncaAshlar': { set: 'plaster_detail', normal: 0.8, keepColor: true },
  'MAT-Arch_IncaMegalith': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_IncaJoint': { set: 'plaster_detail', normal: 0.5, keepColor: true },
  'MAT-Arch_IncaAdobe': { set: 'plaster_detail', normal: 0.7, keepColor: true },
  'MAT-Arch_IncaThatch': { set: 'roof_thatch', tint: 0xd9bf86, normal: 0.9 },
  'MAT-Arch_IncaEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_IncaSand': { set: 'plaster_detail', normal: 0.4, keepColor: true },
  // Colonial: lime plaster and adobe keep their documented paint. The photographed tile is a saturated
  // red (#b24541); a warm multiply cannot raise its green enough, so the runtime also rotates the hue 12°
  // towards orange, then pulls it halfway to luma. The roofs read as fired terracotta instead of pink
  // under the cool sky. The plaza floor has its own light paving set; the stone is lifted so the kerb and
  // the fountain do not read black.
  'MAT-Arch_ColonialPlaster': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_ColonialAdobe': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_ColonialTile': TILE_SURFACE,
  'MAT-Arch_ColonialWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_ColonialStone': { set: 'wall_cutstone', tint: 0xd8d2c2, normal: 0.8, lift: 1.25 },
  'MAT-Arch_ColonialPaving': { set: 'ground_plaza', tint: 0xf0e6d6, normal: 0.5, lift: 1.25 },
  'MAT-Arch_ColonialDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // Republican: the fort's brick and stone, the quebrada's adobe and earth roofs, the timber of the
  // pier and the paved aprons. The photographed brick is dark, so the runtime lifts and warms it; the
  // adobe and earth keep their documented paint under the plaster detail set.
  'MAT-Arch_RepublicBrick': { set: 'wall_brick', tint: 0xd8b7a8, normal: 0.7, lift: 1.35 },
  'MAT-Arch_RepublicStone': { set: 'wall_fieldstone', tint: 0xd8d2c2, normal: 0.8, lift: 1.4 },
  'MAT-Arch_RepublicAdobe': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_RepublicEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_RepublicWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_RepublicPaving': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // The fort courtyard is the one Republican floor seen at dusk (Real Felipe); the grey slab set read navy
  // under the cool dusk sky, so it is warmed and lifted like the colonial paving, with flatter joints.
  'MAT-Arch_RepublicPlaza': { set: 'ground_plaza', tint: 0xf2e2c4, normal: 0.35, lift: 1.7 },
  'MAT-Arch_RepublicDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // Independence: lime plaster, adobe, canvas and earth keep their paint under the plaster detail set, the
  // tile is weathered like the colonial one, and the stone is lifted.
  'MAT-Arch_IndependencePlaster': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_IndependenceAdobe': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_IndependenceTile': TILE_SURFACE,
  'MAT-Arch_IndependenceStone': { set: 'wall_fieldstone', tint: 0xd8d2c2, normal: 0.8, lift: 1.4 },
  'MAT-Arch_IndependenceWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_IndependenceCanvas': { set: 'plaster_detail', normal: 0.5, keepColor: true },
  'MAT-Arch_IndependenceEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_IndependenceDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // North coast (Moche and Chimú): packed adobe, its shadowed face, lime plaster and the painted friezes
  // keep their documented paint under the plaster detail set; the packed plaza is the same set, and the
  // timber is mapped like the other kits' wood.
  'MAT-Arch_MocheAdobe': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_MocheAdobeDark': { set: 'plaster_detail', normal: 0.8, keepColor: true },
  'MAT-Arch_MochePlaster': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_MocheFriezeCream': { set: 'plaster_detail', normal: 0.5, keepColor: true },
  'MAT-Arch_MocheFriezeRed': { set: 'plaster_detail', normal: 0.5, keepColor: true },
  'MAT-Arch_MocheEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_MocheWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_MocheDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // Highlands (Wari and the Chanca pucará): the field and cut stone are lifted out of the dark photographed
  // dry-stone tile; the plaster, earth, thatch and openings keep their paint under the detail sets.
  'MAT-Arch_WariStone': { set: 'wall_fieldstone', tint: 0xd9c9ae, normal: 0.85, lift: 1.5 },
  'MAT-Arch_WariCutstone': { set: 'wall_cutstone', tint: 0xe8dbca, normal: 0.75, lift: 1.15 },
  'MAT-Arch_WariPlasterWhite': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_WariPlasterRed': { set: 'plaster_detail', normal: 0.5, keepColor: true },
  'MAT-Arch_WariEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_WariThatch': { set: 'roof_thatch', tint: 0xd9bf86, normal: 0.9 },
  'MAT-Arch_WariWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_WariDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  // Killke (Tambotoco): the same warm highland fieldstone and straw thatch as the procedural ayllu kit
  // it replaces, so the domestic vocabulary survives the move to modelled pieces. The stone and the cut
  // thresholds are lifted out of the dark photographed sets; plaster, earth and openings keep their paint.
  'MAT-Arch_KillkeStone': { set: 'wall_fieldstone', tint: 0xd9c9ae, normal: 0.85, lift: 1.45 },
  'MAT-Arch_KillkeCutstone': { set: 'wall_cutstone', tint: 0xe8dbca, normal: 0.75, lift: 1.15 },
  'MAT-Arch_KillkePlaster': { set: 'plaster_detail', normal: 0.6, keepColor: true },
  'MAT-Arch_KillkeEarth': { set: 'plaster_detail', normal: 0.9, keepColor: true },
  'MAT-Arch_KillkeThatch': { set: 'roof_thatch', tint: 0xd9bf86, normal: 0.9 },
  'MAT-Arch_KillkeWood': { set: 'wood', tint: 0x7a5c46, normal: 0.7 },
  'MAT-Arch_KillkeDark': { set: 'plaster_detail', normal: 0.6, keepColor: true },
};

/**
 * Shift a sampled diffuse colour towards orange, then mix it towards its luma: `hue` degrees around the
 * grey axis (a warm tint cannot raise the green of a red map), `saturation` 1 keeps the map, 0 is grey.
 */
function applyArchTone(material: THREE.MeshStandardMaterial, saturation: number, hue: number): void {
  const value = saturation.toFixed(2);
  const hueValue = hue.toFixed(3);
  const previousHook = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previousHook.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
  float archAngle = ${hueValue} * 0.01745329252;
  float archCos = cos(archAngle);
  float archSin = sin(archAngle);
  vec3 archAxis = vec3(0.577350269);
  diffuseColor.rgb =
    diffuseColor.rgb * archCos +
    cross(archAxis, diffuseColor.rgb) * archSin +
    archAxis * dot(archAxis, diffuseColor.rgb) * (1.0 - archCos);
  float archLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = mix(vec3(archLuma), diffuseColor.rgb, ${value});`,
    );
  };
  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${previousKey()}|arch-tone-${value}-${hueValue}`;
}

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
  if (surface.saturation !== undefined || surface.hue !== undefined) {
    applyArchTone(material, surface.saturation ?? 1, surface.hue ?? 0);
  }
  material.needsUpdate = true;
}

/** The camera is this far from the city centre before the far (LOD1) city is drawn. */
const CITY_LOD1_DISTANCE = 150;

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
        // A hillside piece with a modelled footing is seated at its centre so the uphill wall cuts into
        // the slope and the downhill face shows the foundation, without the roof sinking into the hill.
        const y = p.lift
          ? this.groundUnder(p, model, Math.max) + p.lift * p.scale[1]
          : p.seat === 'centre'
            ? this.heightAt(p.x, p.z) - 0.08
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
