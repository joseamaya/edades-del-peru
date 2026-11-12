import { RNG } from '../../util/rng';
import { distanceToPath } from '../../util/math';
import { CARAL_FORDS, CARAL_RIVER_PATH } from './caralHeightmap';
import type { PropPlacement } from './props';
import type { WildlifeSpawn } from './wildlife';
import type { SettlementField, SettlementRoad } from './settlementPlan';
import { hasNearbyWater } from './scatter';
import type { TerrainQuery } from './terrainQuery';

/** Terrain and reservation queries used by the visual Caral valley plan. */
export interface CaralValleyQuery extends TerrainQuery {
  isReserved(x: number, z: number): boolean;
  /** Blockers and resource nodes a decorative tree must not grow through; optional for pure tests. */
  isOccupied?(x: number, z: number): boolean;
  /** Ground a decorative tree may stand on; it never adds its own obstacle. */
  isWalkable?(x: number, z: number): boolean;
  /** Terrain height, used to stop the approach at the foot of the terrace. */
  getHeight?(x: number, z: number): number;
}

export interface CaralApproach {
  id: 'aspero';
  /** Painted centreline, from the base across the Supe ford to the Lower Half. */
  points: { x: number; z: number }[];
  width: number;
}

export interface CaralGrovePlacement {
  /** The two tree variants the Caral vegetation kit draws (huarango/algarrobo and sauce). */
  species: 'algarrobo' | 'sauce';
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

export interface CaralValleyPlan {
  fields: SettlementField[];
  roads: SettlementRoad[];
  approaches: CaralApproach[];
  groves: CaralGrovePlacement[];
}

/** Narrow dirt paths, visually distinct from the settlement's wider roads. */
export const CARAL_VALLEY_PATH_WIDTH = 0.65;
/** A road-scale painted approach, readable from the RTS camera without becoming a highway. */
export const CARAL_APPROACH_WIDTH = 2.8;
/** Keep canopy and ground cover clear of a painted approach. */
export const CARAL_APPROACH_CLEARANCE = 3.4;

/**
 * Plots on the west-bank floodplain of the Supe transect map (scripts/build_caral_heightmap.py), around
 * the communal canal: cotton, gourds, squash and beans in the lower valley.
 */
const FIELD_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  // West bank, around the communal canal.
  [46, 104],
  [54, 96],
  [44, 128],
  [56, 136],
  [42, 146],
  [58, 112],
  [48, 88],
  [52, 72],
  [44, 60],
  [56, 52],
  // East bank: the floodplain between the river and the city's terrace.
  [84, 40],
  [90, 58],
  [84, 76],
  [92, 92],
  [86, 108],
  [92, 126],
  [84, 142],
  [90, 160],
];
const VALLEY_FIELD_SIZE_MIN = 5.0;
const VALLEY_FIELD_SIZE_MAX = 7.5;
const VALLEY_FIELD_SLOPE_LIMIT = 0.32;
const VALLEY_FIELD_CLEARANCE = 7.5;
export const VALLEY_FIELD_MARGIN = 0.7;

/**
 * Small groves on the west edge of the valley, outside the city keep-out: algarrobos on the dry
 * terrace margin and willows along the Supe's bank. Counts are deliberately small so they read as
 * groves and stay inside the scene budget.
 */
const GROVE_CLUSTERS: ReadonlyArray<{
  x: number;
  z: number;
  species: CaralGrovePlacement['species'];
  count: number;
}> = [
  { x: 50, z: 160, species: 'algarrobo', count: 4 },
  { x: 55, z: 148, species: 'algarrobo', count: 3 },
  { x: 60, z: 164, species: 'sauce', count: 4 },
  { x: 60, z: 145, species: 'sauce', count: 3 },
  { x: 48, z: 126, species: 'algarrobo', count: 4 },
  { x: 59, z: 122, species: 'sauce', count: 3 },
  { x: 50, z: 106, species: 'algarrobo', count: 3 },
  { x: 60, z: 98, species: 'sauce', count: 3 },
  { x: 46, z: 112, species: 'algarrobo', count: 3 },
  { x: 58, z: 86, species: 'sauce', count: 3 },
  { x: 47, z: 76, species: 'algarrobo', count: 3 },
  { x: 58, z: 62, species: 'sauce', count: 3 },
  { x: 46, z: 52, species: 'algarrobo', count: 3 },
  { x: 57, z: 44, species: 'sauce', count: 3 },
];
const GROVE_SLOPE_LIMIT = 0.35;
const GROVE_CLEARANCE = 4.2;

/** Centreline of the Supe's north-south reach in the transect map (mirrors the heightmap generator). */
function supeX(z: number): number {
  return 70 + 3 * Math.sin(z * 0.06 + 0.4);
}

/** Canes along both banks of the Supe, then totora across the wetlands at its mouth. */
const BANK_ANCHORS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 14 }, (_, i) => {
  const z = 30 + i * 12;
  return [
    [supeX(z) - 6.5, z],
    [supeX(z + 6) + 6.5, z + 6],
  ] as const;
}).flat();
const WETLAND_ANCHORS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 24 }, (_, i) => {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return [22 + col * 6 + (row % 2) * 3, 198 + row * 7] as const;
});
const REED_ANCHORS: ReadonlyArray<readonly [number, number, 'bank' | 'wetland']> = [
  ...BANK_ANCHORS.map(([x, z]) => [x, z, 'bank'] as const),
  ...WETLAND_ANCHORS.map(([x, z]) => [x, z, 'wetland'] as const),
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
  return { fields, roads, ...planCaralValleyScenery(seed, base, siteTarget, fields, q) };
}

/**
 * The occupancy-sensitive part of the plan: approaches and groves are recomputed after the opening
 * base, resources and buildings exist, while the reserved fields stay exactly where they were planned.
 */
export function planCaralValleyScenery(
  seed: number,
  base: { x: number; z: number },
  siteTarget: { x: number; z: number } | undefined,
  fields: readonly SettlementField[],
  q: CaralValleyQuery,
): Pick<CaralValleyPlan, 'approaches' | 'groves'> {
  const approaches = siteTarget ? planApproaches(base, siteTarget, fields, q) : [];
  return { approaches, groves: planGrovePlacements(seed, approaches, fields, q) };
}

/**
 * Visual-only totora and riverbank canes (caña brava, carrizo) along the Supe floodplain. Every candidate
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
  for (const [ax, az, zone] of REED_ANCHORS) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = ax + rng.range(-2, 2);
      const z = az + rng.range(-2, 2);
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
      if (q.getSlope(x, z) > VALLEY_PROP_SLOPE_LIMIT) continue;
      if (!hasNearbyWater(x, z, q)) continue;
      if (Math.hypot(x - base.x, z - base.z) < 8) continue;
      if (q.isReserved(x, z)) continue;
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < VALLEY_PROP_CLEARANCE)) continue;
      const reed = zone === 'wetland' || rng.chance(0.4);
      // Riverbank canes instead of generic shrubs; the species alternates by position so the
      // random stream (and every placement) stays as before.
      const cane = (Math.floor(x + z) & 1) === 0 ? 'cana_brava' : 'carrizo';
      out.push({
        id: reed ? 'totora' : cane,
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

/** Deer groups and bird flocks along the Supe (Shady: venados and aves in the riparian forest). */
const DEER_GROUPS = 2;
const DEER_PER_GROUP = 3;
const BIRD_FLOCKS = 2;
const BIRDS_PER_FLOCK = 3;
const FAUNA_BASE_CLEARANCE = 14;
const FAUNA_GROUP_CLEARANCE = 14;
/** Deer graze on an orbit of up to ~3.1 units: their roost needs dry land all around that ring. */
const DEER_LAND_RING = 4;
const DEER_WATER_RING = 9;

/**
 * Visual-only riparian fauna for the Supe floodplain: small deer groups grazing near the water and
 * bird flocks roosting over the reeds. Every roost must see water and stay clear of the base and of
 * the other groups; members share the roost so the group moves (and a flock lifts) together.
 * Deterministic for a seed; placed before the regional fauna so the wildlife cap keeps it.
 */
export function planCaralValleyFauna(
  seed: number,
  base: { x: number; z: number },
  q: CaralValleyQuery,
): WildlifeSpawn[] {
  const rng = new RNG((seed * 3266489917 + 29) >>> 0);
  const roosts: { x: number; z: number; deer: boolean }[] = [];
  const order = [...REED_ANCHORS.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  let deerGroups = 0;
  let birdFlocks = 0;
  for (const k of order) {
    if (deerGroups >= DEER_GROUPS && birdFlocks >= BIRD_FLOCKS) break;
    const [ax, az] = REED_ANCHORS[k];
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = ax + rng.range(-4, 4);
      const z = az + rng.range(-4, 4);
      if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
      if (q.getSlope(x, z) > VALLEY_PROP_SLOPE_LIMIT) continue;
      if (Math.hypot(x - base.x, z - base.z) < FAUNA_BASE_CLEARANCE) continue;
      if (roosts.some((r) => Math.hypot(r.x - x, r.z - z) < FAUNA_GROUP_CLEARANCE)) continue;
      // Deer graze within sight of the water on a dry ring; birds roost right over the water's edge.
      const deerFits =
        deerGroups < DEER_GROUPS && ringIsDry(x, z, DEER_LAND_RING, q) && ringHasWater(x, z, DEER_WATER_RING, q);
      const birdFits = birdFlocks < BIRD_FLOCKS && hasNearbyWater(x, z, q);
      if (!deerFits && !birdFits) continue;
      roosts.push({ x, z, deer: deerFits });
      if (deerFits) deerGroups++;
      else birdFlocks++;
      break;
    }
  }
  const out: WildlifeSpawn[] = [];
  for (const r of roosts) {
    const members = r.deer ? DEER_PER_GROUP : BIRDS_PER_FLOCK;
    for (let m = 0; m < members; m++) {
      out.push({
        id: r.deer ? 'deer' : 'riparian_bird',
        x: r.x,
        z: r.z,
        rotY: rng.range(0, Math.PI * 2),
        // Birds are drawn about twice life size so a flock still reads from the default camera.
        scale: r.deer ? rng.range(0.9, 1.1) : rng.range(1.8, 2.2),
      });
    }
  }
  return out;
}

/** Pelicans working the sea off Áspero (the anchoveta shoals that fed the fishing village). */
export function planCaralCoastFauna(seed: number): WildlifeSpawn[] {
  const rng = new RNG((seed * 2246822519 + 71) >>> 0);
  const out: WildlifeSpawn[] = [];
  for (const [px, pz] of PELICAN_ROOSTS) {
    for (let m = 0; m < PELICANS_PER_FLOCK; m++) {
      out.push({ id: 'pelican', x: px, z: pz, rotY: rng.range(0, Math.PI * 2), scale: rng.range(0.9, 1.1) });
    }
  }
  return out;
}

/** Two pelican flocks over the sea west of Áspero (transect map of scripts/build_caral_heightmap.py). */
const PELICAN_ROOSTS: ReadonlyArray<readonly [number, number]> = [
  [8, 160],
  [6, 196],
];
const PELICANS_PER_FLOCK = 3;

function ringHasWater(x: number, z: number, radius: number, q: CaralValleyQuery): boolean {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (q.isWater(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) return true;
  }
  return false;
}

function ringIsDry(x: number, z: number, radius: number, q: CaralValleyQuery): boolean {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (q.isWater(x + Math.cos(a) * radius, z + Math.sin(a) * radius)) return false;
  }
  return true;
}

/**
 * The southern crossing: the approach from Áspero enters the city from the lower valley. Its x is
 * interpolated from the authored Supe centreline, so the painted route and the walkable ford share
 * the same data.
 */
function southernFord(): { x: number; z: number; halfWidth: number } {
  const ford = CARAL_FORDS.reduce((south, f) => (f.z > south.z ? f : south), CARAL_FORDS[0]!);
  for (let i = 1; i < CARAL_RIVER_PATH.length; i++) {
    const [x0, z0] = CARAL_RIVER_PATH[i - 1]!;
    const [x1, z1] = CARAL_RIVER_PATH[i]!;
    if (ford.z < z0 || ford.z > z1) continue;
    const t = z1 === z0 ? 0 : (ford.z - z0) / (z1 - z0);
    return { x: x0 + (x1 - x0) * t, z: ford.z, halfWidth: ford.halfWidth };
  }
  return { x: CARAL_RIVER_PATH[0]![0], z: ford.z, halfWidth: ford.halfWidth };
}

/**
 * Stop at the foot of the terrace instead of painting up the escarpment. Scan west from the Lower
 * Half on the valley side; the first two-metre drop marks the scarp, so the path ends on the low side.
 */
function approachFoot(siteTarget: { x: number; z: number }, q: CaralValleyQuery): { x: number; z: number } {
  const z = siteTarget.z + 12;
  const high = q.getHeight?.(siteTarget.x, z);
  if (high !== undefined) {
    for (let x = siteTarget.x - 1; x >= siteTarget.x - 55; x--) {
      const h = q.getHeight?.(x, z);
      if (h !== undefined && high - h >= 2) return { x: x + 1, z };
    }
  }
  return { x: siteTarget.x - 30, z };
}

/** One painted approach from the base, across the Supe's southern ford, to the terrace foot. */
function planApproaches(
  base: { x: number; z: number },
  siteTarget: { x: number; z: number },
  fields: readonly SettlementField[],
  q: CaralValleyQuery,
): CaralApproach[] {
  const ford = southernFord();
  const foot = approachFoot(siteTarget, q);
  const points = [
    { x: base.x + 8, z: base.z },
    { x: base.x + 16, z: base.z - 2 },
    { x: ford.x - 9, z: ford.z + 6 },
    { x: ford.x, z: ford.z },
    { x: ford.x + 10, z: ford.z + 4 },
    { x: ford.x + 14, z: ford.z + 20 },
    { x: ford.x + 24, z: ford.z + 22 },
    { x: foot.x, z: foot.z },
  ];
  if (!approachIsOpen(points, fields, q)) return [];
  return [{ id: 'aspero', points, width: CARAL_APPROACH_WIDTH }];
}

/**
 * The path must stay on buildable dry ground except across the ford, and must not cut a field.
 * The last stretch enters the city keep-out, which is expected: it leads to the terrace foot.
 */
function approachIsOpen(
  points: readonly { x: number; z: number }[],
  fields: readonly SettlementField[],
  q: CaralValleyQuery,
): boolean {
  const ford = southernFord();
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]!;
    const to = points[i]!;
    const steps = Math.max(2, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      const atFord = Math.abs(z - ford.z) <= ford.halfWidth;
      if (!atFord && (q.isWater(x, z) || !q.isBuildable(x, z))) return false;
      if (fields.some((f) => Math.abs(x - f.x) <= f.size / 2 + 1.2 && Math.abs(z - f.z) <= f.size / 2 + 1.2)) {
        return false;
      }
    }
  }
  return true;
}

/** Algarrobo and willow groups on the valley edge, clear of the painted approach and existing props. */
function planGrovePlacements(
  seed: number,
  approaches: readonly CaralApproach[],
  fields: readonly SettlementField[],
  q: CaralValleyQuery,
): CaralGrovePlacement[] {
  const rng = new RNG((seed * 1103515245 + 0x433) >>> 0);
  const out: CaralGrovePlacement[] = [];
  for (const cluster of GROVE_CLUSTERS) {
    for (let i = 0; i < cluster.count; i++) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const x = cluster.x + rng.range(-4.2, 4.2);
        const z = cluster.z + rng.range(-4.2, 4.2);
        if (q.isWater(x, z) || !q.isBuildable(x, z) || q.isReserved(x, z)) continue;
        if (q.getSlope(x, z) > GROVE_SLOPE_LIMIT || q.isWalkable?.(x, z) === false) continue;
        if (q.isOccupied?.(x, z)) continue;
        if (
          fields.some(
            (f) =>
              Math.abs(x - f.x) <= f.size / 2 + VALLEY_FIELD_MARGIN &&
              Math.abs(z - f.z) <= f.size / 2 + VALLEY_FIELD_MARGIN,
          )
        ) {
          continue;
        }
        if (approaches.some((a) => distanceToPath(x, z, a.points) <= CARAL_APPROACH_CLEARANCE)) continue;
        if (out.some((p) => Math.hypot(p.x - x, p.z - z) < GROVE_CLEARANCE)) continue;
        out.push({
          species: cluster.species,
          x,
          z,
          rotY: rng.range(0, Math.PI * 2),
          scale: rng.range(0.82, 1.18),
        });
        break;
      }
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
