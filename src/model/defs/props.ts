import { scatterAmbient, type AmbientPlacement, type AmbientSample } from './scatter';
import type { AmbientQuery } from './ambientQuery';
import type { GeographicRegion } from './profiles';

/** Scatter props (visual only): desert cacti, wetland totora, rock clusters, shrubs. */
export type PropId = 'cactus' | 'totora' | 'rock' | 'shrub';

export const PROP_IDS: PropId[] = ['cactus', 'totora', 'rock', 'shrub'];

export type PropPlacement = AmbientPlacement<PropId>;

/** Base presence of each prop per geographic region. */
const REGION_WEIGHTS: Record<GeographicRegion, Record<PropId, number>> = {
  north_coast: { rock: 0.5, shrub: 0.5, cactus: 0.8, totora: 0.4 },
  central_coast: { rock: 0.6, shrub: 0.5, cactus: 0.5, totora: 0.6 },
  south_coast: { rock: 0.8, shrub: 0.3, cactus: 1.2, totora: 0.2 },
  andean_valley: { rock: 0.6, shrub: 0.9, cactus: 0.4, totora: 0 },
  high_andes: { rock: 1.0, shrub: 0.5, cactus: 0.3, totora: 0 },
  altiplano: { rock: 0.7, shrub: 0.4, cactus: 0.3, totora: 0.7 },
  amazon: { rock: 0.3, shrub: 0.8, cactus: 0, totora: 0 },
};

/** How suitable the ground is for a prop (0 = never place). */
function suitability(id: PropId, s: AmbientSample): number {
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

/** How many props a map of `mapSize` carries. */
export function propCountFor(mapSize: number): number {
  return Math.round((mapSize * mapSize) / 1100);
}

/** Deterministic prop scatter (unit-tested with a fake query). */
export function planProps(
  region: GeographicRegion,
  seed: number,
  size: number,
  count: number,
  query: AmbientQuery,
): PropPlacement[] {
  const weights = REGION_WEIGHTS[region];
  return scatterAmbient<PropId>({
    seed,
    size,
    count,
    guard: 6,
    scaleRange: [0.8, 1.25],
    query,
    optionsFor: (s) => {
      const options: Array<[PropId, number]> = [];
      for (const id of PROP_IDS) {
        const base = weights[id];
        if (base > 0) options.push([id, base * suitability(id, s)]);
      }
      return options;
    },
  });
}
