import type { AuthoredHeightField } from './authoredTerrain';
import type { GroundPbrSlot } from './profiles';
import type { TerrainPaletteId } from './terrainPalettes';
import type { HeritageBuildingId } from './heritage';
import { CARAL_PHASE_PLAN } from './caralPhases';
import {
  CHAVIN_CITY_BLOCKERS,
  CHAVIN_HERITAGE_SINCE,
  CHAVIN_PHASE_PLAN,
  chavinKeepout,
  chavinPoint,
} from './chavinCity';
import { CUSCO_CITY_BLOCKERS } from './cuscoCity';
import type { SitePhasePlan } from './sitePhases';
import {
  CARAL_COAST_STEP,
  CARAL_COAST_X,
  CARAL_FORDS,
  CARAL_GROUND,
  CARAL_GROUND_SIZE,
  CARAL_HEIGHTMAP,
  CARAL_HEIGHTMAP_SIZE,
  CARAL_HEIGHTMAP_WORLD_SIZE,
  CARAL_RIVER_HALF_WIDTH,
  CARAL_RIVER_PATH,
} from './caralHeightmap';
import {
  CHAVIN_GROUND,
  CHAVIN_GROUND_SIZE,
  CHAVIN_HEIGHTMAP,
  CHAVIN_HEIGHTMAP_SIZE,
  CHAVIN_HEIGHTMAP_WORLD_SIZE,
} from './chavinHeightmap';
import {
  MOCHE_GROUND,
  MOCHE_GROUND_SIZE,
  MOCHE_HEIGHTMAP,
  MOCHE_HEIGHTMAP_SIZE,
  MOCHE_HEIGHTMAP_WORLD_SIZE,
} from './mocheHeightmap';
import { mocheLength, mochePoint } from './mocheSite';
import {
  WARI_GROUND,
  WARI_GROUND_SIZE,
  WARI_HEIGHTMAP,
  WARI_HEIGHTMAP_SIZE,
  WARI_HEIGHTMAP_WORLD_SIZE,
} from './wariHeightmap';
import { wariLength, wariPoint } from './wariSite';
import {
  CHANCA_GROUND,
  CHANCA_GROUND_SIZE,
  CHANCA_HEIGHTMAP,
  CHANCA_HEIGHTMAP_SIZE,
  CHANCA_HEIGHTMAP_WORLD_SIZE,
} from './chancaHeightmap';
import { chancaLength, chancaPoint } from './chancaSite';
import {
  CHIMU_GROUND,
  CHIMU_GROUND_SIZE,
  CHIMU_HEIGHTMAP,
  CHIMU_HEIGHTMAP_SIZE,
  CHIMU_HEIGHTMAP_WORLD_SIZE,
} from './chimuHeightmap';
import { chimuLength, chimuPoint } from './chimuSite';
import {
  COLONIAL_GROUND,
  COLONIAL_GROUND_SIZE,
  COLONIAL_HEIGHTMAP,
  COLONIAL_HEIGHTMAP_SIZE,
  COLONIAL_HEIGHTMAP_WORLD_SIZE,
} from './colonialHeightmap';
import { colonialLength, colonialPoint } from './colonialSite';
import {
  INDEPENDENCE_GROUND,
  INDEPENDENCE_GROUND_SIZE,
  INDEPENDENCE_HEIGHTMAP,
  INDEPENDENCE_HEIGHTMAP_SIZE,
  INDEPENDENCE_HEIGHTMAP_WORLD_SIZE,
} from './independenceHeightmap';
import {
  ARICA_GROUND,
  ARICA_GROUND_SIZE,
  ARICA_HEIGHTMAP,
  ARICA_HEIGHTMAP_SIZE,
  ARICA_HEIGHTMAP_WORLD_SIZE,
} from './aricaHeightmap';
import { aricaLength } from './aricaSite';
import { cuscoIncaLength, cuscoIncaPoint } from './cuscoIncaSite';
import { independenceLength } from './independenceSite';
import {
  JUNTA_GROUND,
  JUNTA_GROUND_SIZE,
  JUNTA_HEIGHTMAP,
  JUNTA_HEIGHTMAP_SIZE,
  JUNTA_HEIGHTMAP_WORLD_SIZE,
  JUNTA_RIVER_HALF_WIDTH,
  JUNTA_RIVER_PATH,
} from './juntaHeightmap';
import {
  TAMBOTOCO_GROUND,
  TAMBOTOCO_GROUND_SIZE,
  TAMBOTOCO_HEIGHTMAP,
  TAMBOTOCO_HEIGHTMAP_SIZE,
  TAMBOTOCO_HEIGHTMAP_WORLD_SIZE,
  TAMBOTOCO_STREAM_HALF_WIDTH,
  TAMBOTOCO_STREAM_PATH,
} from './tambotocoHeightmap';
import { TAMBOTOCO_CAVE, TAMBOTOCO_INTICANCHA_HUTS, TAMBOTOCO_SHRINE, TAMBOTOCO_VILLAGES } from './tambotocoLayout';
import { CUSCO_COLONIAL, LIMA_COLONIAL } from './colonialLayout';
import { colonialCityBlockers } from './colonialCity';
import {
  aricaCityBlockers,
  ARICA_BATTERY_ANCHOR,
  ARICA_CITY_ANCHOR,
  REAL_FELIPE_CITY_ANCHOR,
  TARAPACA_CITY_ANCHOR,
  realFelipeCityBlockers,
  tarapacaCityBlockers,
} from './republicCity';
import {
  BRENA_CITY_ANCHOR,
  INDEPENDENCE_CHAPEL_ANCHOR,
  INDEPENDENCE_CITY_ANCHOR,
  brenaCityBlockers,
  independenceCityBlockers,
} from './independenceCity';
import {
  CHIMU_CITY_ANCHOR,
  CHIMU_SITE_ANCHOR,
  MOCHE_CITY_ANCHOR,
  MOCHE_HUACA_LUNA_ANCHOR,
  MOCHE_HUACA_SOL_ANCHOR,
  chimuCityBlockers,
  mocheCityBlockers,
} from './mocheChimuCity';
import { CHANCA_CITY_ANCHOR, chancaCityBlockers, wariCityBlockers } from './wariChancaCity';

import {
  LIMA_GROUND,
  LIMA_GROUND_SIZE,
  LIMA_HEIGHTMAP,
  LIMA_HEIGHTMAP_SIZE,
  LIMA_HEIGHTMAP_WORLD_SIZE,
  LIMA_RIVER_HALF_WIDTH,
  LIMA_RIVER_PATH,
} from './limaHeightmap';

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
  | 'real_felipe_site'
  | 'tarapaca_site'
  | 'brena_site'
  | 'cusco_inca_site'
  | 'cusco_junta_site'
  | 'tambotoco_site'
  | 'lima_site'
  | 'miraflores_site'
  | 'vilcabamba_site';

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
  /** Last phase in which it still stands (e.g. temporary fair tents); omitted means forever. */
  until?: string;
}

/** Whether (x, z) lies inside the blocker footprint expanded by `pad` on every side. */
export function insideSiteBlocker(blocker: SiteBlocker, x: number, z: number, pad = 0): boolean {
  return Math.abs(x - blocker.x) <= blocker.w / 2 + pad && Math.abs(z - blocker.z) <= blocker.d / 2 + pad;
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
  water?: {
    deep: string;
    shallow: string;
    sheen: number;
    foam: number;
    fog: number;
    refraction: number;
    /** Optional water-grid segments (default 128; Tambotoco uses 64 to pay for the site detail). */
    grid?: number;
  };
}

export interface SiteLife {
  /** Height of the sacred fire above the site anchor, in world metres. */
  fireHeight?: number;
  /** Phase in which the sacred fire burns. */
  firePhase?: string;
  /** Phase from which the daily life stops (cooking smoke); e.g. Caral's sealed city. */
  quietPhase?: string;
  /** Distance from the authored river within which the drought dries the riparian grove (m). */
  dryGroveRadius?: number;
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
  /** Height of the opening hold (cave/title) before the flight to the base; defaults to cameraHeight. */
  openingHeight?: number;
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
  /** The blockers come from the kit layout, so a headless match must apply them too. */
  simulationCollision?: boolean;
  blockerPadding: number;
  buildKeepout: readonly SiteKeepoutRect[];
  wallCollision: SiteWallCollision;
  terrain: SiteTerrainStyle;
  environs?: SiteEnvirons;
  /** Presentation-only living details (fire, smoke, fairground). */
  life?: SiteLife;
  /** Phase from which the authored GLB stands; omitted means from the opening. */
  modelSince?: string;
  /**
   * The authored GLB is a labelled abstraction that the mission replaces with a kit or a procedural
   * landmark (Arica, Real Felipe, Tarapacá, Independencia, Breña, Vilcabamba); do not load it.
   */
  hideModel?: boolean;
  /** Authored presentation family; the renderer picks the overlay from it. */
  style?: 'ayllu' | 'colonial' | 'republic' | 'independence' | 'moche' | 'wari';
  /** Source meshes hidden because the game heightfield/scene owns that layer. */
  hideNodePatterns?: readonly RegExp[];
  /** Clears an approach strip from the player base to the site anchor. */
  walkableCorridor?: { width: number };
  /** Source nodes that carry a heritage card. */
  heritageNodeMap?: readonly SiteHeritageNodeMap[];
  /** Thin source surfaces that need double-sided rendering and polygon offset. */
  doubleSidedPatterns?: readonly RegExp[];
}

const DEFAULT_SITE_TERRAIN: SiteTerrainStyle = {
  pbr: { grass: 'grass', dirt: 'dirt', sand: 'sand', rock: 'rock', snow: 'snow' },
  flatNormals: false,
  suppressSnow: false,
  valleyHaze: false,
  moisture: { valleyHeight: 6.2, valleyRange: 3.8, bankStart: 0.12, bankRange: 0.1 },
};

/** Uniform source-to-game scale for the Ciudades Sagradas Caral remaster. */
const CARAL_SITE_SCALE = 0.25;

/** Lima's plaza and cabildo: shared by the mission layout and the authored site. */
export const LIMA_SITE_ORIGIN = LIMA_COLONIAL.center;

/**
 * The Sacred City sits on the east of the Supe-valley transect (scripts/build_caral_heightmap.py): its
 * monuments keep the layout of the former 192 m site map, shifted east by this offset so the sea, Áspero
 * and the lower valley fit west of it.
 */
export const CARAL_CITY_OFFSET_X = 64;

/** World size of the m1 transect map. */
export const CARAL_MAP_SIZE = 256;

/** Shift a point given in the former 192 m site frame into the transect map. */
function caralCityPoint<T extends { x: number }>(p: T): T {
  return { ...p, x: p.x + CARAL_CITY_OFFSET_X };
}

/** Source origin in game coordinates; the Great Pyramid ends at (164, 30). */
export const CARAL_SITE_ORIGIN = caralCityPoint({ x: 100, z: 69.2 });

/** Objective anchor at the Great Pyramid. */
const CARAL_SITE_ANCHOR = caralCityPoint({ x: 100, z: 30 });

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
const CARAL_SITE_BLOCKER_PADDING = 0.5;

/**
 * Phase from which each Caral monument answers clicks and shows its card. The physical blockers use
 * `CARAL_HERITAGE_BLOCK_SINCE` instead: the five smaller complexes block from foundation (their started
 * platform exists) but their cards wait for the finished model. The Mayor and Áspero stand throughout.
 */
export const CARAL_HERITAGE_SINCE: Partial<Record<HeritageBuildingId, string>> = {
  caral_pyramid_central: 'finished',
  caral_pyramid_quarry: 'finished',
  caral_pyramid_lesser: 'finished',
  caral_pyramid_gallery: 'finished',
  caral_pyramid_huanca: 'finished',
  caral_anfiteatro: 'in_use',
};

/**
 * Act III starts the five smaller complexes with a low platform at foundation; their own cards still
 * wait for the finished model (the click surface and the physical obstacle are separate decisions).
 */
export const CARAL_HERITAGE_BLOCK_SINCE: Partial<Record<HeritageBuildingId, string>> = {
  ...CARAL_HERITAGE_SINCE,
  caral_pyramid_central: 'foundation',
  caral_pyramid_quarry: 'foundation',
  caral_pyramid_lesser: 'foundation',
  caral_pyramid_gallery: 'foundation',
  caral_pyramid_huanca: 'foundation',
};

export const CARAL_SITE_BLOCKERS: readonly SiteBlocker[] = [
  ...CARAL_HERITAGE_PROXIES.map(({ id, x, z, w, d }) => ({ x, z, w, d, since: CARAL_HERITAGE_BLOCK_SINCE[id] })),
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

/** The battery point in the former 192 m frame, scaled into the 256 m map. */
const ARICA_SITE_POINT = ARICA_CITY_ANCHOR;

// The Tarapacá village spans ~44 x 26 m around its own anchor; keep construction off it.
const TARAPACA_BUILD_KEEPOUT: readonly SiteKeepoutRect[] = [
  { x: TARAPACA_CITY_ANCHOR.x / 256, z: TARAPACA_CITY_ANCHOR.z / 256, rx: 0.095, rz: 0.075 },
];

/** The Cusco plaza point in the former 192 m frame, scaled into the 256 m map. */
const COLONIAL_SITE_POINT = colonialPoint({ x: 134.8, z: 73 });

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
      river: { path: CARAL_RIVER_PATH, halfWidth: CARAL_RIVER_HALF_WIDTH },
      coast: { step: CARAL_COAST_STEP, x: CARAL_COAST_X },
      fords: CARAL_FORDS,
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
    life: {
      fireHeight: 16.6,
      firePhase: 'in_use',
      quietPhase: 'sealed',
      dryGroveRadius: 26,
      offeringObjective: 'a3_fuego',
    },
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
    origin: chavinPoint({ x: 96, z: 96 }),
    anchor: chavinPoint({ x: 98, z: 87.5 }),
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
      { ...chavinPoint({ x: 98, z: 86 }), id: 'chavin_plaza_circular', w: 18, d: 15, h: 5 },
      { ...chavinPoint({ x: 107, z: 80 }), id: 'chavin_edificio_a', w: 25, d: 22, h: 18 },
      { ...chavinPoint({ x: 90, z: 91 }), id: 'chavin_edificio_b', w: 20, d: 19, h: 13 },
      { ...chavinPoint({ x: 110, z: 85 }), id: 'chavin_portada', w: 9, d: 7, h: 8 },
      { ...chavinPoint({ x: 92, z: 86 }), id: 'chavin_galeria', w: 8, d: 10, h: 6 },
    ],
    phases: CHAVIN_PHASE_PLAN,
    heritageSince: CHAVIN_HERITAGE_SINCE,
    blockers: CHAVIN_CITY_BLOCKERS,
    blockerPadding: 0.5,
    buildKeepout: [chavinKeepout({ x: 0.51, z: 0.456, rx: 0.17, rz: 0.14 })],
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
    hideModel: true,
    style: 'moche',
    // The 192 m composition is scaled by 4/3 into the 256 m transect; the model, proxies and blockers
    // scale with it so the huacas still cover their terrace.
    scale: mocheLength(0.25),
    origin: mochePoint({ x: 119, z: 73 }),
    anchor: mochePoint({ x: 123, z: 81 }),
    cameraHeight: mocheLength(68),
    framing: 'site-biased',
    heightField: {
      size: MOCHE_HEIGHTMAP_SIZE,
      worldSize: MOCHE_HEIGHTMAP_WORLD_SIZE,
      heights: MOCHE_HEIGHTMAP,
      ground: { size: MOCHE_GROUND_SIZE, weights: MOCHE_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'moche_huaca_sol',
        ...MOCHE_HUACA_SOL_ANCHOR,
        w: 24,
        d: 18.5,
        h: 13.6,
      },
      {
        id: 'moche_huaca_luna',
        ...MOCHE_HUACA_LUNA_ANCHOR,
        w: 14,
        d: 12.8,
        h: 6.5,
      },
      {
        id: 'moche_plaza',
        ...MOCHE_CITY_ANCHOR,
        w: 30,
        d: 20,
        h: 0.4,
      },
    ],
    // The kit composition around the plaza; the same layout derives the blockers.
    blockers: mocheCityBlockers(),
    simulationCollision: true,
    blockerPadding: mocheLength(0.5),
    buildKeepout: [{ x: 0.62, z: 0.38, rx: 0.18, rz: 0.15 }],
    wallCollision: {
      // The Moche kit owns its own merged geometry and blockers; the hidden GLB is no longer loaded.
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: mocheLength(8) },
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
    hideModel: true,
    style: 'wari',
    // The retired 192 m composition's scale stays for the registry fallback; the kit draws in world metres.
    scale: wariLength(0.25),
    origin: wariPoint({ x: 107.5, z: 86.4 }),
    // The site anchor frames the kit composition (the mission focus is its own point).
    anchor: wariPoint({ x: 107.5, z: 97.5 }),
    cameraHeight: wariLength(70),
    framing: 'site-biased',
    heightField: {
      size: WARI_HEIGHTMAP_SIZE,
      worldSize: WARI_HEIGHTMAP_WORLD_SIZE,
      heights: WARI_HEIGHTMAP,
      ground: { size: WARI_GROUND_SIZE, weights: WARI_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'wari_templo_d',
        ...wariPoint({ x: 107.5, z: 88.4 }),
        w: 18,
        d: 18.4,
        h: 6.7,
      },
      { id: 'wari_plaza', ...wariPoint({ x: 107.5, z: 98.3 }), w: 26, d: 18, h: 0.4 },
      { id: 'wari_galeria', ...wariPoint({ x: 86.4, z: 97.5 }), w: 14.3, d: 5.3, h: 3.75 },
      { id: 'wari_mural', ...wariPoint({ x: 101.5, z: 107 }), w: 10.2, d: 0.7, h: 2.6 },
    ],
    // The kit composition around the ceremonial plaza; the same layout derives the blockers.
    blockers: wariCityBlockers(),
    simulationCollision: true,
    blockerPadding: wariLength(0.5),
    buildKeepout: [{ x: 0.56, z: 0.45, rx: 0.18, rz: 0.15 }],
    wallCollision: {
      // The Wari kit owns its own merged geometry and blockers; the hidden GLB is no longer loaded.
      meshPatterns: [],
      maxStartYAboveBase: wariLength(1.2),
    },
    walkableCorridor: { width: wariLength(8) },
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
    hideModel: true,
    style: 'wari',
    // The retired 160 m composition's scale stays for the registry fallback; the kit draws in world metres.
    scale: chancaLength(0.7),
    origin: chancaPoint({ x: 112.4, z: 60.8 }),
    anchor: chancaPoint({ x: 112.4, z: 60.8 }),
    cameraHeight: chancaLength(48),
    framing: 'site-biased',
    heightField: {
      size: CHANCA_HEIGHTMAP_SIZE,
      worldSize: CHANCA_HEIGHTMAP_WORLD_SIZE,
      heights: CHANCA_HEIGHTMAP,
      ground: { size: CHANCA_GROUND_SIZE, weights: CHANCA_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'chanca_pucara',
        ...CHANCA_CITY_ANCHOR,
        w: 22,
        d: 24,
        h: 8,
      },
    ],
    // The kit composition around the pucará terrace; the same layout derives the blockers.
    blockers: chancaCityBlockers(),
    simulationCollision: true,
    blockerPadding: chancaLength(0.5),
    buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
    wallCollision: {
      // The Wari kit owns its own merged geometry and blockers; the hidden GLB is no longer loaded.
      meshPatterns: [],
      maxStartYAboveBase: chancaLength(1.2),
    },
    walkableCorridor: { width: chancaLength(8) },
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
    hideModel: true,
    style: 'moche',
    // The 192 m composition is scaled by 4/3 into the 256 m transect; the model, proxies and blockers
    // scale with it so Chan Chan still covers its terrace.
    scale: chimuLength(0.7),
    origin: chimuPoint({ x: 142.8, z: 65 }),
    anchor: CHIMU_SITE_ANCHOR,
    cameraHeight: chimuLength(55),
    framing: 'site-biased',
    heightField: {
      size: CHIMU_HEIGHTMAP_SIZE,
      worldSize: CHIMU_HEIGHTMAP_WORLD_SIZE,
      heights: CHIMU_HEIGHTMAP,
      ground: { size: CHIMU_GROUND_SIZE, weights: CHIMU_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'chimu_compound',
        ...CHIMU_CITY_ANCHOR,
        w: 24,
        d: 20,
        h: 11,
      },
    ],
    // The kit composition around the compound; the same layout derives the blockers.
    blockers: chimuCityBlockers(),
    simulationCollision: true,
    blockerPadding: chimuLength(0.5),
    buildKeepout: [{ x: 0.744, z: 0.339, rx: 0.075, rz: 0.065 }],
    wallCollision: {
      // The north-coast kit owns its own merged geometry and blockers; the hidden GLB is no longer loaded.
      meshPatterns: [],
      maxStartYAboveBase: chimuLength(1.2),
    },
    walkableCorridor: { width: chimuLength(8) },
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
    hideModel: true,
    style: 'colonial',
    // The 192 m composition is scaled by 4/3 into the 256 m transect; the model, proxies and blockers
    // scale with it so the church still covers its plaza.
    scale: colonialLength(0.65),
    origin: COLONIAL_SITE_POINT,
    anchor: COLONIAL_SITE_POINT,
    cameraHeight: colonialLength(52),
    framing: 'site-biased',
    heightField: {
      size: COLONIAL_HEIGHTMAP_SIZE,
      worldSize: COLONIAL_HEIGHTMAP_WORLD_SIZE,
      heights: COLONIAL_HEIGHTMAP,
      ground: { size: COLONIAL_GROUND_SIZE, weights: COLONIAL_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'colonial_church',
        ...COLONIAL_SITE_POINT,
        // The drawn cathedral (nave 24.9 x 13.4 m and its tower) sets the pick volume.
        w: 25,
        d: 13.5,
        h: 15,
      },
    ],
    // The kit composition around this anchor; the plaza stays open.
    blockers: colonialCityBlockers(COLONIAL_SITE_POINT),
    simulationCollision: true,
    blockerPadding: colonialLength(0.5),
    buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.1, rz: 0.11 }],
    wallCollision: {
      meshPatterns: [/colonial/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: colonialLength(8) },
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
    hideModel: true,
    style: 'independence',
    scale: independenceLength(0.65),
    origin: INDEPENDENCE_CITY_ANCHOR,
    anchor: INDEPENDENCE_CITY_ANCHOR,
    cameraHeight: independenceLength(54),
    framing: 'site-biased',
    heightField: {
      size: INDEPENDENCE_HEIGHTMAP_SIZE,
      worldSize: INDEPENDENCE_HEIGHTMAP_WORLD_SIZE,
      heights: INDEPENDENCE_HEIGHTMAP,
      ground: { size: INDEPENDENCE_GROUND_SIZE, weights: INDEPENDENCE_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'independence_chapel',
        x: INDEPENDENCE_CHAPEL_ANCHOR.x,
        z: INDEPENDENCE_CHAPEL_ANCHOR.z,
        w: 14.8,
        d: 9.3,
        h: 11.6,
      },
    ],
    blockers: independenceCityBlockers(),
    simulationCollision: true,
    blockerPadding: independenceLength(0.5),
    buildKeepout: [{ x: 0.702, z: 0.37, rx: 0.065, rz: 0.065 }],
    wallCollision: {
      meshPatterns: [],
      maxStartYAboveBase: independenceLength(1.2),
    },
    walkableCorridor: { width: independenceLength(8) },
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
    hideModel: true,
    style: 'republic',
    // The kit is modelled in game metres; the site point is the 256 m transect anchor.
    scale: aricaLength(0.8),
    origin: ARICA_SITE_POINT,
    anchor: ARICA_SITE_POINT,
    cameraHeight: 64,
    framing: 'site-biased',
    heightField: {
      size: ARICA_HEIGHTMAP_SIZE,
      worldSize: ARICA_HEIGHTMAP_WORLD_SIZE,
      heights: ARICA_HEIGHTMAP,
      ground: { size: ARICA_GROUND_SIZE, weights: ARICA_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'arica_battery',
        x: ARICA_BATTERY_ANCHOR.x,
        z: ARICA_BATTERY_ANCHOR.z,
        w: aricaLength(6),
        d: aricaLength(10),
        h: aricaLength(4.5),
      },
    ],
    blockers: aricaCityBlockers(),
    simulationCollision: true,
    blockerPadding: aricaLength(0.5),
    buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.08, rz: 0.07 }],
    wallCollision: {
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: aricaLength(8) },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  // Callao (1824–1826): the Arica battery GLB is kept as a registry fallback, and the Republican kit
  // draws the Real Felipe curtains, bastions and magazine.
  real_felipe_site: {
    id: 'real_felipe_site',
    label: 'Fortaleza del Real Felipe y el Callao',
    modelName: 'arica_site',
    hideModel: true,
    style: 'republic',
    scale: aricaLength(0.8),
    origin: REAL_FELIPE_CITY_ANCHOR,
    anchor: REAL_FELIPE_CITY_ANCHOR,
    cameraHeight: 64,
    framing: 'site-biased',
    heightField: {
      size: ARICA_HEIGHTMAP_SIZE,
      worldSize: ARICA_HEIGHTMAP_WORLD_SIZE,
      heights: ARICA_HEIGHTMAP,
      ground: { size: ARICA_GROUND_SIZE, weights: ARICA_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [],
    blockers: realFelipeCityBlockers(),
    simulationCollision: true,
    blockerPadding: aricaLength(0.5),
    buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.08, rz: 0.07 }],
    wallCollision: {
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: aricaLength(8) },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  // Tarapacá (1879): the site moved to the village in the quebrada. The Arica GLB is not loaded; the
  // Republican kit draws the adobe village, the crest and the Pachica hamlet on this heightfield.
  tarapaca_site: {
    id: 'tarapaca_site',
    label: 'Quebrada y pueblo de Tarapacá',
    modelName: 'arica_site',
    hideModel: true,
    style: 'republic',
    scale: aricaLength(0.8),
    origin: TARAPACA_CITY_ANCHOR,
    anchor: TARAPACA_CITY_ANCHOR,
    cameraHeight: 56,
    framing: 'site-biased',
    heightField: {
      size: ARICA_HEIGHTMAP_SIZE,
      worldSize: ARICA_HEIGHTMAP_WORLD_SIZE,
      heights: ARICA_HEIGHTMAP,
      ground: { size: ARICA_GROUND_SIZE, weights: ARICA_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [],
    // The village is the battlefield: its plaza and the east street stay walkable so both lines can
    // close and fight; the houses, chapel, corral, parapet and outcrops block from the same layout.
    blockers: tarapacaCityBlockers(),
    simulationCollision: true,
    blockerPadding: 0.5,
    buildKeepout: [...TARAPACA_BUILD_KEEPOUT],
    wallCollision: { meshPatterns: [], maxStartYAboveBase: 1.2 },
    walkableCorridor: { width: aricaLength(8) },
    terrain: { ...DEFAULT_SITE_TERRAIN, palette: 'atacama', flatNormals: true, suppressSnow: true },
  },
  // La Breña (1882–1883) draws its sierra camp from the Independence kit on the same Ayacucho heightfield.
  brena_site: {
    id: 'brena_site',
    label: 'Sierra central y campamento de la Breña',
    modelName: 'independence_site',
    hideModel: true,
    style: 'independence',
    scale: independenceLength(0.65),
    origin: BRENA_CITY_ANCHOR,
    anchor: BRENA_CITY_ANCHOR,
    cameraHeight: independenceLength(54),
    framing: 'site-biased',
    heightField: {
      size: INDEPENDENCE_HEIGHTMAP_SIZE,
      worldSize: INDEPENDENCE_HEIGHTMAP_WORLD_SIZE,
      heights: INDEPENDENCE_HEIGHTMAP,
      ground: { size: INDEPENDENCE_GROUND_SIZE, weights: INDEPENDENCE_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [],
    blockers: brenaCityBlockers(),
    simulationCollision: true,
    blockerPadding: independenceLength(0.5),
    // The mission overrides this with its Huamachuco keepout (0.6); this default covers the camp.
    buildKeepout: [{ x: 0.702, z: 0.37, rx: 0.065, rz: 0.065 }],
    wallCollision: { meshPatterns: [], maxStartYAboveBase: independenceLength(1.2) },
    walkableCorridor: { width: independenceLength(8) },
    terrain: { ...DEFAULT_SITE_TERRAIN, flatNormals: true, suppressSnow: true },
  },
  cusco_inca_site: {
    id: 'cusco_inca_site',
    label: 'Cusco incaico y Quipaipan',
    modelName: 'cusco_inca_site',
    // The 192 m composition is scaled by 4/3 into the 256 m transect; the model, proxies and blockers
    // scale with it so the ushnu still covers its plaza.
    scale: cuscoIncaLength(0.7),
    origin: cuscoIncaPoint({ x: 124.8, z: 130.6 }),
    anchor: cuscoIncaPoint({ x: 124.8, z: 130.6 }),
    cameraHeight: cuscoIncaLength(58),
    framing: 'site-biased',
    // Both missions that use this site supply their own field (`m6b` Quipaipan, `m_cusco_1536`).
    pathCellSize: 1,
    heritageProxies: [
      {
        id: 'cusco_ushnu',
        // The drawn ushnu is the 20 x 15 m kit piece at 3/4: its pick volume matches the model, not the
        // old full-size footprint that stuck ~1 m out and 3 m up.
        ...cuscoIncaPoint({ x: 124.8, z: 130.6 }),
        w: cuscoIncaLength(11.4),
        d: cuscoIncaLength(8.55),
        h: cuscoIncaLength(3.9),
      },
    ],
    // Every building of the Blender composition (cuscoCity.ts), from the same layout the renderer bakes.
    blockers: CUSCO_CITY_BLOCKERS,
    simulationCollision: true,
    blockerPadding: 0.4,
    buildKeepout: [{ x: 0.65, z: 0.68, rx: 0.08, rz: 0.07 }],
    wallCollision: {
      meshPatterns: [/cusco/i],
      maxStartYAboveBase: cuscoIncaLength(1.2),
    },
    walkableCorridor: { width: cuscoIncaLength(8) },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
    },
  },
  // 1814 Cusco reuses the colonial plaza model on a new 256 m Cusco–Umachiri transect
  // (scripts/build_junta_heightmap.py). The temple is the Junta's cabildo card.
  cusco_junta_site: {
    id: 'cusco_junta_site',
    label: 'Cusco y el camino de Umachiri',
    modelName: 'colonial_site',
    hideModel: true,
    style: 'colonial',
    scale: 0.65,
    origin: { ...CUSCO_COLONIAL.center },
    anchor: { ...CUSCO_COLONIAL.center },
    cameraHeight: 56,
    framing: 'site-biased',
    heightField: {
      size: JUNTA_HEIGHTMAP_SIZE,
      worldSize: JUNTA_HEIGHTMAP_WORLD_SIZE,
      heights: JUNTA_HEIGHTMAP,
      ground: { size: JUNTA_GROUND_SIZE, weights: JUNTA_GROUND },
      river: { path: JUNTA_RIVER_PATH, halfWidth: JUNTA_RIVER_HALF_WIDTH },
      // The crossing at Umachiri keeps the Lalli walkable on the campaign route.
      fords: [{ z: 200, halfWidth: 12 }],
    },
    pathCellSize: 1,
    heritageProxies: [
      { id: 'colonial_church', x: CUSCO_COLONIAL.center.x, z: CUSCO_COLONIAL.center.z, w: 25, d: 13.5, h: 15 },
    ],
    phases: { phases: ['ciudad'], initial: 'ciudad' },
    blockers: colonialCityBlockers(CUSCO_COLONIAL.center, 'ciudad'),
    simulationCollision: true,
    blockerPadding: 0.5,
    buildKeepout: [{ x: 72 / 256, z: 58 / 256, rx: 0.1, rz: 0.11 }],
    wallCollision: {
      meshPatterns: [/colonial/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
      // The Cusco basin (5.7 m) reads wet, the altiplano (4.0 m) reads as puna grass.
      moisture: { valleyHeight: 7.6, valleyRange: 3.4, bankStart: 0.12, bankRange: 0.1 },
      water: { deep: '#1c3a44', shallow: '#4f7a74', sheen: 0.12, foam: 0.1, fog: 0.22, refraction: 0.15, grid: 64 },
    },
  },
  // Lima (1535) reuses the colonial plaza/church model on a new 256 m coast transect.
  lima_site: {
    id: 'lima_site',
    label: 'La Ciudad de los Reyes y el Rímac',
    modelName: 'colonial_site',
    hideModel: true,
    style: 'colonial',
    modelSince: 'ciudad',
    scale: 0.65,
    origin: { ...LIMA_SITE_ORIGIN },
    anchor: { ...LIMA_SITE_ORIGIN },
    cameraHeight: 56,
    framing: 'site-biased',
    heightField: {
      size: LIMA_HEIGHTMAP_SIZE,
      worldSize: LIMA_HEIGHTMAP_WORLD_SIZE,
      heights: LIMA_HEIGHTMAP,
      ground: { size: LIMA_GROUND_SIZE, weights: LIMA_GROUND },
      river: { path: LIMA_RIVER_PATH, halfWidth: LIMA_RIVER_HALF_WIDTH },
    },
    pathCellSize: 1,
    phases: { phases: ['traza', 'ciudad'], initial: 'traza' },
    heritageProxies: [{ id: 'lima_plaza', x: LIMA_SITE_ORIGIN.x, z: LIMA_SITE_ORIGIN.z, w: 12, d: 10, h: 6 }],
    blockers: colonialCityBlockers(LIMA_SITE_ORIGIN, 'ciudad'),
    simulationCollision: true,
    blockerPadding: 0.5,
    buildKeepout: [{ x: LIMA_SITE_ORIGIN.x / 256, z: LIMA_SITE_ORIGIN.z / 256, rx: 0.1, rz: 0.11 }],
    wallCollision: {
      meshPatterns: [/colonial/i],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
      moisture: { valleyHeight: 6.2, valleyRange: 3.2, bankStart: 0.12, bankRange: 0.1 },
      water: { deep: '#0f2a2e', shallow: '#2a5652', sheen: 0.15, foam: 0.12, fog: 0.3, refraction: 0.2 },
    },
  },
  // Miraflores (1881) uses the Lima colonial kit as the city backdrop; the redoubts are the player's
  // forts at the objective nodes. The Plaza Mayor proxy is deliberately absent: it belongs to Lima.
  miraflores_site: {
    id: 'miraflores_site',
    label: 'Lima y la línea de Miraflores',
    modelName: 'colonial_site',
    hideModel: true,
    style: 'colonial',
    modelSince: 'ciudad',
    scale: 0.65,
    origin: { ...LIMA_SITE_ORIGIN },
    anchor: { ...LIMA_SITE_ORIGIN },
    cameraHeight: 56,
    framing: 'site-biased',
    heightField: {
      size: LIMA_HEIGHTMAP_SIZE,
      worldSize: LIMA_HEIGHTMAP_WORLD_SIZE,
      heights: LIMA_HEIGHTMAP,
      ground: { size: LIMA_GROUND_SIZE, weights: LIMA_GROUND },
      river: { path: LIMA_RIVER_PATH, halfWidth: LIMA_RIVER_HALF_WIDTH },
    },
    pathCellSize: 1,
    phases: { phases: ['ciudad'], initial: 'ciudad' },
    heritageProxies: [],
    blockers: colonialCityBlockers(LIMA_SITE_ORIGIN, 'ciudad'),
    simulationCollision: true,
    blockerPadding: 0.5,
    buildKeepout: [{ x: LIMA_SITE_ORIGIN.x / 256, z: LIMA_SITE_ORIGIN.z / 256, rx: 0.1, rz: 0.11 }],
    wallCollision: { meshPatterns: [/colonial/i], maxStartYAboveBase: 1.2 },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
      moisture: { valleyHeight: 6.2, valleyRange: 3.2, bankStart: 0.12, bankRange: 0.1 },
      water: { deep: '#0f2a2e', shallow: '#2a5652', sheen: 0.15, foam: 0.12, fog: 0.3, refraction: 0.2 },
    },
  },
  // Vilcabamba (1572): the Chanca hillfort GLB is kept as a registry fallback but not loaded; the
  // mission draws a low cloud-forest platform and longhouses (Espíritu Pampa has no surveyed field here).
  vilcabamba_site: {
    id: 'vilcabamba_site',
    label: 'Vilcabamba y Huayna Pucará',
    modelName: 'chanca_site',
    hideModel: true,
    scale: chancaLength(0.7),
    origin: chancaPoint({ x: 112.4, z: 60.8 }),
    anchor: chancaPoint({ x: 112.4, z: 60.8 }),
    cameraHeight: chancaLength(48),
    framing: 'site-biased',
    heightField: {
      size: CHANCA_HEIGHTMAP_SIZE,
      worldSize: CHANCA_HEIGHTMAP_WORLD_SIZE,
      heights: CHANCA_HEIGHTMAP,
      ground: { size: CHANCA_GROUND_SIZE, weights: CHANCA_GROUND },
    },
    pathCellSize: 1,
    heritageProxies: [],
    blockers: [{ ...chancaPoint({ x: 112.4, z: 60.8 }), w: chancaLength(11), d: chancaLength(9) }],
    blockerPadding: chancaLength(0.5),
    buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
    wallCollision: { meshPatterns: [], maxStartYAboveBase: chancaLength(1.2) },
    walkableCorridor: { width: chancaLength(8) },
    // The Urubamba runs dark and quiet under the canopy: low foam keeps the narrow channel from reading
    // as a white ribbon, and the green water separates it from the coastal missions' turquoise sea.
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      flatNormals: true,
      suppressSnow: true,
      water: { deep: '#183a33', shallow: '#35685a', sheen: 0.12, foam: 0.1, fog: 0.3, refraction: 0.15 },
    },
  },
  // Huanacaure (legendary Ayar route) on a new 256 m Pacaritambo–Cusco transect. The ayllu world is
  // drawn by `AylluSite`: cave mouth, Huanacaure shrine, valley hamlets and the planned Inticancha.
  tambotoco_site: {
    id: 'tambotoco_site',
    label: 'Huanacaure y el valle del Cusco',
    modelName: 'ayllu_site',
    style: 'ayllu',
    // Kept for the site contract; the procedural kit draws in world coordinates.
    scale: 0.7,
    origin: { x: TAMBOTOCO_SHRINE.x, z: TAMBOTOCO_SHRINE.z },
    anchor: { x: TAMBOTOCO_SHRINE.x, z: TAMBOTOCO_SHRINE.z },
    cameraHeight: 56,
    openingHeight: 30,
    framing: 'site-biased',
    heightField: {
      size: TAMBOTOCO_HEIGHTMAP_SIZE,
      worldSize: TAMBOTOCO_HEIGHTMAP_WORLD_SIZE,
      heights: TAMBOTOCO_HEIGHTMAP,
      ground: { size: TAMBOTOCO_GROUND_SIZE, weights: TAMBOTOCO_GROUND },
      river: { path: TAMBOTOCO_STREAM_PATH, halfWidth: TAMBOTOCO_STREAM_HALF_WIDTH },
      fords: [{ z: 190, halfWidth: 10 }],
    },
    pathCellSize: 1,
    phases: { phases: ['cave', 'huanacaure', 'inticancha', 'fundada'], initial: 'cave' },
    heritageProxies: [{ id: 'tambotoco_huanacaure', x: TAMBOTOCO_SHRINE.x, z: TAMBOTOCO_SHRINE.z, w: 12, d: 10, h: 5 }],
    blockers: [
      { x: TAMBOTOCO_SHRINE.x, z: TAMBOTOCO_SHRINE.z, w: 12, d: 10 },
      { x: TAMBOTOCO_CAVE.x, z: TAMBOTOCO_CAVE.z, w: 11, d: 9 },
      ...TAMBOTOCO_VILLAGES.flatMap((v) => v.huts.map((h) => ({ x: h.x, z: h.z, w: h.w + 1.4, d: h.d + 1.4 }))),
      ...TAMBOTOCO_INTICANCHA_HUTS.map((h) => ({
        x: h.x,
        z: h.z,
        w: h.w + 1.4,
        d: h.d + 1.4,
        since: 'fundada',
      })),
    ],
    blockerPadding: 0.5,
    buildKeepout: [{ x: TAMBOTOCO_SHRINE.x / 256, z: TAMBOTOCO_SHRINE.z / 256, rx: 0.07, rz: 0.065 }],
    wallCollision: {
      // The ayllu kit owns its own merged geometry and blockers; the hidden GLB is no longer loaded.
      meshPatterns: [],
      maxStartYAboveBase: 1.2,
    },
    walkableCorridor: { width: 8 },
    terrain: {
      ...DEFAULT_SITE_TERRAIN,
      palette: 'cusco_valley',
      pbr: { grass: 'puna_grass', dirt: 'dirt', sand: 'sand', rock: 'rock', snow: 'snow' },
      flatNormals: true,
      suppressSnow: true,
      valleyHaze: true,
      moisture: { valleyHeight: 6.4, valleyRange: 3.2, bankStart: 0.12, bankRange: 0.1 },
      water: { deep: '#2c4748', shallow: '#4e6b65', sheen: 0.1, foam: 0.08, fog: 0.22, refraction: 0.15, grid: 64 },
    },
  },
};

export function getAuthoredSite(id: AuthoredSiteId | null | undefined): AuthoredSiteDef | undefined {
  return id ? AUTHORED_SITES[id] : undefined;
}

/**
 * Whether an authored site is in its late period. Caral's Act IV drought is the documented cue for the
 * final period (granodiorite dwellings and a little maize; docs/historia/campanas/caral.md). No other site
 * reads it, so it derives from the saved environment state instead of adding a field of its own.
 */
export function isLatePeriod(siteId: AuthoredSiteId | undefined, environment: Record<string, number>): boolean {
  return siteId === 'caral_site' && (environment.drought ?? 0) > 0;
}
