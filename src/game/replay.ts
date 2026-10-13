import type { Game } from '../core/Game';
import type { GameSettings } from '../core/Config';
import type { BuildingKind, Order, OrderTarget, UnitKind } from '../core/types';
import { hashCode } from '../util/rng';

/** Bump when the replay schema or the simulation changes in a breaking way. */
export const REPLAY_VERSION = 1;

/** Stable localStorage key (see AGENTS: keep storage keys stable). */
const STORAGE_KEY = 'peru-replay';

export type CombatStance = 'agresivo' | 'defensivo' | 'pasivo';

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

  get done(): boolean {
    return this.index >= this.replay.commands.length;
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

/**
 * A stable hash of the gameplay-relevant state, used to prove that a replay
 * reproduces a match exactly. Visuals (camera, fog, particles, animation
 * phases) are deliberately excluded.
 */
export function stateHash(game: Game): number {
  const units = [...game.units.values()]
    .filter((u) => !u.dead)
    .sort((a, b) => a.id - b.id)
    .map((u) => [
      u.id,
      u.owner,
      u.kind,
      u.pos.x,
      u.pos.z,
      u.hp,
      u.orderQueue.map((o) => [o.kind, o.entityId ?? null, o.target?.x ?? null, o.target?.z ?? null]),
    ]);
  const buildings = [...game.buildings.values()]
    .filter((b) => !b.dead)
    .sort((a, b) => a.id - b.id)
    .map((b) => [
      b.id,
      b.owner,
      b.kind,
      b.pos.x,
      b.pos.z,
      b.hp,
      b.constructionComplete,
      b.constructionProgress,
      b.productionQueue.map((q) => q.unit),
      b.researchQueue,
      b.foodAmount,
    ]);
  const nodes = [...game.resourceNodes.values()]
    .filter((n) => !n.dead)
    .sort((a, b) => a.id - b.id)
    .map((n) => [n.id, n.amount, n.depleted]);
  const players = game.players.map((p) => [
    p.id,
    p.era,
    p.resources.food,
    p.resources.wood,
    p.resources.silver,
    p.resources.stone,
    p.populationUsed,
    [...p.techs].sort(),
    p.alive,
  ]);
  return hashCode(JSON.stringify({ units, buildings, nodes, players, rng: game.rng.getState() }));
}
