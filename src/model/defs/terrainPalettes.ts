import { smoothstep } from '../../util/math';

/** Data-driven terrain palettes: material tints and macro height bands. */

export type TerrainPaletteId =
  'north_coast' | 'central_coast' | 'south_coast' | 'andean_valley' | 'high_andes' | 'altiplano' | 'amazon' | 'caral';

/** Shared landform thresholds (world units; slope is the raw height delta used by the mesh). */
export const TERRAIN_BAND_RANGES = {
  valleyOffset: 1,
  valleyRange: 6,
  lomaStart: 4.5,
  lomaEnd: 12,
  slopeStart: 1.8,
  slopeEnd: 4.5,
} as const;

export interface TerrainBandWeights {
  valley: number;
  slope: number;
  loma: number;
  summit: number;
}

/** Normalized band weights; summit wins over slope so snowy peaks stay snowy. */
export function terrainBandWeights(
  height: number,
  slope: number,
  waterLevel: number,
  snowLine: number,
  suppressSnow = false,
): TerrainBandWeights {
  const r = TERRAIN_BAND_RANGES;
  const valley = 1 - smoothstep(waterLevel + r.valleyOffset, waterLevel + r.valleyOffset + r.valleyRange, height);
  const loma = smoothstep(r.lomaStart, r.lomaEnd, height);
  const summit = suppressSnow ? 0 : smoothstep(snowLine - 6, snowLine, height);
  const slopeBand = smoothstep(r.slopeStart, r.slopeEnd, slope);

  let wSummit = summit;
  let wSlope = slopeBand * (1 - summit);
  let wLoma = loma * (1 - summit) * (1 - slopeBand);
  let wValley = valley * (1 - loma) * (1 - slopeBand) * (1 - summit);
  const sum = wValley + wSlope + wLoma + wSummit;
  if (sum > 0) {
    const inv = 1 / sum;
    wValley *= inv;
    wSlope *= inv;
    wLoma *= inv;
    wSummit *= inv;
  } else {
    wValley = 1;
  }
  return { valley: wValley, slope: wSlope, loma: wLoma, summit: wSummit };
}

export interface TerrainPalette {
  /** Multipliers applied to the packed material albedo (near-white preserves detail). */
  materials: {
    grass: string;
    dirt: string;
    sand: string;
    rock: string;
    snow: string;
  };
  /** Macro colours blended by landform; muted so the albedo still reads. */
  bands: {
    valley: string;
    slope: string;
    loma: string;
    summit: string;
  };
  /** How much textured albedo replaces the band colour (0..1). */
  textureMix: number;
  /** Extra aerial-perspective cap on authored high-relief sites. */
  fogCapBoost?: number;
}

export const TERRAIN_PALETTES: Record<TerrainPaletteId, TerrainPalette> = {
  north_coast: {
    materials: {
      grass: '#f8f0d8',
      dirt: '#f8e8d0',
      sand: '#fff0e0',
      rock: '#e8e0d8',
      snow: '#ffffff',
    },
    bands: { valley: '#7a9a5a', slope: '#b0a080', loma: '#c8b090', summit: '#d8d0c0' },
    textureMix: 0.82,
  },
  central_coast: {
    materials: {
      grass: '#f8f0d8',
      dirt: '#f8e8d0',
      sand: '#fff0e0',
      rock: '#e8e0d8',
      snow: '#ffffff',
    },
    bands: { valley: '#7a9a5a', slope: '#b0a080', loma: '#c8b090', summit: '#d8d0c0' },
    textureMix: 0.82,
  },
  south_coast: {
    materials: {
      grass: '#f8d890',
      dirt: '#f0c890',
      sand: '#f8d8a0',
      rock: '#e0c8a8',
      snow: '#ffffff',
    },
    bands: { valley: '#7a8a4a', slope: '#b09868', loma: '#c0a870', summit: '#d0c8b8' },
    textureMix: 0.82,
  },
  andean_valley: {
    materials: {
      grass: '#d8f0b0',
      dirt: '#e8d0b0',
      sand: '#f0e0c0',
      rock: '#d8d0d0',
      snow: '#ffffff',
    },
    bands: { valley: '#4a7a2a', slope: '#7a8a4a', loma: '#9a9a60', summit: '#c0c8b8' },
    textureMix: 0.84,
  },
  high_andes: {
    materials: {
      grass: '#f0d898',
      dirt: '#e8c898',
      sand: '#f0d8a8',
      rock: '#d8c8c8',
      snow: '#ffffff',
    },
    bands: { valley: '#7a7a4a', slope: '#a08860', loma: '#b89a68', summit: '#d0c8b8' },
    textureMix: 0.82,
  },
  altiplano: {
    materials: {
      grass: '#f0e0a8',
      dirt: '#f0d0a8',
      sand: '#f8e0b8',
      rock: '#e8d8c8',
      snow: '#ffffff',
    },
    bands: { valley: '#9a8a4a', slope: '#c0a060', loma: '#d0b070', summit: '#e0d8c0' },
    textureMix: 0.82,
  },
  amazon: {
    materials: {
      grass: '#b8f090',
      dirt: '#e0a888',
      sand: '#e8c8a8',
      rock: '#b8b0a0',
      snow: '#ffffff',
    },
    bands: { valley: '#2f6a2a', slope: '#6a5a32', loma: '#7a6538', summit: '#9a8a68' },
    textureMix: 0.84,
  },
  caral: {
    materials: {
      grass: '#f8e8b0',
      dirt: '#f0e0c8',
      sand: '#fff0d8',
      rock: '#e8d8c8',
      snow: '#ffffff',
    },
    bands: { valley: '#5a7a3a', slope: '#a08a68', loma: '#b89a70', summit: '#c8c0b0' },
    textureMix: 0.78,
    fogCapBoost: 0.08,
  },
};
