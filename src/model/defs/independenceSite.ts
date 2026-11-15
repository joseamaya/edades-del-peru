import { INDEPENDENCE_HEIGHTMAP_WORLD_SIZE } from './independenceHeightmap';
import { siteComposition } from './siteComposition';

/** The Ayacucho site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(INDEPENDENCE_HEIGHTMAP_WORLD_SIZE);

export const INDEPENDENCE_MAP_SIZE = composition.mapSize;
export const INDEPENDENCE_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const independenceLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const independencePoint = composition.point;
