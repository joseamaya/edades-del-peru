import type { Game } from '../core/Game';
import type { PlayerState } from '../core/types';
import { SAVE_VERSION, SaveData, PlayerSave } from './saveTypes';

/** Stable localStorage key (see AGENTS: keep storage keys stable). */
const STORAGE_KEY = 'peru-save';

function toPlayerSave(p: PlayerState): PlayerSave {
  return {
    id: p.id,
    civ: p.civ,
    resources: { ...p.resources },
    populationUsed: p.populationUsed,
    era: p.era,
    ageBuildings: p.ageBuildings,
    techs: [...p.techs],
    alive: p.alive,
    kills: p.kills,
    totalLost: p.totalLost,
    wonderActive: p.wonderActive,
    stats: { ...p.stats },
  };
}

/** Capture the full gameplay state of a match. */
export function serializeGame(game: Game): SaveData {
  const cam = game.camera;
  const target = cam.getTarget();
  return {
    version: SAVE_VERSION,
    settings: { ...game.settings },
    rngState: game.rng.getState(),
    camera: { x: target.x, z: target.z, zoom: cam.getZoom(), yaw: cam.getYaw() },
    fog: game.fow.serialize(),
    players: game.players.map(toPlayerSave),
    units: [...game.units.values()].filter((u) => !u.dead).map((u) => u.toSave()),
    buildings: [...game.buildings.values()].filter((b) => !b.dead).map((b) => b.toSave()),
    resourceNodes: [...game.resourceNodes.values()].filter((n) => !n.dead && !n.depleted).map((n) => n.toSave()),
  };
}

/** Validate an arbitrary object as a save of the current version. */
export function validateSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== SAVE_VERSION) return null;
  if (!r.settings || !Array.isArray(r.players) || !Array.isArray(r.units) || !Array.isArray(r.buildings)) return null;
  if (!Array.isArray(r.resourceNodes)) return null;
  return raw as SaveData;
}

export function saveToStorage(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}

export function loadFromStorage(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? validateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
