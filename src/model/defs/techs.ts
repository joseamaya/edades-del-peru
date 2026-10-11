import { BuildingKind, Era, Resources, ZERO_RESOURCES } from '../../core/types';

export interface TechEffect {
  attackMult?: number;
  armorMult?: number;
  gatheringMult?: Partial<Resources>;
  capacityBonus?: number;
  speedBonus?: number;
  losBonus?: number;
  priceDiscount?: number;
  rangeBonus?: number;
}

export interface TechDef {
  id: string;
  name: string;
  description: string;
  cost: Resources;
  time: number;
  minEra: Era;
  building: BuildingKind;
  effect: TechEffect;
  /** Tecnologías que desbloquea (unidades o edificios) */
  unlocksUnits?: string[];
  requirements?: string[];
  icon?: string;
}

const BASE: Resources = ZERO_RESOURCES;
function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const TECHS: TechDef[] = [
  {
    id: 'irrigation_canal',
    name: 'Canal de Regadío',
    description: 'Canal de regadío: todas las unidades se desplazan un 10% más rápido.',
    cost: cost({ wood: 100, silver: 50 }),
    time: 40,
    minEra: Era.FORMATIVE,
    building: BuildingKind.CENTER,
    effect: { speedBonus: 0.1 },
    icon: '🌊',
  },
  {
    id: 'andean_loom',
    name: 'Telar Andino',
    description: 'Talleres más eficientes. Madera y plata se recolectan un 15% más rápido.',
    cost: cost({ wood: 80, silver: 60 }),
    time: 45,
    minEra: Era.FORMATIVE,
    building: BuildingKind.INSTITUTE,
    effect: { gatheringMult: { wood: 0.15, silver: 0.15 } },
    icon: '🧶',
  },
  {
    id: 'bow_and_bolas',
    name: 'Arco y Boleadora',
    description: 'Desbloquea a los Tiradores de Élite en el Arsenal.',
    cost: cost({ silver: 120, food: 60 }),
    time: 50,
    minEra: Era.REGIONAL_STATES,
    building: BuildingKind.ARSENAL,
    effect: { attackMult: 0.1 },
    unlocksUnits: ['rifleman'],
    icon: '🏹',
  },
  {
    id: 'silver_metallurgy',
    name: 'Metalurgia de la Plata',
    description: 'Aleaciones superiores. +10% de blindaje a todas las unidades.',
    cost: cost({ silver: 150, wood: 80 }),
    time: 55,
    minEra: Era.REGIONAL_STATES,
    building: BuildingKind.SMELTER,
    effect: { armorMult: 0.1 },
    icon: '🥈',
  },
  {
    id: 'shock_cavalry',
    name: 'Caballería de Choque',
    description: 'Desbloquea la Caballería de Choque en el Establo.',
    cost: cost({ silver: 150, food: 80 }),
    time: 55,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.STABLE,
    effect: { attackMult: 0.1 },
    unlocksUnits: ['cavalry'],
    icon: '🐎',
  },
  {
    id: 'siege_engines',
    name: 'Huaracas y Onagros',
    description: 'Desbloquea la Artillería en el Taller. Máquinas de asedio más potentes.',
    cost: cost({ silver: 180, stone: 40 }),
    time: 60,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.FACTORY,
    effect: { attackMult: 0.15 },
    unlocksUnits: ['artillery'],
    icon: '💣',
  },
  {
    id: 'workshops',
    name: 'Obrajes y Talleres',
    description: 'La producción se industrializa. Las unidades infligen un 15% más de daño.',
    cost: cost({ silver: 200, stone: 80 }),
    time: 60,
    minEra: Era.TAHUANTINSUYO,
    building: BuildingKind.INSTITUTE,
    effect: { attackMult: 0.15 },
    icon: '🏭',
  },
  {
    id: 'anti_air_defense',
    name: 'Defensa Antiaérea',
    description: 'Desbloquea al Artillero Antiaéreo en el Arsenal. +1 rango de alcance.',
    cost: cost({ silver: 160, stone: 60 }),
    time: 55,
    minEra: Era.CONTEMPORARY,
    building: BuildingKind.ARSENAL,
    effect: { rangeBonus: 1 },
    unlocksUnits: ['anti_air'],
    icon: '🎯',
  },
  {
    id: 'siege_mortars',
    name: 'Morteros de Asedio',
    description: 'Desbloquea el Mortero en el Taller.',
    cost: cost({ silver: 170, food: 60 }),
    time: 55,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.FACTORY,
    effect: { attackMult: 0.1 },
    unlocksUnits: ['mortar'],
    icon: '💥',
  },
  {
    id: 'heavy_armor',
    name: 'Blindajes Pesados',
    description: 'Desbloquea el Ariete Blindado en el Establo.',
    cost: cost({ silver: 220, stone: 80 }),
    time: 65,
    minEra: Era.CONTEMPORARY,
    building: BuildingKind.STABLE,
    effect: { armorMult: 0.15 },
    unlocksUnits: ['tank'],
    icon: '🛡️',
  },
  {
    id: 'rocketry',
    name: 'Cohetería',
    description: 'Desbloquea la Artillería de Cohetes en el Taller.',
    cost: cost({ silver: 250, stone: 200 }),
    time: 80,
    minEra: Era.CONTEMPORARY,
    building: BuildingKind.FACTORY,
    effect: { attackMult: 0.2 },
    unlocksUnits: ['nuclear'],
    icon: '🚀',
  },
  {
    id: 'quipus_watchers',
    name: 'Quipus y Vigías',
    description: 'Amplía la visión de todos los edificios y unidades.',
    cost: cost({ silver: 150, stone: 120 }),
    time: 60,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.INSTITUTE,
    effect: { losBonus: 2 },
    icon: '📡',
  },
  {
    id: 'hunters',
    name: 'Cazadores',
    description: 'Desbloquea al Cazador en el Arsenal.',
    cost: cost({ silver: 180, stone: 60 }),
    time: 60,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.ARSENAL,
    effect: { rangeBonus: 1 },
    unlocksUnits: ['sniper'],
    icon: '🦅',
  },
  {
    id: 'amauta_words',
    name: 'Palabra del Amauta',
    description: 'Desbloquea al Amauta en la Casa del Guerrero.',
    cost: cost({ food: 150, silver: 100 }),
    time: 60,
    minEra: Era.VICEROYALTY,
    building: BuildingKind.BARRACKS,
    effect: {},
    unlocksUnits: ['commissar'],
    icon: '🧙',
  },
  {
    id: 'swift_chasquis',
    name: 'Chasquis Veloces',
    description: 'Los obreros cargan 5 recursos más por viaje.',
    cost: cost({ silver: 180, stone: 120 }),
    time: 60,
    minEra: Era.REPUBLIC,
    building: BuildingKind.CENTER,
    effect: { capacityBonus: 5 },
    icon: '🏃',
  },
  {
    id: 'armored_engineering',
    name: 'Ingeniería Blindada',
    description: 'Desbloquea al Guardián Blindado en el Pucará.',
    cost: cost({ silver: 300, stone: 250 }),
    time: 90,
    minEra: Era.CONTEMPORARY,
    building: BuildingKind.FORTRESS,
    effect: { attackMult: 0.2, armorMult: 0.2 },
    unlocksUnits: ['mec'],
    icon: '🛡️',
  },
  {
    id: 'hydroelectric',
    name: 'Hidroeléctricas',
    description: 'Energía casi infinita. Recolección de piedra +30%.',
    cost: cost({ silver: 250, stone: 300 }),
    time: 80,
    minEra: Era.CONTEMPORARY,
    building: BuildingKind.REFINERY,
    effect: { gatheringMult: { stone: 0.3 } },
    icon: '⚡',
  },
  {
    id: 'mass_production',
    name: 'Producción en Serie',
    description: 'Producción militar acelerada. Entrenamiento un 20% más rápido.',
    cost: cost({ silver: 140, food: 80 }),
    time: 50,
    minEra: Era.TAHUANTINSUYO,
    building: BuildingKind.FACTORY,
    effect: { priceDiscount: 0.2 },
    icon: '🔧',
  },
];

export function getTech(id: string): TechDef | undefined {
  return TECHS.find((t) => t.id === id);
}
