import { CivId, Era, MapType, HistoricalPeriod } from './types';

export interface GameSettings {
  mapSize: number; // 256 | 192 | 128
  mapType: MapType;
  mapSeed: number;
  civPlayer: CivId;
  civAI: CivId;
  /** Historical period of the match (period-locked matches). */
  period: HistoricalPeriod;
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';
  startingEra: Era;
  populationCap: number;
  gameSpeed: number; // multiplier (0.5x-3x)
  timeOfDay: 'morning' | 'noon' | 'dusk' | 'night';
  fogOfWar: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  showHints: boolean;
  /** Cinematic effects (SSAO, bloom, vignette, aberration). Off = sharp classic look. */
  cinematic: boolean;
  /** Post-processing quality preset (also auto-lowered by the quality governor). */
  quality: 'high' | 'medium' | 'low';
  /** Settings schema version, for one-time migrations of stored settings. */
  settingsVersion: number;
  /** Allow rotating the camera with Z/X (AoE2 DE style). Off = fixed camera like SC2. */
  rotateCamera: boolean;
  /** Camera pan speed preset (keyboard + edge scroll). */
  cameraSpeed: 'slow' | 'normal' | 'fast';
  victoryMode: 'conquest' | 'wonder';
  /** Mod ids loaded at boot (data patches over the defs); later ones win. */
  activeMods: string[];
  /** Active campaign mission id (undefined = skirmish). */
  missionId?: string;
}

export type Difficulty = GameSettings['difficulty'];

/** Current settings schema version; bump when stored defaults must migrate. */
export const SETTINGS_VERSION = 2;

/** Open ground kept clear around every opening base before random scatter. */
export const OPENING_BASE_CLEARANCE = 14;

export const DEFAULT_SETTINGS: GameSettings = {
  mapSize: 192,
  mapType: 'coast',
  mapSeed: Math.floor(Math.random() * 1e9),
  civPlayer: CivId.MOCHE,
  civAI: CivId.RECUAY,
  period: HistoricalPeriod.EARLY_INTERMEDIATE,
  difficulty: 'normal',
  startingEra: Era.REGIONAL_STATES,
  populationCap: 100,
  gameSpeed: 1,
  timeOfDay: 'noon',
  fogOfWar: true,
  soundEnabled: true,
  musicEnabled: true,
  showHints: true,
  cinematic: true,
  quality: 'high',
  settingsVersion: SETTINGS_VERSION,
  rotateCamera: false,
  cameraSpeed: 'normal',
  victoryMode: 'conquest',
  activeMods: [],
};

export const RESOURCE_INFO = {
  food: { name: 'Comida', icon: '🌽', color: '#8fca7a' },
  wood: { name: 'Madera', icon: '🪵', color: '#b58a5c' },
  silver: { name: 'Plata', icon: '🥈', color: '#9aa7b5' },
  stone: { name: 'Piedra', icon: '🪨', color: '#c8a878' },
} as const;

/** Player-facing names for the map / geography types. */
export const MAP_LABEL: Record<MapType, string> = {
  coast: 'Costa / litoral',
  andes: 'Andes / sierra',
  altiplano: 'Altiplano',
  jungle: 'Selva',
};

export const DIFFICULTY_MULT = {
  easy: { aggression: 0.5, reaction: 1.4 },
  normal: { aggression: 1.0, reaction: 1.0 },
  hard: { aggression: 1.4, reaction: 0.7 },
  legendary: { aggression: 1.8, reaction: 0.45 },
} as const;

/** Camera pan-speed presets (keyboard + edge scroll), applied to the base speed. */
export const CAMERA_SPEED_SCALE: Record<GameSettings['cameraSpeed'], number> = {
  slow: 0.7,
  normal: 1,
  fast: 1.5,
};
