import { CivId, Geography, HistoricalPeriod, MapType } from '../../core/types';
import { getCiv } from './civs';
import { getPeriod } from './periods';
import { landmarkForCiv, type LandmarkId } from './landmarks';
import { archProfileFor, type HistoricalArchitectureProfile } from './architecture';

/**
 * Geographic region of a map. Finer than `MapType` (which stays as the playable
 * terrain family): several regions share one `MapType` (all coasts are `coast`).
 */
export type GeographicRegion =
  'north_coast' | 'central_coast' | 'south_coast' | 'andean_valley' | 'high_andes' | 'altiplano' | 'amazon';

export type SoilKind = 'sandy' | 'loam' | 'clay' | 'peaty' | 'rocky';

/** Tree/foliage variant (shared with the instancing manager). */
export type TreeVariant = 'broad' | 'needle' | 'frond';

export interface ResourceProfile {
  /** Relative weight of each gatherable node (tree/mine/well/berry). */
  tree: number;
  mine: number;
  well: number;
  berry: number;
  /** Absolute counts of animals and fishing spots. */
  hunt: number;
  fishing: number;
}

/**
 * Data-driven visual/natural identity of a map. Modifies the existing procedural
 * generator (it does not replace it): the same seed + profile is deterministic.
 */
export interface HistoricalMapProfile {
  id: string;
  region: GeographicRegion;
  /** Playable terrain family (matches the region's default map). */
  baseMapType: MapType;
  terrain: {
    soil: SoilKind;
    fbmScale: number;
    fbmOctaves: number;
    fbmOffset: number;
    baseGain: number;
    baseBias: number;
    borderCarve: number;
    mtnAmp: number;
    riverCount: number;
    riverWidth: number;
    /** Chance of agricultural terracing (andenes) on buildable slopes. */
    terraceChance: number;
  };
  elevation: {
    snowLine: number;
  };
  climate: {
    /** 0 humid .. 1 desert. */
    aridity: number;
    /** 0 dry .. 1 humid. */
    moisture: number;
    /** 0 cold .. 1 hot. */
    temperature: number;
  };
  water: {
    level: number;
    inland: boolean;
    /** Bofedales / humedales present. */
    wetland: boolean;
  };
  vegetation: {
    density: number;
    variants: Partial<Record<TreeVariant, number>>;
  };
  resources: ResourceProfile;
  atmosphere: {
    fogDensity: number;
    sunWarmth: number;
    skyTint: string;
  };
  landmark: LandmarkId | null;
  provenance: string;
}

/** The resolved visual world: natural map plus the architecture of the civilization. */
export interface WorldProfile {
  map: HistoricalMapProfile;
  architecture: HistoricalArchitectureProfile;
}

/** Sea/lake level shared by every map (matches `Terrain.waterLevel`). */
export const WATER_LEVEL = 2.2;

const MAPTYPE_REGION: Record<MapType, GeographicRegion> = {
  coast: 'central_coast',
  andes: 'andean_valley',
  altiplano: 'altiplano',
  jungle: 'amazon',
};

const REGION_MAP: Record<GeographicRegion, MapType> = {
  north_coast: 'coast',
  central_coast: 'coast',
  south_coast: 'coast',
  andean_valley: 'andes',
  high_andes: 'andes',
  altiplano: 'altiplano',
  amazon: 'jungle',
};

const GEOGRAPHY_REGION: Record<Geography, GeographicRegion> = {
  coast: MAPTYPE_REGION.coast,
  andes: MAPTYPE_REGION.andes,
  altiplano: MAPTYPE_REGION.altiplano,
};

/** Documented region of a civilization (from `docs/historia/mapas.md`). */
const CIV_REGION: Partial<Record<CivId, GeographicRegion>> = {
  [CivId.CUPISNIQUE]: 'north_coast',
  [CivId.MOCHE]: 'north_coast',
  [CivId.CHIMU]: 'north_coast',
  [CivId.PARACAS]: 'south_coast',
  [CivId.NAZCA]: 'south_coast',
  [CivId.CHINCHA]: 'south_coast',
  [CivId.WARI]: 'high_andes',
  [CivId.CHANCA]: 'high_andes',
  [CivId.INCA]: 'high_andes',
  [CivId.TIAHUANACO]: 'altiplano',
  [CivId.COLLAS_LUPACA]: 'altiplano',
  [CivId.CARAL]: 'central_coast',
};

export function regionDefaultMap(region: GeographicRegion): MapType {
  return REGION_MAP[region];
}

export function regionForCiv(id: CivId): GeographicRegion {
  return CIV_REGION[id] ?? GEOGRAPHY_REGION[getCiv(id).geography];
}

export function regionForMapType(mapType: MapType): GeographicRegion {
  return MAPTYPE_REGION[mapType];
}

const COAST_TERRAIN = {
  fbmScale: 1.0,
  fbmOctaves: 4,
  fbmOffset: 13,
  baseGain: 0.16,
  baseBias: 0.74,
  borderCarve: 1.0,
  mtnAmp: 5,
  riverCount: 2,
  riverWidth: 1.6,
};

const ANDES_TERRAIN = {
  fbmScale: 1.1,
  fbmOctaves: 4,
  fbmOffset: 41,
  baseGain: 0.24,
  baseBias: 0.64,
  borderCarve: 0,
  mtnAmp: 16,
  riverCount: 2,
  riverWidth: 1.6,
};

const ALTIPLANO_TERRAIN = {
  fbmScale: 0.9,
  fbmOctaves: 3,
  fbmOffset: 21,
  baseGain: 0.14,
  baseBias: 0.64,
  borderCarve: 0,
  mtnAmp: 8,
  riverCount: 1,
  riverWidth: 1.4,
};

const JUNGLE_TERRAIN = {
  fbmScale: 1.1,
  fbmOctaves: 3,
  fbmOffset: 31,
  baseGain: 0.25,
  baseBias: 0.66,
  borderCarve: 0.7,
  mtnAmp: 9,
  riverCount: 3,
  riverWidth: 2.2,
};

export const MAP_PROFILES: Record<GeographicRegion, HistoricalMapProfile> = {
  north_coast: {
    id: 'north_coast',
    region: 'north_coast',
    baseMapType: 'coast',
    terrain: { ...COAST_TERRAIN, soil: 'sandy', terraceChance: 0.15 },
    elevation: { snowLine: 20 },
    climate: { aridity: 0.92, moisture: 0.28, temperature: 0.82 },
    water: { level: WATER_LEVEL, inland: false, wetland: true },
    vegetation: { density: 0.06, variants: { broad: 1 } },
    resources: { tree: 0.3, mine: 0.4, well: 0.2, berry: 0.15, hunt: 12, fishing: 8 },
    atmosphere: { fogDensity: 0.015, sunWarmth: 1.05, skyTint: '#dfe4d8' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Moche: Chicama-Moche-Virú; Chimú: Chan Chan)',
  },
  central_coast: {
    id: 'central_coast',
    region: 'central_coast',
    baseMapType: 'coast',
    terrain: { ...COAST_TERRAIN, soil: 'loam', terraceChance: 0.2 },
    elevation: { snowLine: 20 },
    climate: { aridity: 0.82, moisture: 0.35, temperature: 0.8 },
    water: { level: WATER_LEVEL, inland: false, wetland: true },
    vegetation: { density: 0.12, variants: { broad: 1 } },
    resources: { tree: 0.4, mine: 0.12, well: 0.28, berry: 0.25, hunt: 12, fishing: 8 },
    atmosphere: { fogDensity: 0.02, sunWarmth: 1.0, skyTint: '#e2e6dc' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Caral-Supe: valle de Supe y Áspero)',
  },
  south_coast: {
    id: 'south_coast',
    region: 'south_coast',
    baseMapType: 'coast',
    terrain: { ...COAST_TERRAIN, soil: 'sandy', terraceChance: 0.1 },
    elevation: { snowLine: 20 },
    climate: { aridity: 0.95, moisture: 0.22, temperature: 0.85 },
    water: { level: WATER_LEVEL, inland: false, wetland: false },
    vegetation: { density: 0.04, variants: { broad: 1 } },
    resources: { tree: 0.25, mine: 0.45, well: 0.15, berry: 0.1, hunt: 8, fishing: 10 },
    atmosphere: { fogDensity: 0.012, sunWarmth: 1.08, skyTint: '#e6e2d6' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Paracas, Nazca, Chincha: costa desértica sur)',
  },
  andean_valley: {
    id: 'andean_valley',
    region: 'andean_valley',
    baseMapType: 'andes',
    terrain: { ...ANDES_TERRAIN, soil: 'loam', terraceChance: 0.45 },
    elevation: { snowLine: 15 },
    climate: { aridity: 0.1, moisture: 0.75, temperature: 0.45 },
    water: { level: WATER_LEVEL, inland: true, wetland: false },
    vegetation: { density: 0.55, variants: { broad: 0.7, needle: 0.3 } },
    resources: { tree: 0.45, mine: 0.35, well: 0.2, berry: 0.2, hunt: 14, fishing: 0 },
    atmosphere: { fogDensity: 0.025, sunWarmth: 0.95, skyTint: '#cdd8d2' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Chavín: Callejón de Conchucos; Recuay: Callejón de Huaylas)',
  },
  high_andes: {
    id: 'high_andes',
    region: 'high_andes',
    baseMapType: 'andes',
    terrain: { ...ANDES_TERRAIN, soil: 'rocky', baseBias: 0.62, mtnAmp: 17, terraceChance: 0.7 },
    elevation: { snowLine: 13 },
    climate: { aridity: 0.15, moisture: 0.6, temperature: 0.3 },
    water: { level: WATER_LEVEL, inland: true, wetland: false },
    vegetation: { density: 0.5, variants: { broad: 0.5, needle: 0.5 } },
    resources: { tree: 0.4, mine: 0.4, well: 0.25, berry: 0.15, hunt: 12, fishing: 0 },
    atmosphere: { fogDensity: 0.028, sunWarmth: 0.98, skyTint: '#c8d4d8' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Inca: Cusco/Urubamba; Wari: Ayacucho; Chanca: Andahuaylas)',
  },
  altiplano: {
    id: 'altiplano',
    region: 'altiplano',
    baseMapType: 'altiplano',
    terrain: { ...ALTIPLANO_TERRAIN, soil: 'peaty', terraceChance: 0.35 },
    elevation: { snowLine: 14 },
    climate: { aridity: 0.4, moisture: 0.5, temperature: 0.25 },
    water: { level: WATER_LEVEL, inland: true, wetland: true },
    vegetation: { density: 0.15, variants: { needle: 0.7, broad: 0.3 } },
    resources: { tree: 0.1, mine: 0.3, well: 0.4, berry: 0.15, hunt: 16, fishing: 6 },
    atmosphere: { fogDensity: 0.022, sunWarmth: 0.9, skyTint: '#d2dadf' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (Tiahuanaco, Collas/Lupaca: meseta del Titicaca)',
  },
  amazon: {
    id: 'amazon',
    region: 'amazon',
    baseMapType: 'jungle',
    terrain: { ...JUNGLE_TERRAIN, soil: 'clay', terraceChance: 0.05 },
    elevation: { snowLine: 22 },
    climate: { aridity: 0, moisture: 1, temperature: 0.95 },
    water: { level: WATER_LEVEL, inland: true, wetland: true },
    vegetation: { density: 1, variants: { frond: 0.7, broad: 0.3 } },
    resources: { tree: 0.7, mine: 0.1, well: 0.15, berry: 0.25, hunt: 10, fishing: 8 },
    atmosphere: { fogDensity: 0.04, sunWarmth: 0.92, skyTint: '#c4d2be' },
    landmark: null,
    provenance: 'docs/historia/mapas.md (selva alta: ceja de selva / amazonía)',
  },
};

export function profileForMapType(mapType: MapType): HistoricalMapProfile {
  return MAP_PROFILES[regionForMapType(mapType)];
}

/**
 * Region used for a match. An explicit region wins; otherwise the civilization's
 * region is used when it matches the map type (e.g. Moche on a coast map →
 * north_coast), and the map type's default region otherwise (e.g. the Inca
 * fighting on a coastal scenario → central_coast, not the high Andes). This keeps
 * the map selector and the campaign's `map.type` authoritative over the terrain.
 */
function resolveRegion(opts: { civ: CivId; mapType: MapType; region?: GeographicRegion }): GeographicRegion {
  if (opts.region) return opts.region;
  const civRegion = regionForCiv(opts.civ);
  return regionDefaultMap(civRegion) === opts.mapType ? civRegion : regionForMapType(opts.mapType);
}

/**
 * Resolve the natural map profile from `HistoricalPeriod + GeographicRegion +
 * Civilization + MapType`. The region (map type + civ) drives terrain, climate,
 * vegetation and resources; the period gates the landmark.
 */
export function resolveMapProfile(opts: {
  period: HistoricalPeriod;
  civ: CivId;
  mapType: MapType;
  region?: GeographicRegion;
}): HistoricalMapProfile {
  const region = resolveRegion(opts);
  return {
    ...MAP_PROFILES[region],
    baseMapType: regionDefaultMap(region),
    landmark: landmarkForCiv(opts.civ, opts.period),
  };
}

/**
 * Resolve the full visual world (natural map + civilization architecture) from
 * `HistoricalPeriod + GeographicRegion + Civilization + MapType`.
 */
export function resolveWorldProfile(opts: {
  period: HistoricalPeriod;
  civ: CivId;
  mapType: MapType;
  region?: GeographicRegion;
}): WorldProfile {
  return {
    map: resolveMapProfile(opts),
    architecture: archProfileFor(opts.civ, getPeriod(opts.period).level),
  };
}
