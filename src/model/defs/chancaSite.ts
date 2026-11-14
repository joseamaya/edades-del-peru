import { CHANCA_HEIGHTMAP_WORLD_SIZE } from './chancaHeightmap';
import { siteComposition } from './siteComposition';

/** The Chanca pucará was authored for the former 160 m map; the model mission samples it on 256 m. */
const composition = siteComposition(CHANCA_HEIGHTMAP_WORLD_SIZE, 160);

export const CHANCA_MAP_SIZE = composition.mapSize;
export const CHANCA_COMPOSITION_SCALE = composition.scale;

/** Scale a length in the former 160 m site frame into the 256 m map. */
export const chancaLength = composition.length;

/** Move a point from the former 160 m site frame into the 256 m map. */
export const chancaPoint = composition.point;
