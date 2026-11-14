import { COLONIAL_HEIGHTMAP_WORLD_SIZE } from './colonialHeightmap';
import { siteComposition } from './siteComposition';

/** The Cusco site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(COLONIAL_HEIGHTMAP_WORLD_SIZE);

export const COLONIAL_MAP_SIZE = composition.mapSize;
export const COLONIAL_SOURCE_SIZE = composition.sourceSize;
export const COLONIAL_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const colonialLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const colonialPoint = composition.point;
