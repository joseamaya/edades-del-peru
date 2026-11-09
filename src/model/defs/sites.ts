import type { AuthoredHeightField } from './authoredTerrain';
import type { GroundPbrSlot } from './profiles';
import type { TerrainPaletteId } from './terrainPalettes';
import type { HeritageBuildingId } from './heritage';
import { CARAL_PHASE_PLAN } from './caralPhases';
import { CHAVIN_CITY_BLOCKERS, CHAVIN_HERITAGE_SINCE, CHAVIN_PHASE_PLAN } from './chavinCity';
import type { SitePhasePlan } from './sitePhases';
import {
  CARAL_GROUND,
  CARAL_GROUND_SIZE,
  CARAL_HEIGHTMAP,
  CARAL_HEIGHTMAP_SIZE,
  CARAL_HEIGHTMAP_WORLD_SIZE,
} from './caralHeightmap';
import {
  CHAVIN_GROUND,
  CHAVIN_GROUND_SIZE,
  CHAVIN_HEIGHTMAP,
  CHAVIN_HEIGHTMAP_SIZE,
  CHAVIN_HEIGHTMAP_WORLD_SIZE,
} from './chavinHeightmap';
import { MOCHE_HEIGHTMAP, MOCHE_HEIGHTMAP_SIZE, MOCHE_HEIGHTMAP_WORLD_SIZE } from './mocheHeightmap';
import { WARI_HEIGHTMAP, WARI_HEIGHTMAP_SIZE, WARI_HEIGHTMAP_WORLD_SIZE } from './wariHeightmap';
import { CHANCA_HEIGHTMAP, CHANCA_HEIGHTMAP_SIZE, CHANCA_HEIGHTMAP_WORLD_SIZE } from './chancaHeightmap';
import { CHIMU_HEIGHTMAP, CHIMU_HEIGHTMAP_SIZE, CHIMU_HEIGHTMAP_WORLD_SIZE } from './chimuHeightmap';
import { COLONIAL_HEIGHTMAP, COLONIAL_HEIGHTMAP_SIZE, COLONIAL_HEIGHTMAP_WORLD_SIZE } from './colonialHeightmap';
import {
  INDEPENDENCE_HEIGHTMAP,
  INDEPENDENCE_HEIGHTMAP_SIZE,
  INDEPENDENCE_HEIGHTMAP_WORLD_SIZE,
} from './independenceHeightmap';
import { ARICA_HEIGHTMAP, ARICA_HEIGHTMAP_SIZE, ARICA_HEIGHTMAP_WORLD_SIZE } from './aricaHeightmap';
import { CUSCO_HEIGHTMAP, CUSCO_HEIGHTMAP_SIZE, CUSCO_HEIGHTMAP_WORLD_SIZE } from './cuscoHeightmap';

export type AuthoredSiteId =
  | 'caral_site'
  | 'chavin_site'
  | 'moche_site'
  | 'wari_site'
  | 'chanca_site'
  | 'chimu_site'
  | 'colonial_site'
  | 'independence_site'
  | 'arica_site'
  | 'cusco_inca_site';

/** Dedicated visual-only decor GLBs for the later campaigns. */
export type DecorModelId =
  'chanca_fortress' | 'chimu_compound' | 'colonial_church' | 'independence_chapel' | 'arica_battery';

export interface SiteHeritageProxy {
  id: HeritageBuildingId;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface SiteBlocker {
  x: number;
  z: number;
  w: number;
  d: number;
  /** First construction phase in which it stands; omitted means from the opening. */
  since?: string;
}

export interface SiteKeepoutRect {
  /** Normalized centre. */
  x: number;
  z: number;
  /** Normalized half-extents. */
  rx: number;
  rz: number;
}

export interface SiteWallCollision {
  /** Mesh-name patterns whose near-vertical faces become navigation walls. */
  meshPatterns: readonly RegExp[];
  /** Faces starting above this height above the site floor are roofs/details. */
  maxStartYAboveBase: number;
}

export interface SiteTerrainMoisture {
  valleyHeight: number;
  valleyRange: number;
  bankStart: number;
  bankRange: number;
}

export interface SiteTerrainStyle {
  /** Optional palette override (Caral keeps the authored desert/valley treatment). */
  palette?: TerrainPaletteId;
  pbr: Record<GroundPbrSlot, string>;
  /** Disable photographic normal maps where they alias at RTS tiling. */
  flatNormals: boolean;
  suppressSnow: boolean;
  valleyHaze: boolean;
  moisture: SiteTerrainMoisture;
  /** Optional sea/river colours (art-direction palette) and sun sheen. */
  water?: { deep: string; shallow: string; sheen: number; foam: number; fog: number; refraction: number };
}

export interface SiteLife {
  /** Height of the sacred fire above the site anchor, in world metres. */
  fireHeight?: number;
  /** Phase in which the sacred fire burns. */
  firePhase?: string;
  /** Mission objective whose activation lights the large offering blaze. */
  offeringObjective?: string;
}

export interface SiteEnvirons {
  /** The only current authored valley fabric: Caral's floodplain plots and paths. */
  valley?: 'caral';
  /** The only current authored opening deployment: Caral's camera-facing arc. */
  opening?: 'caral';
  suppressPropIds?: readonly string[];
  suppressFaunaIds?: readonly string[];
}

export interface SiteHeritageNodeMap {
  pattern: RegExp;
  id: HeritageBuildingId;
}

/** Source-backed campaign site: model transform, terrain, collision and heritage. */
export interface AuthoredSiteDef {
  id: AuthoredSiteId;
  label: string;
  modelName: string;
  /** Uniform source-to-game scale. */
  scale: number;
  /** Source origin in game coordinates. */
  origin: { x: number; z: number };
  /** Objective anchor in game coordinates. */
  anchor: { x: number; z: number };
  /** Opening/intro camera height. */
  cameraHeight: number;
  /** Frame the base alone or the midpoint between base and site. */
  framing?: 'midpoint' | 'site-biased' | 'site';
  heightField?: AuthoredHeightField;
  pathCellSize: number;
  heritageProxies: readonly SiteHeritageProxy[];
  /** Ordered construction phases of the site's main monument; omitted for a static site. */
  phases?: SitePhasePlan;
  /** Phase from which each heritage card stands; omitted entries stand from the opening. */
  heritageSince?: Partial<Record<HeritageBuildingId, string>>;
  blockers: readonly SiteBlocker[];
  blockerPadding: number;
  buildKeepout: readonly SiteKeepoutRect[];
  wallCollision: SiteWallCollision;
  terrain: SiteTerrainStyle;
  environs?: SiteEnvirons;
  /** Presentation-only living details (fire, smoke, fairground). */
  life?: SiteLife;
  /** Source meshes hidden because the game heightfield/scene owns that layer. */
  hideNodePatterns?: readonly RegExp[];
  /** Clears an approach strip from the player base to the site anchor. */
  walkableCorridor?: { width: number };
  /** Source nodes that carry a heritage card. */
  heritageNodeMap?: readonly SiteHeritageNodeMap[];
  /** Thin source surfaces that need double-sided rendering and polygon offset. */
  doubleSidedPatterns?: readonly RegExp[];
}

export const DEFAULT_SITE_TERRAIN: SiteTerrainStyle = {
  pbr: { grass: 'grass', dirt: 'dirt', sand: 'sand', rock: 'rock', snow: 'snow' },
  flatNormals: false,
  suppressSnow: false,
  valleyHaze: false,
  moisture: { valleyHeight: 6.2, valleyRange: 3.8, bankStart: 0.12, bankRange: 0.1 },
};

/** Uniform source-to-game scale for the Ciudades Sagradas Caral remaster. */
export const CARAL_SITE_SCALE = 0.25;

/**
 * The Sacred City sits on the east of the Supe-valley transect (scripts/build_caral_heightmap.py): its
 * monuments keep the layout of the former 192 m site map, shifted east by this offset so the sea, Áspero
 * and the lower valley fit west of it.
 */
export const CARAL_CITY_OFFSET_X = 64;

/** World size of the m1 transect map. */
export const CARAL_MAP_SIZE = 256;

/** Shift a point given in the former 192 m site frame into the transect map. */
export function caralCityPoint<T extends { x: number }>(p: T): T {
  return { ...p, x: p.x + CARAL_CITY_OFFSET_X };
}

/** Source origin in game coordinates; the Great Pyramid ends at (164, 30). */
export const CARAL_SITE_ORIGIN = caralCityPoint({ x: 100, z: 69.2 });

/** Objective anchor at the Great Pyramid. */
export const CARAL_SITE_ANCHOR = caralCityPoint({ x: 100, z: 30 });

/** Opening framing: wide enough to read the valley, the base and the city. */
export const CARAL_SITE_CAMERA = { height: 54 } as const;

export type CaralHeritageProxy = SiteHeritageProxy;

/** Invisible raycast volumes for the authored site's named heritage nodes. */
export const CARAL_HERITAGE_PROXIES: readonly CaralHeritageProxy[] = (
  [
    // h follows the architecture kit's Pyramid Mayor (6 terraces, ~8.7 people; art-direction §3).
    { id: 'caral_pyramid_mayor', x: 100, z: 30, w: 43.4, d: 39.8, h: 16.2 },
    { id: 'caral_pyramid_central', x: 67.5, z: 57.5, w: 18, d: 23, h: 8 },
    { id: 'caral_pyramid_quarry', x: 75, z: 80, w: 17, d: 11, h: 6 },
    { id: 'caral_pyramid_lesser', x: 135, z: 20, w: 13, d: 11, h: 6 },
    { id: 'caral_pyramid_gallery', x: 132.5, z: 45, w: 18, d: 17, h: 12 },
    { id: 'caral_pyramid_huanca', x: 132.5, z: 67.5, w: 14, d: 13, h: 8 },
    { id: 'caral_anfiteatro', x: 100, z: 151.65, w: 37.6, d: 22.5, h: 11 },
  ] as const
).map((p) => caralCityPoint<CaralHeritageProxy>(p));

/** Áspero's Huaca de los Ídolos, on the coast west of the city (matches ASPERO_HUACA in caralCity.ts). */
export const ASPERO_HERITAGE_PROXY: CaralHeritageProxy = {
  id: 'aspero_huaca_idolos',
  x: 40,
  z: 148,
  w: 21.2,
  d: 18.8,
  h: 8.25,
};

/** The circular altar is solid but has no heritage click proxy. */
export const CARAL_CIRCULAR_ALTAR = caralCityPoint({ x: 72.5, z: 144.55, w: 10.6, d: 7.7 });

/** Extra clearance around solid monument AABBs for unit footprints. */
export const CARAL_SITE_BLOCKER_PADDING = 0.5;

/**
 * Phase from which each Caral monument stands (matches the `since` of its kit placement in caralCity.ts):
 * until then it neither blocks units nor answers clicks. The Pyramid Mayor and Áspero stand throughout.
 */
export const CARAL_HERITAGE_SINCE: Partial<Record<HeritageBuildingId, string>> = {
  caral_pyramid_central: 'finished',
  caral_pyramid_quarry: 'finished',
  caral_pyramid_lesser: 'finished',
  caral_pyramid_gallery: 'finished',
  caral_pyramid_huanca: 'finished',
  caral_anfiteatro: 'in_use',
};

export const CARAL_SITE_BLOCKERS: readonly SiteBlocker[] = [
  ...CARAL_HERITAGE_PROXIES.map(({ id, x, z, w, d }) => ({ x, z, w, d, since: CARAL_HERITAGE_SINCE[id] })),
  { x: ASPERO_HERITAGE_PROXY.x, z: ASPERO_HERITAGE_PROXY.z, w: ASPERO_HERITAGE_PROXY.w, d: ASPERO_HERITAGE_PROXY.d },
  { ...CARAL_CIRCULAR_ALTAR, since: 'in_use' },
];

/**
 * Normalized construction exclusion over the Upper Half, residential fabric, the gap between both
 * halves, and the Lower Half (given in the former 192 m frame, re-normalised to the transect map).
 * The player's Áspero base on the coast stays well outside it.
 */
export const CARAL_SITE_BUILD_KEEPOUT: readonly SiteKeepoutRect[] = [
  { x: 0.5216, z: 0.2583, rx: 0.2174, rz: 0.1885 },
  { x: 0.5078, z: 0.501, rx: 0.2474, rz: 0.1833 },
  { x: 0.5328, z: 0.7102, rx: 0.138, rz: 0.0268 },
  { x: 0.5328, z: 0.7992, rx: 0.138, rz: 0.0612 },
].map((r) => caralKeepout(r));

/** Re-normalise a rectangle given in the former 192 m site frame to the transect map. */
export function caralKeepout(r: SiteKeepoutRect): SiteKeepoutRect {
  const k = 192 / CARAL_MAP_SIZE;
  return { x: r.x * k + CARAL_CITY_OFFSET_X / CARAL_MAP_SIZE, z: r.z * k, rx: r.rx * k, rz: r.rz * k };
}

export const AUTHORED_SITES: Record<AuthoredSiteId, AuthoredSiteDef> = {
  caral_site: {
    id: 'caral_site',
    label: 'Ciudad Sagrada de Caral',
    modelName: 'caral_site',
    scale: CARAL_SITE_SCALE,
    origin: CARAL_SITE_ORIGIN,
    anchor: CARAL_SITE_ANCHOR,
    cameraHeight: CARAL_SITE_CAMERA.height,
    heightField: {
      size: CARAL_HEIGHTMAP_SIZE,
      worldSize: CARAL_HEIGHTMAP_WORLD_SIZE,
      heights: CARAL_HEIGHTMAP,
      ground: { size: CARAL_GROUND_SIZE, weights: CARAL_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [...CARAL_HERITAGE_PROXIES, ASPERO_HERITAGE_PROXY],
    phases: CARAL_PHASE_PLAN,
    heritageSince: CARAL_HERITAGE_SINCE,
    blockers: CARAL_SITE_BLOCKERS,
    blockerPadding: CARAL_SITE_BLOCKER_PADDING,
    buildKeepout: CARAL_SITE_BUILD_KEEPOUT,
    // No wall collision from the ruins GLB: m1 draws the city in use (architecture kit), whose houses
    // block through CARAL_CITY_BLOCKERS; walls taken from the hidden ruins would be invisible obstacles.
    wallCollision: {
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      palette: 'caral',
      pbr: {
        grass: 'grass',
        dirt: 'dirt',
        sand: 'sand',
        rock: 'rock',
        snow: 'snow',
      },
      flatNormals: false,
      suppressSnow: true,
      valleyHaze: true,
      // art-direction §4: sea #3f5f5c -> #24413f, darkened for the high coastal sun.
      water: { deep: '#0f2a2e', shallow: '#2a5652', sheen: 0.15, foam: 0.12, fog: 0.3, refraction: 0.2 },
    },
    life: { fireHeight: 16.6, firePhase: 'in_use', offeringObjective: 'a3_fuego' },
    environs: {
      valley: 'caral',
      opening: 'caral',
      suppressPropIds: ['cactus'],
      suppressFaunaIds: ['llama', 'vicuna'],
    },
    hideNodePatterns: [/Infra_(Terrain|Reference)/],
    heritageNodeMap: [
      { pattern: /Caral_LOD[01]_Mayor$/, id: 'caral_pyramid_mayor' },
      { pattern: /Caral_LOD[01]_Anfiteatro$/, id: 'caral_anfiteatro' },
    ],
    doubleSidedPatterns: [/PlazaMayor_(BandaRoja|PisoAnilloRojo|PisoRojo)$/],
  },
  chavin_site: {
    id: 'chavin_site',
    label: 'Chavín de Huántar',
    modelName: 'chavin_site',
    scale: 0.22,
    origin: { x: 128, z: 128 },
    anchor: { x: 130.7, z: 116.7 },
    cameraHeight: 60,
    framing: 'site-biased',
    heightField: {
      size: CHAVIN_HEIGHTMAP_SIZE,
      worldSize: CHAVIN_HEIGHTMAP_WORLD_SIZE,
      heights: CHAVIN_HEIGHTMAP,
      ground: { size: CHAVIN_GROUND_SIZE, weights: CHAVIN_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      { id: 'chavin_plaza_circular', x: 130.7, z: 114.7, w: 18, d: 15, h: 5 },
      { id: 'chavin_edificio_a', x: 142.7, z: 106.7, w: 25, d: 22, h: 18 },
      { id: 'chavin_edificio_b', x: 120, z: 121.3, w: 20, d: 19, h: 13 },
      { id: 'chavin_portada', x: 146.7, z: 113.3, w: 9, d: 7, h: 8 },
      { id: 'chavin_galeria', x: 122.7, z: 114.7, w: 8, d: 10, h: 6 },
    ],
    phases: CHAVIN_PHASE_PLAN,
    heritageSince: CHAVIN_HERITAGE_SINCE,
    blockers: CHAVIN_CITY_BLOCKERS,
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.51, z: 0.456, rx: 0.17, rz: 0.14 }],
    // The kit draws the city; walls taken from the hidden source GLB would be invisible obstacles.
    wallCollision: {
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      palette: 'andean_valley',
      flatNormals: true,
      suppressSnow: true,
      valleyHaze: true,
      water: { deep: '#204a4a', shallow: '#4f7d72', sheen: 0.12, foam: 0.12, fog: 0.25, refraction: 0.15 },
    },
    life: { fireHeight: 6.2, firePhase: 'apogee' },
    environs: { suppressPropIds: ['cactus'] },
    hideNodePatterns: [/Chavin_LOD[01]_(Terrain|Reference)/],
  },
  moche_site: {
    id: 'moche_site',
    label: 'Huacas de Moche',
    modelName: 'moche_site',
    scale: 0.25,
    origin: { x: 119, z: 73 },
    anchor: { x: 123, z: 81 },
    cameraHeight: 68,
    framing: 'site-biased',
    heightField: {
      size: MOCHE_HEIGHTMAP_SIZE,
      worldSize: MOCHE_HEIGHTMAP_WORLD_SIZE,
      heights: MOCHE_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [
      { id: 'moche_huaca_sol', x: 109.5, z: 73, w: 23, d: 15.5, h: 12 },
      { id: 'moche_huaca_luna', x: 132.5, z: 71, w: 16.5, d: 12, h: 9 },
      { id: 'moche_plaza', x: 121, z: 76, w: 20.5, d: 13.5, h: 2 },
    ],
    blockers: [
      { x: 109.5, z: 73, w: 23, d: 15.5 },
      { x: 132.5, z: 71, w: 16.5, d: 12 },
    ],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.62, z: 0.38, rx: 0.18, rz: 0.15 }],
    wallCollision: {
      meshPatterns: [/Moche_LOD[01]_Walls/, /^Cube/],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
      pbr: {
        grass: 'grass',
        dirt: 'dirt',
        sand: 'sand',
        rock: 'rock',
        snow: 'snow',
      },
    },
    hideNodePatterns: [/Moche_LOD[01]_(Terrain|Apron)/],
  },
  wari_site: {
    id: 'wari_site',
    label: 'Complejo Arqueológico Wari',
    modelName: 'wari_site',
    scale: 0.25,
    origin: { x: 107.5, z: 86.4 },
    anchor: { x: 107.5, z: 102 },
    cameraHeight: 70,
    framing: 'site-biased',
    heightField: {
      size: WARI_HEIGHTMAP_SIZE,
      worldSize: WARI_HEIGHTMAP_WORLD_SIZE,
      heights: WARI_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [
      { id: 'wari_templo_d', x: 107.5, z: 83.9, w: 15, d: 7.5, h: 3.5 },
      { id: 'wari_plaza', x: 107.5, z: 96.4, w: 23, d: 13, h: 2 },
      { id: 'wari_galeria', x: 107.5, z: 74.4, w: 15, d: 3, h: 1.5 },
      { id: 'wari_mural', x: 107.5, z: 89.7, w: 15, d: 1, h: 1.2 },
    ],
    blockers: [
      { x: 107.5, z: 83.9, w: 15, d: 7.5 },
      { x: 107.5, z: 74.4, w: 15, d: 3 },
    ],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.56, z: 0.45, rx: 0.18, rz: 0.15 }],
    wallCollision: {
      meshPatterns: [/Wari_(Plaza|Perimeter|Gallery|D_Facade)/, /^Cube/],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
    hideNodePatterns: [/Wari_LOD[01]_(Terrain|Apron)/],
  },
  chanca_site: {
    id: 'chanca_site',
    label: 'Pucará chanca de Yahuar Pampa',
    modelName: 'chanca_site',
    scale: 0.7,
    origin: { x: 112.4, z: 60.8 },
    anchor: { x: 112.4, z: 60.8 },
    cameraHeight: 48,
    framing: 'site-biased',
    heightField: {
      size: CHANCA_HEIGHTMAP_SIZE,
      worldSize: CHANCA_HEIGHTMAP_WORLD_SIZE,
      heights: CHANCA_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'chanca_pucara', x: 112.4, z: 60.8, w: 11, d: 9, h: 5 }],
    blockers: [{ x: 112.4, z: 60.8, w: 11, d: 9 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
    wallCollision: {
      meshPatterns: [/chanca/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  chimu_site: {
    id: 'chimu_site',
    label: 'Conjunto chimú de Chan Chan',
    modelName: 'chimu_site',
    scale: 0.7,
    origin: { x: 142.8, z: 65 },
    anchor: { x: 142.8, z: 65 },
    cameraHeight: 55,
    framing: 'site-biased',
    heightField: {
      size: CHIMU_HEIGHTMAP_SIZE,
      worldSize: CHIMU_HEIGHTMAP_WORLD_SIZE,
      heights: CHIMU_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'chimu_compound', x: 142.8, z: 65, w: 11, d: 8.5, h: 4.5 }],
    blockers: [{ x: 142.8, z: 65, w: 11, d: 8.5 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.744, z: 0.339, rx: 0.075, rz: 0.065 }],
    wallCollision: {
      meshPatterns: [/chimu/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  colonial_site: {
    id: 'colonial_site',
    label: 'Plaza y templo colonial del Cusco',
    modelName: 'colonial_site',
    scale: 0.65,
    origin: { x: 134.8, z: 73 },
    anchor: { x: 134.8, z: 73 },
    cameraHeight: 52,
    framing: 'site-biased',
    heightField: {
      size: COLONIAL_HEIGHTMAP_SIZE,
      worldSize: COLONIAL_HEIGHTMAP_WORLD_SIZE,
      heights: COLONIAL_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'colonial_church', x: 134.8, z: 73, w: 9, d: 9, h: 6 }],
    blockers: [{ x: 134.8, z: 73, w: 9, d: 9 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.065, rz: 0.065 }],
    wallCollision: {
      meshPatterns: [/colonial/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  independence_site: {
    id: 'independence_site',
    label: 'Capilla y campamento patriota de Ayacucho',
    modelName: 'independence_site',
    scale: 0.65,
    origin: { x: 134.8, z: 71 },
    anchor: { x: 134.8, z: 71 },
    cameraHeight: 54,
    framing: 'site-biased',
    heightField: {
      size: INDEPENDENCE_HEIGHTMAP_SIZE,
      worldSize: INDEPENDENCE_HEIGHTMAP_WORLD_SIZE,
      heights: INDEPENDENCE_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'independence_chapel', x: 134.8, z: 71, w: 9, d: 9, h: 6 }],
    blockers: [{ x: 134.8, z: 71, w: 9, d: 9 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.702, z: 0.37, rx: 0.065, rz: 0.065 }],
    wallCollision: {
      meshPatterns: [/independence/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  arica_site: {
    id: 'arica_site',
    label: 'Terraza portuaria y batería de Arica',
    modelName: 'arica_site',
    scale: 0.8,
    origin: { x: 134.8, z: 73 },
    anchor: { x: 134.8, z: 73 },
    cameraHeight: 48,
    framing: 'site-biased',
    heightField: {
      size: ARICA_HEIGHTMAP_SIZE,
      worldSize: ARICA_HEIGHTMAP_WORLD_SIZE,
      heights: ARICA_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'arica_battery', x: 134.8, z: 73, w: 13, d: 9, h: 3 }],
    blockers: [{ x: 134.8, z: 73, w: 13, d: 9 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.08, rz: 0.07 }],
    wallCollision: {
      meshPatterns: [/arica/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  cusco_inca_site: {
    id: 'cusco_inca_site',
    label: 'Cusco incaico y Quipaipan',
    modelName: 'cusco_inca_site',
    scale: 0.7,
    origin: { x: 124.8, z: 130.6 },
    anchor: { x: 124.8, z: 130.6 },
    cameraHeight: 58,
    framing: 'site-biased',
    heightField: {
      size: CUSCO_HEIGHTMAP_SIZE,
      worldSize: CUSCO_HEIGHTMAP_WORLD_SIZE,
      heights: CUSCO_HEIGHTMAP,
    },
    pathCellSize: 1,
    heritageProxies: [{ id: 'cusco_ushnu', x: 124.8, z: 130.6, w: 13, d: 10, h: 6 }],
    blockers: [{ x: 124.8, z: 130.6, w: 13, d: 10 }],
    blockerPadding: 0.5,
    buildKeepout: [{ x: 0.65, z: 0.68, rx: 0.08, rz: 0.07 }],
    wallCollision: {
      meshPatterns: [/cusco/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
};

export function getAuthoredSite(id: AuthoredSiteId | null | undefined): AuthoredSiteDef | undefined {
  return id ? AUTHORED_SITES[id] : undefined;
}
