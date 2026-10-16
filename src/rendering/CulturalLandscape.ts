import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Terrain } from './Terrain';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import { planCulturalLandscape, RENDERED_FEATURES, type LandscapeQuery } from '../model/defs/landscapePlan';
import type { LandscapeFeature } from '../model/defs/landscape';

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

/**
 * Static, deterministic cultural landscape (roads, fields, plazas, canals,
 * terraces, walls, corrals, paths) drawn from
 * `HistoricalMapProfile.culturalLandscape`. Geometry is planned by the pure
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
      getTerrace: (x, z) => terrain.getTerrace(x, z),
      getCanal: (x, z) => terrain.getCanal(x, z),
    };

    const buckets: Partial<Record<LandscapeFeature, THREE.BufferGeometry[]>> = {};
    for (const p of planCulturalLandscape(landscape, seed, q)) {
      const y = terrain.getHeight(p.x, p.z) + (OFFSET[p.feature] ?? 0.04);
      const geo = featureGeometry(p.feature, p.size, p.yaw);
      geo.translate(p.x, y, p.z);
      (buckets[p.feature] ??= []).push(geo);
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

/** Geometry for a feature; flat features lie in the XZ plane. */
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
  const depth = feature === 'road' ? size * 0.6 : feature === 'path' ? size * 0.5 : size;
  return new THREE.PlaneGeometry(size, depth).rotateX(-Math.PI / 2).rotateY(yaw);
}
