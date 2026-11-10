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
