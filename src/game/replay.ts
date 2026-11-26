import type { GameSettings } from '../core/Config';
import type { Resources } from '../core/types';
import type { BuildingKind, CombatStance, Order, OrderTarget, UnitKind } from '../core/types';

/** Bump when the replay schema or the simulation changes in a breaking way (32: m9, 33: m7, 34: m3, 35: m4, 36: m5, 37: m6, 38: m6b and 39: m8 moved to 256 m; 40: Tambotoco E3b ground paint; 41: Vilcabamba's Urubamba and ford, Callao's bay and Quipaipan's arroyo; 42: the withdrawal releases and the Vilcabamba/Miraflores waves; 43: the no-army defeat; 44: the held garrisons of Chimú and Cusco 1536; 45: the authored-site construction rule prefers the mission keepout; 46: the Republican sites take their kit blockers; 47: the Independence sites take their kit blockers; 48: the Moche and Chimú sites take their kit blockers; 49: the Wari and Chanca sites take their kit blockers; 50: the Vilcabamba refuge takes its kit blockers; 51: melee separation also relaxes stopped and attacking units; 52: the separation is cavalry-only, so the foot line keeps its hold stance; 53: Tambotoco's buildings and blockers come from the Killke kit; 54: headless site collision and the fishing retarget skip unreachable banks). */
export const REPLAY_VERSION = 54;

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
  | { kind: 'advanceEra' }
  | { kind: 'market'; action: 'buy' | 'sell'; resource: keyof Resources; amount: number }
  | { kind: 'replant'; buildingId: number };

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

function clearReplay(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Remove a legacy skirmish replay, including replays from older schema versions. */
export function clearSkirmishReplay(): void {
  try {
    const replay = loadReplay();
    if (replay) {
      if (!replay.settings.missionId) localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { settings?: { missionId?: unknown } };
    const missionId = parsed?.settings?.missionId;
    if (typeof missionId !== 'string' || !missionId) localStorage.removeItem(STORAGE_KEY);
  } catch {
    clearReplay();
  }
}
