import { HistoricalPeriod } from '../../core/types';
import type { HistoricalMapProfile } from './profiles';

/**
 * Display-referred color grade applied after tone mapping (identity = neutral).
 * Deliberately conservative so it never fights the NeutralToneMapping.
 */
export interface ColorGrade {
  /** Color saturation multiplier (1 = unchanged). */
  saturation: number;
  /** Contrast multiplier around mid grey (1 = unchanged). */
  contrast: number;
  /** Additive shadow lift per channel, 0 = none. */
  lift: [number, number, number];
  /** Multiplicative gain per channel (1 = unchanged). */
  gain: [number, number, number];
  /** Warm (+) / cool (-) white-balance shift, in -1..1. */
  temperature: number;
}

export const NEUTRAL_GRADE: ColorGrade = {
  saturation: 1,
  contrast: 1,
  lift: [0, 0, 0],
  gain: [1, 1, 1],
  temperature: 0,
};

/**
 * Visual identity per historical period (see `docs/historia/`). Not a historical
 * claim: a mood — warm dry coast, cold crisp highlands, muted colonial, dramatic
 * republican desaturation.
 */
export const PERIOD_GRADES: Record<HistoricalPeriod, ColorGrade> = {
  [HistoricalPeriod.ARCHAIC]: {
    saturation: 1.04,
    contrast: 1.03,
    lift: [0.012, 0.005, 0],
    gain: [1.05, 1.01, 0.96],
    temperature: 0.3,
  },
  [HistoricalPeriod.EARLY_HORIZON]: {
    saturation: 0.96,
    contrast: 1.02,
    lift: [0, 0.004, 0.01],
    gain: [0.98, 1.0, 1.04],
    temperature: -0.25,
  },
  [HistoricalPeriod.EARLY_INTERMEDIATE]: {
    saturation: 1.08,
    contrast: 1.05,
    lift: [0.01, 0.003, 0],
    gain: [1.06, 1.0, 0.95],
    temperature: 0.3,
  },
  [HistoricalPeriod.MIDDLE_HORIZON]: {
    saturation: 1.02,
    contrast: 1.06,
    lift: [0, 0.004, 0.008],
    gain: [0.99, 1.0, 1.03],
    temperature: -0.15,
  },
  [HistoricalPeriod.LATE_INTERMEDIATE]: {
    saturation: 1.05,
    contrast: 1.04,
    lift: [0.008, 0.003, 0],
    gain: [1.05, 1.01, 0.97],
    temperature: 0.2,
  },
  [HistoricalPeriod.LATE_HORIZON]: {
    saturation: 1.06,
    contrast: 1.06,
    lift: [0.004, 0.004, 0.006],
    gain: [1.02, 1.02, 1.02],
    temperature: -0.1,
  },
  [HistoricalPeriod.VICEROYALTY]: {
    saturation: 0.88,
    contrast: 1.03,
    lift: [0.02, 0.012, 0.0],
    gain: [1.06, 1.0, 0.9],
    temperature: 0.25,
  },
  [HistoricalPeriod.INDEPENDENCE]: {
    saturation: 0.92,
    contrast: 1.06,
    lift: [0.006, 0.006, 0.008],
    gain: [1.03, 1.0, 0.98],
    temperature: 0.1,
  },
  [HistoricalPeriod.REPUBLIC]: {
    saturation: 0.82,
    contrast: 1.08,
    lift: [0.01, 0.01, 0.014],
    gain: [1.02, 0.99, 0.96],
    temperature: -0.15,
  },
  [HistoricalPeriod.CONTEMPORARY]: {
    saturation: 0.98,
    contrast: 1.02,
    lift: [0, 0.002, 0.006],
    gain: [1.0, 1.0, 1.02],
    temperature: -0.05,
  },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function gradeForPeriod(period: HistoricalPeriod): ColorGrade {
  return PERIOD_GRADES[period] ?? NEUTRAL_GRADE;
}

/**
 * The period's grade nudged by the biome: hot/arid regions run a touch warmer and
 * more saturated, cold regions a touch cooler. Pure and deterministic.
 */
export function resolveColorGrade(period: HistoricalPeriod, profile: HistoricalMapProfile): ColorGrade {
  const base = gradeForPeriod(period);
  const warmth = (profile.climate.temperature - 0.5) * 0.24;
  const aridity = (profile.climate.aridity - 0.5) * 0.1;
  return {
    saturation: clamp(base.saturation + aridity, 0.6, 1.4),
    contrast: base.contrast,
    lift: [base.lift[0], base.lift[1], base.lift[2]],
    gain: [base.gain[0], base.gain[1], base.gain[2]],
    temperature: clamp(base.temperature + warmth, -1, 1),
  };
}
