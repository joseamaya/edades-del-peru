import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Terrain } from './Terrain';
import type { SettlementPlan, SettlementField, SettlementRoad } from '../model/defs/settlementPlan';
import { applyGeneratedPbr } from './Biomes';
import { buildRibbon } from './ribbon';
import { scaleUv, GROUND_TILE } from '../util/uv';

const ROAD_WIDTH = 1.4;
/** Length of a road sub-segment; the ribbon samples the terrain at each vertex. */
const ROAD_STEP = 2;
/** Field grid cell size; the field mesh follows the terrain at each vertex. */
const FIELD_STEP = 2;
/** Small lift above the terrain so the surfaces do not z-fight with the ground. */
const OFFSET = 0.06;

/**
 * Visual-only overlay of a planned starting settlement: its fields and the roads
 * that connect them to the center. Deterministic (derived from the same plan as
 * the dwellings) and merged into two meshes (roads, fields) so a base costs two
 * draw calls. The roads are ribbons and the fields are terrain-conforming grids,
 * so both follow the relief instead of floating over it. No entities, no
 * obstacles, no gameplay effect — the plan is the layout source (see
 * `model/defs/settlementPlan.ts`).
 */
export class SettlementOverlay {
  readonly group = new THREE.Group();
  private materials: THREE.Material[] = [];

  constructor(
    readonly plan: SettlementPlan,
    terrain: Terrain,
  ) {
    this.group.name = 'settlement';
    const roadMat = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
    const fieldMat = new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 1 });
    applyGeneratedPbr(roadMat, 'ground_road');
    applyGeneratedPbr(fieldMat, 'ground_field');
    this.add(
      'roads',
      plan.roads.map((r) => roadGeometry(r, terrain)).filter((g): g is THREE.BufferGeometry => g !== null),
      roadMat,
    );
    this.add(
      'fields',
      plan.fields.map((f) => fieldGeometry(f, terrain)),
      fieldMat,
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

/** A ribbon along the road, sub-sampled so it drapes over the terrain. */
function roadGeometry(road: SettlementRoad, terrain: Terrain): THREE.BufferGeometry | null {
  const pts = subdivide(road.from, road.to, ROAD_STEP);
  const geo = buildRibbon(pts, ROAD_WIDTH, (x, z) => terrain.getHeight(x, z) + OFFSET);
  if (geo) scaleUv(geo, 1 / GROUND_TILE, 1 / GROUND_TILE);
  return geo;
}

/** A field grid tilted to the terrain: every vertex sits on the ground + offset. */
function fieldGeometry(field: SettlementField, terrain: Terrain): THREE.BufferGeometry {
  const segs = Math.max(1, Math.round(field.size / FIELD_STEP));
  const geo = new THREE.PlaneGeometry(field.size, field.size, segs, segs)
    .rotateX(-Math.PI / 2)
    .rotateY(-field.yaw)
    .translate(field.x, 0, field.z);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrain.getHeight(pos.getX(i), pos.getZ(i)) + OFFSET);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const r = Math.max(1, field.size / GROUND_TILE);
  scaleUv(geo, r, r);
  return geo;
}

function subdivide(
  from: { x: number; z: number },
  to: { x: number; z: number },
  step: number,
): { x: number; z: number }[] {
  const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / step));
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
  }
  return pts;
}
