import { rotateXZ } from '../../util/math';
import { insideTerrainRect, type TerrainRect } from './terrainLayout';

/**
 * Source-backed scene plan for the Sacred City of Caral-Supe (mission 1).
 *
 * The city is not random: it follows the published division into Caral Alto
 * (Upper Half: six large pyramids around the Central Plaza, the Plaza de la
 * Huanca and the elite residential units) and Caral Bajo (Lower Half: the
 * Amphitheatre Temple, the Round Altar, the Bench Temple, the Q residence and
 * the smaller residences), separated by the Supe river valley.
 *
 * Sources: UNESCO WHC 1269 and its advisory-body evaluation; Shady Solís,
 * "The Caral-Supe Civilization" (Zona Arqueológica Caral, 2005); the 2008
 * cultural-values report; `docs/historia/civilizaciones/caral.md`.
 *
 * The six Upper-Half pyramids and the named sectors are documented. Their exact
 * relative coordinates are a **plausible schematic**, not a survey: the plan
 * keeps the documented hierarchy (Great Pyramid largest, Central/Gallery next,
 * Quarry/Lesser/Huanca smaller; Central Plaza as the main open space; Plaza de
 * la Huanca with its monolith between the Gallery, Huanca and Lesser pyramids).
 * Pure and deterministic (no THREE, no RNG), so it is unit-testable headless.
 */

export type SetpieceId = 'caral_sacred_city';

export type CaralPyramidName = 'greater' | 'central' | 'quarry' | 'lesser' | 'gallery' | 'huanca';
export type CaralLowerName = 'amphitheatre' | 'round_altar' | 'bench_temple';

export type CaralPlacementKind =
  'pyramid' | 'temple' | 'sunken_plaza' | 'plaza' | 'compound' | 'monolith' | 'path' | 'ford';

export interface CaralPlacement {
  kind: CaralPlacementKind;
  /** Documented name when the structure has one (`greater`, `huanca`, …). */
  name?: string;
  /** World coordinates in map units. */
  x: number;
  z: number;
  /** Facing of the structure's main stair / entrance (radians). */
  yaw: number;
  /** Footprint width (X) and depth (Z) in world units. */
  width: number;
  depth: number;
  /** Terraced height, in tiers, for pyramids and temples. */
  tiers?: number;
  /** Width of the central staircase. */
  stairWidth?: number;
  /** Radius for a sunken circular plaza. */
  radius?: number;
  /** Elite residence / public building (larger rooms, closer to a pyramid). */
  elite?: boolean;
  /** Rooms around the patio (residential compounds). */
  rooms?: number;
  /** The modular Anfiteatro GLB is anchored at this placement. */
  modularAnchor?: boolean;
  /** The rendered city omits this placement because a modular GLB replaces it. */
  modularReplaced?: boolean;
}

export interface CaralCityPlan {
  id: SetpieceId;
  /** Upper Half (Caral Alto) anchor in world units. */
  upper: { x: number; z: number };
  /** Lower Half (Caral Bajo) anchor in world units; the player's base sits here. */
  lower: { x: number; z: number };
  /** The Great Pyramid anchor; the game renders the modular Pyramid Mayor GLB here. */
  mainPyramid: CaralPlacement;
  placements: CaralPlacement[];
  /** World-space rectangles kept free of resources, props and canals. */
  keepout: TerrainRect[];
}

const REFERENCE_SIZE = 128;

function local(anchor: { x: number; z: number }, yaw: number, lx: number, lz: number): { x: number; z: number } {
  const p = rotateXZ(lx, lz, yaw);
  return { x: anchor.x + p.x, z: anchor.z + p.z };
}

function pyramid(
  name: CaralPyramidName,
  x: number,
  z: number,
  width: number,
  depth: number,
  tiers: number,
  yaw: number,
  stairWidth = 1.8,
): CaralPlacement {
  return { kind: 'pyramid', name, x, z, yaw, width, depth, tiers, stairWidth };
}

function temple(
  name: CaralLowerName,
  width: number,
  depth: number,
  tiers: number,
  yaw: number,
  stairWidth = 1.8,
): CaralPlacement {
  return { kind: 'temple', name, x: 0, z: 0, yaw, width, depth, tiers, stairWidth };
}

/**
 * Build the deterministic plan for a map of `size`. `upper`/`lower` are world
 * anchors resolved from the mission layout. The scale factor keeps the same
 * composition on larger skirmish maps.
 */
export function planCaralCity(opts: {
  size: number;
  upper: { x: number; z: number };
  lower: { x: number; z: number };
  yaw?: number;
  /** Dry crossings over the Supe; visual causeway + resource keep-out. */
  fords?: { x: number; z: number; width: number; depth: number }[];
}): CaralCityPlan {
  const s = opts.size / REFERENCE_SIZE;
  const yaw = opts.yaw ?? 0;
  const rot = (a: number) => a + yaw;
  const at = (anchor: { x: number; z: number }, lx: number, lz: number) => local(anchor, yaw, lx * s, lz * s);
  const upper = opts.upper;
  const lower = opts.lower;

  // --- Caral Alto: six monumental complexes around the Central Plaza ---
  const mainPyramid: CaralPlacement = {
    ...pyramid('greater', 0, 0, 15, 9, 4, yaw, 2.2),
    ...at(upper, -17, -3),
  };

  const placements: CaralPlacement[] = [];

  // Central Plaza, the main open space of the Upper Half.
  placements.push({ kind: 'plaza', name: 'central_plaza', ...at(upper, 0, 0), yaw, width: 16 * s, depth: 10 * s });

  // The other five pyramids of the Upper Half. The Great Pyramid is the landmark.
  const central = { ...pyramid('central', 0, 0, 11, 7, 4, rot(0)), ...at(upper, -11, -11) };
  const quarry = { ...pyramid('quarry', 0, 0, 10, 7, 3, rot(Math.PI)), ...at(upper, -11, 9) };
  const lesser = { ...pyramid('lesser', 0, 0, 8, 6, 3, rot(Math.PI)), ...at(upper, 9, 9) };
  const gallery = { ...pyramid('gallery', 0, 0, 11, 8, 4, rot(-Math.PI / 2)), ...at(upper, 14, -4) };
  const huanca = { ...pyramid('huanca', 0, 0, 9, 7, 3, rot(-Math.PI / 2)), ...at(upper, 15, 6) };
  placements.push(central, quarry, lesser, gallery, huanca);

  // Open plazas in front of each stair (the Great Pyramid's sunken plaza is part
  // of the landmark model).
  placements.push(
    { kind: 'plaza', name: 'quarry_plaza', ...at(upper, -11, 4), yaw: rot(0), width: 7 * s, depth: 4 * s },
    { kind: 'plaza', name: 'gallery_plaza', ...at(upper, 8, -3), yaw: rot(-Math.PI / 2), width: 5 * s, depth: 7 * s },
    { kind: 'plaza', name: 'huanca_plaza', ...at(upper, 8, 6), yaw: rot(-Math.PI / 2), width: 5 * s, depth: 6 * s },
  );

  // Plaza de la Huanca and its 2.3 m monolith (documented in the 2005/2008 reports).
  placements.push(
    { kind: 'plaza', name: 'plaza_de_la_huanca', ...at(upper, 10, 2), yaw: rot(0), width: 4 * s, depth: 4 * s },
    { kind: 'monolith', name: 'la_huanca', ...at(upper, 10, 2), yaw: rot(0), width: 0.35 * s, depth: 0.35 * s },
  );

  // Elite residential units and public buildings of the Upper Half.
  const compound = (
    name: string,
    lx: number,
    lz: number,
    width: number,
    depth: number,
    rooms: number,
    elite: boolean,
    ry = 0,
  ): CaralPlacement => ({
    kind: 'compound',
    name,
    ...at(upper, lx, lz),
    yaw: ry + yaw,
    width: width * s,
    depth: depth * s,
    rooms,
    elite,
  });

  placements.push(
    compound('B1', -17, -10, 8, 6, 6, true),
    compound('B2', 0, -14, 9, 6, 7, true),
    compound('B5', 17, -9, 8, 6, 6, true),
    compound('greater_residential_complex', 0, 11, 13, 8, 8, true),
    compound('E2', -7, 14, 7, 5, 5, true),
    compound('E3', 7, 14, 7, 5, 5, true),
    compound('upper_residence_w', -20, 4, 7, 5, 4, false, 0.15),
    compound('upper_residence_e', 20, 3, 7, 5, 4, false, -0.12),
    compound('upper_residence_sw', -18, 13, 6, 5, 4, false),
    compound('upper_residence_se', 19, 13, 6, 5, 4, false),
  );

  // --- Caral Bajo: the Lower Half, across the Supe valley ---
  const lowerAt = (lx: number, lz: number) => at(lower, lx, lz);

  // The Amphitheatre Temple is linked to the largest sunken circular plaza; the
  // game replaces this temple, the round altar and the bench temple with the
  // modular Anfiteatro GLB while keeping the plaza.
  placements.push({
    ...temple('amphitheatre', 10, 7, 3, rot(0), 1.9),
    ...lowerAt(-16, 1),
    modularAnchor: true,
    modularReplaced: true,
  });
  placements.push({
    kind: 'sunken_plaza',
    name: 'amphitheatre_plaza',
    ...lowerAt(-16, 11.7),
    yaw: rot(0),
    width: 14.4 * s,
    depth: 14.4 * s,
    radius: 7.2 * s,
  });

  placements.push(
    { ...temple('round_altar', 8, 6, 3, rot(-Math.PI / 2), 1.7), ...lowerAt(15, 1), modularReplaced: true },
    { ...temple('bench_temple', 7, 5, 2, rot(0), 1.5), ...lowerAt(14, -9), modularReplaced: true },
    {
      kind: 'compound',
      name: 'Q',
      ...lowerAt(-14, -9),
      yaw,
      width: 8 * s,
      depth: 6 * s,
      rooms: 6,
      elite: true,
    },
    {
      kind: 'compound',
      name: 'lesser_residential_complex_w',
      ...lowerAt(-6, 12),
      yaw,
      width: 6 * s,
      depth: 5 * s,
      rooms: 4,
      elite: false,
    },
    {
      kind: 'compound',
      name: 'lesser_residential_complex_c',
      ...lowerAt(0, 14),
      yaw,
      width: 7 * s,
      depth: 5 * s,
      rooms: 5,
      elite: false,
    },
    {
      kind: 'compound',
      name: 'lesser_residential_complex_e',
      ...lowerAt(10, 13),
      yaw,
      width: 6 * s,
      depth: 5 * s,
      rooms: 4,
      elite: false,
    },
    {
      kind: 'compound',
      name: 'specialized_workshop',
      ...lowerAt(16, 13),
      yaw: -0.1 + yaw,
      width: 6 * s,
      depth: 5 * s,
      rooms: 4,
      elite: false,
    },
    {
      kind: 'compound',
      name: 'lower_residence_w',
      ...lowerAt(-20, -6),
      yaw: 0.1 + yaw,
      width: 6 * s,
      depth: 5 * s,
      rooms: 4,
      elite: false,
    },
    {
      kind: 'compound',
      name: 'lower_residence_e',
      ...lowerAt(19, 6),
      yaw: -0.1 + yaw,
      width: 6 * s,
      depth: 5 * s,
      rooms: 4,
      elite: false,
    },
  );

  // Short processional paths inside each half. They are visual-only and help the
  // eye read the axes between the plaza and the main temples.
  placements.push(
    { kind: 'path', name: 'upper_axis_n', ...at(upper, 0, -9), yaw: rot(0), width: 2.2 * s, depth: 7 * s },
    { kind: 'path', name: 'upper_axis_s', ...at(upper, 0, 8), yaw: rot(0), width: 2.2 * s, depth: 6 * s },
    { kind: 'path', name: 'lower_axis', ...lowerAt(0, -8), yaw: rot(0), width: 2.2 * s, depth: 7 * s },
  );

  const keepout: TerrainRect[] = [
    { x: upper.x, z: upper.z, rx: 26 * s, rz: 18 * s },
    { x: lower.x, z: lower.z, rx: 24 * s, rz: 20 * s },
  ];

  for (const ford of opts.fords ?? []) {
    placements.push({
      kind: 'ford',
      name: 'supe_ford',
      x: ford.x,
      z: ford.z,
      yaw: 0,
      width: ford.width,
      depth: ford.depth,
    });
    keepout.push({ x: ford.x, z: ford.z, rx: ford.width / 2 + 2, rz: ford.depth / 2 + 2 });
  }

  return {
    id: 'caral_sacred_city',
    upper,
    lower,
    mainPyramid,
    placements,
    keepout,
  };
}

/** Whether a point lies inside the scenic city footprint (resources/props exclusion). */
export function inCaralCity(plan: CaralCityPlan, x: number, z: number, margin = 0): boolean {
  return plan.keepout.some((r) => insideTerrainRect(r, x, z, margin));
}
