import { Era, BuildingKind, Resources, ZERO_RESOURCES, UnitKind } from '../../core/types';
import { ModelSpec, ProjectileKind } from './units';

export interface BuildingStats {
  hp: number;
  armor: number;
  los: number;
  cost: Resources;
  buildTime: number;
  size: number; // footprint in grid units
  providesPop: number;
  isDropsite: boolean;
  garrisons: number;
  attack?: { range: number; attack: number; attackSpeed: number };
}

export interface BuildingDef {
  id: BuildingKind;
  name: string;
  description: string;
  category: 'economy' | 'military' | 'defense' | 'advance' | 'special';
  minEra: Era;
  eraStats?: Partial<Record<Era, { hp?: number; attack?: number; range?: number }>>;
  eraModel: Partial<Record<Era, ModelSpec>>;
  trainable?: UnitKind[];
  techs?: string[];
  requiresTech?: string[];
  requiresFortress?: boolean;
  isWonder?: boolean;
  garrisons?: number;
  isDropsite?: boolean;
  dropTypes?: Array<'food' | 'wood' | 'silver' | 'stone'>;
  providesPop?: number;
  isUnique?: boolean; // only 1
  /** Wall/gate segments finish instantly (no construction site). */
  instant?: boolean;
}

const BASE: Resources = ZERO_RESOURCES;
function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const BUILDING_DEFS: Record<BuildingKind, BuildingDef> = {
  center: {
    id: BuildingKind.CENTER,
    name: 'Plaza Mayor',
    description: 'Centro de tu civilización. Entrena obreros, recolecta y avanza de era.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    eraModel: {
      [Era.FORMATIVE]: { type: 'center_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'center_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'center_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'center_atomic', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'center_information', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'center_modern', scale: 1.1 },
    },
    trainable: [UnitKind.WORKER, UnitKind.SCOUT],
    isDropsite: true,
    dropTypes: ['food', 'wood', 'silver', 'stone'],
    garrisons: 15,
  },
  house: {
    id: BuildingKind.HOUSE,
    name: 'Vivienda',
    description: 'Proporciona población. Construye más para entrenar más unidades.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    providesPop: 5,
    eraModel: {
      [Era.FORMATIVE]: { type: 'house_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'house_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'house_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'house_atomic', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'house_information', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'house_modern', scale: 1.08 },
    },
  },
  mill: {
    id: BuildingKind.MILL,
    name: 'Troje',
    description: 'Depósito de comida. Los obreros entregan la comida aquí.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    isDropsite: true,
    dropTypes: ['food'],
    eraModel: {
      [Era.FORMATIVE]: { type: 'mill_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'mill_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'mill_modern', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'mill_modern', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'plant_food', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'plant_food', scale: 1.07 },
    },
  },
  sawmill: {
    id: BuildingKind.SAWMILL,
    name: 'Aserradero',
    description: 'Depósito de madera. Necesario para talar árboles.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    isDropsite: true,
    dropTypes: ['wood'],
    eraModel: {
      [Era.FORMATIVE]: { type: 'sawmill_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'sawmill_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'sawmill_modern', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'sawmill_modern', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'plant_materials', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'plant_materials', scale: 1.07 },
    },
  },
  smelter: {
    id: BuildingKind.SMELTER,
    name: 'Platería',
    description: 'Depósito de plata. Necesaria para explotar las minas.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    isDropsite: true,
    dropTypes: ['silver'],
    eraModel: {
      [Era.FORMATIVE]: { type: 'smelter_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'smelter_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'smelter_modern', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'smelter_modern', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'plant_silver', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'plant_silver', scale: 1.07 },
    },
  },
  refinery: {
    id: BuildingKind.REFINERY,
    name: 'Cantera',
    description: 'Depósito de piedra. Necesaria para explotar las canteras.',
    category: 'economy',
    minEra: Era.TAHUANTINSUYO,
    isDropsite: true,
    dropTypes: ['stone'],
    eraModel: {
      [Era.TAHUANTINSUYO]: { type: 'refinery', scale: 1 },
      [Era.VICEROYALTY]: { type: 'refinery', scale: 1.02 },
      [Era.REPUBLIC]: { type: 'plant_stone', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'plant_stone', scale: 1.08 },
    },
  },
  barracks: {
    id: BuildingKind.BARRACKS,
    name: 'Casa del Guerrero',
    description: 'Entrena infantería y conversores (Amauta, Misionero).',
    category: 'military',
    minEra: Era.FORMATIVE,
    trainable: [UnitKind.SOLDIER, UnitKind.COMMISSAR, UnitKind.MISSIONARY],
    eraModel: {
      [Era.FORMATIVE]: { type: 'barracks_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'barracks_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'barracks_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'barracks_atomic', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'barracks_information', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'barracks_modern', scale: 1.08 },
    },
  },
  arsenal: {
    id: BuildingKind.ARSENAL,
    name: 'Arsenal',
    description: 'Entrena unidades a distancia y de precisión.',
    category: 'military',
    minEra: Era.FORMATIVE,
    trainable: [UnitKind.MUSKETEER, UnitKind.RIFLEMAN, UnitKind.SNIPER, UnitKind.ANTI_AIR],
    eraModel: {
      [Era.FORMATIVE]: { type: 'arsenal_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'arsenal_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'arsenal_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'arsenal_atomic', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'arsenal_information', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'arsenal_modern', scale: 1.08 },
    },
  },
  stable: {
    id: BuildingKind.STABLE,
    name: 'Establo',
    description: 'Entrena jinetes, caballería y exploradores.',
    category: 'military',
    minEra: Era.VICEROYALTY,
    trainable: [UnitKind.HUSSAR, UnitKind.CAVALRY, UnitKind.TANK, UnitKind.SCOUT],
    eraModel: {
      [Era.FORMATIVE]: { type: 'stable_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'stable_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'stable_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'stable_atomic', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'stable_information', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'stable_modern', scale: 1.08 },
    },
  },
  factory: {
    id: BuildingKind.FACTORY,
    name: 'Taller de Artillería',
    description: 'Produce artillería, morteros y arsenal pesado.',
    category: 'military',
    minEra: Era.VICEROYALTY,
    trainable: [UnitKind.ARTILLERY, UnitKind.MORTAR, UnitKind.NUCLEAR],
    eraModel: {
      [Era.REGIONAL_STATES]: { type: 'factory_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'factory_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'factory_atomic', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'factory_information', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'factory_modern', scale: 1.1 },
    },
  },
  wall: {
    instant: true,
    id: BuildingKind.WALL,
    name: 'Muralla',
    description: 'Segmento defensivo que bloquea el paso. Coloca varios en cadena para cerrar un frente.',
    category: 'defense',
    minEra: Era.FORMATIVE,
    eraModel: {
      [Era.FORMATIVE]: { type: 'wall' },
      [Era.REGIONAL_STATES]: { type: 'wall' },
      [Era.TAHUANTINSUYO]: { type: 'wall' },
      [Era.VICEROYALTY]: { type: 'wall_colonial' },
      [Era.REPUBLIC]: { type: 'wall_modern' },
      [Era.CONTEMPORARY]: { type: 'wall_modern' },
    },
  },
  gate: {
    instant: true,
    id: BuildingKind.GATE,
    name: 'Puerta',
    description: 'Paso fortificado: tus unidades pueden cruzar, las enemigas no.',
    category: 'defense',
    minEra: Era.FORMATIVE,
    eraModel: {
      [Era.FORMATIVE]: { type: 'gate' },
      [Era.REGIONAL_STATES]: { type: 'gate' },
      [Era.TAHUANTINSUYO]: { type: 'gate' },
      [Era.VICEROYALTY]: { type: 'gate_colonial' },
      [Era.REPUBLIC]: { type: 'gate_modern' },
      [Era.CONTEMPORARY]: { type: 'gate_modern' },
    },
  },
  tower: {
    id: BuildingKind.TOWER,
    name: 'Atalaya',
    description: 'Torre defensiva con ataque a distancia. La guarnición añade proyectiles.',
    category: 'defense',
    minEra: Era.FORMATIVE,
    eraModel: {
      [Era.FORMATIVE]: { type: 'tower' },
      [Era.REGIONAL_STATES]: { type: 'tower' },
      [Era.TAHUANTINSUYO]: { type: 'tower' },
      [Era.VICEROYALTY]: { type: 'tower_colonial' },
      [Era.REPUBLIC]: { type: 'tower_modern' },
      [Era.CONTEMPORARY]: { type: 'tower_modern' },
    },
  },
  fortress: {
    id: BuildingKind.FORTRESS,
    name: 'Pucará',
    description: 'Fortaleza defensiva con guarnición y unidades de élite. Necesaria para avanzar de era.',
    category: 'defense',
    minEra: Era.REGIONAL_STATES,
    garrisons: 20,
    eraModel: {
      [Era.REGIONAL_STATES]: { type: 'fortress_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'fortress_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'fortress_atomic', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'fortress_information', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'fortress_modern', scale: 1.1 },
    },
  },
  market: {
    id: BuildingKind.MARKET,
    name: 'Mercado',
    description: 'Centro de comercio e intercambio de recursos.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    isDropsite: true,
    dropTypes: ['food', 'wood', 'silver', 'stone'],
    eraModel: {
      [Era.FORMATIVE]: { type: 'market_steam', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'market_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'market_modern', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'market_modern', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'exchange_information', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'exchange_modern', scale: 1.07 },
    },
  },
  institute: {
    id: BuildingKind.INSTITUTE,
    name: 'Yachaywasi',
    description: 'Casa del saber: desbloquea tecnologías y mejoras militares.',
    category: 'advance',
    minEra: Era.REGIONAL_STATES,
    techs: [],
    eraModel: {
      [Era.REGIONAL_STATES]: { type: 'institute_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'institute_war', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'institute_atomic', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'institute_information', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'institute_modern', scale: 1.1 },
    },
  },
  farm: {
    id: BuildingKind.FARM,
    name: 'Andén',
    description: 'Cultivo en terrazas. Producción continua de comida que se agota con el tiempo.',
    category: 'economy',
    minEra: Era.FORMATIVE,
    eraModel: {
      [Era.FORMATIVE]: { type: 'farm', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'farm', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'farm', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'farm', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'farm', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'farm', scale: 1.06 },
    },
  },
  wonder: {
    id: BuildingKind.WONDER,
    name: 'Huaca Sagrada',
    description: 'Tu monumento de victoria. Si permanece en pie 5 minutos, ganas.',
    category: 'special',
    // buildable in any era in wonder mode (Game.canBuildKind ignores minEra for the wonder)
    minEra: Era.FORMATIVE,
    isWonder: true,
    eraModel: {
      [Era.FORMATIVE]: { type: 'wonder', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'wonder', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'wonder', scale: 1 },
      [Era.VICEROYALTY]: { type: 'wonder', scale: 1 },
      [Era.REPUBLIC]: { type: 'wonder', scale: 1 },
      [Era.CONTEMPORARY]: { type: 'wonder', scale: 1 },
    },
  },
};

const BASE_BUILDING_STATS: Record<BuildingKind, BuildingStats> = {
  center: {
    hp: 1800,
    armor: 3,
    los: 12,
    cost: cost({ wood: 180, silver: 40 }),
    buildTime: 120,
    size: 4,
    providesPop: 0,
    isDropsite: true,
    garrisons: 15,
  },
  house: {
    hp: 350,
    armor: 1,
    los: 4,
    cost: cost({ wood: 30 }),
    buildTime: 20,
    size: 2,
    providesPop: 5,
    isDropsite: false,
    garrisons: 0,
  },
  mill: {
    hp: 300,
    armor: 1,
    los: 4,
    cost: cost({ wood: 50 }),
    buildTime: 25,
    size: 2,
    providesPop: 0,
    isDropsite: true,
    garrisons: 0,
  },
  sawmill: {
    hp: 300,
    armor: 1,
    los: 4,
    cost: cost({ wood: 60 }),
    buildTime: 25,
    size: 2,
    providesPop: 0,
    isDropsite: true,
    garrisons: 0,
  },
  smelter: {
    hp: 300,
    armor: 1,
    los: 4,
    cost: cost({ wood: 60, silver: 20 }),
    buildTime: 25,
    size: 2,
    providesPop: 0,
    isDropsite: true,
    garrisons: 0,
  },
  refinery: {
    hp: 320,
    armor: 1,
    los: 4,
    cost: cost({ wood: 60, silver: 30 }),
    buildTime: 28,
    size: 2,
    providesPop: 0,
    isDropsite: true,
    garrisons: 0,
  },
  barracks: {
    hp: 550,
    armor: 2,
    los: 6,
    cost: cost({ wood: 120, silver: 20 }),
    buildTime: 40,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 10,
  },
  arsenal: {
    hp: 500,
    armor: 2,
    los: 6,
    cost: cost({ wood: 100, silver: 30 }),
    buildTime: 38,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 10,
  },
  stable: {
    hp: 600,
    armor: 2,
    los: 6,
    cost: cost({ wood: 110, silver: 40 }),
    buildTime: 42,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 10,
  },
  factory: {
    hp: 700,
    armor: 2,
    los: 7,
    cost: cost({ wood: 130, silver: 70 }),
    buildTime: 50,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 10,
  },
  fortress: {
    hp: 1600,
    armor: 3,
    los: 11,
    cost: cost({ wood: 200, silver: 140, stone: 40 }),
    buildTime: 90,
    size: 4,
    providesPop: 0,
    isDropsite: false,
    garrisons: 20,
    attack: { range: 14, attack: 25, attackSpeed: 2.5 },
  },
  wall: {
    hp: 320,
    armor: 4,
    los: 3,
    cost: cost({ stone: 10, wood: 5 }),
    buildTime: 4,
    size: 1,
    providesPop: 0,
    isDropsite: false,
    garrisons: 0,
  },
  gate: {
    hp: 480,
    armor: 4,
    los: 4,
    cost: cost({ stone: 20, wood: 10 }),
    buildTime: 6,
    size: 1,
    providesPop: 0,
    isDropsite: false,
    garrisons: 0,
  },
  tower: {
    hp: 750,
    armor: 3,
    los: 12,
    cost: cost({ stone: 60, wood: 40 }),
    buildTime: 20,
    size: 2,
    providesPop: 0,
    isDropsite: false,
    garrisons: 6,
    attack: { range: 12, attack: 14, attackSpeed: 2.2 },
  },
  market: {
    hp: 500,
    armor: 1,
    los: 7,
    cost: cost({ wood: 120, silver: 40 }),
    buildTime: 35,
    size: 3,
    providesPop: 0,
    isDropsite: true,
    garrisons: 0,
  },
  institute: {
    hp: 450,
    armor: 1,
    los: 6,
    cost: cost({ wood: 100, silver: 60 }),
    buildTime: 40,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 0,
  },
  farm: {
    hp: 250,
    armor: 0,
    los: 3,
    cost: cost({ food: 60, wood: 10 }),
    buildTime: 20,
    size: 3,
    providesPop: 0,
    isDropsite: false,
    garrisons: 0,
  },
  wonder: {
    hp: 3000,
    armor: 4,
    los: 14,
    cost: cost({ wood: 400, silver: 300, stone: 400 }),
    buildTime: 200,
    size: 5,
    providesPop: 0,
    isDropsite: false,
    garrisons: 0,
  },
};

/** Defensive projectile and speed for a building's auto-attack in this era. */
export function defensiveProjectileFor(era: Era): { kind: ProjectileKind; speed: number } {
  return era <= Era.TAHUANTINSUYO ? { kind: 'sling_stone', speed: 26 } : { kind: 'bullet', speed: 40 };
}

/** Final stats of a building in a given era. */
export function getBuildingStats(kind: BuildingKind, era: Era): BuildingStats {
  const base = BASE_BUILDING_STATS[kind];
  const mods = BUILDING_DEFS[kind].eraStats?.[era] ?? {};
  const clone: BuildingStats = { ...base };
  if (mods.hp) clone.hp = base.hp * mods.hp;
  if (mods.attack && base.attack) {
    clone.attack = { ...base.attack, attack: base.attack.attack * mods.attack };
  }
  if (mods.range && base.attack) {
    clone.attack = { ...base.attack, range: base.attack.range * mods.range };
  }
  clone.cost = { ...base.cost };
  return clone;
}

export function getBuildingModel(kind: BuildingKind, era: Era): ModelSpec {
  const m = BUILDING_DEFS[kind].eraModel[era];
  if (m) return m;
  const anyEra = BUILDING_DEFS[kind].eraModel;
  let best: Era = Era.FORMATIVE;
  for (let e = era; e >= Era.FORMATIVE; e--) {
    if (anyEra[e as Era]) {
      best = e as Era;
      break;
    }
  }
  return anyEra[best] ?? { type: 'center_steam' };
}

export interface BuildingOverride {
  name?: string;
  description?: string;
  category?: BuildingDef['category'];
  /** Absolute base stats (hp, armor, los, cost, size, ...). */
  stats?: Partial<BuildingStats>;
  eraStats?: BuildingDef['eraStats'];
}

/** Apply a validated mod override to a building (mutates the defs in place). */
export function overrideBuilding(id: BuildingKind, o: BuildingOverride): void {
  const def = BUILDING_DEFS[id];
  if (!def) return;
  if (o.name !== undefined) {
    def.name = o.name;
    BUILDING_INFO[id] = { ...BUILDING_INFO[id], name: o.name };
  }
  if (o.description !== undefined) def.description = o.description;
  if (o.category !== undefined) def.category = o.category;
  if (o.stats) BASE_BUILDING_STATS[id] = { ...BASE_BUILDING_STATS[id], ...o.stats };
  if (o.eraStats) def.eraStats = { ...def.eraStats, ...o.eraStats };
}

export const BUILDING_INFO: Record<BuildingKind, { name: string; icon: string; category: string }> = {
  center: { name: 'Plaza Mayor', icon: '🏛️', category: 'Centro' },
  house: { name: 'Vivienda', icon: '🏠', category: 'Economía' },
  mill: { name: 'Troje', icon: '🌾', category: 'Economía' },
  sawmill: { name: 'Aserradero', icon: '🪓', category: 'Economía' },
  smelter: { name: 'Platería', icon: '⚒️', category: 'Economía' },
  refinery: { name: 'Cantera', icon: '🪨', category: 'Economía' },
  barracks: { name: 'Casa del Guerrero', icon: '🎖️', category: 'Militar' },
  arsenal: { name: 'Arsenal', icon: '🎯', category: 'Militar' },
  stable: { name: 'Establo', icon: '🐎', category: 'Militar' },
  factory: { name: 'Taller de Artillería', icon: '🏭', category: 'Militar' },
  fortress: { name: 'Pucará', icon: '🏰', category: 'Defensa' },
  wall: { name: 'Muralla', icon: '🧱', category: 'Defensa' },
  gate: { name: 'Puerta', icon: '🚪', category: 'Defensa' },
  tower: { name: 'Atalaya', icon: '🗼', category: 'Defensa' },
  market: { name: 'Mercado', icon: '💰', category: 'Economía' },
  institute: { name: 'Yachaywasi', icon: '📚', category: 'Avance' },
  farm: { name: 'Andén', icon: '🌽', category: 'Economía' },
  wonder: { name: 'Huaca Sagrada', icon: '🗿', category: 'Victoria' },
};

/** Projectiles fired by a defensive building per cooldown (base + garrison). */
export function defensiveShotCount(garrisoned: number): number {
  return 1 + Math.max(0, garrisoned);
}

/** Damage per defensive projectile: the base shot is full, each garrison shot is 35%. */
export function defensiveShotDamage(attack: number, index: number): number {
  return index === 0 ? attack : attack * 0.35;
}
