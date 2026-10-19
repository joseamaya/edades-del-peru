import { scatterAmbient, type AmbientPlacement, type AmbientSample } from './scatter';
import type { AmbientQuery } from './ambientQuery';
import type { GeographicRegion } from './profiles';

/**
 * Ambient Peruvian fauna (visual only): llamas and vicuñas graze the highlands,
 * condors soar over the Andes and pelicans work the coast. No entities, no
 * obstacles, no gameplay — placed deterministically from the map seed.
 */
export type SpeciesId = 'llama' | 'vicuna' | 'condor' | 'pelican';

export const SPECIES_IDS: SpeciesId[] = ['llama', 'vicuna', 'condor', 'pelican'];

export type WildlifeSpawn = AmbientPlacement<SpeciesId>;

/** Base presence of each species per geographic region. */
const REGION_WEIGHTS: Record<GeographicRegion, Record<SpeciesId, number>> = {
  north_coast: { pelican: 1.2, llama: 0.2, vicuna: 0, condor: 0 },
  central_coast: { pelican: 1.0, llama: 0.3, vicuna: 0, condor: 0 },
  south_coast: { pelican: 0.8, llama: 0.3, vicuna: 0, condor: 0.5 },
  andean_valley: { pelican: 0, llama: 1.0, vicuna: 0.4, condor: 0.6 },
  high_andes: { pelican: 0, llama: 0.8, vicuna: 1.2, condor: 1.0 },
  altiplano: { pelican: 0, llama: 1.2, vicuna: 0.8, condor: 0.4 },
  amazon: { pelican: 0, llama: 0, vicuna: 0, condor: 0.2 },
};

/** How many fauna a region carries (kept small: one mesh per animal). */
const REGION_COUNT: Record<GeographicRegion, number> = {
  north_coast: 10,
  central_coast: 10,
  south_coast: 9,
  andean_valley: 10,
  high_andes: 12,
  altiplano: 12,
  amazon: 4,
};

export function faunaCountFor(region: GeographicRegion): number {
  return REGION_COUNT[region];
}

/** Habitats are separated by altitude and water: pelicans on the shore, camelids on the puna. */
function suitability(id: SpeciesId, s: AmbientSample): number {
  switch (id) {
    case 'pelican':
      // `nearWater` is the reliable shore test; `isBeach` alone is a thin strip
      return s.nearWater ? 1.6 : s.beach ? 1.4 : 0;
    case 'llama':
      return s.height > 2 ? 1 : 0;
    case 'vicuna':
      return s.height > 4 ? 1.2 : 0;
    case 'condor':
      return s.height > 5 ? 1.3 : 0;
  }
}

/** Deterministic fauna placement (unit-tested with a fake query). */
export function planWildlife(
  region: GeographicRegion,
  seed: number,
  size: number,
  count: number,
  query: AmbientQuery,
): WildlifeSpawn[] {
  const weights = REGION_WEIGHTS[region];
  return scatterAmbient<SpeciesId>({
    seed,
    size,
    count,
    guard: 8,
    scaleRange: [0.9, 1.15],
    query,
    optionsFor: (s) => {
      const options: Array<[SpeciesId, number]> = [];
      for (const id of SPECIES_IDS) {
        const base = weights[id];
        if (base > 0) options.push([id, base * suitability(id, s)]);
      }
      return options;
    },
  });
}
