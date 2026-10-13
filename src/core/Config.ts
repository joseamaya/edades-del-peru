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
  /** Allow rotating the camera with Q/E (AoE2 DE style). Off = fixed camera like SC2. */
  rotateCamera: boolean;
  victoryMode: 'conquest' | 'wonder';
  /** Active campaign mission id (undefined = skirmish). */
  missionId?: string;
}

export type Difficulty = GameSettings['difficulty'];

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
  cinematic: false,
  rotateCamera: false,
  victoryMode: 'conquest',
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
