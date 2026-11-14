import { WARI_HEIGHTMAP_WORLD_SIZE } from './wariHeightmap';
import { siteComposition } from './siteComposition';

/** The Wari complex was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(WARI_HEIGHTMAP_WORLD_SIZE);

export const WARI_MAP_SIZE = composition.mapSize;
export const WARI_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const wariLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const wariPoint = composition.point;
