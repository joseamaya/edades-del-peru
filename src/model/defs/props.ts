import { RNG, weightedPick } from '../../util/rng';
import type { GeographicRegion } from './profiles';

/** Scatter props (visual only): desert cacti, wetland totora, rock clusters, shrubs. */
export type PropId = 'cactus' | 'totora' | 'rock' | 'shrub';

export const PROP_IDS: PropId[] = ['cactus', 'totora', 'rock', 'shrub'];

/** Terrain facts a placement needs (provided by `Terrain`; fake in tests). */
export interface PlacementSample {
  height: number;
  water: boolean;
  beach: boolean;
  /** 0 flat .. 1 steep. */
  slope: number;
  /** 0 dry .. 1 wet. */
  moisture: number;
}

export interface PropPlacement {
  id: PropId;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

/** Base presence of each prop per geographic region. */
const REGION_WEIGHTS: Record<GeographicRegion, Partial<Record<PropId, number>>> = {
  north_coast: { rock: 0.5, shrub: 0.5, cactus: 0.8, totora: 0.4 },
  central_coast: { rock: 0.6, shrub: 0.5, cactus: 0.5, totora: 0.6 },
  south_coast: { rock: 0.8, cactus: 1.2, shrub: 0.3, totora: 0.2 },
  andean_valley: { rock: 0.6, shrub: 0.9, cactus: 0.4 },
  high_andes: { rock: 1.0, shrub: 0.5, cactus: 0.3 },
  altiplano: { rock: 0.7, shrub: 0.4, totora: 0.7, cactus: 0.3 },
  amazon: { shrub: 0.8, rock: 0.3 },
};

/** How suitable the ground is for a prop (0 = never place). */
function suitability(id: PropId, s: PlacementSample): number {
  const wet = s.moisture;
  const dry = 1 - s.moisture;
  switch (id) {
    case 'cactus':
      return dry * 1.5 * (s.slope > 0.5 ? 0.3 : 1);
    case 'totora':
      return (s.beach ? 1.4 : 0) + wet * 0.8;
    case 'rock':
      return 0.4 + s.slope * 1.6;
    case 'shrub':
      return 0.3 + wet * 0.9;
  }
}

/**
 * Deterministic scatter of props over `[0,size]`. Pure: same seed + region +
 * sample produce the same placement (unit-tested with a fake sample).
 */
export function planProps(
  region: GeographicRegion,
  seed: number,
  size: number,
  count: number,
  sample: (x: number, z: number) => PlacementSample,
): PropPlacement[] {
  const rng = new RNG(seed);
  const weights = REGION_WEIGHTS[region] ?? {};
  const out: PropPlacement[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 6) {
    const x = rng.range(6, size - 6);
    const z = rng.range(6, size - 6);
    const s = sample(x, z);
    if (s.water) continue;
    const options: Array<[PropId, number]> = [];
    for (const id of PROP_IDS) {
      const base = weights[id] ?? 0;
      if (base > 0) options.push([id, base * suitability(id, s)]);
    }
    const id = weightedPick(rng, options);
    if (!id) break;
    out.push({ id, x, z, rotY: rng.range(0, Math.PI * 2), scale: rng.range(0.8, 1.25) });
  }
  return out;
}
