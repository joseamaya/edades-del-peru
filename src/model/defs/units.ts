import { CivId, Era, UnitKind, Resources, ZERO_RESOURCES, HistoricalPeriod } from '../../core/types';
import { ERA_DEFS } from './eras';

export type DamageClass = 'light' | 'heavy' | 'fortified';
export type ProjectileKind =
  'bullet' | 'rocket' | 'howitzer_shell' | 'nuclear' | 'tracer' | 'arrow' | 'sling_stone' | 'none';
export type RangedWeapon = 'sling' | 'bow' | 'arquebus' | 'musket' | 'rifle';

export interface EraIdentity {
  name: string;
  icon: string;
  description?: string;
  weapon?: RangedWeapon;
}

import type { PersonGender } from './people';

export interface ModelSpec {
  /** Parametric model type. */
  type: string;
  scale?: number;
  barrel?: number;
  /** Presentation-only gender variant; the simulation is unaffected. */
  gender?: PersonGender;
}

export interface UnitStats {
  hp: number;
  attack: number;
  range: number;
  lightArmor: number;
  heavyArmor: number;
  speed: number;
  los: number;
  attackSpeed: number; // seconds between attacks
  area?: number; // area damage radius
  cost: Resources;
  trainTime: number;
  population: number;
  damageType: DamageClass;
  projectile: ProjectileKind;
}

export interface UnitArchetype {
  id: UnitKind;
  name: string;
  description: string;
  category: 'econ' | 'infantry' | 'ranged' | 'cavalry' | 'siege' | 'special' | 'unique';
  /** Multipliers per era over the base stats. */
  eraStats: Partial<
    Record<Era, { hp?: number; attack?: number; range?: number; speed?: number; los?: number; area?: number }>
  >;
  /** Model per era (visual). */
  eraModel: Partial<Record<Era, ModelSpec>>;
  /** Visible name, description, icon and ranged weapon per era. */
  eraIdentity?: Partial<Record<Era, EraIdentity>>;
  /** Technologies required to train (besides the era). */
  requiresTech?: string[];
  /** Does it need an advancement building (castle)? */
  requiresFortress?: boolean;
  /**
   * Earliest historical period in which the unit is plausible. Enforces the
   * chronology rule (no firearms, horses, vehicles or engines before 1532) for
   * scripted content; the era stats models the tech level. Default: Arcaico.
   */
  minPeriod?: HistoricalPeriod;
  /** Conversion unit (can convert enemy units). */
  converter?: boolean;
}

const BASE: Resources = ZERO_RESOURCES;

function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const UNIT_ARCHETYPES: Record<UnitKind, UnitArchetype> = {
  worker: {
    id: UnitKind.WORKER,
    name: 'Obrero',
    description: 'Recolecta recursos, construye y repara. La base de toda economía.',
    category: 'econ',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1, attack: 1 },
      [Era.REGIONAL_STATES]: { hp: 1.1, attack: 1.1 },
      [Era.TAHUANTINSUYO]: { hp: 1.25, attack: 1.2 },
      [Era.VICEROYALTY]: { hp: 1.4, attack: 1.3 },
      [Era.REPUBLIC]: { hp: 1.55, attack: 1.4 },
      [Era.CONTEMPORARY]: { hp: 1.75, attack: 1.5 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'worker', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'worker', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'worker', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'worker', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'worker', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'worker', scale: 1.08 },
    },
  },
  soldier: {
    id: UnitKind.SOLDIER,
    name: 'Guerrero',
    description: 'Infantería básica con lanza y macana. Barata y numerosa.',
    category: 'infantry',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1, attack: 1 },
      [Era.REGIONAL_STATES]: { hp: 1.15, attack: 1.25 },
      [Era.TAHUANTINSUYO]: { hp: 1.4, attack: 1.5 },
      [Era.VICEROYALTY]: { hp: 1.6, attack: 1.8 },
      [Era.REPUBLIC]: { hp: 1.85, attack: 2.1 },
      [Era.CONTEMPORARY]: { hp: 2.2, attack: 2.5 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'soldier_grunt', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'soldier_grunt', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'soldier_modern', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'soldier_modern', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'soldier_elite', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'soldier_elite', scale: 1.12 },
    },
  },
  musketeer: {
    id: UnitKind.MUSKETEER,
    name: 'Hondero',
    description: 'Tirador con honda y boleadora. Buen daño a distancia en masa.',
    category: 'ranged',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1, attack: 1 },
      [Era.REGIONAL_STATES]: { hp: 1.2, attack: 1.3 },
      [Era.TAHUANTINSUYO]: { hp: 1.45, attack: 1.6 },
      [Era.VICEROYALTY]: { hp: 1.6, attack: 1.9 },
      [Era.REPUBLIC]: { hp: 1.8, attack: 2.2 },
      [Era.CONTEMPORARY]: { hp: 2.1, attack: 2.6 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'musketeer', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'musketeer', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'musketeer', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'arquebusier', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'line_infantry', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'line_infantry', scale: 1.1 },
    },
    eraIdentity: {
      [Era.FORMATIVE]: {
        name: 'Hondero',
        icon: '🏹',
        description: 'Tirador con honda y boleadora. Buen daño a distancia en masa.',
        weapon: 'sling',
      },
      [Era.REGIONAL_STATES]: {
        name: 'Hondero',
        icon: '🏹',
        description: 'Tirador con honda y boleadora. Buen daño a distancia en masa.',
        weapon: 'sling',
      },
      [Era.TAHUANTINSUYO]: {
        name: 'Hondero',
        icon: '🏹',
        description: 'Tirador con honda y boleadora. Buen daño a distancia en masa.',
        weapon: 'sling',
      },
      [Era.VICEROYALTY]: {
        name: 'Arcabucero',
        icon: '🔫',
        description: 'Arcabucero con arcabuz de mecha. Dispara a distancia con pólvora.',
        weapon: 'arquebus',
      },
      [Era.REPUBLIC]: {
        name: 'Fusilero',
        icon: '🔫',
        description: 'Fusilero de línea con fusil. La infantería de fuego del ejército republicano.',
        weapon: 'rifle',
      },
      [Era.CONTEMPORARY]: {
        name: 'Fusilero',
        icon: '🔫',
        description: 'Fusilero de línea con fusil. La infantería de fuego del ejército moderno.',
        weapon: 'rifle',
      },
    },
  },
  rifleman: {
    id: UnitKind.RIFLEMAN,
    name: 'Arquero',
    description: 'Tropas de élite con arco largo y cerbatana. Alta cadencia de fuego.',
    category: 'ranged',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1.2, attack: 1.4, range: 1.1 },
      [Era.REGIONAL_STATES]: { hp: 1.4, attack: 1.6, range: 1.15 },
      [Era.TAHUANTINSUYO]: { hp: 1.7, attack: 1.9, range: 1.2 },
      [Era.VICEROYALTY]: { hp: 1.9, attack: 2.2, range: 1.25 },
      [Era.REPUBLIC]: { hp: 2.1, attack: 2.6, range: 1.3 },
      [Era.CONTEMPORARY]: { hp: 2.4, attack: 3.0, range: 1.35 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'rifleman', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'rifleman', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'rifleman', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'musketeer_line', scale: 1.04 },
      [Era.REPUBLIC]: { type: 'advanced_rifleman', scale: 1.06 },
      [Era.CONTEMPORARY]: { type: 'advanced_rifleman', scale: 1.12 },
    },
    eraIdentity: {
      [Era.FORMATIVE]: {
        name: 'Arquero',
        icon: '🏹',
        description: 'Tropas de élite con arco largo y cerbatana. Alta cadencia de fuego.',
        weapon: 'bow',
      },
      [Era.REGIONAL_STATES]: {
        name: 'Arquero',
        icon: '🏹',
        description: 'Tropas de élite con arco largo y cerbatana. Alta cadencia de fuego.',
        weapon: 'bow',
      },
      [Era.TAHUANTINSUYO]: {
        name: 'Arquero',
        icon: '🏹',
        description: 'Tropas de élite con arco largo y cerbatana. Alta cadencia de fuego.',
        weapon: 'bow',
      },
      [Era.VICEROYALTY]: {
        name: 'Mosquetero',
        icon: '🔫',
        description: 'Mosquetero de élite con mosquete. Dispara a distancia con pólvora.',
        weapon: 'musket',
      },
      [Era.REPUBLIC]: {
        name: 'Tirador de Élite',
        icon: '🎯',
        description: 'Tirador de élite con rifle. Precisión y alcance en el campo de batalla.',
        weapon: 'rifle',
      },
      [Era.CONTEMPORARY]: {
        name: 'Tirador de Élite',
        icon: '🎯',
        description: 'Tirador de élite con rifle. Precisión y alcance en el campo de batalla.',
        weapon: 'rifle',
      },
    },
    requiresTech: ['bow_and_bolas'],
  },
  sniper: {
    id: UnitKind.SNIPER,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Cazador',
    description: 'Cazador de largo alcance. Devastador contra oficiales y tropas.',
    category: 'ranged',
    eraStats: {
      [Era.FORMATIVE]: { hp: 0.9, attack: 2.0, range: 1.6 },
      [Era.REGIONAL_STATES]: { hp: 1.0, attack: 2.3, range: 1.7 },
      [Era.TAHUANTINSUYO]: { hp: 1.15, attack: 2.6, range: 1.8 },
      [Era.VICEROYALTY]: { hp: 1.25, attack: 3.0, range: 1.9 },
      [Era.REPUBLIC]: { hp: 1.4, attack: 3.4, range: 2.0 },
      [Era.CONTEMPORARY]: { hp: 1.55, attack: 3.9, range: 2.2 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'rifleman', scale: 1.02 },
      [Era.REGIONAL_STATES]: { type: 'rifleman', scale: 1.03 },
      [Era.TAHUANTINSUYO]: { type: 'rifleman', scale: 1.05 },
      [Era.VICEROYALTY]: { type: 'advanced_rifleman', scale: 1.06 },
      [Era.REPUBLIC]: { type: 'advanced_rifleman', scale: 1.08 },
      [Era.CONTEMPORARY]: { type: 'advanced_rifleman', scale: 1.14 },
    },
    eraIdentity: {
      [Era.VICEROYALTY]: { name: 'Cazador', icon: '🦅', weapon: 'rifle' },
      [Era.REPUBLIC]: { name: 'Cazador', icon: '🦅', weapon: 'rifle' },
      [Era.CONTEMPORARY]: { name: 'Cazador', icon: '🦅', weapon: 'rifle' },
    },
    requiresTech: ['hunters'],
  },
  hussar: {
    id: UnitKind.HUSSAR,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Jinete',
    description: 'Jinete ligero veloz. Perfecto para asaltar la economía y flanquear.',
    category: 'cavalry',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1.2, attack: 1.0, speed: 1.0 },
      [Era.REGIONAL_STATES]: { hp: 1.35, attack: 1.3, speed: 1.05 },
      [Era.TAHUANTINSUYO]: { hp: 1.6, attack: 1.7, speed: 1.1 },
      [Era.VICEROYALTY]: { hp: 1.8, attack: 2.0, speed: 1.15 },
      [Era.REPUBLIC]: { hp: 2.0, attack: 2.3, speed: 1.2 },
      [Era.CONTEMPORARY]: { hp: 2.3, attack: 2.7, speed: 1.25 },
    },
    eraModel: {
      [Era.VICEROYALTY]: { type: 'hussar', scale: 1.05 },
      [Era.REPUBLIC]: { type: 'hussar', scale: 1.1 },
      [Era.CONTEMPORARY]: { type: 'motorcycle', scale: 1.1 },
    },
  },
  cavalry: {
    id: UnitKind.CAVALRY,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Caballería de Choque',
    description: 'Jinetes de choque. Golpean fuerte contra infantería y economía.',
    category: 'cavalry',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1.6, attack: 1.2 },
      [Era.REGIONAL_STATES]: { hp: 1.8, attack: 1.5 },
      [Era.TAHUANTINSUYO]: { hp: 2.0, attack: 1.9 },
      [Era.VICEROYALTY]: { hp: 2.2, attack: 2.3 },
      [Era.REPUBLIC]: { hp: 2.5, attack: 2.7 },
      [Era.CONTEMPORARY]: { hp: 2.8, attack: 3.1 },
    },
    eraModel: {
      [Era.VICEROYALTY]: { type: 'cavalry', scale: 1.15 },
      [Era.REPUBLIC]: { type: 'cavalry', scale: 1.18 },
      [Era.CONTEMPORARY]: { type: 'modern_tank', scale: 1.2 },
    },
    requiresTech: ['shock_cavalry'],
  },
  tank: {
    id: UnitKind.TANK,
    minPeriod: HistoricalPeriod.CONTEMPORARY,
    name: 'Ariete Blindado',
    description: 'Blindaje pesado y cañón de gran calibre. El rey del campo de batalla.',
    category: 'cavalry',
    eraStats: {
      [Era.FORMATIVE]: { hp: 2.2, attack: 2.0, speed: 0.9 },
      [Era.REGIONAL_STATES]: { hp: 2.5, attack: 2.4, speed: 0.95 },
      [Era.TAHUANTINSUYO]: { hp: 2.8, attack: 2.8, speed: 1.0 },
      [Era.VICEROYALTY]: { hp: 3.1, attack: 3.2, speed: 1.05 },
      [Era.REPUBLIC]: { hp: 3.4, attack: 3.6, speed: 1.1 },
      [Era.CONTEMPORARY]: { hp: 3.8, attack: 4.0, speed: 1.15 },
    },
    eraModel: {
      [Era.CONTEMPORARY]: { type: 'modern_tank', scale: 1.2 },
    },
    requiresTech: ['heavy_armor'],
  },
  scout: {
    id: UnitKind.SCOUT,
    name: 'Explorador',
    description: 'Explorador veloz. Ilumina el mapa con su visión.',
    category: 'special',
    eraStats: {
      [Era.FORMATIVE]: { hp: 0.8, attack: 0.5, speed: 1.2, los: 1.3 },
      [Era.REGIONAL_STATES]: { hp: 0.9, attack: 0.6, speed: 1.25, los: 1.35 },
      [Era.TAHUANTINSUYO]: { hp: 1.0, attack: 0.7, speed: 1.3, los: 1.4 },
      [Era.VICEROYALTY]: { hp: 1.1, attack: 0.8, speed: 1.35, los: 1.45 },
      [Era.REPUBLIC]: { hp: 1.2, attack: 0.9, speed: 1.4, los: 1.5 },
      [Era.CONTEMPORARY]: { hp: 1.3, attack: 1.0, speed: 1.5, los: 1.6 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'soldier_grunt', scale: 0.9 },
      [Era.REGIONAL_STATES]: { type: 'soldier_grunt', scale: 0.9 },
      [Era.TAHUANTINSUYO]: { type: 'soldier_grunt', scale: 0.92 },
      [Era.VICEROYALTY]: { type: 'hussar', scale: 0.98 },
      [Era.REPUBLIC]: { type: 'hussar', scale: 1.0 },
      [Era.CONTEMPORARY]: { type: 'motorcycle', scale: 1.05 },
    },
  },
  anti_air: {
    id: UnitKind.ANTI_AIR,
    minPeriod: HistoricalPeriod.CONTEMPORARY,
    name: 'Artillero Antiaéreo',
    description: 'Artillero de precisión: diezma unidades a distancia con fuego sostenido.',
    category: 'ranged',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1.0, attack: 1.3, range: 1.2 },
      [Era.REGIONAL_STATES]: { hp: 1.1, attack: 1.5, range: 1.25 },
      [Era.TAHUANTINSUYO]: { hp: 1.25, attack: 1.8, range: 1.3 },
      [Era.VICEROYALTY]: { hp: 1.4, attack: 2.1, range: 1.35 },
      [Era.REPUBLIC]: { hp: 1.55, attack: 2.4, range: 1.4 },
      [Era.CONTEMPORARY]: { hp: 1.7, attack: 2.8, range: 1.45 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'musketeer', scale: 1.02 },
      [Era.REGIONAL_STATES]: { type: 'musketeer', scale: 1.03 },
      [Era.TAHUANTINSUYO]: { type: 'musketeer', scale: 1.05 },
      [Era.VICEROYALTY]: { type: 'veteran_rifleman', scale: 1.06 },
      [Era.REPUBLIC]: { type: 'veteran_rifleman', scale: 1.08 },
      [Era.CONTEMPORARY]: { type: 'aa', scale: 1.1 },
    },
    requiresTech: ['anti_air_defense'],
  },
  artillery: {
    id: UnitKind.ARTILLERY,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Artillería de Asedio',
    description: 'Asedio de largo alcance. Destruye edificios y formaciones.',
    category: 'siege',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1.0, attack: 3.0, range: 2.4, speed: 0.55 },
      [Era.REGIONAL_STATES]: { hp: 1.1, attack: 3.5, range: 2.5, speed: 0.58 },
      [Era.TAHUANTINSUYO]: { hp: 1.2, attack: 4.0, range: 2.6, speed: 0.6 },
      [Era.VICEROYALTY]: { hp: 1.3, attack: 4.5, range: 2.7, speed: 0.62 },
      [Era.REPUBLIC]: { hp: 1.4, attack: 5.0, range: 2.8, speed: 0.64 },
      [Era.CONTEMPORARY]: { hp: 1.5, attack: 5.5, range: 3.0, speed: 0.66 },
    },
    eraModel: {
      [Era.VICEROYALTY]: { type: 'artillery', scale: 1.08 },
      [Era.REPUBLIC]: { type: 'howitzer', scale: 1.1 },
      [Era.CONTEMPORARY]: { type: 'howitzer', scale: 1.15 },
    },
    requiresTech: ['siege_engines'],
  },
  mortar: {
    id: UnitKind.MORTAR,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Mortero',
    description: 'Daño en área devastador. Ideal para aplastar formaciones.',
    category: 'siege',
    eraStats: {
      [Era.FORMATIVE]: { hp: 0.9, attack: 2.2, range: 2.0, speed: 0.5, area: 3.5 },
      [Era.REGIONAL_STATES]: { hp: 1.0, attack: 2.6, range: 2.1, speed: 0.52, area: 3.6 },
      [Era.TAHUANTINSUYO]: { hp: 1.1, attack: 3.0, range: 2.2, speed: 0.54, area: 3.7 },
      [Era.VICEROYALTY]: { hp: 1.2, attack: 3.4, range: 2.3, speed: 0.56, area: 3.8 },
      [Era.REPUBLIC]: { hp: 1.3, attack: 3.8, range: 2.4, speed: 0.58, area: 4.0 },
      [Era.CONTEMPORARY]: { hp: 1.4, attack: 4.2, range: 2.5, speed: 0.6, area: 4.2 },
    },
    eraModel: {
      [Era.VICEROYALTY]: { type: 'mortar', scale: 1.06 },
      [Era.REPUBLIC]: { type: 'mortar', scale: 1.08 },
      [Era.CONTEMPORARY]: { type: 'mortar', scale: 1.1 },
    },
    requiresTech: ['siege_mortars'],
  },
  commissar: {
    id: UnitKind.COMMISSAR,
    name: 'Amauta',
    description: 'Sabio andino que convierte unidades enemigas a tu causa con su palabra.',
    category: 'special',
    eraStats: {
      [Era.FORMATIVE]: { hp: 0.9, attack: 0, range: 2.0, speed: 0.75 },
      [Era.REGIONAL_STATES]: { hp: 1.0, attack: 0, range: 2.2, speed: 0.8 },
      [Era.TAHUANTINSUYO]: { hp: 1.1, attack: 0, range: 2.4, speed: 0.85 },
      [Era.VICEROYALTY]: { hp: 1.2, attack: 0, range: 2.6, speed: 0.9 },
      [Era.REPUBLIC]: { hp: 1.3, attack: 0, range: 2.8, speed: 0.95 },
      [Era.CONTEMPORARY]: { hp: 1.4, attack: 0, range: 3.0, speed: 1.0 },
    },
    eraModel: {
      [Era.FORMATIVE]: { type: 'commissar', scale: 1 },
      [Era.REGIONAL_STATES]: { type: 'commissar', scale: 1 },
      [Era.TAHUANTINSUYO]: { type: 'commissar', scale: 1.02 },
      [Era.VICEROYALTY]: { type: 'commissar', scale: 1.03 },
      [Era.REPUBLIC]: { type: 'commissar', scale: 1.05 },
      [Era.CONTEMPORARY]: { type: 'commissar', scale: 1.08 },
    },
    requiresTech: ['amauta_words'],
    converter: true,
  },
  missionary: {
    id: UnitKind.MISSIONARY,
    minPeriod: HistoricalPeriod.VICEROYALTY,
    name: 'Misionero',
    description: 'Religioso que convierte unidades enemigas a tu causa con su prédica.',
    category: 'special',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1, attack: 0, range: 1, speed: 1 },
      [Era.REGIONAL_STATES]: { hp: 1, attack: 0, range: 1, speed: 1 },
      [Era.TAHUANTINSUYO]: { hp: 1, attack: 0, range: 1, speed: 1 },
      [Era.VICEROYALTY]: { hp: 1, attack: 0, range: 1, speed: 1 },
      [Era.REPUBLIC]: { hp: 1.1, attack: 0, range: 1.05, speed: 1.05 },
      [Era.CONTEMPORARY]: { hp: 1.2, attack: 0, range: 1.1, speed: 1.1 },
    },
    eraModel: {
      [Era.VICEROYALTY]: { type: 'missionary', scale: 1 },
      [Era.REPUBLIC]: { type: 'missionary', scale: 1.03 },
      [Era.CONTEMPORARY]: { type: 'missionary', scale: 1.06 },
    },
    requiresTech: ['evangelization'],
    converter: true,
  },
  nuclear: {
    id: UnitKind.NUCLEAR,
    minPeriod: HistoricalPeriod.CONTEMPORARY,
    name: 'Artillería de Cohetes',
    description: 'Artillería de cohetes de largo alcance. Devastación en área masiva.',
    category: 'siege',
    eraStats: {
      [Era.FORMATIVE]: { hp: 1, attack: 1, range: 1, speed: 0.4 },
      [Era.REGIONAL_STATES]: { hp: 1, attack: 1, range: 1, speed: 0.4 },
      [Era.TAHUANTINSUYO]: { hp: 1, attack: 1, range: 1, speed: 0.4 },
      [Era.VICEROYALTY]: { hp: 1.1, attack: 7.0, range: 3.0, speed: 0.45, area: 7.0 },
      [Era.REPUBLIC]: { hp: 1.2, attack: 8.0, range: 3.2, speed: 0.48, area: 7.5 },
      [Era.CONTEMPORARY]: { hp: 1.3, attack: 9.0, range: 3.4, speed: 0.5, area: 8.0 },
    },
    eraModel: {
      [Era.CONTEMPORARY]: { type: 'howitzer', scale: 1.15 },
    },
    requiresTech: ['rocketry'],
    requiresFortress: true,
  },
};

/** Base stats per unit (VAPOR era). */
const BASE_STATS: Record<UnitKind, UnitStats> = {
  worker: {
    hp: 25,
    attack: 3,
    range: 0,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.4,
    los: 4,
    attackSpeed: 1.5,
    cost: cost({ food: 50, wood: 20 }),
    trainTime: 15,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  soldier: {
    hp: 40,
    attack: 5,
    range: 0,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.5,
    los: 5,
    attackSpeed: 1.5,
    cost: cost({ food: 40, wood: 20 }),
    trainTime: 21,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  musketeer: {
    hp: 35,
    attack: 7,
    range: 9,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.4,
    los: 7,
    attackSpeed: 2.2,
    cost: cost({ food: 35, silver: 25 }),
    trainTime: 22,
    population: 1,
    damageType: 'heavy',
    projectile: 'bullet',
  },
  rifleman: {
    hp: 40,
    attack: 8,
    range: 10,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.3,
    los: 8,
    attackSpeed: 1.8,
    cost: cost({ food: 40, silver: 30 }),
    trainTime: 25,
    population: 1,
    damageType: 'heavy',
    projectile: 'tracer',
  },
  sniper: {
    hp: 30,
    attack: 14,
    range: 16,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.2,
    los: 10,
    attackSpeed: 3.2,
    cost: cost({ food: 45, silver: 40 }),
    trainTime: 30,
    population: 1,
    damageType: 'heavy',
    projectile: 'tracer',
  },
  hussar: {
    hp: 50,
    attack: 6,
    range: 0,
    lightArmor: 1,
    heavyArmor: 0,
    speed: 4.2,
    los: 6,
    attackSpeed: 1.6,
    cost: cost({ food: 50, wood: 25 }),
    trainTime: 26,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  cavalry: {
    hp: 70,
    attack: 9,
    range: 0,
    lightArmor: 2,
    heavyArmor: 0,
    speed: 3.6,
    los: 5,
    attackSpeed: 1.8,
    cost: cost({ food: 60, silver: 40 }),
    trainTime: 32,
    population: 2,
    damageType: 'heavy',
    projectile: 'bullet',
  },
  tank: {
    hp: 120,
    attack: 13,
    range: 0,
    lightArmor: 3,
    heavyArmor: 2,
    speed: 3.0,
    los: 7,
    attackSpeed: 2.0,
    cost: cost({ silver: 90, stone: 40 }),
    trainTime: 38,
    population: 3,
    damageType: 'heavy',
    projectile: 'howitzer_shell',
  },
  scout: {
    hp: 30,
    attack: 3,
    range: 0,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 4.5,
    los: 8,
    attackSpeed: 1.5,
    cost: cost({ food: 35, wood: 20 }),
    trainTime: 20,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  anti_air: {
    hp: 35,
    attack: 9,
    range: 11,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.3,
    los: 8,
    attackSpeed: 1.4,
    cost: cost({ food: 35, silver: 30 }),
    trainTime: 24,
    population: 1,
    damageType: 'light',
    projectile: 'tracer',
  },
  artillery: {
    hp: 45,
    attack: 30,
    range: 20,
    lightArmor: 0,
    heavyArmor: 1,
    speed: 1.6,
    los: 10,
    attackSpeed: 5.0,
    area: 4.0,
    cost: cost({ silver: 120, wood: 60 }),
    trainTime: 45,
    population: 3,
    damageType: 'fortified',
    projectile: 'howitzer_shell',
  },
  mortar: {
    hp: 40,
    attack: 22,
    range: 17,
    lightArmor: 0,
    heavyArmor: 1,
    speed: 1.5,
    los: 9,
    attackSpeed: 4.5,
    area: 3.6,
    cost: cost({ silver: 100, food: 50 }),
    trainTime: 40,
    population: 2,
    damageType: 'heavy',
    projectile: 'howitzer_shell',
  },
  commissar: {
    hp: 30,
    attack: 0,
    range: 8,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.6,
    los: 8,
    attackSpeed: 6.0,
    cost: cost({ food: 60, silver: 30 }),
    trainTime: 45,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  missionary: {
    hp: 30,
    attack: 0,
    range: 8,
    lightArmor: 0,
    heavyArmor: 0,
    speed: 2.6,
    los: 8,
    attackSpeed: 6.0,
    cost: cost({ food: 60, silver: 40 }),
    trainTime: 45,
    population: 1,
    damageType: 'light',
    projectile: 'bullet',
  },
  nuclear: {
    hp: 50,
    attack: 60,
    range: 22,
    lightArmor: 0,
    heavyArmor: 1,
    speed: 1.4,
    los: 12,
    attackSpeed: 9.0,
    area: 8.0,
    cost: cost({ silver: 200, stone: 150 }),
    trainTime: 65,
    population: 4,
    damageType: 'fortified',
    projectile: 'nuclear',
  },
};

const WEAPON_PROJECTILE: Record<RangedWeapon, ProjectileKind> = {
  sling: 'sling_stone',
  bow: 'arrow',
  arquebus: 'bullet',
  musket: 'bullet',
  rifle: 'bullet',
};

/** Projectile that matches the unit's weapon in this era (no firearms before 1532). */
export function projectileFor(kind: UnitKind, era: Era): ProjectileKind {
  const base = BASE_STATS[kind];
  if (base.range === 0) return 'none';
  const weapon = unitRangedWeapon(kind, era);
  if (weapon) return WEAPON_PROJECTILE[weapon];
  if (era <= Era.TAHUANTINSUYO) return 'sling_stone';
  return base.projectile;
}

/** Pristine projectile defaults, captured before mods patch BASE_STATS. */
const DEFAULT_PROJECTILES: Record<UnitKind, ProjectileKind> = Object.fromEntries(
  Object.entries(BASE_STATS).map(([kind, stats]) => [kind, stats.projectile]),
) as Record<UnitKind, ProjectileKind>;

/** Final stats of an archetype in a given era. */
export function getUnitStats(kind: UnitKind, era: Era): UnitStats {
  const base = BASE_STATS[kind];
  const mods = UNIT_ARCHETYPES[kind].eraStats[era] ?? {};
  const clone: UnitStats = { ...base };
  // A mod that overrides the projectile keeps it; otherwise the era decides.
  if (base.projectile === DEFAULT_PROJECTILES[kind]) clone.projectile = projectileFor(kind, era);
  if (mods.hp) clone.hp = base.hp * mods.hp;
  if (mods.attack) clone.attack = base.attack * mods.attack;
  if (mods.range) clone.range = base.range * mods.range;
  if (mods.speed) clone.speed = base.speed * mods.speed;
  clone.cost = { ...base.cost };
  return clone;
}

/** Earliest historical period in which a unit is plausible (chronology guard). */
export function unitMinPeriod(kind: UnitKind): HistoricalPeriod {
  return UNIT_ARCHETYPES[kind].minPeriod ?? HistoricalPeriod.ARCHAIC;
}

/** Conversion units (Amauta, Misionero) can convert enemy units. */
export function isConverter(kind: UnitKind): boolean {
  return UNIT_ARCHETYPES[kind].converter === true;
}

/** Model to use for a unit in an era. */
export function getUnitModel(kind: UnitKind, era: Era): ModelSpec {
  const m = UNIT_ARCHETYPES[kind].eraModel[era];
  if (m) return m;
  const anyEra = UNIT_ARCHETYPES[kind].eraModel;
  const best = ERA_DEFS.filter((e) => e.id <= era)
    .map((e) => e.id)
    .reverse()
    .find((id) => anyEra[id]);
  return anyEra[best ?? Era.FORMATIVE] ?? { type: 'soldier_grunt' };
}

/** Visible identity for an era, falling back to the nearest lower era. */
function eraIdentityFor(kind: UnitKind, era: Era): EraIdentity | undefined {
  const identities = UNIT_ARCHETYPES[kind].eraIdentity;
  if (!identities) return undefined;
  if (identities[era]) return identities[era];
  const best = ERA_DEFS.filter((e) => e.id <= era)
    .map((e) => e.id)
    .reverse()
    .find((id) => identities[id]);
  return best === undefined ? undefined : identities[best];
}

/** Ranged weapon a unit carries in an era, when the archetype defines one. */
export function unitRangedWeapon(kind: UnitKind, era: Era): RangedWeapon | undefined {
  return eraIdentityFor(kind, era)?.weapon;
}

/** True for gunpowder weapons that must not appear before 1532. */
export function isFirearmWeapon(weapon: RangedWeapon | undefined): boolean {
  return weapon === 'arquebus' || weapon === 'musket' || weapon === 'rifle';
}

export interface UnitOverride {
  name?: string;
  description?: string;
  category?: UnitArchetype['category'];
  /** Absolute base stats (hp, attack, range, cost, ...). */
  stats?: Partial<UnitStats>;
  /** Per-era multipliers over the base stats. */
  eraStats?: UnitArchetype['eraStats'];
}

/** Apply a validated mod override to a unit (mutates the defs in place). */
export function overrideUnit(id: UnitKind, o: UnitOverride): void {
  const arch = UNIT_ARCHETYPES[id];
  if (!arch) return;
  const eraKeys = Object.keys(arch.eraIdentity ?? {}).map(Number) as Era[];
  if (o.name !== undefined) {
    arch.name = o.name;
    UNIT_INFO[id] = { ...UNIT_INFO[id], name: o.name };
    for (const era of eraKeys) {
      const identity = arch.eraIdentity?.[era];
      if (identity) arch.eraIdentity![era] = { ...identity, name: o.name };
    }
  }
  if (o.description !== undefined) {
    arch.description = o.description;
    for (const era of eraKeys) {
      const identity = arch.eraIdentity?.[era];
      if (identity) arch.eraIdentity![era] = { ...identity, description: o.description };
    }
  }
  if (o.category !== undefined) arch.category = o.category;
  if (o.stats) BASE_STATS[id] = { ...BASE_STATS[id], ...o.stats };
  if (o.eraStats) arch.eraStats = { ...arch.eraStats, ...o.eraStats };
}

export const UNIT_INFO: Record<UnitKind, { name: string; icon: string; category: string }> = {
  worker: { name: 'Obrero', icon: '⛏️', category: 'Economía' },
  soldier: { name: 'Guerrero', icon: '🗡️', category: 'Infantería' },
  musketeer: { name: 'Hondero', icon: '🏹', category: 'Distancia' },
  rifleman: { name: 'Arquero', icon: '🎯', category: 'Distancia' },
  sniper: { name: 'Cazador', icon: '🦅', category: 'Distancia' },
  hussar: { name: 'Jinete', icon: '🐎', category: 'Caballería' },
  cavalry: { name: 'Caballería de Choque', icon: '🐎', category: 'Caballería' },
  tank: { name: 'Ariete Blindado', icon: '🛡️', category: 'Caballería' },
  scout: { name: 'Explorador', icon: '🏃', category: 'Reconocimiento' },
  anti_air: { name: 'Artillero Antiaéreo', icon: '🎯', category: 'Distancia' },
  artillery: { name: 'Artillería', icon: '💣', category: 'Asedio' },
  mortar: { name: 'Mortero', icon: '💥', category: 'Asedio' },
  commissar: { name: 'Amauta', icon: '🧙', category: 'Especial' },
  missionary: { name: 'Misionero', icon: '⛪', category: 'Especial' },
  nuclear: { name: 'Artillería de Cohetes', icon: '🚀', category: 'Asedio' },
};

/** Player-facing unit name for an era; the Chasqui label is reserved for the Inca. */
export function unitDisplayName(kind: UnitKind, civ: CivId | undefined, era: Era): string {
  if (kind === UnitKind.SCOUT && civ === CivId.INCA) return 'Chasqui';
  return eraIdentityFor(kind, era)?.name ?? UNIT_ARCHETYPES[kind].name;
}

/** Player-facing description for an era; the Qhapaq Ñan belongs to the Inca Chasqui. */
export function unitDisplayDescription(kind: UnitKind, civ: CivId | undefined, era: Era): string {
  if (kind === UnitKind.SCOUT && civ === CivId.INCA) {
    return 'Mensajero veloz del Qhapaq Ñan. Ilumina el mapa con su visión.';
  }
  return eraIdentityFor(kind, era)?.description ?? UNIT_ARCHETYPES[kind].description;
}

/** Player-facing icon for an era. */
export function unitDisplayIcon(kind: UnitKind, era: Era): string {
  return eraIdentityFor(kind, era)?.icon ?? UNIT_INFO[kind].icon;
}
