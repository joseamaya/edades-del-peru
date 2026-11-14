import { CHIMU_HEIGHTMAP_WORLD_SIZE } from './chimuHeightmap';
import { siteComposition } from './siteComposition';

/** The Chan Chan site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(CHIMU_HEIGHTMAP_WORLD_SIZE);

export const CHIMU_MAP_SIZE = composition.mapSize;
export const CHIMU_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const chimuLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const chimuPoint = composition.point;
