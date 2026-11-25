import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { independencePoint } from './independenceSite';
import { SINGLE_PHASE, type SitePhasePlan } from './sitePhases';

/**
 * The Independence sites, assembled from the shared Independence architecture kit
 * (`scripts/blender/build_independence_architecture_kit.py`): the Ayacucho chapel and patriot camp
 * (`m8_independencia`) and the sierra-central camp of La Breña (`m_brena`).
 *
 * Both are representative abstractions, not surveys. The camp composition leaves the east-west lane
 * open: the Ayacucho march crosses the site, and the mission's walkable corridor must survive the kit's
 * blockers. One placement list and one blocker list per site keep what is drawn and what blocks in sync.
 */
export const INDEPENDENCE_PHASE_PLAN: SitePhasePlan = SINGLE_PHASE;

const ONE: [number, number, number] = [1, 1, 1];
const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({ x: anchor.x + dx, z: anchor.z + dz });

/** The Ayacucho chapel/camp point on the 256 m map; Breña keeps the same camp anchor. */
export const INDEPENDENCE_CITY_ANCHOR = independencePoint({ x: 134.8, z: 71 });
export const BRENA_CITY_ANCHOR = INDEPENDENCE_CITY_ANCHOR;

/** The Ayacucho chapel sits north of the parade ground, its door facing the open lane. */
export const INDEPENDENCE_CHAPEL_ANCHOR = at(INDEPENDENCE_CITY_ANCHOR, 0, -12.2);

/**
 * Solid footprints in model space (Blender bounds, game +Z = Blender -Y): the walls and bases, not the
 * eaves or the roof overhangs. The parade ground has none and stays walkable.
 */
export const INDEPENDENCE_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  chapel: { minX: -7, maxX: 7, minZ: -4, maxZ: 4 },
  hacienda: { minX: -4.5, maxX: 4.5, minZ: -3, maxZ: 3 },
  community_house: { minX: -3, maxX: 3, minZ: -2, maxZ: 2 },
  tent: { minX: -1.6, maxX: 1.6, minZ: -1.3, maxZ: 1.3 },
  camp_wall: { minX: -5, maxX: 5, minZ: -0.37, maxZ: 0.37 },
  well: { minX: -1.1, maxX: 1.1, minZ: -1.1, maxZ: 1.1 },
  earthwork: { minX: -5, maxX: 5, minZ: -0.71, maxZ: 0.71 },
};

/**
 * Ayacucho: the 24 x 16 m parade ground, the chapel closing the north side, the hacienda closing the
 * south, four tents on the flanks, low north/south walls behind the buildings and the well.
 * The east-west lane (z -5.2..+5.2) is free: the Junín-Ayacucho march and the walkable corridor cross it.
 */
export const INDEPENDENCE_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'parade_ground', ...INDEPENDENCE_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 0.02 },
  { asset: 'chapel', ...INDEPENDENCE_CHAPEL_ANCHOR, rotY: 0, scale: ONE },
  // The hacienda faces the parade ground from the south.
  { asset: 'hacienda', ...at(INDEPENDENCE_CITY_ANCHOR, 0, 11.5), rotY: Math.PI, scale: ONE },
  // Tents on the flanks, outside the chapel/hacienda doors and the central lane.
  { asset: 'tent', ...at(INDEPENDENCE_CITY_ANCHOR, -9, -6.5), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'tent', ...at(INDEPENDENCE_CITY_ANCHOR, 9, -6.5), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'tent', ...at(INDEPENDENCE_CITY_ANCHOR, -9, 6.5), rotY: Math.PI / 2, scale: ONE },
  { asset: 'tent', ...at(INDEPENDENCE_CITY_ANCHOR, 9, 6.5), rotY: Math.PI / 2, scale: ONE },
  // Low boundary walls behind the chapel and the hacienda; the east and west ends stay open.
  { asset: 'camp_wall', ...at(INDEPENDENCE_CITY_ANCHOR, -7, -18.6), rotY: 0, scale: ONE },
  { asset: 'camp_wall', ...at(INDEPENDENCE_CITY_ANCHOR, 7, -18.6), rotY: 0, scale: ONE },
  { asset: 'camp_wall', ...at(INDEPENDENCE_CITY_ANCHOR, -7, 17.2), rotY: 0, scale: ONE },
  { asset: 'camp_wall', ...at(INDEPENDENCE_CITY_ANCHOR, 7, 17.2), rotY: 0, scale: ONE },
  { asset: 'well', ...at(INDEPENDENCE_CITY_ANCHOR, 10, 12.5), rotY: 0, scale: ONE },
];

/**
 * Breña: a tighter sierra camp without the chapel: two community houses north, the hacienda/camp store
 * south, three tents, a stone corral in the south-west, the earth bank on the north edge and the well.
 * The central lane stays open for the mission's columns.
 */
export const BRENA_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'parade_ground', ...BRENA_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 0.02 },
  { asset: 'community_house', ...at(BRENA_CITY_ANCHOR, -8, -8), rotY: 0, scale: [1.1, 1, 1.1] },
  { asset: 'community_house', ...at(BRENA_CITY_ANCHOR, 8, -8), rotY: 0, scale: [1, 1, 1] },
  { asset: 'hacienda', ...at(BRENA_CITY_ANCHOR, 0, 10), rotY: Math.PI, scale: [0.9, 1, 0.9] },
  { asset: 'tent', ...at(BRENA_CITY_ANCHOR, -9, 4), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'tent', ...at(BRENA_CITY_ANCHOR, 9, 4), rotY: Math.PI / 2, scale: ONE },
  { asset: 'tent', ...at(BRENA_CITY_ANCHOR, 0, -5), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'camp_wall', ...at(BRENA_CITY_ANCHOR, -10, 13), rotY: Math.PI / 2, scale: ONE },
  { asset: 'camp_wall', ...at(BRENA_CITY_ANCHOR, -6.5, 16.5), rotY: 0, scale: ONE },
  { asset: 'earthwork', ...at(BRENA_CITY_ANCHOR, 0, -13), rotY: 0, scale: ONE },
  { asset: 'well', ...at(BRENA_CITY_ANCHOR, 10, 10), rotY: 0, scale: ONE },
];

/** Every solid piece blocks; the parade ground stays walkable. */
export function independenceCityBlockers() {
  return layoutBlockers(INDEPENDENCE_CITY_LAYOUT, INDEPENDENCE_KIT_FOOTPRINTS);
}

export function brenaCityBlockers() {
  return layoutBlockers(BRENA_CITY_LAYOUT, INDEPENDENCE_KIT_FOOTPRINTS);
}

/** The composition each Independence site draws; both share the kit and its materials. */
export const INDEPENDENCE_LAYOUTS = {
  independence_site: INDEPENDENCE_CITY_LAYOUT,
  brena_site: BRENA_CITY_LAYOUT,
} as const;
