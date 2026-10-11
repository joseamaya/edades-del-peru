import { Game } from './core/Game';
import * as THREE from 'three';
import { GameSettings, DEFAULT_SETTINGS } from './core/Config';
import { BuildingKind, CivId, Periodo } from './core/types';
import { getBuildingStats } from './model/defs/buildings';
import { CIVS, civsDePeriodo } from './model/defs/civs';
import { getPeriodo } from './model/defs/periodos';

/** Lee ajustes guardados o usa los predeterminados, validando cada campo. */
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
const MAP_TYPES = ['costa', 'andes', 'altiplano', 'selva', 'continente', 'archipielago', 'lago', 'estepas'];
const CIV_IDS = CIVS.map((c) => c.id) as string[];
const PERIODO_IDS = Object.values(Periodo).filter((v) => typeof v === 'number') as number[];
const DIFFICULTIES = ['facil', 'normal', 'dificil', 'legendario'];
const TIMES_OF_DAY = ['mañana', 'mediodía', 'atardecer', 'noche'];
const VICTORY_MODES = ['conquista', 'maravilla'];

/** Valida y normaliza un objeto de ajustes arbitrario. */
function sanitizeSettings(raw: unknown): GameSettings {
  const s: GameSettings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (MAP_SIZES.includes(r.mapSize as number)) s.mapSize = r.mapSize as number;
  if (MAP_TYPES.includes(r.mapType as string)) s.mapType = r.mapType as GameSettings['mapType'];
  if (Number.isFinite(r.mapSeed)) s.mapSeed = Math.floor(r.mapSeed as number);
  if (CIV_IDS.includes(r.civPlayer as string)) s.civPlayer = r.civPlayer as CivId;
  if (CIV_IDS.includes(r.civAI as string)) s.civAI = r.civAI as CivId;
  if (PERIODO_IDS.includes(r.periodo as number)) s.periodo = r.periodo as Periodo;
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
  // el nivel tecnológico se deriva del periodo (partidas bloqueadas por periodo)
  s.startingEra = getPeriodo(s.periodo).nivel;
  // garantizar que las civs pertenezcan al periodo y que el rival sea distinto
  const disp = civsDePeriodo(s.periodo);
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

function boot(): void {
  const params = new URLSearchParams(window.location.search);
  const settings = loadSettings();
  if (params.get('mission')) settings.missionId = params.get('mission')!;
  if (params.get('fog') === '0') settings.fogOfWar = false;
  if (params.get('seed') !== null) settings.mapSeed = intParam(params, 'seed', settings.mapSeed);
  const game = new Game(settings);
  (window as any).game = game;
  (window as any).THREE = THREE;
  game.postfx.setCinematic(settings.cinematic);
  if (params.get('low') === '1') {
    game.pixelRatioOverride = 1;
    game.renderer.setPixelRatio(1);
    game.postfx.setCinematic(false);
    game.postfx.setQuality('bajo');
    game.postfx.vignetteEnabled = false;
  }
  if (params.get('speed') !== null) game.loop.speed = Math.max(0.25, floatParam(params, 'speed', 1));
  if (params.get('era') !== null && !settings.missionId) {
    const target = intParam(params, 'era', 0);
    game.players[0].resources = { comida: 9999, madera: 9999, acero: 9999, energia: 9999 };
    let guard = 0;
    while (game.players[0].era < target && guard++ < 8) {
      const ok = game.advanceEra(0);
      if (!ok) {
        // construir edificios de avance necesarios
        const center = [...game.buildings.values()].find((b) => b.kind === BuildingKind.CENTRO && b.owner === 0);
        if (center) {
          const def = game.players[0].era;
          const BuildingCtor = Object.getPrototypeOf(center).constructor as any;
          for (const kind of [BuildingKind.FORTALEZA, BuildingKind.INSTITUTO, BuildingKind.MERCADO]) {
            if (game.players[0].era >= (kind === BuildingKind.FORTALEZA || kind === BuildingKind.INSTITUTO ? 1 : 0)) {
              const stats = getBuildingStats(kind, def);
              const spot = game.findFreeSpot(center.pos.x, center.pos.z, stats.tamano);
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
  if (params.get('menu') === '1') {
    game.hud.showMainMenu();
  } else if (!startsMatchDirectly(params)) {
    game.hud.showMainMenu();
  }
}

/** True si la URL pide entrar directo a la partida (depuración, ?play=1 o ?menu=0). */
function startsMatchDirectly(params: URLSearchParams): boolean {
  if (params.get('menu') === '0' || params.get('play') === '1') return true;
  return ['seed', 'era', 'mission', 'low', 'speed', 'fog'].some((k) => params.has(k));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
