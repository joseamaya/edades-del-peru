import { RNG } from '../../util/rng';
import type { PropPlacement } from './props';
import type { SettlementField, SettlementRoad } from './settlementPlan';
import type { TerrainQuery } from './terrainQuery';

/** Terrain and reservation queries used by the visual Caral valley plan. */
export interface CaralValleyQuery extends TerrainQuery {
  getHeight(x: number, z: number): number;
  getMoisture(x: number, z: number): number;
  isReserved(x: number, z: number): boolean;
}

export interface CaralValleyPlan {
  fields: SettlementField[];
  roads: SettlementRoad[];
}

const FIELD_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [15, 118],
  [23, 127],
  [14, 141],
  [27, 150],
  [19, 160],
  [34, 155],
];
const FIELD_SIZE_MIN = 3.4;
const FIELD_SIZE_MAX = 4.6;
const FIELD_SLOPE_LIMIT = 0.32;
const FIELD_CLEARANCE = 4.2;
const SITE_PATH = { x: 84, z: 151 } as const;

/**
 * Deterministic visual-only field/path plan for the green Supe valley beside the
 * Caral base. The plots sit on the floodplain, never on water, the authored site,
 * the canal or the starting settlement. They are scenery, not resource nodes:
 * no obstacle, no yield and no pathfinding entry is created.
 */
export function planCaralValley(seed: number, base: { x: number; z: number }, q: CaralValleyQuery): CaralValleyPlan {
  const rng = new RNG((seed * 2654435761 + 19) >>> 0);
  const fields: SettlementField[] = [];
  for (const [ax, az] of FIELD_ANCHORS) {
    const x = ax + rng.range(-1.4, 1.4);
    const z = az + rng.range(-1.4, 1.4);
    if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
    if (q.getSlope(x, z) > FIELD_SLOPE_LIMIT) continue;
    if (fields.some((f) => Math.hypot(f.x - x, f.z - z) < FIELD_CLEARANCE)) continue;
    fields.push({ x, z, yaw: 0.18 + rng.range(-0.08, 0.08), size: rng.range(FIELD_SIZE_MIN, FIELD_SIZE_MAX) });
  }
  const roads: SettlementRoad[] = fields.map((f) => {
    const dx = f.x - base.x;
    const dz = f.z - base.z;
    const length = Math.hypot(dx, dz);
    const inset = f.size / 2 + 0.7;
    const t = length > inset ? (length - inset) / length : 0;
    return { from: base, to: { x: base.x + dx * t, z: base.z + dz * t } };
  });
  if (!q.isWater(SITE_PATH.x, SITE_PATH.z)) roads.push({ from: base, to: SITE_PATH });
  return { fields, roads };
}

const REED_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [9.5, 70],
  [11, 82],
  [10, 94],
  [12, 106],
  [9.5, 118],
  [13, 130],
  [10, 142],
  [14, 154],
  [11, 166],
  [15, 178],
  [17, 90],
  [19, 116],
  [18, 146],
  [21, 162],
  [16, 130],
  [20, 174],
  [12, 62],
  [14, 74],
  [13, 98],
  [15, 122],
  [12.5, 136],
  [16, 150],
  [12.5, 158],
  [16, 170],
  [18, 66],
  [20, 102],
  [19, 126],
  [21, 150],
  [17, 184],
];
const PROP_CLEARANCE = 1.8;
const PROP_SLOPE_LIMIT = 0.35;

/**
 * Visual-only reeds and low shrubs along the Supe floodplain. Kept away from the
 * fields, the base, the canal and the authored site; no collision or yield.
 */
export function planCaralValleyProps(
  seed: number,
  base: { x: number; z: number },
  fields: SettlementField[],
  q: CaralValleyQuery,
): PropPlacement[] {
  const rng = new RNG((seed * 2246822519 + 23) >>> 0);
  const out: PropPlacement[] = [];
  for (const [ax, az] of REED_ANCHORS) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = ax + rng.range(-2, 2);
      const z = az + rng.range(-2, 2);
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
      if (q.getSlope(x, z) > PROP_SLOPE_LIMIT) continue;
      if (Math.hypot(x - base.x, z - base.z) < 8) continue;
      if (fields.some((f) => Math.hypot(f.x - x, f.z - z) < f.size / 2 + PROP_CLEARANCE)) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < PROP_CLEARANCE)) continue;
      const reed = rng.chance(0.72);
      out.push({
        id: reed ? 'totora' : 'shrub',
        x,
        z,
        rotY: rng.range(0, Math.PI * 2),
        scale: reed ? rng.range(1.0, 1.5) : rng.range(0.8, 1.15),
      });
      break;
    }
  }
  return out;
}
