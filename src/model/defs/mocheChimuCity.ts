import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { chimuPoint } from './chimuSite';
import { mochePoint } from './mocheSite';
import { SINGLE_PHASE, type SitePhasePlan } from './sitePhases';

/**
 * The north-coast adobe sites, assembled from the shared Moche architecture kit
 * (`scripts/blender/build_moche_architecture_kit.py`): the Huacas del Sol y de la Luna (`m3_moche_recuay`)
 * and the Chimú compound of Chan Chan (`m6_chimu_inca`).
 *
 * Both are representative massings, not surveys, and both belong to the same north-coast adobe tradition:
 * battered tiered platforms, painted frieze bands (Moche) and niched compound walls (Chimú). One placement
 * list and one blocker list per site keep what is drawn and what blocks in sync.
 */
export const MOCHE_PHASE_PLAN: SitePhasePlan = SINGLE_PHASE;

const ONE: [number, number, number] = [1, 1, 1];
const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({ x: anchor.x + dx, z: anchor.z + dz });

/** The Moche plaza between the two huacas, on the 256 m transect. */
export const MOCHE_CITY_ANCHOR = mochePoint({ x: 121, z: 76 });
/** The two huacas, north of the plaza; the site proxies read the same points. */
export const MOCHE_HUACA_SOL_ANCHOR = at(MOCHE_CITY_ANCHOR, -15.3, -4);
export const MOCHE_HUACA_LUNA_ANCHOR = at(MOCHE_CITY_ANCHOR, 15.3, -6.6);
/** The Chimú compound centre, on the 256 m transect. */
export const CHIMU_CITY_ANCHOR = chimuPoint({ x: 142.8, z: 65 });
/** The walkable plaza point south of the platform; the site anchor and camera frame read from it. */
export const CHIMU_SITE_ANCHOR = at(CHIMU_CITY_ANCHOR, 0, 4.5);

/**
 * Solid footprints in model space (Blender bounds, game +Z = Blender -Y), including the access ramps: a
 * ramp is solid ground, so units must walk around it rather than through it. The plaza floor has none and
 * stays walkable.
 */
export const MOCHE_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  huaca: { minX: -12, maxX: 12, minZ: -8, maxZ: 13 },
  platform: { minX: -7, maxX: 7, minZ: -5, maxZ: 9.4 },
  hall: { minX: -4.15, maxX: 4.15, minZ: -3.15, maxZ: 3.15 },
  audiencia: { minX: -4.5, maxX: 4.5, minZ: -3.5, maxZ: 3.5 },
  wall: { minX: -5.06, maxX: 5.06, minZ: -0.7, maxZ: 0.7 },
  niche_wall: { minX: -5.07, maxX: 5.07, minZ: -0.76, maxZ: 0.76 },
  altar: { minX: -2.1, maxX: 2.1, minZ: -1.64, maxZ: 1.64 },
  frieze: { minX: -5.1, maxX: 5.1, minZ: -0.35, maxZ: 0.35 },
};

/**
 * Moche: the two huacas closing the north side, the 30 x 20 m plaza between them, the painted frieze panels
 * and the altar on its southern edge, two patio halls behind and low walls framing the east and north.
 * The south-west approach (the player's base) and the central gap stay open.
 */
export const MOCHE_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...MOCHE_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 0.02 },
  { asset: 'huaca', ...MOCHE_HUACA_SOL_ANCHOR, rotY: 0, scale: ONE },
  { asset: 'platform', ...MOCHE_HUACA_LUNA_ANCHOR, rotY: 0, scale: ONE },
  { asset: 'altar', ...MOCHE_HUACA_LUNA_ANCHOR, rotY: 0, scale: ONE, lift: 4.32 },
  { asset: 'hall', ...at(MOCHE_CITY_ANCHOR, -6, -20.8), rotY: 0, scale: ONE },
  { asset: 'hall', ...at(MOCHE_CITY_ANCHOR, 14, -20.8), rotY: 0, scale: ONE },
  { asset: 'wall', ...at(MOCHE_CITY_ANCHOR, -20, -24.5), rotY: 0, scale: ONE },
  { asset: 'wall', ...at(MOCHE_CITY_ANCHOR, 25.4, -24.5), rotY: 0, scale: ONE },
  { asset: 'wall', ...at(MOCHE_CITY_ANCHOR, 25.7, -2), rotY: Math.PI / 2, scale: ONE },
  { asset: 'frieze', ...at(MOCHE_CITY_ANCHOR, -12, 12), rotY: Math.PI, scale: ONE },
  { asset: 'frieze', ...at(MOCHE_CITY_ANCHOR, 12, 12), rotY: Math.PI, scale: ONE },
  { asset: 'altar', ...at(MOCHE_CITY_ANCHOR, 3.7, -6), rotY: 0, scale: ONE },
];

/**
 * Chimú: the compound plaza, the terraced platform with the audiencia on its summit, four niched walls on
 * the flanks and north, and the southern niched walls with the 6 m gate the approach passes through.
 */
export const CHIMU_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...CHIMU_CITY_ANCHOR, rotY: 0, scale: [0.8, 1, 0.85], lift: 0.02 },
  { asset: 'platform', ...at(CHIMU_CITY_ANCHOR, 0, -1), rotY: 0, scale: ONE },
  { asset: 'audiencia', ...at(CHIMU_CITY_ANCHOR, 0, -1), rotY: 0, scale: ONE, lift: 4.32 },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, -10.5, 0), rotY: Math.PI / 2, scale: ONE },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, 10.5, 0), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, -7, -10.2), rotY: 0, scale: ONE },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, 7, -10.2), rotY: 0, scale: ONE },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, -8, 11.5), rotY: Math.PI, scale: ONE },
  { asset: 'niche_wall', ...at(CHIMU_CITY_ANCHOR, 8, 11.5), rotY: Math.PI, scale: ONE },
];

/** Every solid piece blocks; the plaza floor and the audiencia's own hall stay as drawn. */
export function mocheCityBlockers() {
  return layoutBlockers(MOCHE_CITY_LAYOUT, MOCHE_KIT_FOOTPRINTS);
}

export function chimuCityBlockers() {
  return layoutBlockers(CHIMU_CITY_LAYOUT, MOCHE_KIT_FOOTPRINTS);
}

/** The composition each north-coast site draws; both share the kit and its materials. */
export const MOCHE_LAYOUTS = {
  moche_site: MOCHE_CITY_LAYOUT,
  chimu_site: CHIMU_CITY_LAYOUT,
} as const;
