import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Terrain } from './Terrain';
import type { SettlementPlan, SettlementField, SettlementRoad } from '../model/defs/settlementPlan';

const ROAD_WIDTH = 1.4;
/** Small lift above the terrain so the flat quads do not z-fight with the ground. */
const OFFSET = 0.06;

/**
 * Visual-only overlay of a planned starting settlement: its fields and the roads
 * that connect them to the center. Deterministic (derived from the same plan as
 * the dwellings) and merged into two meshes (roads, fields) so a base costs two
 * draw calls. No entities, no obstacles, no gameplay effect — the plan is the
 * layout source (see `model/defs/settlementPlan.ts`).
 */
export class SettlementOverlay {
  readonly group = new THREE.Group();
  private materials: THREE.Material[] = [];

  constructor(
    readonly plan: SettlementPlan,
    terrain: Terrain,
  ) {
    this.group.name = 'settlement';
    this.add(
      'roads',
      plan.roads.map((r) => roadGeometry(r, terrain)),
      new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 }),
    );
    this.add(
      'fields',
      plan.fields.map((f) => fieldGeometry(f, terrain)),
      new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 1 }),
    );
  }

  private add(name: string, parts: THREE.BufferGeometry[], material: THREE.MeshStandardMaterial): void {
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.materials.push(material);
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

/** A flat ribbon quad along the segment, lifted to clear the highest ground under it. */
function roadGeometry(road: SettlementRoad, terrain: Terrain): THREE.BufferGeometry {
  const { from, to } = road;
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  const y = maxHeight(terrain, from.x, from.z, to.x, to.z) + OFFSET;
  const angle = Math.atan2(to.z - from.z, to.x - from.x);
  return new THREE.PlaneGeometry(len, ROAD_WIDTH)
    .rotateX(-Math.PI / 2)
    .rotateY(-angle)
    .translate((from.x + to.x) / 2, y, (from.z + to.z) / 2);
}

/** A flat field quad at the planned spot, lifted to clear the highest corner. */
function fieldGeometry(field: SettlementField, terrain: Terrain): THREE.BufferGeometry {
  const h = field.size / 2;
  let y = terrain.getHeight(field.x, field.z);
  for (const [dx, dz] of [
    [-h, -h],
    [h, -h],
    [-h, h],
    [h, h],
  ]) {
    y = Math.max(y, terrain.getHeight(field.x + dx, field.z + dz));
  }
  return new THREE.PlaneGeometry(field.size, field.size)
    .rotateX(-Math.PI / 2)
    .rotateY(-field.yaw)
    .translate(field.x, y + OFFSET, field.z);
}

function maxHeight(terrain: Terrain, x0: number, z0: number, x1: number, z1: number): number {
  let h = -Infinity;
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    h = Math.max(h, terrain.getHeight(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t));
  }
  return h;
}
