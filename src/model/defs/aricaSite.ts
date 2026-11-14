import { ARICA_HEIGHTMAP_WORLD_SIZE } from './aricaHeightmap';

/** The Arica site was authored for the former 192 m map; the model mission samples it on 256 m. */
export const ARICA_MAP_SIZE = ARICA_HEIGHTMAP_WORLD_SIZE;

/** The frame the Arica composition was authored in. */
export const ARICA_SOURCE_SIZE = 192;

/** The heightfield, the site model and every site-local point scale by this factor. */
export const ARICA_COMPOSITION_SCALE = ARICA_MAP_SIZE / ARICA_SOURCE_SIZE;

/** Scale a length in the former 192 m site frame into the 256 m map. */
export function aricaLength(metres: number): number {
  return metres * ARICA_COMPOSITION_SCALE;
}

/** Move a point from the former 192 m site frame into the 256 m map. */
export function aricaPoint<T extends { x: number; z: number }>(p: T): T {
  return { ...p, x: p.x * ARICA_COMPOSITION_SCALE, z: p.z * ARICA_COMPOSITION_SCALE };
}
