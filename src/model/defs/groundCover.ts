import { RNG, weightedPick } from '../../util/rng';
import type { GeographicRegion, HistoricalMapProfile } from './profiles';

/** Low ground cover species; all are historical Andean/coastal/Amazonian ground flora or gravel. */
export type GroundCoverSpecies = 'grass' | 'ichu' | 'fern' | 'pebble' | 'gravel';

export const GROUND_COVER_SPECIES: readonly GroundCoverSpecies[] = ['grass', 'ichu', 'fern', 'pebble', 'gravel'];

/** Hard cap shared by the renderer, tests and the benchmark. */
export const GROUND_COVER_INSTANCE_BUDGET = 16000;

export interface GroundCoverWeights {
  grass: number;
  dirt: number;
  sand: number;
  rock: number;
}

/** Terrain/material sample at a candidate point. */
export interface GroundCoverSample {
  height: number;
  slope: number;
  moisture: number;
  beach: boolean;
  weights: GroundCoverWeights;
}

/** Terrain queries the ground-cover planner needs (satisfied by `Terrain`; fake in tests). */
export interface GroundCoverQuery {
  size: number;
  getHeight(x: number, z: number): number;
  getSlope(x: number, z: number): number;
  getMoisture(x: number, z: number): number;
  isWater(x: number, z: number): boolean;
  isBeach(x: number, z: number): boolean;
  getSplatWeights(x: number, z: number): GroundCoverWeights;
  /** Buildings, fields, roads, reserved site footprints and other keep-outs. */
  isExcluded(x: number, z: number): boolean;
}

export interface GroundCoverPlacement {
  species: GroundCoverSpecies;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

/** Relative presence of each species per geographic region. */
const REGION_WEIGHTS: Record<GeographicRegion, Record<GroundCoverSpecies, number>> = {
  north_coast: { grass: 0.9, ichu: 0, fern: 0, pebble: 0.9, gravel: 0.7 },
  central_coast: { grass: 1.0, ichu: 0, fern: 0, pebble: 0.7, gravel: 0.5 },
  south_coast: { grass: 0.35, ichu: 0, fern: 0, pebble: 1.2, gravel: 1.0 },
  andean_valley: { grass: 1.1, ichu: 0.5, fern: 0, pebble: 0.35, gravel: 0.3 },
  high_andes: { grass: 0.45, ichu: 1.3, fern: 0, pebble: 0.6, gravel: 0.5 },
  altiplano: { grass: 0.6, ichu: 1.2, fern: 0, pebble: 0.4, gravel: 0.35 },
  amazon: { grass: 0.7, ichu: 0, fern: 1.2, pebble: 0.15, gravel: 0.1 },
};

const SCALE_RANGE: Record<GroundCoverSpecies, readonly [number, number]> = {
  grass: [0.75, 1.25],
  ichu: [0.8, 1.35],
  fern: [0.8, 1.2],
  pebble: [0.6, 1.4],
  gravel: [0.5, 1.2],
};

/** Per-species habitat weight at a sample (0 = never place). */
function habitatWeight(id: GroundCoverSpecies, s: GroundCoverSample, vegetation: number): number {
  const w = s.weights;
  const dry = 1 - s.moisture;
  const flat = Math.max(0, 1 - s.slope * 1.15);
  switch (id) {
    case 'grass':
      return (
        (w.grass + w.dirt * 0.2 + Math.max(0, s.moisture - 0.3) * 0.9) *
        (0.35 + s.moisture * 1.1) *
        (0.4 + vegetation) *
        flat
      );
    case 'ichu':
      return (w.grass * 0.85 + w.rock * 0.25) * (0.5 + dry * 0.7) * (0.5 + vegetation * 0.5) * flat;
    case 'fern':
      return w.grass * (0.2 + s.moisture * 1.4) * (0.2 + vegetation) * flat;
    case 'pebble':
      return (w.sand * 1.2 + w.rock * 0.9 + (s.beach ? 0.8 : 0)) * (0.7 + s.slope * 0.6);
    case 'gravel':
      return (w.sand * 0.8 + w.rock * 1.1 + w.dirt * 0.25) * (0.6 + s.slope * 0.8);
  }
}

/** Target instance count before the hard budget cap. */
export function groundCoverCount(size: number, vegetation: number, budget: number): number {
  return Math.min(budget, Math.round(size * size * 0.55 * (0.4 + vegetation * 0.6)));
}

/**
 * Deterministic low ground cover: tufts, ferns and gravel on terrain whose
 * material weights and moisture make it suitable. Pure (same seed + profile +
 * query → same placements), so it can be unit-tested headless.
 */
export function planGroundCover(
  profile: Pick<HistoricalMapProfile, 'region' | 'vegetation'>,
  seed: number,
  count: number,
  query: GroundCoverQuery,
): GroundCoverPlacement[] {
  const rng = new RNG((seed * 2654435761 + 0x7f4a7c15) >>> 0);
  const region = REGION_WEIGHTS[profile.region];
  const vegetation = profile.vegetation.density;
  const target = Math.max(0, Math.floor(count));
  const out: GroundCoverPlacement[] = [];
  let tries = 0;
  while (out.length < target && tries++ < target * 6) {
    const x = rng.range(2, query.size - 2);
    const z = rng.range(2, query.size - 2);
    if (query.isWater(x, z) || query.isExcluded(x, z)) continue;
    const sample: GroundCoverSample = {
      height: query.getHeight(x, z),
      slope: query.getSlope(x, z),
      moisture: query.getMoisture(x, z),
      beach: query.isBeach(x, z),
      weights: query.getSplatWeights(x, z),
    };
    if (sample.slope > 0.85 || sample.weights.dirt > 0.65) continue;
    const options: Array<[GroundCoverSpecies, number]> = [];
    for (const id of GROUND_COVER_SPECIES) {
      const base = region[id];
      if (base <= 0) continue;
      const weight = base * habitatWeight(id, sample, vegetation);
      if (weight > 0.001) options.push([id, weight]);
    }
    const id = weightedPick(rng, options);
    if (!id) continue;
    const [min, max] = SCALE_RANGE[id];
    out.push({ species: id, x, z, rotY: rng.range(0, Math.PI * 2), scale: rng.range(min, max) });
  }
  return out;
}
