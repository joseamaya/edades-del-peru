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
 * The rendered houses overhang their 2-grid footprint (the quincha walls read ~2.5 wide), so props
 * keep clear of the *walls*, not just the anchor: the clearance grows with the prop's own radius
 * (a 1.3 m drying rack needs more room than a basket).
 */
const BUILDING_CLEARANCE = 2.0;
const PROP_CLEARANCE = 0.8;

/** Half-width of each prop at its default scale, in game metres. */
const PROP_RADIUS: Record<DressingKind, number> = {
  hearth: 0.6,
  drying_rack: 0.75,
  basket: 0.4,
  gourd: 0.35,
  cotton: 0.5,
  bench: 0.6,
  windbreak: 0.7,
  stela: 0.5,
  offering: 0.6,
  stone_head: 0.45,
  megalith: 0.65,
};

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

  const free = (x: number, z: number, kind: DressingKind): boolean => {
    if (query.isWater(x, z) || !query.isBuildable(x, z)) return false;
    if (query.getSlope(x, z) > MAX_SLOPE) return false;
    const reach = BUILDING_CLEARANCE + PROP_RADIUS[kind];
    if (anchors.some((a) => Math.hypot(a.x - x, a.z - z) < reach)) return false;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < PROP_CLEARANCE)) return false;
    return true;
  };

  for (const kind of sequence) {
    const central = kind === 'hearth' || kind === 'stela';
    const pool = central ? [anchors[0]] : houses.length ? houses : anchors;
    for (let attempt = 0; attempt < 28; attempt++) {
      const anchor = rng.pick(pool);
      const a = rng.range(0, Math.PI * 2);
      const radius = anchor.center ? rng.range(3.4, 5.0) : rng.range(2.4, 3.6);
      const x = anchor.x + Math.cos(a) * radius;
      const z = anchor.z + Math.sin(a) * radius;
      if (!free(x, z, kind)) continue;
      placed.push({ kind, x, z, yaw: rng.range(0, Math.PI * 2), scale: rng.range(0.85, 1.15) });
      break;
    }
  }
  return placed;
}
