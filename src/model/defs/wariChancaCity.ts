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
 * Solid footprints in model space (Blender bounds, game +Z = Blender -Y). The plaza floor has none and the
 * andén is a low step (1.2 m), so both stay walkable; the walls, towers and buildings block.
 */
export const WARI_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  d_temple: { minX: -9, maxX: 9, minZ: -9, maxZ: 9.5 },
  gallery: { minX: -7.15, maxX: 7.15, minZ: -2.65, maxZ: 2.65 },
  room: { minX: -3.6, maxX: 3.75, minZ: -2.7, maxZ: 2.7 },
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
  { asset: 'plaza', ...at(WARI_CITY_ANCHOR, 0, 7), rotY: 0, scale: ONE, lift: 0.02 },
  { asset: 'd_temple', ...at(WARI_CITY_ANCHOR, 0, -10), rotY: 0, scale: ONE },
  // The galleries flank the plaza on the flat core of the pad (the western edge falls away at x < 127).
  { asset: 'gallery', ...at(WARI_CITY_ANCHOR, -12.8, 7), rotY: 0, scale: [0.7, 1, 1] },
  { asset: 'gallery', ...at(WARI_CITY_ANCHOR, 12.8, 7), rotY: 0, scale: [0.7, 1, 1] },
  { asset: 'mural', ...at(WARI_CITY_ANCHOR, -8, 18), rotY: Math.PI, scale: ONE },
  { asset: 'mural', ...at(WARI_CITY_ANCHOR, 8, 18), rotY: Math.PI, scale: ONE },
  { asset: 'altar', ...at(WARI_CITY_ANCHOR, 2.7, 14), rotY: 0, scale: ONE },
  { asset: 'room', ...at(WARI_CITY_ANCHOR, -9.3, -26), rotY: 0, scale: ONE },
  { asset: 'room', ...at(WARI_CITY_ANCHOR, 9.3, -26), rotY: 0, scale: ONE },
];

/**
 * Chanca: the terraced enclosure, the thick walls on three sides and the two southern segments that leave
 * the gate, the round towers at the corners and the altar on the terrace.
 */
export const CHANCA_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: [0.5, 1, 0.6], lift: 0.02 },
  { asset: 'terrace', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: [0.8, 1, 0.8] },
  { asset: 'altar', ...CHANCA_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 1.12 },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 0, -6.2), rotY: 0, scale: [1.4, 1, 1] },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, -7.6, 0), rotY: Math.PI / 2, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 7.6, 0), rotY: -Math.PI / 2, scale: ONE },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, -5.2, 6.4), rotY: 0, scale: [0.6, 1, 1] },
  { asset: 'pukara_wall', ...at(CHANCA_CITY_ANCHOR, 5.2, 6.4), rotY: 0, scale: [0.6, 1, 1] },
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

/**
 * Vilcabamba (Espíritu Pampa): a low cloud-forest refuge built from the highland kit's domestic pieces —
 * longhouses, a small plaza, a perimeter wall and the Huayna Pucará tower. It is a late-Inca settlement, not
 * an imperial complex, so the D-shaped temple, the galleries and the niches stay out of it.
 *
 * The perimeter wall is closed on three sides and keeps a **wide south gate** (about 10 m): the refuge must never be a sealed box (the
 * no-walkable-building rule needs a way in for the mission's columns).
 */
export const VILCABAMBA_REFUGE_ANCHOR = { x: 180, z: 97 } as const;

export const VILCABAMBA_REFUGE_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...at(VILCABAMBA_REFUGE_ANCHOR, 0, 2), rotY: 0, scale: [0.42, 1, 0.34], lift: 0.02 },
  { asset: 'room', ...at(VILCABAMBA_REFUGE_ANCHOR, -4.6, -6), rotY: 0, scale: [0.7, 1, 0.7] },
  { asset: 'room', ...at(VILCABAMBA_REFUGE_ANCHOR, 2.8, -6), rotY: 0, scale: [0.7, 1, 0.7] },
  { asset: 'room', ...at(VILCABAMBA_REFUGE_ANCHOR, -5, 3), rotY: Math.PI / 2, scale: [0.8, 1, 0.8] },
  { asset: 'pukara_wall', ...at(VILCABAMBA_REFUGE_ANCHOR, 0, -11), rotY: 0, scale: [1.86, 1, 1] },
  { asset: 'pukara_wall', ...at(VILCABAMBA_REFUGE_ANCHOR, -10.5, -2), rotY: Math.PI / 2, scale: [2, 1, 1] },
  { asset: 'pukara_wall', ...at(VILCABAMBA_REFUGE_ANCHOR, 10.5, -2), rotY: -Math.PI / 2, scale: [2, 1, 1] },
  { asset: 'pukara_wall', ...at(VILCABAMBA_REFUGE_ANCHOR, -8.2, 9), rotY: 0, scale: [0.62, 1, 1] },
  { asset: 'pukara_wall', ...at(VILCABAMBA_REFUGE_ANCHOR, 8.2, 9), rotY: 0, scale: [0.62, 1, 1] },
  { asset: 'tower', ...at(VILCABAMBA_REFUGE_ANCHOR, 5.5, 4.5), rotY: 0, scale: [0.8, 1, 0.8] },
];

export function vilcabambaRefugeBlockers() {
  return layoutBlockers(VILCABAMBA_REFUGE_LAYOUT, WARI_KIT_FOOTPRINTS);
}

/** The composition each highland site draws; all three share the kit and its materials. */
export const WARI_LAYOUTS = {
  wari_site: WARI_CITY_LAYOUT,
  chanca_site: CHANCA_CITY_LAYOUT,
  vilcabamba_site: VILCABAMBA_REFUGE_LAYOUT,
} as const;
