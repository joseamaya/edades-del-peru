import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { cuscoIncaPoint } from './cuscoIncaSite';
import type { SitePhasePlan } from './sitePhases';

/** Cusco stands whole in both missions (1532, 1536): one phase. */
export const CUSCO_PHASE_PLAN: SitePhasePlan = { phases: ['standing'], initial: 'standing' };

/** The Haukaypata and Sacsayhuamán anchors, in the 256 m map; `cuscoSite.ts` re-exports them. */
export const CUSCO_CITY_PLAZA = cuscoIncaPoint({ x: 124.8, z: 130.6 });
export const CUSCO_CITY_SACSAY = cuscoIncaPoint({ x: 118.5, z: 105.75 });
const PLAZA = CUSCO_CITY_PLAZA;
const SACSAY = CUSCO_CITY_SACSAY;

const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({ x: anchor.x + dx, z: anchor.z + dz });
const ONE: [number, number, number] = [1, 1, 1];

/**
 * The Inca capital around its plaza, assembled from the Cusco architecture kit
 * (`scripts/blender/build_cusco_architecture_kit.py`). A representative composition, not a survey: the ushnu on
 * the Haukaypata, a great hall (kallanka) and houses opening on the plaza, enclosure walls behind them, and the
 * three zig-zag terraces of Sacsayhuamán on the hill to the north, facing the city. The front of every piece
 * (doorways, stair, terrace faces) is its +Z.
 */
export const CUSCO_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'plaza', ...PLAZA, rotY: 0, scale: ONE, lift: 0.02 },
  // The ushnu stands on the plaza, not over it: at 3/4 it leaves ~4 m lanes to the buildings around.
  { asset: 'ushnu', ...PLAZA, rotY: 0, scale: [0.75, 0.85, 0.75] },
  // North of the plaza, the great hall opens south on it.
  { asset: 'kallanka', ...at(PLAZA, 0, -12.5), rotY: 0, scale: [0.78, 1, 0.86] },
  // West and east houses turn their doorways to the plaza; the south pair looks north.
  { asset: 'wasi', ...at(PLAZA, -15, -4), rotY: Math.PI / 2, scale: [1.1, 1, 1.3] },
  { asset: 'wasi', ...at(PLAZA, 15, -3), rotY: -Math.PI / 2, scale: [1, 1, 1.3] },
  { asset: 'wasi', ...at(PLAZA, -10, 12), rotY: Math.PI, scale: ONE },
  { asset: 'wasi', ...at(PLAZA, 10, 12), rotY: Math.PI, scale: ONE },
  // Kancha walls behind the buildings, each side opened by a central gateway.
  { asset: 'kancha_wall', ...at(PLAZA, -11, -16.5), rotY: 0, scale: ONE },
  { asset: 'kancha_wall', ...at(PLAZA, 11, -16.5), rotY: 0, scale: ONE },
  { asset: 'kancha_wall', ...at(PLAZA, -11, 16.5), rotY: 0, scale: ONE },
  { asset: 'kancha_wall', ...at(PLAZA, 11, 16.5), rotY: 0, scale: ONE },
  // Sacsayhuamán: three 14 m sections of the stacked terraces, Muyuq Marka on the central one.
  { asset: 'sacsay_square', ...at(SACSAY, -14, 0), rotY: 0, scale: ONE },
  { asset: 'sacsay_round', ...SACSAY, rotY: 0, scale: ONE },
  { asset: 'sacsay_square', ...at(SACSAY, 14, 0), rotY: 0, scale: ONE },
];

/**
 * Solid footprints of the kit pieces in model space (the Blender bounds, game +Z = Blender -Y): the walls, not
 * the eaves. The plaza floor has none and stays walkable.
 */
export const CUSCO_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  ushnu: { minX: -10, maxX: 10, minZ: -7.5, maxZ: 7.5 },
  kallanka: { minX: -10, maxX: 10, minZ: -3.5, maxZ: 3.5 },
  wasi: { minX: -4.5, maxX: 4.5, minZ: -2.5, maxZ: 2.5 },
  kancha_wall: { minX: -6, maxX: 6, minZ: -0.6, maxZ: 0.6 },
  // The terraces run from the back of the fill (Blender y +5) to the first salient (y -10.5).
  sacsay_round: { minX: -7, maxX: 7, minZ: -5, maxZ: 10.5 },
  sacsay_square: { minX: -7, maxX: 7, minZ: -5, maxZ: 10.5 },
};

/** Every building of the composition blocks movement; the gateways between the walls stay open. */
export const CUSCO_CITY_BLOCKERS = layoutBlockers(CUSCO_CITY_LAYOUT, CUSCO_KIT_FOOTPRINTS);

/**
 * The roofs the 1536 fire lights (`MissionDef.fires`): the west and east houses and the great hall, at the
 * ridge lines the kit builds (a `wasi` ridge sits at ~4.75 m, the `kallanka`'s at ~5.85 m). Kept next to the
 * placements so moving a house moves its fire.
 */
export const CUSCO_CITY_FIRES = [
  { pos: { dx: PLAZA.x - 15, dz: PLAZA.z - 4 }, count: 2, height: 4.6 },
  { pos: { dx: PLAZA.x + 15, dz: PLAZA.z - 3 }, count: 2, height: 4.6 },
  { pos: { dx: PLAZA.x, dz: PLAZA.z - 12.5 }, count: 3, height: 5.6 },
] as const;
