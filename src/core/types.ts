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
  // Prehispánicas
  CARAL = 'caral',
  CHAVIN = 'chavin',
  PARACAS = 'paracas',
  MOCHE = 'moche',
  NAZCA = 'nazca',
  RECUAY = 'recuay',
  WARI = 'wari',
  TIAHUANACO = 'tiahuanaco',
  CHIMU = 'chimu',
  CHINCHA = 'chincha',
  CHANCA = 'chanca',
  INCA = 'inca',
  // Históricas (post-hispánicas)
  REALISTAS = 'realistas',
  PATRIOTAS = 'patriotas',
  REPUBLIC = 'republica',
  CHILE = 'chile',
}

/** Geografía base de una civilización: determina el tipo de mapa. */
export type Geography = 'coast' | 'andes' | 'altiplano';

/** Tipos de mapa jugables. */
export type MapType = 'coast' | 'andes' | 'altiplano' | 'jungle';

/**
 * Periodos históricos (partidas bloqueadas por periodo, sin modernización anacrónica).
 * `nivel` mapea al nivel tecnológico interno (0-5) usado por stats/modelos.
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
  SOLDIER = 'soldier', // infantería básica (milicia -> raso)
  MUSKETEER = 'musketeer', // arquero básico (a distancia)
  RIFLEMAN = 'rifleman', // arquero avanzado
  SNIPER = 'sniper', // arquero de élite
  HUSSAR = 'hussar', // caballería ligera
  CAVALRY = 'cavalry', // caballería pesada / blindada
  TANK = 'tank', // caballería de élite tardía
  SCOUT = 'scout', // explorador ligero
  ANTI_AIR = 'anti_air', // anti-aéreo / escaramuzador
  ARTILLERY = 'artillery', // asedio a distancia larga
  MORTAR = 'mortar', // asedio de área
  COMMISSAR = 'commissar', // conversión (monje)
  MECH = 'mec', // unidad única futurista
  NUCLEAR = 'nuclear', // arma táctica de era atómica (área)
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

export type Team = 0 | 1;

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
  ageBuildings: number; // contador de edificios de avance
  techs: Set<string>;
  alive: boolean;
  kills: number;
  totalLost: number;
  wonderActive: boolean;
  bonus: {
    attack: number;
    armor: number;
    gathering: Partial<Resources>;
    carry: number;
    los: number;
    range: number;
    speed: number;
    training: number;
  };
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

/** Catálogo de eventos del bus global (fuente de verdad para `bus`). */
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
