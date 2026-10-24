import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Terrain } from './Terrain';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import {
  planCulturalLandscape,
  RENDERED_FEATURES,
  type LandscapePlacement,
  type LandscapeQuery,
} from '../model/defs/landscapePlan';
import type { LandscapeFeature } from '../model/defs/landscape';
import { applyGeneratedPbr } from './Biomes';
import { buildRibbon } from './ribbon';
import { scaleUv, GROUND_TILE } from '../util/uv';

/** AI-generated ground/landscape material slot per feature (see `prompts_textures.json`). */
const LANDSCAPE_SLOT: Partial<Record<LandscapeFeature, string>> = {
  plaza: 'ground_plaza',
  field: 'ground_field',
  road: 'ground_road',
  path: 'ground_path',
  canal: 'ground_canal',
  terrace: 'terrace_face',
  wall: 'wall_drystone',
  corral: 'corral_brush',
};

/** Warm albedo multiplier per feature (the generated maps are neutral). */
const LANDSCAPE_TINT: Partial<Record<LandscapeFeature, string>> = {
  plaza: '#c2b092',
  field: '#8a9a4a',
  road: '#9a8460',
  path: '#a8946c',
  terrace: '#9a9078',
  wall: '#94866f',
  corral: '#8a7a64',
};

/** Vertical offset above the terrain (half-height for the walls, a small lift for the flats). */
const OFFSET: Partial<Record<LandscapeFeature, number>> = {
  plaza: 0.06,
  road: 0.04,
  path: 0.04,
  field: 0.04,
  canal: 0.08,
  wall: 0.45,
  terrace: 0.6,
  corral: 0.1,
};

/** Ribbon width for the chained features (roads/paths). */
const CHAIN_WIDTH: Partial<Record<LandscapeFeature, number>> = { road: 1.8, path: 1.0 };

/**
 * Static, deterministic cultural landscape (roads, fields, plazas, canals,
 * terraces, walls, corrals, paths) drawn from
 * `HistoricalMapProfile.culturalLandscape`. Geometry is planned by the pure
 * `planCulturalLandscape` and merged per feature into a few meshes, so the whole
 * layer costs only a handful of draw calls. Roads, paths and canals are built as
 * continuous ribbons along their polyline (following the relief); canals follow
 * the carved ditches (`Terrain.getCanalPaths`). Visual only (like the landmark):
 * no entities, no pathfinding obstacles, no gameplay effect.
 */
export class CulturalLandscape {
  readonly group = new THREE.Group();
  /** Worst-case mesh count: one merged mesh per drawable feature (the E2E/bench guard). */
  readonly featureBudget = RENDERED_FEATURES.length;
  private materials: THREE.Material[] = [];

  constructor(
    terrain: Terrain,
    profile: HistoricalMapProfile,
    seed: number,
    avoid?: (x: number, z: number) => boolean,
  ) {
    this.group.name = 'landscape';
    const landscape = profile.culturalLandscape;
    if (!landscape) return;

    const q: LandscapeQuery = {
      size: terrain.size,
      isWater: (x, z) => terrain.isWater(x, z),
      isBuildable: (x, z) => terrain.isBuildable(x, z) && !avoid?.(x, z),
      getSlope: (x, z) => terrain.getSlope(x, z),
      getTerrace: (x, z) => terrain.getTerrace(x, z),
    };

    const buckets: Partial<Record<LandscapeFeature, THREE.BufferGeometry[]>> = {};
    const chains: Partial<Record<LandscapeFeature, Map<number, LandscapePlacement[]>>> = {};
    for (const p of planCulturalLandscape(landscape, seed, q)) {
      if (p.chain === undefined) {
        const off = OFFSET[p.feature] ?? 0.04;
        const geo = featureGeometry(p.feature, p.size, p.yaw);
        const r = Math.max(1, p.size / GROUND_TILE);
        scaleUv(geo, r, r);
        if (p.feature === 'plaza' || p.feature === 'field') {
          // flat features drape over the relief instead of floating on a slope
          const pos = geo.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            pos.setY(i, terrain.getHeight(pos.getX(i) + p.x, pos.getZ(i) + p.z) + off);
          }
          pos.needsUpdate = true;
          geo.computeVertexNormals();
        } else {
          geo.translate(0, terrain.getHeight(p.x, p.z) + off, 0);
        }
        geo.translate(p.x, 0, p.z);
        (buckets[p.feature] ??= []).push(geo);
      } else {
        const byChain = (chains[p.feature] ??= new Map());
        const samples = byChain.get(p.chain);
        if (samples) samples.push(p);
        else byChain.set(p.chain, [p]);
      }
    }

    for (const feature of RENDERED_FEATURES) {
      const width = CHAIN_WIDTH[feature];
      const byChain = chains[feature];
      if (!width || !byChain) continue;
      const off = OFFSET[feature] ?? 0.04;
      for (const samples of byChain.values()) {
        const pts = samples.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => ({ x: p.x, z: p.z }));
        pushRibbon(buckets, feature, pts, width, terrain, off);
      }
    }

    const canalOffset = OFFSET.canal ?? 0.08;
    for (const path of terrain.getCanalPaths()) {
      pushRibbon(buckets, 'canal', path, terrain.canalWidth, terrain, canalOffset);
    }

    const materials: Partial<Record<LandscapeFeature, THREE.MeshStandardMaterial>> = {
      plaza: new THREE.MeshStandardMaterial({ color: '#9c9182', roughness: 0.9 }),
      field: new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 1 }),
      road: new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 }),
      path: new THREE.MeshStandardMaterial({ color: '#9a8464', roughness: 1 }),
      canal: new THREE.MeshStandardMaterial({ color: '#1a8a9a', roughness: 0.2, transparent: true, opacity: 0.72 }),
      terrace: new THREE.MeshStandardMaterial({ color: '#8a8070', roughness: 0.95 }),
      wall: new THREE.MeshStandardMaterial({ color: '#8c7f6e', roughness: 0.9 }),
      corral: new THREE.MeshStandardMaterial({ color: '#7d6f5c', roughness: 1 }),
    };
    for (const feature of RENDERED_FEATURES) {
      const parts = buckets[feature];
      if (!parts?.length) continue;
      const merged = mergeGeometries(parts, false);
      parts.forEach((g) => g.dispose());
      if (!merged) continue;
      const material = materials[feature]!;
      const slot = LANDSCAPE_SLOT[feature];
      if (slot) applyGeneratedPbr(material, slot, LANDSCAPE_TINT[feature] ? { tint: LANDSCAPE_TINT[feature] } : {});
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = feature;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.materials.push(material);
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.materials = [];
    this.group.removeFromParent();
  }
}

/** Build a ribbon for `points` and add it to the feature bucket. */
function pushRibbon(
  buckets: Partial<Record<LandscapeFeature, THREE.BufferGeometry[]>>,
  feature: LandscapeFeature,
  points: { x: number; z: number }[],
  width: number,
  terrain: Terrain,
  offset: number,
): void {
  const geo = buildRibbon(points, width, (x, z) => terrain.getHeight(x, z) + offset);
  if (!geo) return;
  (buckets[feature] ??= []).push(geo);
}

/** Geometry for a point feature; flat features lie in the XZ plane. */
function featureGeometry(feature: LandscapeFeature, size: number, yaw: number): THREE.BufferGeometry {
  if (feature === 'plaza') {
    return new THREE.CircleGeometry(size / 2, 16).rotateX(-Math.PI / 2);
  }
  if (feature === 'wall') {
    return new THREE.BoxGeometry(size, 0.9, 0.3).rotateY(yaw);
  }
  if (feature === 'terrace') {
    return new THREE.BoxGeometry(size, 1.2, 0.35).rotateY(yaw);
  }
  if (feature === 'corral') {
    return new THREE.TorusGeometry(size / 2, 0.18, 6, 16).rotateX(-Math.PI / 2);
  }
  return new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).rotateY(yaw);
}
