import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { aricaPoint } from './aricaSite';
import { SINGLE_PHASE, type SitePhasePlan } from './sitePhases';

/**
 * The Republican sites, assembled from the shared Republican architecture kit
 * (`scripts/blender/build_republic_architecture_kit.py`): Arica's port terrace and battery, the Real
 * Felipe bastioned trace, and the Tarapacá village with its heights and the Pachica hamlet. Each
 * composition is a representative abstraction, not a survey; the mission docs record what is documented
 * and what is assumed.
 *
 * One placement list and one blocker list per site: what is drawn and what blocks comes from the same
 * data (`layoutBlockers`), headless included.
 */
export const REPUBLIC_PHASE_PLAN: SitePhasePlan = SINGLE_PHASE;

/** The Arica terrace, Real Felipe and Tarapacá are static in their missions: one phase. */
const ONE: [number, number, number] = [1, 1, 1];
const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({ x: anchor.x + dx, z: anchor.z + dz });

/** The Arica site point on the 256 m map; Real Felipe reuses the coastal fort anchor. */
export const ARICA_CITY_ANCHOR = aricaPoint({ x: 134.8, z: 73 });
export const REAL_FELIPE_CITY_ANCHOR = ARICA_CITY_ANCHOR;
/** The battery faces the Pacific from the seaward half of the terrace; the warehouse sits landward. */
export const ARICA_BATTERY_ANCHOR = at(ARICA_CITY_ANCHOR, -7, 0);
export const ARICA_WAREHOUSE_ANCHOR = at(ARICA_CITY_ANCHOR, 8, 7);
export const TARAPACA_CITY_ANCHOR = { x: 96, z: 168 } as const;
export const TARAPACA_HEIGHTS_ANCHOR = { x: 160, z: 120 } as const;
export const TARAPACA_PACHICA_ANCHOR = { x: 198, z: 150 } as const;

/**
 * Solid footprints in model space (Blender bounds, game +Z = Blender -Y): the walls and bases, not the
 * eaves or the roof overhangs. Floors and the pier have none and stay walkable.
 */
export const REPUBLIC_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  battery: { minX: -6.5, maxX: 6.5, minZ: -3.7, maxZ: 3.7 },
  warehouse: { minX: -5, maxX: 5, minZ: -3, maxZ: 3 },
  curtain: { minX: -6, maxX: 6, minZ: -1.05, maxZ: 1.05 },
  bastion: { minX: -5, maxX: 5, minZ: -3.5, maxZ: 5 },
  magazine: { minX: -4, maxX: 4, minZ: -3, maxZ: 3 },
  well: { minX: -1.1, maxX: 1.1, minZ: -1.1, maxZ: 1.1 },
  chapel: { minX: -3.5, maxX: 3.5, minZ: -5, maxZ: 5.6 },
  adobe_house: { minX: -4, maxX: 4, minZ: -3, maxZ: 3 },
  corral_wall: { minX: -5, maxX: 5, minZ: -0.36, maxZ: 0.36 },
  parapet: { minX: -10, maxX: 10, minZ: -0.45, maxZ: 0.45 },
  outcrop: { minX: -1.7, maxX: 1.7, minZ: -1.5, maxZ: 1.5 },
};

/**
 * Arica: the paved port terrace, the battery facing the sea, the warehouse behind it and the pier
 * running out from the apron. The apron and pier stay walkable; the battery and warehouse block.
 */
export const ARICA_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'apron', ...ARICA_CITY_ANCHOR, rotY: 0, scale: ONE, lift: 0.02 },
  // The battery's front (+Z) turns west, toward the Pacific.
  { asset: 'battery', ...ARICA_BATTERY_ANCHOR, rotY: -Math.PI / 2, scale: ONE, lift: 0.12 },
  { asset: 'warehouse', ...ARICA_WAREHOUSE_ANCHOR, rotY: 0, scale: ONE },
  // The pier runs west from the apron; it has no footprint and is a landing, not a building.
  { asset: 'pier', ...at(ARICA_CITY_ANCHOR, -16, -2), rotY: Math.PI / 2, scale: [0.78, 1, 0.78], lift: 0.1 },
];

/**
 * Real Felipe: four curtains and four corner bastions around a paved courtyard, with a 4 m sally gate
 * on the south and west sides (the sortie leaves through them). The magazine sits in the north-west
 * quadrant and the well in the south-east one, clear of the gates.
 */
export const REAL_FELIPE_CITY_LAYOUT: readonly ArchPlacement[] = (() => {
  const a = REAL_FELIPE_CITY_ANCHOR;
  const SIDE = 12;
  // A 10 m curtain leaves room for the 4 m gate between the two segments of a side.
  const segment = 10 / 12;
  const wall = (dx: number, dz: number, rotY: number, scale: [number, number, number] = ONE): ArchPlacement => ({
    asset: 'curtain',
    ...at(a, dx, dz),
    rotY,
    scale,
  });
  return [
    { asset: 'fort_plaza', ...a, rotY: 0, scale: ONE, lift: 0.02 },
    // North and east curtains are closed; south and west split around their sally gates.
    wall(-6, -SIDE, 0),
    wall(6, -SIDE, 0),
    wall(SIDE, -6, Math.PI / 2),
    wall(SIDE, 6, Math.PI / 2),
    wall(-7, SIDE, 0, [segment, 1, 1]),
    wall(7, SIDE, 0, [segment, 1, 1]),
    wall(-SIDE, -7, Math.PI / 2, [segment, 1, 1]),
    wall(-SIDE, 7, Math.PI / 2, [segment, 1, 1]),
    // The four bastions turn their salient diagonally outward.
    { asset: 'bastion', ...at(a, -SIDE, -SIDE), rotY: (-3 * Math.PI) / 4, scale: ONE },
    { asset: 'bastion', ...at(a, SIDE, -SIDE), rotY: (3 * Math.PI) / 4, scale: ONE },
    { asset: 'bastion', ...at(a, -SIDE, SIDE), rotY: -Math.PI / 4, scale: ONE },
    { asset: 'bastion', ...at(a, SIDE, SIDE), rotY: Math.PI / 4, scale: ONE },
    { asset: 'magazine', ...at(a, -6, -6), rotY: 0, scale: ONE },
    { asset: 'well', ...at(a, 7, 7), rotY: 0, scale: ONE },
  ];
})();

/** The quebrada houses ring the plaza with ≥2 m gaps; the east street stays clear for the Chilean column. */
const TARAPACA_HOUSES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  // dx, dz, width, depth, yaw
  [-8, -12, 8, 6, 0],
  [2, -13, 7, 5, 0.08],
  [14, -11, 9, 6, -0.05],
  [-11, 10, 7, 5, 0.05],
  [0, 10, 8, 5, 0],
  [11, 11, 9, 6, 0.1],
  [24, -8, 6, 5, 1.5],
  [-27, 4, 6, 4, 1.55],
];

const TARAPACA_PACHICA_HOUSES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-6, -5, 5, 4, 0.05],
  [2, -6, 6, 4.5, -0.08],
  [4, 2, 5, 4, 0.4],
  [-8, 7, 4.5, 3.5, -0.3],
];

export const TARAPACA_CITY_LAYOUT: readonly ArchPlacement[] = [
  // The packed plaza and main street: walkable, with the chapel closing the west end.
  { asset: 'apron', ...TARAPACA_CITY_ANCHOR, rotY: 0, scale: [0.6, 1, 0.5], lift: 0.02 },
  { asset: 'chapel', ...at(TARAPACA_CITY_ANCHOR, -18, -5), rotY: 0, scale: ONE },
  ...TARAPACA_HOUSES.map(([dx, dz, w, d, rotY]): ArchPlacement => ({
    asset: 'adobe_house',
    ...at(TARAPACA_CITY_ANCHOR, dx, dz),
    rotY,
    scale: [w / 8, 1, d / 6],
  })),
  // The crest: a trench parapet and the rock outcrops that make it a defensible height.
  { asset: 'parapet', ...at(TARAPACA_HEIGHTS_ANCHOR, 0, 3), rotY: 0, scale: ONE },
  { asset: 'outcrop', ...at(TARAPACA_HEIGHTS_ANCHOR, 4, -3), rotY: 0.4, scale: ONE },
  { asset: 'outcrop', ...at(TARAPACA_HEIGHTS_ANCHOR, -6, -5), rotY: -0.3, scale: ONE },
  { asset: 'outcrop', ...at(TARAPACA_HEIGHTS_ANCHOR, 8, 1), rotY: 0.7, scale: ONE },
  // Pachica: the hamlet the reinforcements marched from, with its stone corral open to the street.
  ...TARAPACA_PACHICA_HOUSES.map(([dx, dz, w, d, rotY]): ArchPlacement => ({
    asset: 'adobe_house',
    ...at(TARAPACA_PACHICA_ANCHOR, dx, dz),
    rotY,
    scale: [w / 8, 1, d / 6],
  })),
  { asset: 'corral_wall', ...at(TARAPACA_PACHICA_ANCHOR, 2, 8), rotY: 0, scale: ONE },
  { asset: 'corral_wall', ...at(TARAPACA_PACHICA_ANCHOR, -3.5, 5), rotY: Math.PI / 2, scale: [0.6, 1, 1] },
  { asset: 'corral_wall', ...at(TARAPACA_PACHICA_ANCHOR, 9, 5), rotY: Math.PI / 2, scale: [0.6, 1, 1] },
];

/** Every solid piece blocks; the apron, the pier and the plaza floor stay walkable. */
export function aricaCityBlockers() {
  return layoutBlockers(ARICA_CITY_LAYOUT, REPUBLIC_KIT_FOOTPRINTS);
}

export function realFelipeCityBlockers() {
  return layoutBlockers(REAL_FELIPE_CITY_LAYOUT, REPUBLIC_KIT_FOOTPRINTS);
}

export function tarapacaCityBlockers() {
  return layoutBlockers(TARAPACA_CITY_LAYOUT, REPUBLIC_KIT_FOOTPRINTS);
}

/** The composition each Republican site draws; all three share the kit and its materials. */
export const REPUBLIC_LAYOUTS = {
  arica_site: ARICA_CITY_LAYOUT,
  real_felipe_site: REAL_FELIPE_CITY_LAYOUT,
  tarapaca_site: TARAPACA_CITY_LAYOUT,
} as const;
