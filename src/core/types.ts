import * as THREE from 'three';

export const RESOURCE_KEYS = ['comida', 'madera', 'acero', 'energia'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export type Resources = Record<ResourceKey, number>;

export const ZERO_RESOURCES: Resources = { comida: 0, madera: 0, acero: 0, energia: 0 };

export enum Era {
  FORMATIVO = 0,
  ESTADOS_REGIONALES = 1,
  TAHUANTINSUYO = 2,
  VIRREINATO = 3,
  REPUBLICA = 4,
  CONTEMPORANEO = 5,
}

export const ERA_COLORS: Record<Era, number> = {
  [Era.FORMATIVO]: 0xb0885a,
  [Era.ESTADOS_REGIONALES]: 0xa85a3a,
  [Era.TAHUANTINSUYO]: 0xc8a040,
  [Era.VIRREINATO]: 0x7a5a8a,
  [Era.REPUBLICA]: 0x3a6a7a,
  [Era.CONTEMPORANEO]: 0x4a6a9a,
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
  REPUBLICA = 'republica',
  CHILE = 'chile',
}

/** Geografía base de una civilización: determina el tipo de mapa. */
export type Geografia = 'costa' | 'andes' | 'altiplano';

/** Tipos de mapa jugables. */
export type MapType = 'costa' | 'andes' | 'altiplano' | 'selva';

/**
 * Periodos históricos (partidas bloqueadas por periodo, sin modernización anacrónica).
 * `nivel` mapea al nivel tecnológico interno (0-5) usado por stats/modelos.
 */
export enum Periodo {
  ARCAICO = 0,
  HORIZONTE_TEMPRANO = 1,
  INTERMEDIO_TEMPRANO = 2,
  HORIZONTE_MEDIO = 3,
  INTERMEDIO_TARDIO = 4,
  HORIZONTE_TARDIO = 5,
  VIRREINATO = 6,
  INDEPENDENCIA = 7,
  REPUBLICA = 8,
  CONTEMPORANEO = 9,
}

export enum UnitKind {
  OBRERO = 'obrero',
  SOLDADO = 'soldado', // infantería básica (milicia -> raso)
  MOSQUETERO = 'mosquetero', // arquero básico (a distancia)
  FUSILERO = 'fusilero', // arquero avanzado
  FRANCOTIRADOR = 'francotirador', // arquero de élite
  HUSAR = 'husar', // caballería ligera
  CABALLERIA = 'caballeria', // caballería pesada / blindada
  TANQUE = 'tanque', // caballería de élite tardía
  EXPLORADOR = 'explorador', // explorador ligero
  ARTILLERO_AA = 'artillero_aa', // anti-aéreo / escaramuzador
  ARTILLERIA = 'artilleria', // asedio a distancia larga
  MORTERO = 'mortero', // asedio de área
  COMISARIO = 'comisario', // conversión (monje)
  MEC = 'mec', // unidad única futurista
  NUCLEAR = 'nuclear', // arma táctica de era atómica (área)
}

export enum BuildingKind {
  CENTRO = 'centro',
  VIVIENDA = 'vivienda',
  MOLINO = 'molino',
  SERRERIA = 'serreria',
  FUNDICION = 'fundicion',
  REFINERIA = 'refineria',
  CUARTEL = 'cuartel',
  POLVORIN = 'polvorin',
  GARAJE = 'garaje',
  FABRICA = 'fabrica',
  FORTALEZA = 'fortaleza',
  MERCADO = 'mercado',
  INSTITUTO = 'instituto',
  GRANJA = 'granja',
  MARAVILLA = 'maravilla',
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
    ataque: number;
    armadura: number;
    recoleccion: Partial<Resources>;
    carry: number;
    los: number;
    rango: number;
    velocidad: number;
    entrenamiento: number;
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
  alert: { icono: string; texto: string; x: number; z: number; warn?: boolean };
  'fx:shot': EmptyEvent;
  'fx:artillery': EmptyEvent;
  'fx:laser': EmptyEvent;
  'fx:explosion': EmptyEvent;
  'fx:death': EmptyEvent;
  'fx:hit': EmptyEvent;
  'fx:wood': EmptyEvent;
  'fx:mine': EmptyEvent;
};
