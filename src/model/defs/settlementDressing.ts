import { CivId } from '../../core/types';
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

export type SettlementDressingProfile = 'caral' | 'chavin' | 'moche' | 'wari' | 'inca';

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

/**
 * The household set of each culture, built from the same prop kinds: what changes is the mix and the tint,
 * not the geometry. Moche keeps the fish drying rack and gourds of a coastal valley; Wari (state workshops)
 * and the Inca (qollqa stores, textiles) lean on baskets, cotton and benches. Undocumented parts follow the
 * audit's remedy of reusing the Caral set: `docs/release/0.2.0-asset-historical-audit.md` P2-4, and
 * `docs/historia/civilizaciones/{moche,wari,inca}.md` for the economy. The loom remains a gap: no prop exists.
 */
export interface DressingSet {
  /** Props placed, in order. */
  sequence: DressingKind[];
  /** Multiplied over the shared kit's own colours. A multiply only darkens, so no channel exceeds 1. */
  tint: number;
}

export const DRESSING_SETS: Record<SettlementDressingProfile, DressingSet> = {
  caral: {
    tint: 0xffffff,
    sequence: [
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
  },
  chavin: {
    tint: 0xffffff,
    sequence: [
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
  },
  moche: {
    tint: 0xffe4c2,
    sequence: [
      'hearth',
      'drying_rack',
      'basket',
      'gourd',
      'cotton',
      'bench',
      'drying_rack',
      'basket',
      'gourd',
      'bench',
      'cotton',
      'windbreak',
    ],
  },
  wari: {
    tint: 0xdfe4ee,
    sequence: ['hearth', 'basket', 'cotton', 'bench', 'basket', 'windbreak', 'gourd', 'cotton', 'bench'],
  },
  inca: {
    tint: 0xffd6a8,
    sequence: ['hearth', 'basket', 'basket', 'cotton', 'bench', 'gourd', 'cotton', 'bench', 'windbreak'],
  },
};

/** The campaigns whose `INCA` side is a colonial-era rebellion, not an Inca household. */
const COLONIAL_REBEL_MISSIONS = new Set(['m7_tupac_amaru']);

/**
 * The household set that dresses a base. Keying on the civ alone would dress the 1780 rebellion — `INCA` in the
 * Viceroyalty — with an Incan household, so that campaign is the exception; Cusco 1536 and Vilcabamba 1572 keep
 * theirs, because those are Inca households still. A mission without a set (m8/m9 patriot armies, or a culture
 * with no authored props) stays bare rather than borrowing one.
 */
export function dressingProfileFor(civ: CivId, missionId = ''): SettlementDressingProfile | null {
  if (civ === CivId.INCA && COLONIAL_REBEL_MISSIONS.has(missionId)) return null;
  switch (civ) {
    case CivId.CARAL:
      return 'caral';
    case CivId.CHAVIN:
      return 'chavin';
    case CivId.MOCHE:
      return 'moche';
    case CivId.WARI:
      return 'wari';
    case CivId.INCA:
      return 'inca';
    default:
      return null;
  }
}

const MAX_SLOPE = 0.42;
/**
 * The rendered buildings overhang their grid footprint, so props keep clear of the *walls*, not just the
 * anchor: the clearance covers the footprint's half-diagonal and grows with the prop's own radius.
 * Dwellings read ~3.2 x 2.8 with a plinth; the Plaza Mayor reads 6.46 x 5.27, and its plinth reaches
 * ~4.7 from the centre. Central props are kept outside that footprint (the courtyard stays empty).
 */
const DWELLING_CLEARANCE = 2.45;
/** `buildCaralCenter(3.4)`: 6.46 x 5.27 walls, the plinth adds 12 % per side -> half-diagonal 4.67. */
export const CENTER_CLEARANCE = 4.8;
const MIN_PROP_SCALE = 0.85;
const MAX_PROP_SCALE = 1.15;
/** Air between two props on top of their radii, so touching boxes do not read as one. */
const PROP_MARGIN = 0.1;

/** Half-width of each prop at unit scale, in game metres. */
const PROP_RADIUS: Record<DressingKind, number> = {
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
  const sequence = DRESSING_SETS[profile].sequence;
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
