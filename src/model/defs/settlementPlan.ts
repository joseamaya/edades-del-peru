import { RNG } from '../../util/rng';
import type { SettlementShape } from './landscape';
import type { TerrainQuery } from './terrainQuery';

/** Terrain queries the settlement planner needs (satisfied by `Terrain`; fake in tests). */
export interface SettlementQuery extends TerrainQuery {
  getHeight(x: number, z: number): number;
  getMoisture(x: number, z: number): number;
  /** Agricultural terracing strength (Andean andenes); optional. */
  getTerrace?(x: number, z: number): number;
  /** Irrigation canal strength; optional (fields near a canal read as watered). */
  getCanal?(x: number, z: number): number;
}

export interface SettlementSpot {
  x: number;
  z: number;
  /** Facing from the anchor (radians), so a row of dwellings can be oriented. */
  yaw: number;
}

export interface SettlementField extends SettlementSpot {
  /** Footprint edge length in world units. */
  size: number;
}

export interface SettlementRoad {
  from: { x: number; z: number };
  to: { x: number; z: number };
}

export interface SettlementRequest {
  shape: SettlementShape;
  seed: number;
  anchor: { x: number; z: number };
  count: number;
}

/** The full starting-site plan: center, dwellings, fields and their connecting roads. */
export interface SettlementPlan {
  center: { x: number; z: number };
  dwellings: SettlementSpot[];
  fields: SettlementField[];
  roads: SettlementRoad[];
}

/** Dwellings sit on this ring around the anchor (compact, clear of the resource ring). */
const RING_RADIUS = 5.5;
/** Minimum distance between two dwellings (their obstacles must not merge). */
const MIN_SEP = 3.5;
/** Steepest ground a dwelling may sit on. */
const SLOPE_LIMIT = 0.35;
/** A dwelling may be nudged out to this radius before the fallback scan takes over. */
const MAX_RADIUS = 14;
const SEARCH_ATTEMPTS = 16;

/** Fields stay outside the dwelling ring and inside this radius (world units). */
const FIELD_RADIUS_MIN = 6.5;
const FIELD_RADIUS_MAX = 11;
/** How many fields a starting site lays out. */
const FIELD_COUNT = 3;
/** Candidate scan step for fields (world units). */
const FIELD_SCAN_STEP = 2;
/** A field needs at least this fertility score (moisture + terrace/canal). */
const FIELD_MIN_SCORE = 0.6;
/** Steepest ground a field may sit on. */
const FIELD_SLOPE_LIMIT = 0.3;
/** Minimum distance between fields and from a dwelling. */
const MIN_FIELD_SEP = 4;
const FIELD_SIZE_MIN = 3;
const FIELD_SIZE_MAX = 5;
/** Shortest road worth drawing. */
const ROAD_MIN_LEN = 1.2;

/**
 * Deterministic layout of a starting settlement's dwellings around an anchor,
 * read from the terrain: a `riverside` town leans toward water/moisture, a
 * `hilltop` one toward high ground, and `dispersed`/`grid` fan differently. Pure
 * (no THREE) so it is unit-testable headless; same request -> same plan. A
 * dwelling is nudged around the ring when its spot is water, unbuildable, steep
 * or across a river; if the whole ring fails it scans outward for valid land, and
 * only as a last resort (an all-water map) keeps its nominal ring slot.
 */
export function planSettlement(req: SettlementRequest, q: SettlementQuery): SettlementSpot[] {
  return planDwellings(req, q, new RNG((req.seed * 40503 + 7) >>> 0));
}

/**
 * Deterministic full starting-site plan: the dwellings (as `planSettlement`), the
 * fields on the most fertile reachable ground and the roads that connect them to
 * the center. Fields and roads are layout data only — rendering and gameplay
 * (visual-only) live in the caller. Same request -> same plan.
 */
export function planSettlementSite(req: SettlementRequest, q: SettlementQuery): SettlementPlan {
  const rng = new RNG((req.seed * 40503 + 7) >>> 0);
  const center = { x: req.anchor.x, z: req.anchor.z };
  const dwellings = planDwellings(req, q, rng);
  const fields = planFields(center, dwellings, q, rng);
  const roads = planRoads(center, dwellings, fields, q);
  return { center, dwellings, fields, roads };
}

/** Dwellings for the whole plan (shared with `planSettlement`). Draws from `rng`. */
function planDwellings(req: SettlementRequest, q: SettlementQuery, rng: RNG): SettlementSpot[] {
  const bias = shapeBias(req.shape, q, req.anchor) ?? 0;
  const spacing = req.shape === 'dispersed' ? 1.3 : req.shape === 'grid' ? 0.7 : 0.8;
  const step = Math.PI / 6;
  const out: SettlementSpot[] = [];
  for (let i = 0; i < req.count; i++) {
    const pref = bias + (i - (req.count - 1) / 2) * spacing;
    let spot: SettlementSpot | null = null;
    for (let a = 0; a < SEARCH_ATTEMPTS; a++) {
      const ang = a === 0 ? pref + rng.range(-0.1, 0.1) : pref + rng.range(-1, 1) * step;
      const candidate = {
        x: req.anchor.x + Math.cos(ang) * RING_RADIUS,
        z: req.anchor.z + Math.sin(ang) * RING_RADIUS,
      };
      if (isFree(candidate, req.anchor, q, out)) {
        spot = { ...candidate, yaw: ang };
        break;
      }
    }
    spot ??= findNearbyValid(req.anchor, q, out) ?? nominal(req.anchor, pref);
    out.push(spot);
  }
  return out;
}

/**
 * Fields on the most fertile, gentle, reachable ground around the center: a
 * deterministic candidate scan scored by moisture (+ terrace and canal when the
 * query offers them), pick greedily but keep the fields apart and off the
 * dwellings. Only the field size comes from `rng`.
 */
function planFields(
  center: { x: number; z: number },
  dwellings: SettlementSpot[],
  q: SettlementQuery,
  rng: RNG,
): SettlementField[] {
  const candidates: { x: number; z: number; score: number }[] = [];
  for (let x = center.x - FIELD_RADIUS_MAX; x <= center.x + FIELD_RADIUS_MAX; x += FIELD_SCAN_STEP) {
    for (let z = center.z - FIELD_RADIUS_MAX; z <= center.z + FIELD_RADIUS_MAX; z += FIELD_SCAN_STEP) {
      const d = Math.hypot(x - center.x, z - center.z);
      if (d < FIELD_RADIUS_MIN || d > FIELD_RADIUS_MAX) continue;
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.getSlope(x, z) > FIELD_SLOPE_LIMIT) continue;
      const score = fieldScore(q, x, z);
      if (score < FIELD_MIN_SCORE) continue;
      if (crossesWater(center, x, z, q)) continue;
      candidates.push({ x, z, score });
    }
  }
  // highest fertility first; x/z break ties so the pick is deterministic
  candidates.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
  const out: SettlementField[] = [];
  for (const c of candidates) {
    if (out.length >= FIELD_COUNT) break;
    if (out.some((f) => dist2(f, c) < MIN_FIELD_SEP ** 2)) continue;
    if (dwellings.some((d) => dist2(d, c) < MIN_FIELD_SEP ** 2)) continue;
    const yaw = Math.atan2(center.z - c.z, center.x - c.x);
    out.push({ x: c.x, z: c.z, yaw, size: rng.range(FIELD_SIZE_MIN, FIELD_SIZE_MAX) });
  }
  return out;
}

/** Straight spokes from the center to each dwelling and field, skipping water and stubs. */
function planRoads(
  center: { x: number; z: number },
  dwellings: SettlementSpot[],
  fields: SettlementField[],
  q: SettlementQuery,
): SettlementRoad[] {
  const roads: SettlementRoad[] = [];
  const add = (to: { x: number; z: number }): void => {
    if (Math.hypot(to.x - center.x, to.z - center.z) < ROAD_MIN_LEN) return;
    if (crossesWater(center, to.x, to.z, q)) return;
    roads.push({ from: { x: center.x, z: center.z }, to: { x: to.x, z: to.z } });
  };
  for (const d of dwellings) add(d);
  for (const f of fields) add(f);
  return roads;
}

/** Fertility of a cell: moisture plus the terraces and canals that water it. */
function fieldScore(q: SettlementQuery, x: number, z: number): number {
  const terrace = q.getTerrace ? clamp01(q.getTerrace(x, z)) : 0;
  const canal = q.getCanal ? clamp01(q.getCanal(x, z)) : 0;
  return clamp01(q.getMoisture(x, z)) + terrace * 0.8 + canal * 0.4;
}

/** A spot is free when it is buildable, dry, gentle, not cut off and clear of the others. */
function isFree(
  p: { x: number; z: number },
  anchor: { x: number; z: number },
  q: SettlementQuery,
  taken: SettlementSpot[],
): boolean {
  if (q.isWater(p.x, p.z) || !q.isBuildable(p.x, p.z) || q.getSlope(p.x, p.z) > SLOPE_LIMIT) return false;
  // a dwelling across a river would be unreachable, and conquest needs every building razed
  if (crossesWater(anchor, p.x, p.z, q)) return false;
  return !taken.some((s) => dist2(s, p) < MIN_SEP ** 2);
}

/** Deterministic outward scan for valid land when the nominal ring is all water/unbuildable. */
function findNearbyValid(
  anchor: { x: number; z: number },
  q: SettlementQuery,
  taken: SettlementSpot[],
): SettlementSpot | null {
  for (let r = RING_RADIUS + 1.5; r <= MAX_RADIUS; r += 1.5) {
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const p = { x: anchor.x + Math.cos(ang) * r, z: anchor.z + Math.sin(ang) * r };
      if (isFree(p, anchor, q, taken)) return { ...p, yaw: ang };
    }
  }
  return null;
}

function nominal(anchor: { x: number; z: number }, ang: number): SettlementSpot {
  return { x: anchor.x + Math.cos(ang) * RING_RADIUS, z: anchor.z + Math.sin(ang) * RING_RADIUS, yaw: ang };
}

/** True if the straight segment from the anchor to (x, z) crosses water. */
function crossesWater(anchor: { x: number; z: number }, x: number, z: number, q: SettlementQuery): boolean {
  const steps = 8;
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

function dist2(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
