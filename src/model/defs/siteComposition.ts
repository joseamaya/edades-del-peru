/** A site composition authored in a smaller frame and sampled into a larger campaign map. */
export interface SiteComposition {
  readonly mapSize: number;
  readonly sourceSize: number;
  /** Map size divided by the authored frame. */
  readonly scale: number;
  /** Scale a length in the authored frame into the map. */
  length(metres: number): number;
  /** Move a point from the authored frame into the map. */
  point<T extends { x: number; z: number }>(p: T): T;
}

/** The campaign sites (Arica, Cusco) were authored for the former 192 m maps. */
export const SITE_SOURCE_SIZE = 192;

export function siteComposition(mapSize: number, sourceSize = SITE_SOURCE_SIZE): SiteComposition {
  const scale = mapSize / sourceSize;
  return {
    mapSize,
    sourceSize,
    scale,
    length: (metres) => metres * scale,
    point: <T extends { x: number; z: number }>(p: T): T => ({ ...p, x: p.x * scale, z: p.z * scale }),
  };
}
