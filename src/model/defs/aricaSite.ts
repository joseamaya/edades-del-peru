import { ARICA_HEIGHTMAP_WORLD_SIZE } from './aricaHeightmap';
import { siteComposition } from './siteComposition';

/** The Arica site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(ARICA_HEIGHTMAP_WORLD_SIZE);

export const ARICA_MAP_SIZE = composition.mapSize;
export const ARICA_SOURCE_SIZE = composition.sourceSize;
export const ARICA_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const aricaLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const aricaPoint = composition.point;
