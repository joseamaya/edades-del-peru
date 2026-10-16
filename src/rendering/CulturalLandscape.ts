import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Terrain } from './Terrain';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import { planCulturalLandscape, type LandscapeQuery } from '../model/defs/landscapePlan';
import type { LandscapeFeature } from '../model/defs/landscape';

/** Features the renderer knows how to draw in this phase. */
const FEATURES = ['plaza', 'field', 'road', 'canal'] as const;

/** Vertical offsets above the terrain so features do not z-fight with the ground. */
const LIFT: Partial<Record<LandscapeFeature, number>> = { plaza: 0.06, road: 0.04, field: 0.04, canal: 0.08 };

/**
 * Static, deterministic cultural landscape (roads, fields, plazas, canals) drawn
 * from `HistoricalMapProfile.culturalLandscape`. Geometry is planned by the pure
 * `planCulturalLandscape` and merged per feature into a few meshes, so the whole
 * layer costs only a handful of draw calls. Visual only (like the landmark): no
 * entities, no pathfinding obstacles, no gameplay effect.
 */
export class CulturalLandscape {
  readonly group = new THREE.Group();
  private materials: THREE.Material[] = [];

  constructor(terrain: Terrain, profile: HistoricalMapProfile, seed: number) {
    this.group.name = 'landscape';
    const landscape = profile.culturalLandscape;
    if (!landscape) return;

    const q: LandscapeQuery = {
      size: terrain.size,
      isWater: (x, z) => terrain.isWater(x, z),
      isBuildable: (x, z) => terrain.isBuildable(x, z),
      getSlope: (x, z) => terrain.getSlope(x, z),
      getCanal: (x, z) => terrain.getCanal(x, z),
    };

    const buckets: Partial<Record<LandscapeFeature, THREE.BufferGeometry[]>> = {};
    for (const p of planCulturalLandscape(landscape, seed, q)) {
      const y = terrain.getHeight(p.x, p.z) + (LIFT[p.feature] ?? 0.04);
      const geo = featureGeometry(p.feature, p.size, p.yaw);
      geo.translate(p.x, y, p.z);
      (buckets[p.feature] ??= []).push(geo);
    }

    const materials: Partial<Record<LandscapeFeature, THREE.MeshStandardMaterial>> = {
      plaza: new THREE.MeshStandardMaterial({ color: '#9c9182', roughness: 0.9 }),
      field: new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 1 }),
      road: new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 }),
      canal: new THREE.MeshStandardMaterial({ color: '#1a8a9a', roughness: 0.2, transparent: true, opacity: 0.72 }),
    };
    for (const feature of FEATURES) {
      const parts = buckets[feature];
      if (!parts?.length) continue;
      const merged = mergeGeometries(parts, false);
      parts.forEach((g) => g.dispose());
      if (!merged) continue;
      const material = materials[feature]!;
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

/** Flat, up-facing geometry for a feature (in the XZ plane). */
function featureGeometry(feature: LandscapeFeature, size: number, yaw: number): THREE.BufferGeometry {
  if (feature === 'plaza') {
    const geo = new THREE.CircleGeometry(size / 2, 16);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }
  const depth = feature === 'road' ? size * 0.6 : size;
  const geo = new THREE.PlaneGeometry(size, depth);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(yaw);
  return geo;
}
