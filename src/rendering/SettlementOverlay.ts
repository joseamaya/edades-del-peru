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
export const SETTLEMENT_OFFSET = 0.06;
/** Spacing and width of the young-crop rows on a planned field. */
const CROP_SPACING = 0.85;
const CROP_WIDTH = 0.3;
const CROP_OFFSET = 0.04;

export interface SettlementOverlayOptions {
  roadWidth?: number;
  fieldBorders?: boolean;
}

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

  private readonly roadWidth: number;

  constructor(
    readonly plan: SettlementPlan,
    terrain: Terrain,
    options: SettlementOverlayOptions = {},
  ) {
    this.group.name = 'settlement';
    this.roadWidth = options.roadWidth ?? ROAD_WIDTH;
    const roadMat = new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 1 });
    const fieldMat = new THREE.MeshStandardMaterial({ color: '#6f8f3a', roughness: 1 });
    applyGeneratedPbr(roadMat, 'ground_road');
    applyGeneratedPbr(fieldMat, 'ground_field');
    this.add(
      'roads',
      plan.roads
        .map((r) => roadGeometry(r, terrain.getHeight.bind(terrain), this.roadWidth))
        .filter((g): g is THREE.BufferGeometry => g !== null),
      roadMat,
    );
    this.add(
      'fields',
      plan.fields.map((f) => fieldGeometry(f, terrain.getHeight.bind(terrain))),
      fieldMat,
    );
    const cropMat = new THREE.MeshStandardMaterial({ color: '#82994a', roughness: 1 });
    this.add(
      'crops',
      plan.fields.flatMap((f) => cropGeometry(f, terrain.getHeight.bind(terrain))),
      cropMat,
    );
    if (options.fieldBorders) {
      const borderMat = new THREE.MeshStandardMaterial({ color: '#746955', roughness: 1 });
      this.add(
        'field-borders',
        plan.fields.flatMap((f) => fieldBorderGeometry(f, terrain.getHeight.bind(terrain))),
        borderMat,
      );
    }
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
export function roadGeometry(
  road: SettlementRoad,
  getHeight: (x: number, z: number) => number,
  width = ROAD_WIDTH,
): THREE.BufferGeometry | null {
  return buildRibbon(subdivide(road.from, road.to, ROAD_STEP), width, (x, z) => getHeight(x, z) + SETTLEMENT_OFFSET);
}

/** A field grid tilted to the terrain: every vertex sits on the ground + offset. */
export function fieldGeometry(
  field: SettlementField,
  getHeight: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const segs = Math.max(1, Math.round(field.size / FIELD_STEP));
  const geo = new THREE.PlaneGeometry(field.size, field.size, segs, segs)
    .rotateX(-Math.PI / 2)
    .rotateY(-field.yaw)
    .translate(field.x, 0, field.z);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)) + SETTLEMENT_OFFSET);
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const r = Math.max(1, field.size / GROUND_TILE);
  scaleUv(geo, r, r);
  return geo;
}

/** Young-crop rows that follow the field's terrain, parallel to its furrows. */
export function cropGeometry(
  field: SettlementField,
  getHeight: (x: number, z: number) => number,
): THREE.BufferGeometry[] {
  const half = field.size / 2;
  const n = Math.max(2, Math.floor(field.size / CROP_SPACING));
  const spacing = field.size / n;
  const cos = Math.cos(field.yaw);
  const sin = Math.sin(field.yaw);
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const localX = -half + spacing * (i + 0.5);
    const from = {
      x: field.x + localX * cos - -half * sin,
      z: field.z + localX * sin + -half * cos,
    };
    const to = {
      x: field.x + localX * cos - half * sin,
      z: field.z + localX * sin + half * cos,
    };
    // Rows run along the field's local Z, so they line up with the furrows.
    const geo = buildRibbon(
      subdivide(from, to, 2),
      CROP_WIDTH,
      (x, z) => getHeight(x, z) + SETTLEMENT_OFFSET + CROP_OFFSET,
    );
    if (geo) out.push(geo);
  }
  return out;
}

/** Low earthen edging that helps a plot read as cultivated ground, not a lawn. */
export function fieldBorderGeometry(
  field: SettlementField,
  getHeight: (x: number, z: number) => number,
): THREE.BufferGeometry[] {
  const half = field.size / 2;
  const cos = Math.cos(field.yaw);
  const sin = Math.sin(field.yaw);
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
    [-half, -half],
  ].map(([x, z]) => ({
    x: field.x + x * cos - z * sin,
    z: field.z + x * sin + z * cos,
  }));
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const geo = buildRibbon(
      subdivide(corners[i], corners[i + 1], 1.5),
      0.18,
      (x, z) => getHeight(x, z) + SETTLEMENT_OFFSET + 0.02,
    );
    if (geo) out.push(geo);
  }
  return out;
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
