import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { chancaPoint } from './chancaSite';
import { wariPoint } from './wariSite';
import { SINGLE_PHASE, type SitePhasePlan } from './sitePhases';

/**
 * The highland sites, assembled from the shared Wari architecture kit
 * (`scripts/blender/build_wari_architecture_kit.py`): the Wari complex (`m4_wari`) and the Chanca pucará of
 * Yahuar Pampa (`m5_yahuar_pampa`).
 *
 * Both are representative massings, not surveys. The Wari complex is a D-shaped temple, a walled plaza and
 * the long galleries; the pucará is a terraced enclosure of thick stone walls, round towers and a gate. One
 * placement list and one blocker list per site keep what is drawn and what blocks in sync.
 */
export const WARI_PHASE_PLAN: SitePhasePlan = SINGLE_PHASE;

const ONE: [number, number, number] = [1, 1, 1];
const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({ x: anchor.x + dx, z: anchor.z + dz });

/** The ceremonial centre of the Wari complex, on the 256 m transect. */
export const WARI_CITY_ANCHOR = wariPoint({ x: 107.5, z: 92 });
/** The Chanca pucará, on the 256 m transect. */
export const CHANCA_CITY_ANCHOR = chancaPoint({ x: 112.4, z: 60.8 });

/**
 * Solid footprints in model space (Blender bounds, game +Z = Blender -Y). The plaza floor has none and
 * stays walkable; the terrace is a low step the layout treats as solid so units walk around it.
 */
export const WARI_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  d_temple: { minX: -9, maxX: 9, minZ: -9, maxZ: 9 },
  gallery: { minX: -7.15, maxX: 7.15, minZ: -2.65, maxZ: 2.65 },
  room: { minX: -3.6, maxX: 3.6, minZ: -2.7, maxZ: 2.7 },
  pukara_wall: { minX: -5, maxX: 5, minZ: -1.05, maxZ: 1.05 },
  tower: { minX: -1.85, maxX: 1.85, minZ: -1.85, maxZ: 1.85 },
  mural: { minX: -5.1, maxX: 5.1, minZ: -0.35, maxZ: 0.35 },
  // The andén is a low step (1.2 m): it reads as ground and stays walkable, like the plaza floor.
  altar: { minX: -1.6, maxX: 1.6, minZ: -1.2, maxZ: 1.2 },
};

/**
 * Wari: the D-shaped temple closing the north of the ceremonial plaza, the walled plaza with its painted
 * panels and altar, the long galleries on the flanks, two highland houses behind and the andenes. The
 * provincial road enters from the south, so its south edge stays open.
 */
export const WARI_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...at(WARI_CITY_ANCHOR, 0, 9), rotY: 0, scale: ONE, lift: 0.02 },
  { asset: 'd_temple', ...at(WARI_CITY_ANCHOR, 0, -4), rotY: 0, scale: ONE },
  { asset: 'gallery', ...at(WARI_CITY_ANCHOR, -19, 8), rotY: 0, scale: ONE },
  { asset: 'gallery', ...at(WARI_CITY_ANCHOR, 19, 8), rotY: 0, scale: ONE },
  { asset: 'mural', ...at(WARI_CITY_ANCHOR, -8, 20), rotY: Math.PI, scale: ONE },
  { asset: 'mural', ...at(WARI_CITY_ANCHOR, 8, 20), rotY: Math.PI, scale: ONE },
  { asset: 'altar', ...at(WARI_CITY_ANCHOR, 0, 11), rotY: 0, scale: ONE },
  { asset: 'room', ...at(WARI_CITY_ANCHOR, -9, -18), rotY: 0, scale: ONE },
  { asset: 'room', ...at(WARI_CITY_ANCHOR, 9, -18), rotY: 0, scale: ONE },
  { asset: 'terrace', ...at(WARI_CITY_ANCHOR, -19, -10), rotY: Math.PI / 2, scale: ONE },
  { asset: 'terrace', ...at(WARI_CITY_ANCHOR, 19, -10), rotY: -Math.PI / 2, scale: ONE },
];

/**
 * Chanca: the terraced enclosure, the thick walls on three sides and the two southern segments that leave
 * the gate, the round towers at the corners and the altar on the terrace.
 */
export const CHANCA_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: [0.5, 1, 0.6], lift: 0.02 },
  { asset: 'terrace', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: [0.8, 1, 0.8] },
  { asset: 'altar', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 1.2 },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 0, -6.2), rotY: 0, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, -7.6, 0), rotY: Math.PI / 2, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 7.6, 0), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, -5.2, 6.4), rotY: 0, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 5.2, 6.4), rotY: 0, scale: ONE },
  { asset: 'tower', ...at(CHANCA_CITY_ANCHOR, -9.3, -8.7), rotY: 0, scale: ONE },
  { asset: 'tower', ...at(CHANCA_CITY_ANCHOR, 9.3, -8.7), rotY: 0, scale: ONE },
  { asset: 'tower', ...at(CHANCA_CITY_ANCHOR, -10.2, 7.6), rotY: 0, scale: ONE },
  { asset: 'tower', ...at(CHANCA_CITY_ANCHOR, 10.2, 7.6), rotY: 0, scale: ONE },
];

/** Every solid piece blocks; the plaza floor stays walkable and the lifted altar rides the terrace. */
export function wariCityBlockers() {
  return layoutBlockers(WARI_CITY_LAYOUT, WARI_KIT_FOOTPRINTS);
}

export function chancaCityBlockers() {
  return layoutBlockers(CHANCA_CITY_LAYOUT, WARI_KIT_FOOTPRINTS);
}

/** The composition each highland site draws; both share the kit and its materials. */
export const WARI_LAYOUTS = {
  wari_site: WARI_CITY_LAYOUT,
  chanca_site: CHANCA_CITY_LAYOUT,
} as const;
