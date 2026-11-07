import { CARAL_CIRCULAR_ALTAR, CARAL_HERITAGE_PROXIES, type SiteBlocker } from './sites';

/**
 * The Sacred City of Caral in use (c. 2600–2000 BC), assembled from the Blender architecture kit
 * (scripts/blender/build_caral_architecture_kit.py) on the authored site's terrace. Positions are game
 * units. The pyramids sit on the site's heritage volumes (their pick and pathing footprints); the rest
 * of the layout is an abstraction: the dossier documents the elements (six pyramids, sunken circular
 * plazas, the Amphitheatre, open plazas, upper-half residences larger than lower-half ones, a dwelling
 * periphery), not a surveyed plan for the game map.
 */
export type CaralArchAssetId =
  | 'pyramid_mayor'
  | 'pyramid_mayor_phase1'
  | 'pyramid_mayor_phase2'
  | 'pyramid_mayor_phase3'
  | 'pyramid_small'
  | 'circular_plaza'
  | 'house_common'
  | 'house_elite'
  | 'house_aspero'
  | 'fair_tent';

/** Construction states of the Pyramid Mayor (act III of docs/design/caral-model-mission.md). */
export type CaralMayorPhase = 'foundation' | 'fill' | 'finished' | 'in_use';

export const CARAL_MAYOR_PHASE_ASSET: Record<CaralMayorPhase, CaralArchAssetId> = {
  foundation: 'pyramid_mayor_phase1',
  fill: 'pyramid_mayor_phase2',
  finished: 'pyramid_mayor_phase3',
  in_use: 'pyramid_mayor',
};

export interface CaralArchPlacement {
  asset: CaralArchAssetId;
  x: number;
  z: number;
  /** Yaw in radians; the models face +Z. */
  rotY: number;
  /** Non-uniform scale (x, y, z) of the model. */
  scale: [number, number, number];
  /** Marks the Pyramid Mayor, whose model follows the construction phase. */
  mayor?: boolean;
  /** Raise the model above the ground it sits on (model units, before scaling). */
  lift?: number;
}

/**
 * The plaza model's floor is 1.2 below its origin. The terrain cannot be carved under it, so the floor
 * is seated just above the ground and the rim stands above it (the plaza still reads sunken from its rim).
 */
const PLAZA_FLOOR_DEPTH = 1.25;

/** Kit model footprints (from the export manifests) used to fit a model onto a heritage volume. */
const SMALL_PYRAMID_SIZE = { w: 19.4, d: 19.3, h: 9.6 };
const PLAZA_DIAMETER = 16;

/** Height of the Pyramid Mayor's top terrace in the kit (6 terraces of 2.7), ~8.7 people of 1.86 (art-direction §3). */
export const CARAL_MAYOR_HEIGHT = 16.2;

function heritage(id: string): { x: number; z: number; w: number; d: number; h: number } {
  const p = CARAL_HERITAGE_PROXIES.find((proxy) => proxy.id === id);
  if (!p) throw new Error(`missing heritage proxy ${id}`);
  return p;
}

/**
 * A smaller pyramid fitted to a heritage footprint, front towards `rotY`. Heights are the volumes'
 * heights times 1.6 (the kit compresses footprints more than heights, art-direction §3), kept below
 * 80 % of the Pyramid Mayor so it stays the dominant mass.
 */
function smallPyramid(id: string, rotY: number): CaralArchPlacement {
  const p = heritage(id);
  const quarter = Math.abs(Math.sin(rotY)) > 0.5;
  const w = quarter ? p.d : p.w;
  const d = quarter ? p.w : p.d;
  return {
    asset: 'pyramid_small',
    x: p.x,
    z: p.z,
    rotY,
    scale: [
      w / SMALL_PYRAMID_SIZE.w,
      Math.min(p.h * 1.6, CARAL_MAYOR_HEIGHT * 0.8) / SMALL_PYRAMID_SIZE.h,
      d / SMALL_PYRAMID_SIZE.d,
    ],
  };
}

const mayor = heritage('caral_pyramid_mayor');
const amphitheatre = heritage('caral_anfiteatro');

const HALF_PI = Math.PI / 2;

/** Common quincha houses of the periphery: x, z, yaw (front +Z is the valley side). */
const COMMON_HOUSES: readonly [number, number, number][] = [
  [90, 117, 0.1],
  [99, 124, -0.15],
  [108, 116, 0.05],
  [117, 125, 0.2],
  [126, 114, -0.1],
  [134, 123, 0.15],
  [143, 109, -HALF_PI + 0.1],
  [146, 95, -HALF_PI - 0.1],
  [83, 127, 0.25],
  [128, 134, -0.2],
];

/** Larger residences of the upper half (documented hierarchy; their plan is assumed). */
const ELITE_HOUSES: readonly [number, number, number][] = [
  [118, 93, HALF_PI],
  [84, 100, -HALF_PI],
];

export const CARAL_CITY_LAYOUT: readonly CaralArchPlacement[] = [
  { asset: 'pyramid_mayor', x: mayor.x, z: mayor.z, rotY: 0, scale: [1, 1, 1], mayor: true },
  // Sunken circular plaza in front of the Pyramid Mayor's stair (the stair foot is ~4 beyond the base).
  {
    asset: 'circular_plaza',
    x: mayor.x,
    z: mayor.z + mayor.d / 2 + 12.5,
    rotY: 0,
    scale: [1, 1, 1],
    lift: PLAZA_FLOOR_DEPTH,
  },
  smallPyramid('caral_pyramid_central', HALF_PI),
  smallPyramid('caral_pyramid_quarry', 0),
  smallPyramid('caral_pyramid_lesser', -HALF_PI),
  smallPyramid('caral_pyramid_gallery', -HALF_PI),
  smallPyramid('caral_pyramid_huanca', -HALF_PI),
  // Templo del Anfiteatro: a temple platform behind the largest sunken circular plaza (layout assumed).
  {
    asset: 'pyramid_small',
    x: amphitheatre.x,
    z: amphitheatre.z + 6,
    rotY: Math.PI,
    scale: [amphitheatre.w / SMALL_PYRAMID_SIZE.w, 1.1, 11 / SMALL_PYRAMID_SIZE.d],
  },
  {
    asset: 'circular_plaza',
    x: amphitheatre.x,
    z: amphitheatre.z - 10,
    rotY: 0,
    scale: [21 / PLAZA_DIAMETER, 1, 21 / PLAZA_DIAMETER],
    lift: PLAZA_FLOOR_DEPTH,
  },
  // Pirámide del Altar Redondo (Caral Bajo), on the site's circular-altar footprint.
  {
    asset: 'pyramid_small',
    x: CARAL_CIRCULAR_ALTAR.x,
    z: CARAL_CIRCULAR_ALTAR.z,
    rotY: 0,
    scale: [CARAL_CIRCULAR_ALTAR.w / SMALL_PYRAMID_SIZE.w, 0.55, CARAL_CIRCULAR_ALTAR.d / SMALL_PYRAMID_SIZE.d],
  },
  ...ELITE_HOUSES.map(([x, z, rotY]): CaralArchPlacement => ({ asset: 'house_elite', x, z, rotY, scale: [1, 1, 1] })),
  ...COMMON_HOUSES.map(([x, z, rotY]): CaralArchPlacement => ({ asset: 'house_common', x, z, rotY, scale: [1, 1, 1] })),
];

/** Footprints of the kit houses (walls plus platform), so units walk around them. */
const HOUSE_FOOTPRINT: Partial<Record<CaralArchAssetId, { w: number; d: number }>> = {
  house_common: { w: 5.4, d: 4.4 },
  house_elite: { w: 9.0, d: 7.4 },
};

export const CARAL_CITY_BLOCKERS: readonly SiteBlocker[] = CARAL_CITY_LAYOUT.flatMap((p) => {
  const size = HOUSE_FOOTPRINT[p.asset];
  if (!size) return [];
  const quarter = Math.abs(Math.sin(p.rotY)) > 0.5;
  return [{ x: p.x, z: p.z, w: quarter ? size.d : size.w, d: quarter ? size.w : size.d }];
});
