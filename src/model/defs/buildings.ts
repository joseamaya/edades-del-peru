import { Era, BuildingKind, Resources, ZERO_RESOURCES, UnitKind } from '../../core/types';
import { ModelSpec } from './units';

export interface BuildingStats {
  hp: number;
  armadura: number;
  los: number;
  costo: Resources;
  tiempoConstruccion: number;
  tamano: number; // footprint en unidades de grid
  providesPop: number;
  isDropsite: boolean;
  garrisons: number;
  attack?: { rango: number; ataque: number; velocidadAtaque: number };
}

export interface BuildingDef {
  id: BuildingKind;
  nombre: string;
  descripcion: string;
  categoria: 'economia' | 'militar' | 'defensa' | 'avance' | 'especial';
  eraMinima: Era;
  eraStats?: Partial<Record<Era, { hp?: number; ataque?: number; rango?: number }>>;
  eraModel: Partial<Record<Era, ModelSpec>>;
  trainable?: UnitKind[];
  techs?: string[];
  requiresTech?: string[];
  requiresFortaleza?: boolean;
  isWonder?: boolean;
  garrisons?: number;
  isDropsite?: boolean;
  dropTypes?: Array<'comida' | 'madera' | 'acero' | 'energia'>;
  providesPop?: number;
  isUnique?: boolean; // solo 1
}

const BASE: Resources = ZERO_RESOURCES;
function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const BUILDING_DEFS: Record<BuildingKind, BuildingDef> = {
  centro: {
    id: BuildingKind.CENTRO,
    nombre: 'Plaza Mayor',
    descripcion: 'Centro de tu civilización. Entrena obreros, recolecta y avanza de era.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    eraModel: {
      [Era.FORMATIVO]: { type: 'centro_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'centro_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'centro_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'centro_atomica', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'centro_informacion', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'centro_estelar', scale: 1.1 },
    },
    trainable: [UnitKind.OBRERO],
    isDropsite: true,
    dropTypes: ['comida', 'madera', 'acero', 'energia'],
    garrisons: 15,
  },
  vivienda: {
    id: BuildingKind.VIVIENDA,
    nombre: 'Vivienda',
    descripcion: 'Proporciona población. Construye más para entrenar más unidades.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    providesPop: 5,
    eraModel: {
      [Era.FORMATIVO]: { type: 'vivienda_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'vivienda_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'vivienda_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'vivienda_atomica', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'vivienda_informacion', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'vivienda_estelar', scale: 1.08 },
    },
  },
  molino: {
    id: BuildingKind.MOLINO,
    nombre: 'Troje',
    descripcion: 'Depósito de comida. Los obreros entregan la comida aquí.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    isDropsite: true,
    dropTypes: ['comida'],
    eraModel: {
      [Era.FORMATIVO]: { type: 'molino_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'molino_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'molino_moderno', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'molino_moderno', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'planta_comida', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'planta_comida', scale: 1.07 },
    },
  },
  serreria: {
    id: BuildingKind.SERRERIA,
    nombre: 'Aserradero',
    descripcion: 'Depósito de madera. Necesario para talar árboles.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    isDropsite: true,
    dropTypes: ['madera'],
    eraModel: {
      [Era.FORMATIVO]: { type: 'serreria_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'serreria_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'serreria_moderna', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'serreria_moderna', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'planta_materiales', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'planta_materiales', scale: 1.07 },
    },
  },
  fundicion: {
    id: BuildingKind.FUNDICION,
    nombre: 'Platería',
    descripcion: 'Depósito de plata. Necesaria para explotar las minas.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    isDropsite: true,
    dropTypes: ['acero'],
    eraModel: {
      [Era.FORMATIVO]: { type: 'fundicion_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'fundicion_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'fundicion_moderna', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'fundicion_moderna', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'planta_acero', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'planta_acero', scale: 1.07 },
    },
  },
  refineria: {
    id: BuildingKind.REFINERIA,
    nombre: 'Cantera',
    descripcion: 'Depósito de piedra. Necesaria para explotar las canteras.',
    categoria: 'economia',
    eraMinima: Era.TAHUANTINSUYO,
    isDropsite: true,
    dropTypes: ['energia'],
    eraModel: {
      [Era.TAHUANTINSUYO]: { type: 'refineria', scale: 1 },
      [Era.VIRREINATO]: { type: 'refineria', scale: 1.02 },
      [Era.REPUBLICA]: { type: 'planta_energia', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'planta_energia', scale: 1.08 },
    },
  },
  cuartel: {
    id: BuildingKind.CUARTEL,
    nombre: 'Casa del Guerrero',
    descripcion: 'Entrena infantería y sabios (Amautas).',
    categoria: 'militar',
    eraMinima: Era.FORMATIVO,
    trainable: [UnitKind.SOLDADO, UnitKind.COMISARIO],
    eraModel: {
      [Era.FORMATIVO]: { type: 'cuartel_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'cuartel_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'cuartel_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'cuartel_atomica', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'cuartel_informacion', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'cuartel_estelar', scale: 1.08 },
    },
  },
  polvorin: {
    id: BuildingKind.POLVORIN,
    nombre: 'Arsenal',
    descripcion: 'Entrena unidades a distancia y de precisión.',
    categoria: 'militar',
    eraMinima: Era.FORMATIVO,
    trainable: [UnitKind.MOSQUETERO, UnitKind.FUSILERO, UnitKind.FRANCOTIRADOR, UnitKind.ARTILLERO_AA],
    eraModel: {
      [Era.FORMATIVO]: { type: 'polvorin_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'polvorin_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'polvorin_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'polvorin_atomica', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'polvorin_informacion', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'polvorin_estelar', scale: 1.08 },
    },
  },
  garaje: {
    id: BuildingKind.GARAJE,
    nombre: 'Establo',
    descripcion: 'Entrena jinetes, caballería y exploradores.',
    categoria: 'militar',
    eraMinima: Era.FORMATIVO,
    trainable: [UnitKind.HUSAR, UnitKind.CABALLERIA, UnitKind.TANQUE, UnitKind.EXPLORADOR],
    eraModel: {
      [Era.FORMATIVO]: { type: 'garaje_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'garaje_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'garaje_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'garaje_atomica', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'garaje_informacion', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'garaje_estelar', scale: 1.08 },
    },
  },
  fabrica: {
    id: BuildingKind.FABRICA,
    nombre: 'Taller de Artillería',
    descripcion: 'Produce artillería, morteros y arsenal pesado.',
    categoria: 'militar',
    eraMinima: Era.ESTADOS_REGIONALES,
    trainable: [UnitKind.ARTILLERIA, UnitKind.MORTERO, UnitKind.NUCLEAR],
    eraModel: {
      [Era.ESTADOS_REGIONALES]: { type: 'fabrica_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'fabrica_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'fabrica_atomica', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'fabrica_informacion', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'fabrica_estelar', scale: 1.1 },
    },
  },
  fortaleza: {
    id: BuildingKind.FORTALEZA,
    nombre: 'Pucará',
    descripcion: 'Fortaleza defensiva con guarnición y unidades de élite. Necesaria para avanzar de era.',
    categoria: 'defensa',
    eraMinima: Era.ESTADOS_REGIONALES,
    trainable: [UnitKind.MEC],
    garrisons: 20,
    eraModel: {
      [Era.ESTADOS_REGIONALES]: { type: 'fortaleza_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'fortaleza_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'fortaleza_atomica', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'fortaleza_informacion', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'fortaleza_estelar', scale: 1.1 },
    },
  },
  mercado: {
    id: BuildingKind.MERCADO,
    nombre: 'Mercado',
    descripcion: 'Centro de comercio e intercambio de recursos.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    isDropsite: true,
    dropTypes: ['comida', 'madera', 'acero', 'energia'],
    eraModel: {
      [Era.FORMATIVO]: { type: 'mercado_vapor', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'mercado_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'mercado_moderno', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'mercado_moderno', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'bolsa_informacion', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'bolsa_estelar', scale: 1.07 },
    },
  },
  instituto: {
    id: BuildingKind.INSTITUTO,
    nombre: 'Yachaywasi',
    descripcion: 'Casa del saber: desbloquea tecnologías y mejoras militares.',
    categoria: 'avance',
    eraMinima: Era.ESTADOS_REGIONALES,
    techs: [],
    eraModel: {
      [Era.ESTADOS_REGIONALES]: { type: 'instituto_imperial', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'instituto_guerras', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'instituto_atomica', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'instituto_informacion', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'instituto_estelar', scale: 1.1 },
    },
  },
  granja: {
    id: BuildingKind.GRANJA,
    nombre: 'Andén',
    descripcion: 'Cultivo en terrazas. Producción continua de comida que se agota con el tiempo.',
    categoria: 'economia',
    eraMinima: Era.FORMATIVO,
    eraModel: {
      [Era.FORMATIVO]: { type: 'granja', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'granja', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'granja', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'granja', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'granja_fut', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'granja_fut', scale: 1.06 },
    },
  },
  maravilla: {
    id: BuildingKind.MARAVILLA,
    nombre: 'Huaca Sagrada',
    descripcion: 'Tu monumento de victoria. Si permanece en pie 5 minutos, ganas.',
    categoria: 'especial',
    eraMinima: Era.CONTEMPORANEO,
    isWonder: true,
    eraModel: {
      [Era.CONTEMPORANEO]: { type: 'maravilla', scale: 1 },
    },
  },
};

const BASE_BUILDING_STATS: Record<BuildingKind, BuildingStats> = {
  centro: { hp: 1800, armadura: 3, los: 12, costo: cost({ madera: 180, acero: 40 }), tiempoConstruccion: 120, tamano: 4, providesPop: 0, isDropsite: true, garrisons: 15 },
  vivienda: { hp: 350, armadura: 1, los: 4, costo: cost({ madera: 30 }), tiempoConstruccion: 20, tamano: 2, providesPop: 5, isDropsite: false, garrisons: 0 },
  molino: { hp: 300, armadura: 1, los: 4, costo: cost({ madera: 50 }), tiempoConstruccion: 25, tamano: 2, providesPop: 0, isDropsite: true, garrisons: 0 },
  serreria: { hp: 300, armadura: 1, los: 4, costo: cost({ madera: 60 }), tiempoConstruccion: 25, tamano: 2, providesPop: 0, isDropsite: true, garrisons: 0 },
  fundicion: { hp: 300, armadura: 1, los: 4, costo: cost({ madera: 60, acero: 20 }), tiempoConstruccion: 25, tamano: 2, providesPop: 0, isDropsite: true, garrisons: 0 },
  refineria: { hp: 320, armadura: 1, los: 4, costo: cost({ madera: 60, acero: 30 }), tiempoConstruccion: 28, tamano: 2, providesPop: 0, isDropsite: true, garrisons: 0 },
  cuartel: { hp: 550, armadura: 2, los: 6, costo: cost({ madera: 120, acero: 20 }), tiempoConstruccion: 40, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 10 },
  polvorin: { hp: 500, armadura: 2, los: 6, costo: cost({ madera: 100, acero: 30 }), tiempoConstruccion: 38, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 10 },
  garaje: { hp: 600, armadura: 2, los: 6, costo: cost({ madera: 110, acero: 40 }), tiempoConstruccion: 42, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 10 },
  fabrica: { hp: 700, armadura: 2, los: 7, costo: cost({ madera: 130, acero: 70 }), tiempoConstruccion: 50, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 10 },
  fortaleza: { hp: 1600, armadura: 3, los: 11, costo: cost({ madera: 200, acero: 140, energia: 40 }), tiempoConstruccion: 90, tamano: 4, providesPop: 0, isDropsite: false, garrisons: 20, attack: { rango: 14, ataque: 25, velocidadAtaque: 2.5 } },
  mercado: { hp: 500, armadura: 1, los: 7, costo: cost({ madera: 120, acero: 40 }), tiempoConstruccion: 35, tamano: 3, providesPop: 0, isDropsite: true, garrisons: 0 },
  instituto: { hp: 450, armadura: 1, los: 6, costo: cost({ madera: 100, acero: 60 }), tiempoConstruccion: 40, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 0 },
  granja: { hp: 250, armadura: 0, los: 3, costo: cost({ comida: 60, madera: 10 }), tiempoConstruccion: 20, tamano: 3, providesPop: 0, isDropsite: false, garrisons: 0 },
  maravilla: { hp: 3000, armadura: 4, los: 14, costo: cost({ madera: 400, acero: 300, energia: 400 }), tiempoConstruccion: 200, tamano: 5, providesPop: 0, isDropsite: false, garrisons: 0 },
};

/** Stats finales de un edificio en una era dada. */
export function getBuildingStats(kind: BuildingKind, era: Era): BuildingStats {
  const base = BASE_BUILDING_STATS[kind];
  const mods = BUILDING_DEFS[kind].eraStats?.[era] ?? {};
  const clone: BuildingStats = { ...base };
  if (mods.hp) clone.hp = base.hp * mods.hp;
  if (mods.ataque && base.attack) {
    clone.attack = { ...base.attack, ataque: base.attack.ataque * mods.ataque };
  }
  if (mods.rango && base.attack) {
    clone.attack = { ...base.attack, rango: base.attack.rango * mods.rango };
  }
  clone.costo = { ...base.costo };
  return clone;
}

export function getBuildingModel(kind: BuildingKind, era: Era): ModelSpec {
  const m = BUILDING_DEFS[kind].eraModel[era];
  if (m) return m;
  const anyEra = BUILDING_DEFS[kind].eraModel;
  let best: Era = Era.FORMATIVO;
  for (let e = era; e >= Era.FORMATIVO; e--) {
    if (anyEra[e as Era]) {
      best = e as Era;
      break;
    }
  }
  return anyEra[best] ?? { type: 'centro_vapor' };
}

export const BUILDING_INFO: Record<BuildingKind, { nombre: string; icono: string; categoria: string }> = {
  centro: { nombre: 'Plaza Mayor', icono: '🏛️', categoria: 'Centro' },
  vivienda: { nombre: 'Vivienda', icono: '🏠', categoria: 'Economía' },
  molino: { nombre: 'Troje', icono: '🌾', categoria: 'Economía' },
  serreria: { nombre: 'Aserradero', icono: '🪓', categoria: 'Economía' },
  fundicion: { nombre: 'Platería', icono: '⚒️', categoria: 'Economía' },
  refineria: { nombre: 'Cantera', icono: '🪨', categoria: 'Economía' },
  cuartel: { nombre: 'Casa del Guerrero', icono: '🎖️', categoria: 'Militar' },
  polvorin: { nombre: 'Arsenal', icono: '🎯', categoria: 'Militar' },
  garaje: { nombre: 'Establo', icono: '🐎', categoria: 'Militar' },
  fabrica: { nombre: 'Taller de Artillería', icono: '🏭', categoria: 'Militar' },
  fortaleza: { nombre: 'Pucará', icono: '🏰', categoria: 'Defensa' },
  mercado: { nombre: 'Mercado', icono: '💰', categoria: 'Economía' },
  instituto: { nombre: 'Yachaywasi', icono: '📚', categoria: 'Avance' },
  granja: { nombre: 'Andén', icono: '🌽', categoria: 'Economía' },
  maravilla: { nombre: 'Huaca Sagrada', icono: '🗿', categoria: 'Victoria' },
};
