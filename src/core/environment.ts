/**
 * Named environmental events a mission can start. The definition is data (label and duration); the
 * visual/gameplay effect lives in Game so a loaded save can restore the state without replaying losses.
 */
import type { TranslationKey } from '../i18n';

export interface EnvironmentEventDef {
  labelKey: TranslationKey;
  /** Seconds from 0 to 1. */
  duration: number;
}

export const ENVIRONMENT_EVENTS = {
  drought: { labelKey: 'hud.environment.drought', duration: 40 },
  /** The Supe's winter flood: the river rises and the lomas green with the fog. */
  wet_season: { labelKey: 'hud.environment.wetSeason', duration: 30 },
} as const satisfies Record<string, EnvironmentEventDef>;

export type EnvironmentEventId = keyof typeof ENVIRONMENT_EVENTS;

/** Metres the water plane moves per event at full strength (the drought overrides the flood). */
export const WATER_LEVEL_OFFSET = { drought: -0.75, wetSeason: 0.45 } as const;

/** Water-plane offset for the current environment; a full drought wins over any flood still on. */
export function waterLevelOffset(environment: Record<string, number>): number {
  const drought = Math.max(0, Math.min(1, environment.drought ?? 0));
  const wet = Math.max(0, Math.min(1, environment.wet_season ?? 0));
  return WATER_LEVEL_OFFSET.drought * drought + WATER_LEVEL_OFFSET.wetSeason * wet * (1 - drought);
}
