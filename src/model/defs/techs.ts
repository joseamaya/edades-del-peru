import { BuildingKind, Era, Resources, ZERO_RESOURCES } from '../../core/types';

export interface TechEffect {
  ataqueMult?: number;
  armaduraMult?: number;
  recoleccionMult?: Partial<Resources>;
  capacidadBonus?: number;
  velocidadBonus?: number;
  losBonus?: number;
  precioDescuento?: number;
  rangeBonus?: number;
}

export interface TechDef {
  id: string;
  nombre: string;
  descripcion: string;
  costo: Resources;
  tiempo: number;
  eraMinima: Era;
  edificio: BuildingKind;
  efecto: TechEffect;
  /** Tecnologías que desbloquea (unidades o edificios) */
  unlocksUnits?: string[];
  requisitos?: string[];
  icono?: string;
}

const BASE: Resources = ZERO_RESOURCES;
function cost(c: Partial<Resources>): Resources {
  return { ...BASE, ...c };
}

export const TECHS: TechDef[] = [
  {
    id: 'motor_vapor',
    nombre: 'Canal de Regadío',
    descripcion: 'Canal de regadío: todas las unidades se desplazan un 10% más rápido.',
    costo: cost({ madera: 100, acero: 50 }),
    tiempo: 40,
    eraMinima: Era.FORMATIVO,
    edificio: BuildingKind.CENTRO,
    efecto: { velocidadBonus: 0.1 },
    icono: '🌊',
  },
  {
    id: 'torno_mecanizado',
    nombre: 'Telar Andino',
    descripcion: 'Talleres más eficientes. Madera y plata se recolectan un 15% más rápido.',
    costo: cost({ madera: 80, acero: 60 }),
    tiempo: 45,
    eraMinima: Era.FORMATIVO,
    edificio: BuildingKind.INSTITUTO,
    efecto: { recoleccionMult: { madera: 0.15, acero: 0.15 } },
    icono: '🧶',
  },
  {
    id: 'rifles_repetidos',
    nombre: 'Arco y Boleadora',
    descripcion: 'Desbloquea a los Tiradores de Élite en el Arsenal.',
    costo: cost({ acero: 120, comida: 60 }),
    tiempo: 50,
    eraMinima: Era.ESTADOS_REGIONALES,
    edificio: BuildingKind.POLVORIN,
    efecto: { ataqueMult: 0.1 },
    unlocksUnits: ['fusilero'],
    icono: '🏹',
  },
  {
    id: 'acero_bessemer',
    nombre: 'Metalurgia de la Plata',
    descripcion: 'Aleaciones superiores. +10% de blindaje a todas las unidades.',
    costo: cost({ acero: 150, madera: 80 }),
    tiempo: 55,
    eraMinima: Era.ESTADOS_REGIONALES,
    edificio: BuildingKind.FUNDICION,
    efecto: { armaduraMult: 0.1 },
    icono: '🥈',
  },
  {
    id: 'caballeria_pesada',
    nombre: 'Caballería de Choque',
    descripcion: 'Desbloquea la Caballería de Choque en el Establo.',
    costo: cost({ acero: 150, comida: 80 }),
    tiempo: 55,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.GARAJE,
    efecto: { ataqueMult: 0.1 },
    unlocksUnits: ['caballeria'],
    icono: '🐎',
  },
  {
    id: 'obuses',
    nombre: 'Huaracas y Onagros',
    descripcion: 'Desbloquea la Artillería en el Taller. Máquinas de asedio más potentes.',
    costo: cost({ acero: 180, energia: 40 }),
    tiempo: 60,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.FABRICA,
    efecto: { ataqueMult: 0.15 },
    unlocksUnits: ['artilleria'],
    icono: '💣',
  },
  {
    id: 'mecanizacion',
    nombre: 'Obrajes y Talleres',
    descripcion: 'La producción se industrializa. Las unidades infligen un 15% más de daño.',
    costo: cost({ acero: 200, energia: 80 }),
    tiempo: 60,
    eraMinima: Era.TAHUANTINSUYO,
    edificio: BuildingKind.INSTITUTO,
    efecto: { ataqueMult: 0.15 },
    icono: '🏭',
  },
  {
    id: 'defensa_antiaerea',
    nombre: 'Defensa Antiaérea',
    descripcion: 'Desbloquea al Artillero Antiaéreo en el Arsenal. +1 rango de alcance.',
    costo: cost({ acero: 160, energia: 60 }),
    tiempo: 55,
    eraMinima: Era.CONTEMPORANEO,
    edificio: BuildingKind.POLVORIN,
    efecto: { rangeBonus: 1 },
    unlocksUnits: ['artillero_aa'],
    icono: '🎯',
  },
  {
    id: 'morteros',
    nombre: 'Morteros de Asedio',
    descripcion: 'Desbloquea el Mortero en el Taller.',
    costo: cost({ acero: 170, comida: 60 }),
    tiempo: 55,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.FABRICA,
    efecto: { ataqueMult: 0.1 },
    unlocksUnits: ['mortero'],
    icono: '💥',
  },
  {
    id: 'blindados_pesados',
    nombre: 'Blindajes Pesados',
    descripcion: 'Desbloquea el Ariete Blindado en el Establo.',
    costo: cost({ acero: 220, energia: 80 }),
    tiempo: 65,
    eraMinima: Era.CONTEMPORANEO,
    edificio: BuildingKind.GARAJE,
    efecto: { armaduraMult: 0.15 },
    unlocksUnits: ['tanque'],
    icono: '🛡️',
  },
  {
    id: 'armas_atomicas',
    nombre: 'Cohetería',
    descripcion: 'Desbloquea la Artillería de Cohetes en el Taller.',
    costo: cost({ acero: 250, energia: 200 }),
    tiempo: 80,
    eraMinima: Era.CONTEMPORANEO,
    edificio: BuildingKind.FABRICA,
    efecto: { ataqueMult: 0.2 },
    unlocksUnits: ['nuclear'],
    icono: '🚀',
  },
  {
    id: 'radar',
    nombre: 'Quipus y Vigías',
    descripcion: 'Amplía la visión de todos los edificios y unidades.',
    costo: cost({ acero: 150, energia: 120 }),
    tiempo: 60,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.INSTITUTO,
    efecto: { losBonus: 2 },
    icono: '📡',
  },
  {
    id: 'francotiradores',
    nombre: 'Cazadores',
    descripcion: 'Desbloquea al Cazador en el Arsenal.',
    costo: cost({ acero: 180, energia: 60 }),
    tiempo: 60,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.POLVORIN,
    efecto: { rangeBonus: 1 },
    unlocksUnits: ['francotirador'],
    icono: '🦅',
  },
  {
    id: 'propaganda',
    nombre: 'Palabra del Amauta',
    descripcion: 'Desbloquea al Amauta en la Casa del Guerrero.',
    costo: cost({ comida: 150, acero: 100 }),
    tiempo: 60,
    eraMinima: Era.VIRREINATO,
    edificio: BuildingKind.CUARTEL,
    efecto: {},
    unlocksUnits: ['comisario'],
    icono: '🧙',
  },
  {
    id: 'drones',
    nombre: 'Chasquis Veloces',
    descripcion: 'Los obreros cargan 5 recursos más por viaje.',
    costo: cost({ acero: 180, energia: 120 }),
    tiempo: 60,
    eraMinima: Era.REPUBLICA,
    edificio: BuildingKind.CENTRO,
    efecto: { capacidadBonus: 5 },
    icono: '🏃',
  },
  {
    id: 'mecatronica',
    nombre: 'Ingeniería Blindada',
    descripcion: 'Desbloquea al Guardián Blindado en el Pucará.',
    costo: cost({ acero: 300, energia: 250 }),
    tiempo: 90,
    eraMinima: Era.CONTEMPORANEO,
    edificio: BuildingKind.FORTALEZA,
    efecto: { ataqueMult: 0.2, armaduraMult: 0.2 },
    unlocksUnits: ['mec'],
    icono: '🛡️',
  },
  {
    id: 'fusion',
    nombre: 'Hidroeléctricas',
    descripcion: 'Energía casi infinita. Recolección de piedra +30%.',
    costo: cost({ acero: 250, energia: 300 }),
    tiempo: 80,
    eraMinima: Era.CONTEMPORANEO,
    edificio: BuildingKind.REFINERIA,
    efecto: { recoleccionMult: { energia: 0.3 } },
    icono: '⚡',
  },
  {
    id: 'cadenas_montaje',
    nombre: 'Producción en Serie',
    descripcion: 'Producción militar acelerada. Entrenamiento un 20% más rápido.',
    costo: cost({ acero: 140, comida: 80 }),
    tiempo: 50,
    eraMinima: Era.TAHUANTINSUYO,
    edificio: BuildingKind.FABRICA,
    efecto: { precioDescuento: 0.2 },
    icono: '🔧',
  },
];

export function getTech(id: string): TechDef | undefined {
  return TECHS.find((t) => t.id === id);
}
