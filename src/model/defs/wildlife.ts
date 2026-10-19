import { RNG, weightedPick } from '../../util/rng';
import type { GeographicRegion } from './profiles';
import type { PlacementSample } from './props';

/**
 * Ambient Peruvian fauna (visual only): llamas and vicuñas graze the highlands,
 * condors soar over the Andes and pelicans work the coast. No entities, no
 * obstacles, no gameplay — placed deterministically from the map seed.
 */
export type SpeciesId = 'llama' | 'vicuna' | 'condor' | 'pelican';

export const SPECIES_IDS: SpeciesId[] = ['llama', 'vicuna', 'condor', 'pelican'];

export interface WildlifeSpawn {
  id: SpeciesId;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

/** Base presence of each species per geographic region. */
const REGION_WEIGHTS: Record<GeographicRegion, Partial<Record<SpeciesId, number>>> = {
  north_coast: { pelican: 1.2, llama: 0.2 },
  central_coast: { pelican: 1.0, llama: 0.3 },
  south_coast: { pelican: 0.8, llama: 0.3, condor: 0.5 },
  andean_valley: { llama: 1.0, vicuna: 0.4, condor: 0.6 },
  high_andes: { llama: 0.8, vicuna: 1.2, condor: 1.0 },
  altiplano: { llama: 1.2, vicuna: 0.8, condor: 0.4 },
  amazon: { condor: 0.2 },
};

/** Habitats are separated by altitude and water: pelicans on the shore, camelids on the puna. */
function suitability(id: SpeciesId, s: PlacementSample): number {
  switch (id) {
    case 'pelican':
      return s.beach ? 1.5 : 0;
    case 'llama':
      return s.height > 2 ? 1 : 0;
    case 'vicuna':
      return s.height > 4 ? 1.2 : 0;
    case 'condor':
      return s.height > 6 ? 1.3 : 0;
  }
}

/**
 * Deterministic fauna placement. Pure: same seed + region + sample → same result
 * (unit-tested with a fake sample).
 */
export function planWildlife(
  region: GeographicRegion,
  seed: number,
  size: number,
  count: number,
  sample: (x: number, z: number) => PlacementSample,
): WildlifeSpawn[] {
  const rng = new RNG(seed);
  const weights = REGION_WEIGHTS[region] ?? {};
  const out: WildlifeSpawn[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 8) {
    const x = rng.range(10, size - 10);
    const z = rng.range(10, size - 10);
    const s = sample(x, z);
    if (s.water) continue;
    const options: Array<[SpeciesId, number]> = [];
    for (const id of SPECIES_IDS) {
      const base = weights[id] ?? 0;
      if (base > 0) options.push([id, base * suitability(id, s)]);
    }
    const id = weightedPick(rng, options);
    if (!id) break;
    out.push({ id, x, z, rotY: rng.range(0, Math.PI * 2), scale: rng.range(0.9, 1.15) });
  }
  return out;
}
