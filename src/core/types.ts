import * as THREE from 'three';

export const RESOURCE_KEYS = ['food', 'wood', 'silver', 'stone'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export type Resources = Record<ResourceKey, number>;

export const ZERO_RESOURCES: Resources = { food: 0, wood: 0, silver: 0, stone: 0 };

export enum Era {
  FORMATIVE = 0,
  REGIONAL_STATES = 1,
  TAHUANTINSUYO = 2,
  VICEROYALTY = 3,
  REPUBLIC = 4,
  CONTEMPORARY = 5,
}

export const ERA_COLORS: Record<Era, number> = {
  [Era.FORMATIVE]: 0xb0885a,
  [Era.REGIONAL_STATES]: 0xa85a3a,
  [Era.TAHUANTINSUYO]: 0xc8a040,
  [Era.VICEROYALTY]: 0x7a5a8a,
  [Era.REPUBLIC]: 0x3a6a7a,
  [Era.CONTEMPORARY]: 0x4a6a9a,
};

export enum CivId {
  // Pre-Hispanic
  CARAL = 'caral',
  CHAVIN = 'chavin',
  PARACAS = 'paracas',
  CUPISNIQUE = 'cupisnique',
  MOCHE = 'moche',
  NAZCA = 'nazca',
  RECUAY = 'recuay',
  WARI = 'wari',
  TIAHUANACO = 'tiahuanaco',
  CHIMU = 'chimu',
  CHINCHA = 'chincha',
  CHANCA = 'chanca',
  COLLAS_LUPACA = 'collas_lupaca',
  HUANCA = 'huanca',
  INCA = 'inca',
  // Historical (post-Hispanic)
  REALISTAS = 'realistas',
  PATRIOTAS = 'patriotas',
  REPUBLIC = 'republica',
  CHILE = 'chile',
}

/** Base geography of a civilization: determines the map type. */
export type Geography = 'coast' | 'andes' | 'altiplano';

/** Playable map types. */
export type MapType = 'coast' | 'andes' | 'altiplano' | 'jungle';

/**
 * Historical periods (period-locked matches, no anachronistic modernization).
 * `level` maps to the internal tech level (0-5) used by stats/models.
 */
export enum HistoricalPeriod {
  ARCHAIC = 0,
  EARLY_HORIZON = 1,
  EARLY_INTERMEDIATE = 2,
  MIDDLE_HORIZON = 3,
  LATE_INTERMEDIATE = 4,
  LATE_HORIZON = 5,
  VICEROYALTY = 6,
  INDEPENDENCE = 7,
  REPUBLIC = 8,
  CONTEMPORARY = 9,
}

export enum UnitKind {
  WORKER = 'worker',
  SOLDIER = 'soldier', // basic infantry (militia -> grunt)
  MUSKETEER = 'musketeer', // basic archer (ranged)
  RIFLEMAN = 'rifleman', // advanced archer
  SNIPER = 'sniper', // elite archer
  HUSSAR = 'hussar', // light cavalry
  CAVALRY = 'cavalry', // heavy / armored cavalry
  TANK = 'tank', // late elite cavalry
  SCOUT = 'scout', // light scout
  ANTI_AIR = 'anti_air', // anti-air / skirmisher
  ARTILLERY = 'artillery', // long-range siege
  MORTAR = 'mortar', // area siege
  COMMISSAR = 'commissar', // conversion (monk)
  MECH = 'mec', // unique futuristic unit
  NUCLEAR = 'nuclear', // atomic-era tactical weapon (area)
}

export enum BuildingKind {
  CENTER = 'center',
  HOUSE = 'house',
  MILL = 'mill',
  SAWMILL = 'sawmill',
  SMELTER = 'smelter',
  REFINERY = 'refinery',
  BARRACKS = 'barracks',
  ARSENAL = 'arsenal',
  STABLE = 'stable',
  FACTORY = 'factory',
  FORTRESS = 'fortress',
  MARKET = 'market',
  INSTITUTE = 'institute',
  FARM = 'farm',
  WONDER = 'wonder',
}

export interface OrderTarget {
  x: number;
  z: number;
  entityId?: number;
}

export enum OrderKind {
  IDLE = 'idle',
  MOVE = 'move',
  ATTACK_MOVE = 'attack_move',
  ATTACK = 'attack',
  GATHER = 'gather',
  BUILD = 'build',
  CONSTRUCT = 'construct',
  PATROL = 'patrol',
  GARRISON = 'garrison',
  DELIVER = 'deliver',
  CONVERT = 'convert',
}

export interface Order {
  kind: OrderKind;
  target?: OrderTarget;
  entityId?: number;
  origin?: OrderTarget;
}

export type CombatStance = 'agresivo' | 'defensivo' | 'pasivo';

export type Team = 0 | 1;

/**
 * Aggregated per-player bonuses (technologies + civilization). Additive fields are
 * numeric modifiers: multipliers where noted (`attack`, `armor`, `speed`, `training`),
 * flat amounts otherwise (`carry`, `los`, `range`, `population`). `gathering` values
 * are additive multipliers per resource.
 */
export interface CivBonuses {
  attack: number;
  armor: number;
  gathering: Partial<Resources>;
  carry: number;
  los: number;
  range: number;
  speed: number;
  training: number;
  population: number;
}

/** Numeric civilization bonuses (a partial set of player bonuses). */
export type CivEffects = Partial<CivBonuses>;

export interface PlayerState {
  id: number;
  name: string;
  civ: CivId;
  team: Team;
  color: THREE.Color;
  colorHex: string;
  isAI: boolean;
  difficulty: number; // 0..1
  resources: Resources;
  populationUsed: number;
  populationCap: number;
  era: Era;
  ageBuildings: number; // advancement building counter
  techs: Set<string>;
  alive: boolean;
  kills: number;
  totalLost: number;
  wonderActive: boolean;
  bonus: CivBonuses;
  stats: { created: number; destroyed: number; military: number; econ: number };
}

export interface EntityRef {
  id: number;
  owner: number;
  kind: string;
  pos: THREE.Vector3;
  radius: number;
  hp: number;
  maxHp: number;
  selected: boolean;
  dead: boolean;
}

type EmptyEvent = Record<string, never>;

/** Catalog of global bus events (source of truth for `bus`). */
export type GameEvents = {
  'game:ready': EmptyEvent;
  'game:end': { winner: number | null };
  'player:era': { player: number; era: Era };
  'player:defeat': { player: number };
  'wonder:time': { owner: number; time: number };
  'unit:selected': { ids: number[] };
  'unit:died': { id: number; owner: number; kind: string };
  'unit:converted': { id: number; from: number; to: number };
  'building:died': { id: number; owner: number; kind: string };
  'resources:changed': { player: number; resources: Resources };
  alert: { icon: string; text: string; x: number; z: number; warn?: boolean };
  'fx:shot': EmptyEvent;
  'fx:artillery': EmptyEvent;
  'fx:laser': EmptyEvent;
  'fx:explosion': EmptyEvent;
  'fx:death': EmptyEvent;
  'fx:hit': EmptyEvent;
  'fx:wood': EmptyEvent;
  'fx:mine': EmptyEvent;
};
