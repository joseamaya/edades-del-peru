import type { HeritageBuildingId } from './heritage';

/** Uniform source-to-game scale for the Ciudades Sagradas Caral remaster. */
export const CARAL_SITE_SCALE = 0.25;

/** Source origin in game coordinates; the Great Pyramid ends at (100, 30). */
export const CARAL_SITE_ORIGIN = { x: 100, z: 69.2 } as const;

/** Objective anchor at the Great Pyramid. */
export const CARAL_SITE_ANCHOR = { x: 100, z: 30 } as const;

/** Initial framing relative to the player base. */
export const CARAL_SITE_CAMERA = { dx: 10, dz: -4, height: 44 } as const;

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
  { id: 'caral_pyramid_mayor', x: 100, z: 30, w: 44, d: 38, h: 8.5 },
  { id: 'caral_pyramid_central', x: 67.5, z: 57.5, w: 18, d: 23, h: 8 },
  { id: 'caral_pyramid_quarry', x: 75, z: 80, w: 17, d: 11, h: 6 },
  { id: 'caral_pyramid_lesser', x: 135, z: 20, w: 13, d: 11, h: 6 },
  { id: 'caral_pyramid_gallery', x: 132.5, z: 45, w: 18, d: 17, h: 12 },
  { id: 'caral_pyramid_huanca', x: 132.5, z: 67.5, w: 14, d: 13, h: 8 },
  { id: 'caral_anfiteatro', x: 100, z: 152.5, w: 38, d: 24, h: 11 },
];

export interface CaralSiteBlocker {
  name: string;
  /** Axis-aligned footprint centre in game metres. */
  x: number;
  z: number;
  /** Full width/depth of the built volume. */
  w: number;
  d: number;
}

/**
 * Solid monumental volumes that pathfinding must route around. They come from
 * the authored mesh AABBs; plazas, stairs and processional paths stay walkable.
 */
export const CARAL_SITE_BLOCKERS: readonly CaralSiteBlocker[] = [
  { name: 'caral_pyramid_mayor', x: 100, z: 30, w: 43.4, d: 39.8 },
  { name: 'caral_pyramid_central', x: 67.5, z: 57.5, w: 18, d: 23 },
  { name: 'caral_pyramid_quarry', x: 75, z: 80, w: 17, d: 11 },
  { name: 'caral_pyramid_lesser', x: 135, z: 20, w: 13, d: 11 },
  { name: 'caral_pyramid_gallery', x: 132.5, z: 45, w: 18, d: 17 },
  { name: 'caral_pyramid_huanca', x: 132.5, z: 67.5, w: 14, d: 13 },
  { name: 'caral_anfiteatro', x: 100, z: 151.65, w: 37.6, d: 22.5 },
  { name: 'caral_altar_circular', x: 72.5, z: 144.55, w: 10.6, d: 7.7 },
];
