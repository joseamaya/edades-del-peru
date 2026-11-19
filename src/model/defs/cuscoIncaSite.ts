import { siteComposition } from './siteComposition';

/** World size of the campaign map the Cusco/Quipaipan site is sampled into. */
const CUSCO_HEIGHTMAP_WORLD_SIZE = 256;

/** The Cusco/Quipaipan site was authored for the former 192 m map; the model mission samples it on 256 m. */
const composition = siteComposition(CUSCO_HEIGHTMAP_WORLD_SIZE);

export const CUSCO_INCA_MAP_SIZE = composition.mapSize;
export const CUSCO_INCA_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export const cuscoIncaLength = composition.length;

/** Move a point from the former 192 m site frame into the 256 m map. */
export const cuscoIncaPoint = composition.point;
