import { Era, UnitKind, Resources, ZERO_RESOURCES } from '../../core/types';
import { ERA_DEFS } from './eras';

export type DamageClass = 'ligero' | 'pesado' | 'fortificado';
export type ProjectileKind = 'bala' | 'cohete' | 'obús' | 'laser' | 'rail' | 'nuclear' | 'trazadora';

export interface ModelSpec {
  /** Tipo de modelo paramétrico. */
  type: string;
  scale?: number;
  barrel?: number;
}

export interface UnitStats {
  hp: number;
  ataque: number;
  rango: number;
  armaduraLigero: number;
  armaduraPesado: number;
  velocidad: number;
  los: number;
  velocidadAtaque: number; // segundos entre ataques
  area?: number; // radio de daño en área
  costo: Resources;
  tiempoEntrenamiento: number;
  poblacion: number;
  tipoDano: DamageClass;
  proyectil: ProjectileKind;
}

export interface UnitArchetype {
  id: UnitKind;
  nombre: string;
  descripcion: string;
  categoria: 'econ' | 'infanteria' | 'distancia' | 'caballeria' | 'asedio' | 'especial' | 'unico';
  /** Multiplicadores por era sobre las stats base. */
  eraStats: Partial<Record<Era, { hp?: number; ataque?: number; rango?: number; velocidad?: number; los?: number; area?: number }>>;
  /** Modelo por era (visual). */
  eraModel: Partial<Record<Era, ModelSpec>>;
  /** Tecnologías requeridas para entrenar (además de la era). */
  requiresTech?: string[];
  /** ¿Necesita edificio de avance (castillo)? */
  requiresFortaleza?: boolean;
}

const BASE: Resources = ZERO_RESOURCES;

function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const UNIT_ARCHETYPES: Record<UnitKind, UnitArchetype> = {
  obrero: {
    id: UnitKind.OBRERO,
    nombre: 'Obrero',
    descripcion: 'Recolecta recursos, construye y repara. La base de toda economía.',
    categoria: 'econ',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1, ataque: 1 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.1, ataque: 1.1 },
      [Era.TAHUANTINSUYO]: { hp: 1.25, ataque: 1.2 },
      [Era.VIRREINATO]: { hp: 1.4, ataque: 1.3 },
      [Era.REPUBLICA]: { hp: 1.55, ataque: 1.4 },
      [Era.CONTEMPORANEO]: { hp: 1.75, ataque: 1.5 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'obrero', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'obrero', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'obrero', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'obrero', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'obrero', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'obrero', scale: 1.08 },
    },
  },
  soldado: {
    id: UnitKind.SOLDADO,
    nombre: 'Guerrero',
    descripcion: 'Infantería básica con lanza y macana. Barata y numerosa.',
    categoria: 'infanteria',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1, ataque: 1 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.15, ataque: 1.25 },
      [Era.TAHUANTINSUYO]: { hp: 1.4, ataque: 1.5 },
      [Era.VIRREINATO]: { hp: 1.6, ataque: 1.8 },
      [Era.REPUBLICA]: { hp: 1.85, ataque: 2.1 },
      [Era.CONTEMPORANEO]: { hp: 2.2, ataque: 2.5 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'soldado_raso', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'soldado_raso', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'soldado_moderno', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'soldado_moderno', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'soldado_elite', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'soldado_elite', scale: 1.12 },
    },
  },
  mosquetero: {
    id: UnitKind.MOSQUETERO,
    nombre: 'Hondero',
    descripcion: 'Tirador con honda y boleadora. Buen daño a distancia en masa.',
    categoria: 'distancia',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1, ataque: 1 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.2, ataque: 1.3 },
      [Era.TAHUANTINSUYO]: { hp: 1.45, ataque: 1.6 },
      [Era.VIRREINATO]: { hp: 1.6, ataque: 1.9 },
      [Era.REPUBLICA]: { hp: 1.8, ataque: 2.2 },
      [Era.CONTEMPORANEO]: { hp: 2.1, ataque: 2.6 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'mosquetero', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'mosquetero', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'mosquetero', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'riflero', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'fusil_avanzado', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'fusil_avanzado', scale: 1.1 },
    },
  },
  fusilero: {
    id: UnitKind.FUSILERO,
    nombre: 'Tirador de Élite',
    descripcion: 'Tropas de élite con arco largo y cerbatana. Alta cadencia de fuego.',
    categoria: 'distancia',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1.2, ataque: 1.4, rango: 1.1 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.4, ataque: 1.6, rango: 1.15 },
      [Era.TAHUANTINSUYO]: { hp: 1.7, ataque: 1.9, rango: 1.2 },
      [Era.VIRREINATO]: { hp: 1.9, ataque: 2.2, rango: 1.25 },
      [Era.REPUBLICA]: { hp: 2.1, ataque: 2.6, rango: 1.3 },
      [Era.CONTEMPORANEO]: { hp: 2.4, ataque: 3.0, rango: 1.35 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'fusilero', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'fusilero', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'fusilero', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'riflero', scale: 1.04 },
      [Era.REPUBLICA]: { type: 'fusil_avanzado', scale: 1.06 },
      [Era.CONTEMPORANEO]: { type: 'fusil_avanzado', scale: 1.12 },
    },
    requiresTech: ['rifles_repetidos'],
  },
  francotirador: {
    id: UnitKind.FRANCOTIRADOR,
    nombre: 'Cazador',
    descripcion: 'Cazador de largo alcance. Devastador contra oficiales y tropas.',
    categoria: 'distancia',
    eraStats: {
      [Era.FORMATIVO]: { hp: 0.9, ataque: 2.0, rango: 1.6 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.0, ataque: 2.3, rango: 1.7 },
      [Era.TAHUANTINSUYO]: { hp: 1.15, ataque: 2.6, rango: 1.8 },
      [Era.VIRREINATO]: { hp: 1.25, ataque: 3.0, rango: 1.9 },
      [Era.REPUBLICA]: { hp: 1.4, ataque: 3.4, rango: 2.0 },
      [Era.CONTEMPORANEO]: { hp: 1.55, ataque: 3.9, rango: 2.2 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'fusilero', scale: 1.02 },
      [Era.ESTADOS_REGIONALES]: { type: 'fusilero', scale: 1.03 },
      [Era.TAHUANTINSUYO]: { type: 'fusilero', scale: 1.05 },
      [Era.VIRREINATO]: { type: 'fusil_avanzado', scale: 1.06 },
      [Era.REPUBLICA]: { type: 'fusil_avanzado', scale: 1.08 },
      [Era.CONTEMPORANEO]: { type: 'fusil_avanzado', scale: 1.14 },
    },
    requiresTech: ['francotiradores'],
  },
  husar: {
    id: UnitKind.HUSAR,
    nombre: 'Jinete',
    descripcion: 'Jinete ligero veloz. Perfecto para asaltar la economía y flanquear.',
    categoria: 'caballeria',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1.2, ataque: 1.0, velocidad: 1.0 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.35, ataque: 1.3, velocidad: 1.05 },
      [Era.TAHUANTINSUYO]: { hp: 1.6, ataque: 1.7, velocidad: 1.1 },
      [Era.VIRREINATO]: { hp: 1.8, ataque: 2.0, velocidad: 1.15 },
      [Era.REPUBLICA]: { hp: 2.0, ataque: 2.3, velocidad: 1.2 },
      [Era.CONTEMPORANEO]: { hp: 2.3, ataque: 2.7, velocidad: 1.25 },
    },
    eraModel: {
      [Era.VIRREINATO]: { type: 'husar', scale: 1.05 },
      [Era.REPUBLICA]: { type: 'husar', scale: 1.1 },
      [Era.CONTEMPORANEO]: { type: 'motocicleta', scale: 1.1 },
    },
  },
  caballeria: {
    id: UnitKind.CABALLERIA,
    nombre: 'Caballería de Choque',
    descripcion: 'Jinetes de choque. Golpean fuerte contra infantería y economía.',
    categoria: 'caballeria',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1.6, ataque: 1.2 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.8, ataque: 1.5 },
      [Era.TAHUANTINSUYO]: { hp: 2.0, ataque: 1.9 },
      [Era.VIRREINATO]: { hp: 2.2, ataque: 2.3 },
      [Era.REPUBLICA]: { hp: 2.5, ataque: 2.7 },
      [Era.CONTEMPORANEO]: { hp: 2.8, ataque: 3.1 },
    },
    eraModel: {
      [Era.VIRREINATO]: { type: 'caballeria', scale: 1.15 },
      [Era.REPUBLICA]: { type: 'caballeria', scale: 1.18 },
      [Era.CONTEMPORANEO]: { type: 'tanque_moderno', scale: 1.2 },
    },
    requiresTech: ['caballeria_pesada'],
  },
  tanque: {
    id: UnitKind.TANQUE,
    nombre: 'Ariete Blindado',
    descripcion: 'Blindaje pesado y cañón de gran calibre. El rey del campo de batalla.',
    categoria: 'caballeria',
    eraStats: {
      [Era.FORMATIVO]: { hp: 2.2, ataque: 2.0, velocidad: 0.9 },
      [Era.ESTADOS_REGIONALES]: { hp: 2.5, ataque: 2.4, velocidad: 0.95 },
      [Era.TAHUANTINSUYO]: { hp: 2.8, ataque: 2.8, velocidad: 1.0 },
      [Era.VIRREINATO]: { hp: 3.1, ataque: 3.2, velocidad: 1.05 },
      [Era.REPUBLICA]: { hp: 3.4, ataque: 3.6, velocidad: 1.1 },
      [Era.CONTEMPORANEO]: { hp: 3.8, ataque: 4.0, velocidad: 1.15 },
    },
    eraModel: {
      [Era.CONTEMPORANEO]: { type: 'tanque_moderno', scale: 1.2 },
    },
    requiresTech: ['blindados_pesados'],
  },
  explorador: {
    id: UnitKind.EXPLORADOR,
    nombre: 'Chasqui',
    descripcion: 'Mensajero veloz del Qhapaq Ñan. Ilumina el mapa con su visión.',
    categoria: 'especial',
    eraStats: {
      [Era.FORMATIVO]: { hp: 0.8, ataque: 0.5, velocidad: 1.2, los: 1.3 },
      [Era.ESTADOS_REGIONALES]: { hp: 0.9, ataque: 0.6, velocidad: 1.25, los: 1.35 },
      [Era.TAHUANTINSUYO]: { hp: 1.0, ataque: 0.7, velocidad: 1.3, los: 1.4 },
      [Era.VIRREINATO]: { hp: 1.1, ataque: 0.8, velocidad: 1.35, los: 1.45 },
      [Era.REPUBLICA]: { hp: 1.2, ataque: 0.9, velocidad: 1.4, los: 1.5 },
      [Era.CONTEMPORANEO]: { hp: 1.3, ataque: 1.0, velocidad: 1.5, los: 1.6 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'soldado_raso', scale: 0.9 },
      [Era.ESTADOS_REGIONALES]: { type: 'soldado_raso', scale: 0.9 },
      [Era.TAHUANTINSUYO]: { type: 'soldado_raso', scale: 0.92 },
      [Era.VIRREINATO]: { type: 'husar', scale: 0.98 },
      [Era.REPUBLICA]: { type: 'husar', scale: 1.0 },
      [Era.CONTEMPORANEO]: { type: 'motocicleta', scale: 1.05 },
    },
  },
  artillero_aa: {
    id: UnitKind.ARTILLERO_AA,
    nombre: 'Artillero Antiaéreo',
    descripcion: 'Artillero de precisión: diezma unidades a distancia con fuego sostenido.',
    categoria: 'distancia',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1.0, ataque: 1.3, rango: 1.2 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.1, ataque: 1.5, rango: 1.25 },
      [Era.TAHUANTINSUYO]: { hp: 1.25, ataque: 1.8, rango: 1.3 },
      [Era.VIRREINATO]: { hp: 1.4, ataque: 2.1, rango: 1.35 },
      [Era.REPUBLICA]: { hp: 1.55, ataque: 2.4, rango: 1.4 },
      [Era.CONTEMPORANEO]: { hp: 1.7, ataque: 2.8, rango: 1.45 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'mosquetero', scale: 1.02 },
      [Era.ESTADOS_REGIONALES]: { type: 'mosquetero', scale: 1.03 },
      [Era.TAHUANTINSUYO]: { type: 'mosquetero', scale: 1.05 },
      [Era.VIRREINATO]: { type: 'riflero', scale: 1.06 },
      [Era.REPUBLICA]: { type: 'riflero', scale: 1.08 },
      [Era.CONTEMPORANEO]: { type: 'aa', scale: 1.1 },
    },
    requiresTech: ['defensa_antiaerea'],
  },
  artilleria: {
    id: UnitKind.ARTILLERIA,
    nombre: 'Artillería de Asedio',
    descripcion: 'Asedio de largo alcance. Destruye edificios y formaciones.',
    categoria: 'asedio',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1.0, ataque: 3.0, rango: 2.4, velocidad: 0.55 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.1, ataque: 3.5, rango: 2.5, velocidad: 0.58 },
      [Era.TAHUANTINSUYO]: { hp: 1.2, ataque: 4.0, rango: 2.6, velocidad: 0.6 },
      [Era.VIRREINATO]: { hp: 1.3, ataque: 4.5, rango: 2.7, velocidad: 0.62 },
      [Era.REPUBLICA]: { hp: 1.4, ataque: 5.0, rango: 2.8, velocidad: 0.64 },
      [Era.CONTEMPORANEO]: { hp: 1.5, ataque: 5.5, rango: 3.0, velocidad: 0.66 },
    },
    eraModel: {
      [Era.VIRREINATO]: { type: 'artilleria', scale: 1.08 },
      [Era.REPUBLICA]: { type: 'howitzer', scale: 1.1 },
      [Era.CONTEMPORANEO]: { type: 'howitzer', scale: 1.15 },
    },
    requiresTech: ['obuses'],
  },
  mortero: {
    id: UnitKind.MORTERO,
    nombre: 'Mortero',
    descripcion: 'Daño en área devastador. Ideal para aplastar formaciones.',
    categoria: 'asedio',
    eraStats: {
      [Era.FORMATIVO]: { hp: 0.9, ataque: 2.2, rango: 2.0, velocidad: 0.5, area: 3.5 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.0, ataque: 2.6, rango: 2.1, velocidad: 0.52, area: 3.6 },
      [Era.TAHUANTINSUYO]: { hp: 1.1, ataque: 3.0, rango: 2.2, velocidad: 0.54, area: 3.7 },
      [Era.VIRREINATO]: { hp: 1.2, ataque: 3.4, rango: 2.3, velocidad: 0.56, area: 3.8 },
      [Era.REPUBLICA]: { hp: 1.3, ataque: 3.8, rango: 2.4, velocidad: 0.58, area: 4.0 },
      [Era.CONTEMPORANEO]: { hp: 1.4, ataque: 4.2, rango: 2.5, velocidad: 0.6, area: 4.2 },
    },
    eraModel: {
      [Era.VIRREINATO]: { type: 'mortero', scale: 1.06 },
      [Era.REPUBLICA]: { type: 'mortero', scale: 1.08 },
      [Era.CONTEMPORANEO]: { type: 'mortero', scale: 1.1 },
    },
    requiresTech: ['morteros'],
  },
  comisario: {
    id: UnitKind.COMISARIO,
    nombre: 'Amauta',
    descripcion: 'Sabio andino que convierte unidades enemigas a tu causa con su palabra.',
    categoria: 'especial',
    eraStats: {
      [Era.FORMATIVO]: { hp: 0.9, ataque: 0, rango: 2.0, velocidad: 0.75 },
      [Era.ESTADOS_REGIONALES]: { hp: 1.0, ataque: 0, rango: 2.2, velocidad: 0.8 },
      [Era.TAHUANTINSUYO]: { hp: 1.1, ataque: 0, rango: 2.4, velocidad: 0.85 },
      [Era.VIRREINATO]: { hp: 1.2, ataque: 0, rango: 2.6, velocidad: 0.9 },
      [Era.REPUBLICA]: { hp: 1.3, ataque: 0, rango: 2.8, velocidad: 0.95 },
      [Era.CONTEMPORANEO]: { hp: 1.4, ataque: 0, rango: 3.0, velocidad: 1.0 },
    },
    eraModel: {
      [Era.FORMATIVO]: { type: 'comisario', scale: 1 },
      [Era.ESTADOS_REGIONALES]: { type: 'comisario', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'comisario', scale: 1.02 },
      [Era.VIRREINATO]: { type: 'comisario', scale: 1.03 },
      [Era.REPUBLICA]: { type: 'comisario', scale: 1.05 },
      [Era.CONTEMPORANEO]: { type: 'comisario', scale: 1.08 },
    },
    requiresTech: ['propaganda'],
  },
  mec: {
    id: UnitKind.MEC,
    nombre: 'Guardián Blindado',
    descripcion: 'Vehículo blindado de asalto. La unidad más poderosa del Perú contemporáneo.',
    categoria: 'unico',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1, ataque: 1, rango: 1 },
      [Era.ESTADOS_REGIONALES]: { hp: 1, ataque: 1, rango: 1 },
      [Era.TAHUANTINSUYO]: { hp: 1, ataque: 1, rango: 1 },
      [Era.VIRREINATO]: { hp: 1, ataque: 1, rango: 1 },
      [Era.REPUBLICA]: { hp: 1.2, ataque: 1.2, rango: 1.1 },
      [Era.CONTEMPORANEO]: { hp: 1.6, ataque: 1.6, rango: 1.2 },
    },
    eraModel: {
      [Era.CONTEMPORANEO]: { type: 'tanque_moderno', scale: 1.35 },
    },
    requiresTech: ['mecatronica'],
    requiresFortaleza: true,
  },
  nuclear: {
    id: UnitKind.NUCLEAR,
    nombre: 'Artillería de Cohetes',
    descripcion: 'Artillería de cohetes de largo alcance. Devastación en área masiva.',
    categoria: 'asedio',
    eraStats: {
      [Era.FORMATIVO]: { hp: 1, ataque: 1, rango: 1, velocidad: 0.4 },
      [Era.ESTADOS_REGIONALES]: { hp: 1, ataque: 1, rango: 1, velocidad: 0.4 },
      [Era.TAHUANTINSUYO]: { hp: 1, ataque: 1, rango: 1, velocidad: 0.4 },
      [Era.VIRREINATO]: { hp: 1.1, ataque: 7.0, rango: 3.0, velocidad: 0.45, area: 7.0 },
      [Era.REPUBLICA]: { hp: 1.2, ataque: 8.0, rango: 3.2, velocidad: 0.48, area: 7.5 },
      [Era.CONTEMPORANEO]: { hp: 1.3, ataque: 9.0, rango: 3.4, velocidad: 0.5, area: 8.0 },
    },
    eraModel: {
      [Era.CONTEMPORANEO]: { type: 'howitzer', scale: 1.15 },
    },
    requiresTech: ['armas_atomicas'],
    requiresFortaleza: true,
  },
};

/** Stats base por unidad (era VAPOR). */
const BASE_STATS: Record<UnitKind, UnitStats> = {
  obrero: {
    hp: 25, ataque: 3, rango: 0, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.4, los: 4, velocidadAtaque: 1.5, costo: cost({ comida: 50, madera: 20 }), tiempoEntrenamiento: 15, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'bala',
  },
  soldado: {
    hp: 40, ataque: 5, rango: 0, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.5, los: 5, velocidadAtaque: 1.5, costo: cost({ comida: 40, madera: 20 }), tiempoEntrenamiento: 21, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'bala',
  },
  mosquetero: {
    hp: 35, ataque: 7, rango: 9, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.4, los: 7, velocidadAtaque: 2.2, costo: cost({ comida: 35, acero: 25 }), tiempoEntrenamiento: 22, poblacion: 1,
    tipoDano: 'pesado', proyectil: 'bala',
  },
  fusilero: {
    hp: 40, ataque: 8, rango: 10, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.3, los: 8, velocidadAtaque: 1.8, costo: cost({ comida: 40, acero: 30 }), tiempoEntrenamiento: 25, poblacion: 1,
    tipoDano: 'pesado', proyectil: 'trazadora',
  },
  francotirador: {
    hp: 30, ataque: 14, rango: 16, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.2, los: 10, velocidadAtaque: 3.2, costo: cost({ comida: 45, acero: 40 }), tiempoEntrenamiento: 30, poblacion: 1,
    tipoDano: 'pesado', proyectil: 'trazadora',
  },
  husar: {
    hp: 50, ataque: 6, rango: 0, armaduraLigero: 1, armaduraPesado: 0,
    velocidad: 4.2, los: 6, velocidadAtaque: 1.6, costo: cost({ comida: 50, madera: 25 }), tiempoEntrenamiento: 26, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'bala',
  },
  caballeria: {
    hp: 70, ataque: 9, rango: 0, armaduraLigero: 2, armaduraPesado: 0,
    velocidad: 3.6, los: 5, velocidadAtaque: 1.8, costo: cost({ comida: 60, acero: 40 }), tiempoEntrenamiento: 32, poblacion: 2,
    tipoDano: 'pesado', proyectil: 'bala',
  },
  tanque: {
    hp: 120, ataque: 13, rango: 0, armaduraLigero: 3, armaduraPesado: 2,
    velocidad: 3.0, los: 7, velocidadAtaque: 2.0, costo: cost({ acero: 90, energia: 40 }), tiempoEntrenamiento: 38, poblacion: 3,
    tipoDano: 'pesado', proyectil: 'obús',
  },
  explorador: {
    hp: 30, ataque: 3, rango: 0, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 4.5, los: 8, velocidadAtaque: 1.5, costo: cost({ comida: 35, madera: 20 }), tiempoEntrenamiento: 20, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'bala',
  },
  artillero_aa: {
    hp: 35, ataque: 9, rango: 11, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.3, los: 8, velocidadAtaque: 1.4, costo: cost({ comida: 35, acero: 30 }), tiempoEntrenamiento: 24, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'trazadora',
  },
  artilleria: {
    hp: 45, ataque: 30, rango: 20, armaduraLigero: 0, armaduraPesado: 1,
    velocidad: 1.6, los: 10, velocidadAtaque: 5.0, area: 4.0, costo: cost({ acero: 120, madera: 60 }), tiempoEntrenamiento: 45, poblacion: 3,
    tipoDano: 'fortificado', proyectil: 'obús',
  },
  mortero: {
    hp: 40, ataque: 22, rango: 17, armaduraLigero: 0, armaduraPesado: 1,
    velocidad: 1.5, los: 9, velocidadAtaque: 4.5, area: 3.6, costo: cost({ acero: 100, comida: 50 }), tiempoEntrenamiento: 40, poblacion: 2,
    tipoDano: 'pesado', proyectil: 'obús',
  },
  comisario: {
    hp: 30, ataque: 0, rango: 8, armaduraLigero: 0, armaduraPesado: 0,
    velocidad: 2.6, los: 8, velocidadAtaque: 6.0, costo: cost({ comida: 60, acero: 30 }), tiempoEntrenamiento: 45, poblacion: 1,
    tipoDano: 'ligero', proyectil: 'bala',
  },
  mec: {
    hp: 160, ataque: 18, rango: 14, armaduraLigero: 3, armaduraPesado: 3,
    velocidad: 3.2, los: 10, velocidadAtaque: 2.2, area: 2.5, costo: cost({ acero: 160, energia: 120 }), tiempoEntrenamiento: 55, poblacion: 4,
    tipoDano: 'pesado', proyectil: 'rail',
  },
  nuclear: {
    hp: 50, ataque: 60, rango: 22, armaduraLigero: 0, armaduraPesado: 1,
    velocidad: 1.4, los: 12, velocidadAtaque: 9.0, area: 8.0, costo: cost({ acero: 200, energia: 150 }), tiempoEntrenamiento: 65, poblacion: 4,
    tipoDano: 'fortificado', proyectil: 'nuclear',
  },
};

/** Stats finales de un arquetipo en una era dada. */
export function getUnitStats(kind: UnitKind, era: Era): UnitStats {
  const base = BASE_STATS[kind];
  const mods = UNIT_ARCHETYPES[kind].eraStats[era] ?? {};
  const clone: UnitStats = { ...base };
  if (mods.hp) clone.hp = base.hp * mods.hp;
  if (mods.ataque) clone.ataque = base.ataque * mods.ataque;
  if (mods.rango) clone.rango = base.rango * mods.rango;
  if (mods.velocidad) clone.velocidad = base.velocidad * mods.velocidad;
  clone.costo = { ...base.costo };
  return clone;
}

/** Modelo a usar para una unidad en una era. */
export function getUnitModel(kind: UnitKind, era: Era): ModelSpec {
  const m = UNIT_ARCHETYPES[kind].eraModel[era];
  if (m) return m;
  const anyEra = UNIT_ARCHETYPES[kind].eraModel;
  const best = ERA_DEFS.filter((e) => e.id <= era)
    .map((e) => e.id)
    .reverse()
    .find((id) => anyEra[id]);
  return anyEra[best ?? Era.FORMATIVO] ?? { type: 'soldado_raso' };
}

export const UNIT_INFO: Record<UnitKind, { nombre: string; icono: string; categoria: string }> = {
  obrero: { nombre: 'Obrero', icono: '⛏️', categoria: 'Economía' },
  soldado: { nombre: 'Guerrero', icono: '🗡️', categoria: 'Infantería' },
  mosquetero: { nombre: 'Hondero', icono: '🏹', categoria: 'Distancia' },
  fusilero: { nombre: 'Tirador', icono: '🎯', categoria: 'Distancia' },
  francotirador: { nombre: 'Cazador', icono: '🦅', categoria: 'Distancia' },
  husar: { nombre: 'Jinete', icono: '🐎', categoria: 'Caballería' },
  caballeria: { nombre: 'Caballería de Choque', icono: '🐎', categoria: 'Caballería' },
  tanque: { nombre: 'Ariete Blindado', icono: '🛡️', categoria: 'Caballería' },
  explorador: { nombre: 'Chasqui', icono: '🏃', categoria: 'Reconocimiento' },
  artillero_aa: { nombre: 'Artillero Antiaéreo', icono: '🎯', categoria: 'Distancia' },
  artilleria: { nombre: 'Artillería', icono: '💣', categoria: 'Asedio' },
  mortero: { nombre: 'Mortero', icono: '💥', categoria: 'Asedio' },
  comisario: { nombre: 'Amauta', icono: '🧙', categoria: 'Especial' },
  mec: { nombre: 'Blindado de Asalto', icono: '🛡️', categoria: 'Élite' },
  nuclear: { nombre: 'Artillería de Cohetes', icono: '🚀', categoria: 'Asedio' },
};
