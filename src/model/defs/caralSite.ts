import type { HeritageBuildingId } from './heritage';

/** Uniform source-to-game scale for the Ciudades Sagradas Caral remaster. */
export const CARAL_SITE_SCALE = 0.25;

/** Source origin in game coordinates; the Great Pyramid ends at (100, 30). */
export const CARAL_SITE_ORIGIN = { x: 100, z: 69.2 } as const;

/** Objective anchor at the Great Pyramid. */
export const CARAL_SITE_ANCHOR = { x: 100, z: 30 } as const;

/** Initial framing relative to the player base; wide enough to read the valley and the city. */
export const CARAL_SITE_CAMERA = { dx: 0, dz: 0, height: 54 } as const;

export interface CaralHeritageProxy {
  id: HeritageBuildingId;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

/** Invisible raycast volumes for the authored site's named heritage nodes. */
export const CARAL_HERITAGE_PROXIES: readonly CaralHeritageProxy[] = [
  { id: 'caral_pyramid_mayor', x: 100, z: 30, w: 43.4, d: 39.8, h: 8.5 },
  { id: 'caral_pyramid_central', x: 67.5, z: 57.5, w: 18, d: 23, h: 8 },
  { id: 'caral_pyramid_quarry', x: 75, z: 80, w: 17, d: 11, h: 6 },
  { id: 'caral_pyramid_lesser', x: 135, z: 20, w: 13, d: 11, h: 6 },
  { id: 'caral_pyramid_gallery', x: 132.5, z: 45, w: 18, d: 17, h: 12 },
  { id: 'caral_pyramid_huanca', x: 132.5, z: 67.5, w: 14, d: 13, h: 8 },
  { id: 'caral_anfiteatro', x: 100, z: 151.65, w: 37.6, d: 22.5, h: 11 },
];

/**
 * Solid monumental volumes that pathfinding must route around. Their
 * footprints are the same AABBs used by the heritage click proxies; plazas and
 * the open processional ground stay walkable.
 */
export const CARAL_SITE_BLOCKERS = CARAL_HERITAGE_PROXIES.map(({ x, z, w, d }) => ({ x, z, w, d }));

/**
 * Normalized construction exclusion over the Upper Half, residential fabric,
 * the gap between both halves, and the Lower Half. The Caral Bajo base at
 * (0.315, 0.84) stays outside it.
 */
export const CARAL_SITE_BUILD_KEEPOUT = [
  { x: 0.5216, z: 0.2583, rx: 0.2174, rz: 0.1885 },
  { x: 0.5078, z: 0.501, rx: 0.2474, rz: 0.1833 },
  { x: 0.5328, z: 0.7102, rx: 0.138, rz: 0.0268 },
  { x: 0.5328, z: 0.7992, rx: 0.138, rz: 0.0612 },
] as const;
