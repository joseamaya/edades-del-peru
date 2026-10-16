import { RNG } from '../../util/rng';
import type { SettlementShape } from './landscape';

/** Terrain queries the settlement planner needs (satisfied by `Terrain`; fake in tests). */
export interface SettlementQuery {
  isWater(x: number, z: number): boolean;
  isBuildable(x: number, z: number): boolean;
  getSlope(x: number, z: number): number;
  getHeight(x: number, z: number): number;
  getMoisture(x: number, z: number): number;
}

export interface SettlementSpot {
  x: number;
  z: number;
  /** Facing from the anchor (radians), so a row of dwellings can be oriented. */
  yaw: number;
}

export interface SettlementRequest {
  shape: SettlementShape;
  seed: number;
  anchor: { x: number; z: number };
  count: number;
}

/** Dwellings sit on this ring around the anchor (compact, clear of the resource ring). */
const RING_RADIUS = 5.5;
/** Minimum distance between two dwellings (their obstacles must not merge). */
const MIN_SEP = 3.5;

/**
 * Deterministic layout of a starting settlement's dwellings around an anchor,
 * read from the terrain: a `riverside` town leans toward water/moisture, a
 * `hilltop` one toward high ground, and `dispersed`/`grid` fan differently. Pure
 * (no THREE) so it is unit-testable headless; same request -> same plan. A
 * dwelling is nudged around the ring when its spot is water, unbuildable, steep
 * or across a river; if nothing fits it falls back to its nominal ring slot.
 */
export function planSettlement(req: SettlementRequest, q: SettlementQuery): SettlementSpot[] {
  const rng = new RNG((req.seed * 40503 + 7) >>> 0);
  const bias = shapeBias(req.shape, q, req.anchor) ?? 0;
  const spacing = req.shape === 'dispersed' ? 1.3 : req.shape === 'grid' ? 0.7 : 0.8;
  const step = Math.PI / 6;
  const out: SettlementSpot[] = [];
  for (let i = 0; i < req.count; i++) {
    const pref = bias + (i - (req.count - 1) / 2) * spacing;
    let spot: SettlementSpot | null = null;
    for (let a = 0; a < 16; a++) {
      const ang = a === 0 ? pref + rng.range(-0.1, 0.1) : pref + rng.range(-1, 1) * step;
      const x = req.anchor.x + Math.cos(ang) * RING_RADIUS;
      const z = req.anchor.z + Math.sin(ang) * RING_RADIUS;
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.getSlope(x, z) > 0.35) continue;
      // a dwelling across a river would be unreachable, and conquest needs every building razed
      if (crossesWater(req.anchor, x, z, q)) continue;
      if (out.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < MIN_SEP ** 2)) continue;
      spot = { x, z, yaw: ang };
      break;
    }
    if (!spot) {
      spot = {
        x: req.anchor.x + Math.cos(pref) * RING_RADIUS,
        z: req.anchor.z + Math.sin(pref) * RING_RADIUS,
        yaw: pref,
      };
    }
    out.push(spot);
  }
  return out;
}

/** True if the straight segment from the anchor to (x, z) crosses water. */
function crossesWater(anchor: { x: number; z: number }, x: number, z: number, q: SettlementQuery): boolean {
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (q.isWater(anchor.x + (x - anchor.x) * t, anchor.z + (z - anchor.z) * t)) return true;
  }
  return false;
}

/** Preferred azimuth for the settlement per shape (null = no bias). */
function shapeBias(shape: SettlementShape, q: SettlementQuery, anchor: { x: number; z: number }): number | null {
  if (shape === 'riverside') {
    return bestDirection((x, z) => (q.isWater(x, z) ? 2 : q.getMoisture(x, z)), anchor);
  }
  if (shape === 'hilltop') {
    return bestDirection((x, z) => (q.getSlope(x, z) > 0.5 ? -1 : q.getHeight(x, z)), anchor);
  }
  return null;
}

/** Azimuth with the highest score on a fixed ring around the anchor. */
function bestDirection(score: (x: number, z: number) => number, anchor: { x: number; z: number }): number {
  const radius = 12;
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const s = score(anchor.x + Math.cos(a) * radius, anchor.z + Math.sin(a) * radius);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return best;
}
