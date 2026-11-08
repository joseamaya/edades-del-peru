/**
 * Named environmental events a mission can start. The definition is data (label and duration); the
 * visual/gameplay effect lives in Game so a loaded save can restore the state without replaying losses.
 */
export interface EnvironmentEventDef {
  label: string;
  /** Seconds from 0 to 1. */
  duration: number;
}

export const ENVIRONMENT_EVENTS = {
  drought: { label: 'Sequía', duration: 40 },
} as const satisfies Record<string, EnvironmentEventDef>;

export type EnvironmentEventId = keyof typeof ENVIRONMENT_EVENTS;
