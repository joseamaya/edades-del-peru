import { Game, setAutoStart } from './core/Game';
import * as THREE from 'three';
import { GameSettings, DEFAULT_SETTINGS } from './core/Config';
import { BuildingKind, CivId, HistoricalPeriod } from './core/types';
import { getBuildingStats } from './model/defs/buildings';
import { CIVS, civsForPeriod } from './model/defs/civs';
import { getPeriod } from './model/defs/periods';
import { loadFromStorage } from './game/SaveGame';
import { loadReplay } from './game/replay';
import { loadMods, ModLoadResult } from './game/Mods';

/** Read saved settings or use the defaults, validating each field. */
function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem('peru-settings');
    if (raw) return sanitizeSettings(JSON.parse(raw));
  } catch {
    /* noop */
  }
  return { ...DEFAULT_SETTINGS };
}

const MAP_SIZES = [128, 192, 256];
const MAP_TYPES = ['coast', 'andes', 'altiplano', 'jungle', 'continente', 'archipielago', 'lago', 'estepas'];
const CIV_IDS = CIVS.map((c) => c.id) as string[];
const PERIOD_IDS = Object.values(HistoricalPeriod).filter((v) => typeof v === 'number') as number[];
const DIFFICULTIES = ['easy', 'normal', 'hard', 'legendary'];
const TIMES_OF_DAY = ['morning', 'noon', 'dusk', 'night'];
const VICTORY_MODES = ['conquest', 'wonder'];

/** Validate and normalize an arbitrary settings object. */
function sanitizeSettings(raw: unknown): GameSettings {
  const s: GameSettings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (MAP_SIZES.includes(r.mapSize as number)) s.mapSize = r.mapSize as number;
  if (MAP_TYPES.includes(r.mapType as string)) s.mapType = r.mapType as GameSettings['mapType'];
  if (Number.isFinite(r.mapSeed)) s.mapSeed = Math.floor(r.mapSeed as number);
  if (CIV_IDS.includes(r.civPlayer as string)) s.civPlayer = r.civPlayer as CivId;
  if (CIV_IDS.includes(r.civAI as string)) s.civAI = r.civAI as CivId;
  if (PERIOD_IDS.includes(r.period as number)) s.period = r.period as HistoricalPeriod;
  if (DIFFICULTIES.includes(r.difficulty as string)) s.difficulty = r.difficulty as GameSettings['difficulty'];
  if (Number.isFinite(r.populationCap)) s.populationCap = Math.max(1, Math.floor(r.populationCap as number));
  if (Number.isFinite(r.gameSpeed)) s.gameSpeed = r.gameSpeed as number;
  if (TIMES_OF_DAY.includes(r.timeOfDay as string)) s.timeOfDay = r.timeOfDay as GameSettings['timeOfDay'];
  if (typeof r.fogOfWar === 'boolean') s.fogOfWar = r.fogOfWar;
  if (typeof r.soundEnabled === 'boolean') s.soundEnabled = r.soundEnabled;
  if (typeof r.musicEnabled === 'boolean') s.musicEnabled = r.musicEnabled;
  if (typeof r.showHints === 'boolean') s.showHints = r.showHints;
  if (typeof r.cinematic === 'boolean') s.cinematic = r.cinematic;
  if (typeof r.rotateCamera === 'boolean') s.rotateCamera = r.rotateCamera;
  if (VICTORY_MODES.includes(r.victoryMode as string)) s.victoryMode = r.victoryMode as GameSettings['victoryMode'];
  if (typeof r.missionId === 'string' && r.missionId) s.missionId = r.missionId;
  if (Array.isArray(r.activeMods)) s.activeMods = r.activeMods.filter((x): x is string => typeof x === 'string');
  // the tech level is derived from the period (period-locked matches)
  s.startingEra = getPeriod(s.period).level;
  // guarantee that the civs belong to the period and that the rival is different
  const disp = civsForPeriod(s.period);
  if (!disp.some((c) => c.id === s.civPlayer)) s.civPlayer = disp[0].id;
  if (s.civAI === s.civPlayer || !disp.some((c) => c.id === s.civAI)) {
    const rival = disp.find((c) => c.id !== s.civPlayer) ?? disp[0];
    s.civAI = rival.id;
  }
  return s;
}

function intParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function floatParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const wantsLoad = params.get('load') === '1';
  const wantsReplay = params.get('replay') === '1';
  const snapshot = wantsLoad ? loadFromStorage() : null;
  const replay = wantsReplay ? loadReplay() : null;
  const settings = snapshot ? { ...snapshot.settings } : replay ? { ...replay.settings } : loadSettings();
  if (!snapshot && !replay) {
    if (params.get('mission')) settings.missionId = params.get('mission')!;
    if (params.get('fog') === '0') settings.fogOfWar = false;
    if (params.get('seed') !== null) settings.mapSeed = intParam(params, 'seed', settings.mapSeed);
    if (params.get('period') !== null) {
      settings.period = intParam(params, 'period', settings.period) as HistoricalPeriod;
      Object.assign(settings, sanitizeSettings(settings));
    }
  }
  // mods are data patches over the defs: load them before building the game
  const modParam = params.get('mod');
  const activeMods = modParam
    ? modParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : (settings.activeMods ?? []);
  let modResult: ModLoadResult = { loaded: [], errors: [] };
  if (activeMods.length) {
    const result = await loadMods(activeMods);
    settings.activeMods = result.loaded;
    for (const err of result.errors) console.warn('[mods]', err);
    modResult = result;
  }
  (window as unknown as { __mods?: unknown }).__mods = modResult;
  if (params.get('noloop') === '1') setAutoStart(false);
  const game = new Game(settings, snapshot, replay);
  (window as any).game = game;
  (window as any).THREE = THREE;
  if (params.get('fps') === '1') game.hud.setShowFps(true);
  if (replay) game.hud.showToast('🎬 Repetición', 'info');
  game.postfx.setCinematic(settings.cinematic);
  if (params.get('low') === '1') {
    game.pixelRatioOverride = 1;
    game.renderer.setPixelRatio(1);
    game.postfx.setCinematic(false);
    game.postfx.setQuality('low');
    game.postfx.vignetteEnabled = false;
  }
  if (params.get('speed') !== null) game.loop.speed = Math.max(0.25, floatParam(params, 'speed', 1));
  if (params.get('era') !== null && !settings.missionId && !snapshot) {
    const target = intParam(params, 'era', 0);
    game.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    let guard = 0;
    while (game.players[0].era < target && guard++ < 8) {
      const ok = game.advanceEra(0);
      if (!ok) {
        // build the needed advancement buildings
        const center = [...game.buildings.values()].find((b) => b.kind === BuildingKind.CENTER && b.owner === 0);
        if (center) {
          const def = game.players[0].era;
          const BuildingCtor = Object.getPrototypeOf(center).constructor as any;
          for (const kind of [BuildingKind.FORTRESS, BuildingKind.INSTITUTE, BuildingKind.MARKET]) {
            if (game.players[0].era >= (kind === BuildingKind.FORTRESS || kind === BuildingKind.INSTITUTE ? 1 : 0)) {
              const stats = getBuildingStats(kind, def);
              const spot = game.findFreeSpot(center.pos.x, center.pos.z, stats.size);
              if (spot) {
                const b = new BuildingCtor(kind, 0, def, game.makeBuildContext(0));
                b.pos.set(spot.x, game.terrain.getHeight(spot.x, spot.z), spot.z);
                b.attach(game.scene);
                b.beginConstruction();
                b.addBuildProgress(9999);
                game.buildings.set(b.id, b);
              }
            }
          }
        }
        continue;
      }
    }
  }
  if (params.get('menu') === '1' || (wantsLoad && !snapshot) || (wantsReplay && !replay)) {
    game.hud.showMainMenu();
  } else if (!startsMatchDirectly(params)) {
    game.hud.showMainMenu();
  }
}

/** True if the URL asks to enter the match directly (debug, ?play=1 or ?menu=0). */
function startsMatchDirectly(params: URLSearchParams): boolean {
  if (
    params.get('menu') === '0' ||
    params.get('play') === '1' ||
    params.get('load') === '1' ||
    params.get('replay') === '1'
  )
    return true;
  return ['seed', 'era', 'mission', 'low', 'speed', 'fog', 'period'].some((k) => params.has(k));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot().catch((e) => console.error(e)));
} else {
  void boot().catch((e) => console.error(e));
}
