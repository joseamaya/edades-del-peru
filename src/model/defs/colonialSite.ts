import { COLONIAL_HEIGHTMAP_WORLD_SIZE } from './colonialHeightmap';

/** The Cusco site was authored for the former 192 m map; the model mission samples it on 256 m. */
export const COLONIAL_MAP_SIZE = COLONIAL_HEIGHTMAP_WORLD_SIZE;

/** The frame the Cusco composition was authored in. */
export const COLONIAL_SOURCE_SIZE = 192;

/** The heightfield, the site model and every site-local point scale by this factor. */
export const COLONIAL_COMPOSITION_SCALE = COLONIAL_MAP_SIZE / COLONIAL_SOURCE_SIZE;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export function colonialLength(metres: number): number {
  return metres * COLONIAL_COMPOSITION_SCALE;
}

/** Move a point from the former 192 m site frame into the 256 m map. */
export function colonialPoint<T extends { x: number; z: number }>(p: T): T {
  return { ...p, x: p.x * COLONIAL_COMPOSITION_SCALE, z: p.z * COLONIAL_COMPOSITION_SCALE };
}
