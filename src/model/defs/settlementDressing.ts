import { RNG } from '../../util/rng';
import type { SettlementPlan } from './settlementPlan';
import type { TerrainQuery } from './terrainQuery';

/**
 * Small household/work props that dress a Caral starting settlement. Visual
 * only and deterministic: the props sit between the centre and the dwellings,
 * clear of the buildings and of each other.
 *
 * Historical notes: Caral-Supe has no pottery, so the set uses gourds, baskets
 * (shicras), cotton, fish drying racks, stone hearths and reed screens. Cotton,
 * gourds and fishing are documented; the exact arrangement is an abstraction
 * (see `docs/historia/civilizaciones/caral.md` and `docs/historia/atuendos.md`).
 */
export type DressingKind = 'hearth' | 'drying_rack' | 'basket' | 'gourd' | 'cotton' | 'bench' | 'windbreak';

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

const SEQUENCE: DressingKind[] = [
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
];

const MAX_SLOPE = 0.42;
/** Keep props outside the building footprints (centre 4.0, houses ~1.8 wide). */
const BUILDING_CLEARANCE = 1.55;
const PROP_CLEARANCE = 0.8;

/** Deterministic household props for a planned Caral base. */
export function planSettlementDressing(plan: SettlementPlan, seed: number, query: DressingQuery): DressingPlacement[] {
  const rng = new RNG(seed);
  const anchors = [
    { x: plan.center.x, z: plan.center.z, center: true },
    ...plan.dwellings.map((d) => ({ x: d.x, z: d.z, center: false })),
  ];
  const houses = anchors.filter((a) => !a.center);
  const placed: DressingPlacement[] = [];

  const free = (x: number, z: number): boolean => {
    if (query.isWater(x, z) || !query.isBuildable(x, z)) return false;
    if (query.getSlope(x, z) > MAX_SLOPE) return false;
    if (anchors.some((a) => Math.hypot(a.x - x, a.z - z) < BUILDING_CLEARANCE)) return false;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < PROP_CLEARANCE)) return false;
    return true;
  };

  for (const kind of SEQUENCE) {
    const pool = kind === 'hearth' ? [anchors[0]] : houses.length ? houses : anchors;
    for (let attempt = 0; attempt < 28; attempt++) {
      const anchor = rng.pick(pool);
      const a = rng.range(0, Math.PI * 2);
      const radius = anchor.center ? rng.range(2.8, 4.5) : rng.range(1.7, 2.7);
      const x = anchor.x + Math.cos(a) * radius;
      const z = anchor.z + Math.sin(a) * radius;
      if (!free(x, z)) continue;
      placed.push({ kind, x, z, yaw: rng.range(0, Math.PI * 2), scale: rng.range(0.85, 1.15) });
      break;
    }
  }
  return placed;
}
