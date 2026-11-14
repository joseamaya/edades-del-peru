import { MOCHE_HEIGHTMAP_WORLD_SIZE } from './mocheHeightmap';
import { siteComposition } from './siteComposition';

/** The Huacas de Moche site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(MOCHE_HEIGHTMAP_WORLD_SIZE);

export const MOCHE_MAP_SIZE = composition.mapSize;
export const MOCHE_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const mocheLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const mochePoint = composition.point;
