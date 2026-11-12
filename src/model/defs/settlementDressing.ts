import { RNG } from '../../util/rng';
import type { SettlementPlan } from './settlementPlan';
import type { TerrainQuery } from './terrainQuery';

/**
 * Small household/work props that dress a starting settlement. Visual only and
 * deterministic: the props sit between the centre and the dwellings, clear of
 * the buildings and of each other.
 *
 * Historical notes: Caral-Supe has no pottery, so its set uses gourds, baskets
 * (shicras), cotton, fish drying racks, stone hearths and reed screens. Chavín
 * adds carved stelae, offering altars (spondylus/obsidian) and dressed megaliths,
 * following its feline iconography and long-distance exchange. The exact
 * arrangement is an abstraction (see `docs/historia/civilizaciones/caral.md`,
 * `chavin.md` and `docs/historia/atuendos.md`).
 */
export type DressingKind =
  | 'hearth'
  | 'drying_rack'
  | 'basket'
  | 'gourd'
  | 'cotton'
  | 'bench'
  | 'windbreak'
  | 'stela'
  | 'offering'
  | 'stone_head'
  | 'megalith';

export type SettlementDressingProfile = 'caral' | 'chavin';

export interface DressingPlacement {
  kind: DressingKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
}

export interface DressingQuery extends TerrainQuery {
  getHeight(x: number, z: number): number;
}

const SEQUENCES: Record<SettlementDressingProfile, DressingKind[]> = {
  caral: [
    'hearth',
    'drying_rack',
    'basket',
    'gourd',
    'bench',
    'drying_rack',
    'basket',
    'cotton',
    'gourd',
    'windbreak',
    'basket',
    'bench',
    'gourd',
    'cotton',
  ],
  chavin: [
    'stela',
    'offering',
    'stone_head',
    'megalith',
    'stela',
    'offering',
    'megalith',
    'stone_head',
    'bench',
    'basket',
  ],
};

const MAX_SLOPE = 0.42;
/**
 * The rendered buildings overhang their grid footprint, so props keep clear of the *walls*, not just the
 * anchor: the clearance covers the footprint's half-diagonal and grows with the prop's own radius.
 * Dwellings read ~3.2 x 2.8 with a plinth; the Plaza Mayor reads 6.46 x 5.27, and its plinth reaches
 * ~4.7 from the centre. Central props are kept outside that footprint (the courtyard stays empty).
 */
export const DWELLING_CLEARANCE = 2.45;
/** `buildCaralCenter(3.4)`: 6.46 x 5.27 walls, the plinth adds 12 % per side -> half-diagonal 4.67. */
export const CENTER_CLEARANCE = 4.8;
const MIN_PROP_SCALE = 0.85;
const MAX_PROP_SCALE = 1.15;
/** Air between two props on top of their radii, so touching boxes do not read as one. */
const PROP_MARGIN = 0.1;

/** Half-width of each prop at unit scale, in game metres. */
export const PROP_RADIUS: Record<DressingKind, number> = {
  hearth: 0.6,
  drying_rack: 0.75,
  basket: 0.4,
  gourd: 0.35,
  cotton: 0.5,
  bench: 0.6,
  windbreak: 0.7,
  stela: 0.55,
  offering: 0.7,
  stone_head: 0.5,
  megalith: 0.75,
};

/** Centre-to-anchor distance below which a prop would touch the rendered walls. */
export function propClearance(
  kind: DressingKind,
  scale = MAX_PROP_SCALE,
  anchor: 'dwelling' | 'center' = 'dwelling',
): number {
  return (anchor === 'center' ? CENTER_CLEARANCE : DWELLING_CLEARANCE) + PROP_RADIUS[kind] * scale;
}

/** Centre-to-centre distance below which two props overlap (radii plus a small air gap). */
export function propSeparation(a: DressingKind, aScale: number, b: DressingKind, bScale: number): number {
  return PROP_RADIUS[a] * aScale + PROP_RADIUS[b] * bScale + PROP_MARGIN;
}

/** Deterministic household props for a planned base. */
export function planSettlementDressing(
  plan: SettlementPlan,
  seed: number,
  query: DressingQuery,
  profile: SettlementDressingProfile = 'caral',
): DressingPlacement[] {
  const rng = new RNG(seed);
  const sequence = SEQUENCES[profile];
  const anchors = [
    { x: plan.center.x, z: plan.center.z, center: true },
    ...plan.dwellings.map((d) => ({ x: d.x, z: d.z, center: false })),
  ];
  const houses = anchors.filter((a) => !a.center);
  const placed: DressingPlacement[] = [];

  const free = (x: number, z: number, kind: DressingKind, scale: number): boolean => {
    if (query.isWater(x, z) || !query.isBuildable(x, z)) return false;
    if (query.getSlope(x, z) > MAX_SLOPE) return false;
    if (
      anchors.some((a) => Math.hypot(a.x - x, a.z - z) < propClearance(kind, scale, a.center ? 'center' : 'dwelling'))
    )
      return false;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < propSeparation(p.kind, p.scale, kind, scale))) return false;
    return true;
  };

  for (const kind of sequence) {
    const central = kind === 'hearth' || kind === 'stela';
    const pool = central ? [anchors[0]] : houses.length ? houses : anchors;
    for (let attempt = 0; attempt < 60; attempt++) {
      const anchor = rng.pick(pool);
      const a = rng.range(0, Math.PI * 2);
      // Central props are outside the plaza's plinth; the band starts at the clearance for the
      // largest scale the planner draws, plus a head of room, and never sits on the dwelling ring.
      const centerMin = CENTER_CLEARANCE + PROP_RADIUS[kind] * MAX_PROP_SCALE + PROP_MARGIN;
      const radius = anchor.center ? rng.range(centerMin, centerMin + 1.6) : rng.range(3.5, 5.1);
      const x = anchor.x + Math.cos(a) * radius;
      const z = anchor.z + Math.sin(a) * radius;
      const scale = rng.range(MIN_PROP_SCALE, MAX_PROP_SCALE);
      if (!free(x, z, kind, scale)) continue;
      placed.push({ kind, x, z, yaw: rng.range(0, Math.PI * 2), scale });
      break;
    }
  }
  return placed;
}
