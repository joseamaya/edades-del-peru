import { CivId, Era, MapType, Periodo } from './types';

export interface GameSettings {
  mapSize: number; // 256 | 192 | 128
  mapType: MapType;
  mapSeed: number;
  civPlayer: CivId;
  civAI: CivId;
  /** Periodo histórico de la partida (partidas bloqueadas por periodo). */
  periodo: Periodo;
  difficulty: 'facil' | 'normal' | 'dificil' | 'legendario';
  startingEra: Era;
  populationCap: number;
  gameSpeed: number; // multiplicador (0.5x-3x)
  timeOfDay: 'mañana' | 'mediodía' | 'atardecer' | 'noche';
  fogOfWar: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  showHints: boolean;
  /** Efectos cinematográficos (SSAO, bloom, viñeta, aberración). Off = look clásico nítido. */
  cinematic: boolean;
  /** Permite rotar la cámara con Q/E (estilo AoE2 DE). Off = cámara fija como SC2. */
  rotateCamera: boolean;
  victoryMode: 'conquista' | 'maravilla';
  /** Id de misión de campaña activa (undefined = escaramuza). */
  missionId?: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mapSize: 192,
  mapType: 'costa',
  mapSeed: Math.floor(Math.random() * 1e9),
  civPlayer: CivId.MOCHE,
  civAI: CivId.RECUAY,
  periodo: Periodo.INTERMEDIO_TEMPRANO,
  difficulty: 'normal',
  startingEra: Era.ESTADOS_REGIONALES,
  populationCap: 100,
  gameSpeed: 1,
  timeOfDay: 'mediodía',
  fogOfWar: true,
  soundEnabled: true,
  musicEnabled: true,
  showHints: true,
  cinematic: false,
  rotateCamera: false,
  victoryMode: 'conquista',
};

export const RESOURCE_INFO = {
  comida: { nombre: 'Comida', icono: '🌽', color: '#8fca7a' },
  madera: { nombre: 'Madera', icono: '🪵', color: '#b58a5c' },
  acero: { nombre: 'Plata', icono: '🥈', color: '#9aa7b5' },
  energia: { nombre: 'Piedra', icono: '🪨', color: '#c8a878' },
} as const;

export const DIFFICULTY_MULT = {
  facil: { econ: 0.85, agresion: 0.5, reaction: 1.4 },
  normal: { econ: 1.0, agresion: 1.0, reaction: 1.0 },
  dificil: { econ: 1.15, agresion: 1.4, reaction: 0.7 },
  legendario: { econ: 1.3, agresion: 1.8, reaction: 0.45 },
} as const;
