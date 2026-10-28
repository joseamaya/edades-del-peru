import { RNG } from '../../util/rng';
import type { PropPlacement } from './props';
import type { SettlementField, SettlementRoad } from './settlementPlan';
import { hasNearbyWater } from './scatter';
import type { TerrainQuery } from './terrainQuery';

/** Terrain and reservation queries used by the visual Caral valley plan. */
export interface CaralValleyQuery extends TerrainQuery {
  isReserved(x: number, z: number): boolean;
}

export interface CaralValleyPlan {
  fields: SettlementField[];
  roads: SettlementRoad[];
}

/** Narrow dirt paths, visually distinct from the settlement's wider roads. */
export const CARAL_VALLEY_PATH_WIDTH = 0.65;

const FIELD_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [15, 118],
  [23, 127],
  [14, 141],
  [27, 150],
  [19, 160],
  [34, 155],
];
const VALLEY_FIELD_SIZE_MIN = 3.4;
const VALLEY_FIELD_SIZE_MAX = 4.6;
const VALLEY_FIELD_SLOPE_LIMIT = 0.32;
const VALLEY_FIELD_CLEARANCE = 4.2;
export const VALLEY_FIELD_MARGIN = 0.7;

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
];
const VALLEY_PROP_CLEARANCE = 1.8;
const VALLEY_PROP_SLOPE_LIMIT = 0.35;

/**
 * Deterministic visual-only field/path plan for the green Supe valley beside the
 * Caral base. The plots sit on the floodplain, never on water, the authored site,
 * the canal or the starting settlement. They are scenery, not resource nodes:
 * no obstacle, no yield and no pathfinding entry is created.
 *
 * `siteTarget` is the open ground just short of the Lower Half; callers derive it
 * from the authored site rather than hard-coding world coordinates.
 */
export function planCaralValley(
  seed: number,
  base: { x: number; z: number },
  q: CaralValleyQuery,
  siteTarget?: { x: number; z: number },
): CaralValleyPlan {
  const rng = new RNG((seed * 2654435761 + 19) >>> 0);
  const fields: SettlementField[] = [];
  for (const [ax, az] of FIELD_ANCHORS) {
    const x = ax + rng.range(-1.4, 1.4);
    const z = az + rng.range(-1.4, 1.4);
    if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
    if (q.getSlope(x, z) > VALLEY_FIELD_SLOPE_LIMIT) continue;
    if (fields.some((f) => Math.hypot(f.x - x, f.z - z) < VALLEY_FIELD_CLEARANCE)) continue;
    fields.push({
      x,
      z,
      yaw: 0.18 + rng.range(-0.08, 0.08),
      size: rng.range(VALLEY_FIELD_SIZE_MIN, VALLEY_FIELD_SIZE_MAX),
    });
  }

  const roads: SettlementRoad[] = [];
  for (const field of fields) {
    const to = fieldEdge(base, field);
    if (segmentIsOpen(base, to, q)) roads.push({ from: base, to });
  }
  if (siteTarget && segmentIsOpen(base, siteTarget, q)) roads.push({ from: base, to: siteTarget });
  return { fields, roads };
}

/**
 * Visual-only reeds and low shrubs along the Supe floodplain. Every candidate
 * must see water within a few metres, and is kept away from the fields, base,
 * canal and authored site; no collision or yield.
 */
export function planCaralValleyProps(
  seed: number,
  base: { x: number; z: number },
  q: CaralValleyQuery,
): PropPlacement[] {
  const rng = new RNG((seed * 2246822519 + 23) >>> 0);
  const out: PropPlacement[] = [];
  for (const [ax, az] of REED_ANCHORS) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = ax + rng.range(-2, 2);
      const z = az + rng.range(-2, 2);
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
      if (q.getSlope(x, z) > VALLEY_PROP_SLOPE_LIMIT) continue;
      if (!hasNearbyWater(x, z, q)) continue;
      if (Math.hypot(x - base.x, z - base.z) < 8) continue;
      if (q.isReserved(x, z)) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < VALLEY_PROP_CLEARANCE)) continue;
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

/** Point on the field edge nearest the base, so a path never cuts the crops. */
function fieldEdge(base: { x: number; z: number }, field: SettlementField): { x: number; z: number } {
  const dx = field.x - base.x;
  const dz = field.z - base.z;
  const length = Math.hypot(dx, dz);
  const inset = field.size / 2 + VALLEY_FIELD_MARGIN;
  const t = length > inset ? (length - inset) / length : 0;
  return { x: base.x + dx * t, z: base.z + dz * t };
}

/** True when the drawn path stays on dry, buildable ground. */
function segmentIsOpen(from: { x: number; z: number }, to: { x: number; z: number }, q: CaralValleyQuery): boolean {
  const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    if (q.isWater(x, z) || !q.isBuildable(x, z)) return false;
  }
  return true;
}
