import type { GameSettings } from '../core/Config';
import type { BuildingKind, CombatStance, Order, OrderTarget, UnitKind } from '../core/types';

/** Bump when the replay schema or the simulation changes in a breaking way. */
export const REPLAY_VERSION = 9;

/** Stable localStorage key (see AGENTS: keep storage keys stable). */
const STORAGE_KEY = 'peru-replay';

/**
 * A player command recorded for a replay. Only *player intent* is recorded —
 * everything the simulation derives itself (AI decisions, auto-orders, spawn
 * positions) is reproduced by re-running the same seed.
 */
export type PlayerCommand =
  | { kind: 'order'; unitIds: number[]; order: Order; clear: boolean }
  | { kind: 'stop'; unitIds: number[] }
  | { kind: 'place'; building: BuildingKind; x: number; z: number }
  | { kind: 'train'; buildingId: number; unit: UnitKind }
  | { kind: 'research'; buildingId: number; tech: string }
  | { kind: 'cancel'; buildingId: number; index: number }
  | { kind: 'ungarrison'; buildingId: number }
  | { kind: 'rally'; buildingId: number; target: OrderTarget }
  | { kind: 'stance'; unitIds: number[]; stance: CombatStance }
  | { kind: 'advanceEra' };

/** A command stamped with the simulation step it was issued on. */
export interface TimedCommand {
  step: number;
  cmd: PlayerCommand;
}

export interface Replay {
  version: number;
  settings: GameSettings;
  commands: TimedCommand[];
}

/** Collects player commands during a live match. */
export class ReplayRecorder {
  private commands: TimedCommand[] = [];
  constructor(private settings: GameSettings) {}

  record(step: number, cmd: PlayerCommand): void {
    this.commands.push({ step, cmd });
  }

  toReplay(): Replay {
    return { version: REPLAY_VERSION, settings: { ...this.settings }, commands: this.commands };
  }
}

/** Feeds recorded commands back into a game at the right step. */
export class ReplayPlayer {
  private index = 0;
  constructor(readonly replay: Replay) {}

  /** Commands due at or before `step`, in recorded order. */
  commandsFor(step: number): PlayerCommand[] {
    const out: PlayerCommand[] = [];
    while (this.index < this.replay.commands.length && this.replay.commands[this.index].step <= step) {
      out.push(this.replay.commands[this.index].cmd);
      this.index++;
    }
    return out;
  }
}

/** Validate an arbitrary object as a replay of the current version. */
export function validateReplay(raw: unknown): Replay | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== REPLAY_VERSION) return null;
  if (!r.settings || typeof r.settings !== 'object') return null;
  if (!Array.isArray(r.commands)) return null;
  return raw as Replay;
}

export function saveReplay(replay: Replay): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replay));
    return true;
  } catch {
    return false;
  }
}

export function loadReplay(): Replay | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? validateReplay(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function hasReplay(): boolean {
  return loadReplay() !== null;
}
