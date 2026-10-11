import { Era } from '../../core/types';

export interface EraDef {
  id: Era;
  nombre: string;
  anos: string;
  /** Paleta de construcción de la era. */
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    roof: string;
    emissive: string;
    emissiveIntensity: number;
    detail: string;
  };
  descripcion: string;
  /** Coste en recursos para avanzar a la SIGUIENTE era. */
  advanceCost: { comida: number; madera: number; acero: number; energia: number } | null;
  /** Edificios necesarios (buildings count) para avanzar. */
  advanceRequiredBuildings: number;
}

export const ERA_DEFS: EraDef[] = [
  {
    id: Era.FORMATIVO,
    nombre: 'Perú Antiguo',
    anos: '3000–200 a.C.',
    palette: {
      primary: '#9a7a52',
      secondary: '#c8b088',
      accent: '#b0885a',
      roof: '#6a4a2a',
      emissive: '#ffb060',
      emissiveIntensity: 0.5,
      detail: '#4a3520',
    },
    descripcion: 'Caral y Chavín: las primeras ciudades de América. Pirámides de piedra, plazas hundidas y canales de regadío.',
    advanceCost: { comida: 400, madera: 300, acero: 0, energia: 0 },
    advanceRequiredBuildings: 1,
  },
  {
    id: Era.ESTADOS_REGIONALES,
    nombre: 'Estados Regionales',
    anos: '200 a.C.–1100 d.C.',
    palette: {
      primary: '#8a4a32',
      secondary: '#c86a48',
      accent: '#d8a040',
      roof: '#5a2e22',
      emissive: '#ff8030',
      emissiveIntensity: 0.7,
      detail: '#3a1e16',
    },
    descripcion: 'Moche, Nazca, Tiahuanaco y Wari: huacas de adobe, geoglifos, cerámica maestra y orfebrería.',
    advanceCost: { comida: 600, madera: 400, acero: 400, energia: 0 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.TAHUANTINSUYO,
    nombre: 'Tahuantinsuyo',
    anos: '1100–1532',
    palette: {
      primary: '#7a7a80',
      secondary: '#b8b0a0',
      accent: '#e0b83a',
      roof: '#4a4a52',
      emissive: '#ffd060',
      emissiveIntensity: 0.9,
      detail: '#3a3a40',
    },
    descripcion: 'El Imperio Inca: mampostería de piedra pulida, andenes, el Qhapaq Ñan y el Coricancha dorado.',
    advanceCost: { comida: 700, madera: 400, acero: 800, energia: 200 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.VIRREINATO,
    nombre: 'Virreinato',
    anos: '1532–1821',
    palette: {
      primary: '#8a6a5a',
      secondary: '#c8a888',
      accent: '#c8a040',
      roof: '#7a3a2a',
      emissive: '#ffb050',
      emissiveIntensity: 1.0,
      detail: '#4a3428',
    },
    descripcion: 'El Virreinato del Perú: iglesias barrocas, obrajes, mita minera y la plata de Potosí.',
    advanceCost: { comida: 800, madera: 300, acero: 1000, energia: 600 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.REPUBLICA,
    nombre: 'República',
    anos: '1821–1900',
    palette: {
      primary: '#6a6a72',
      secondary: '#a8a8b0',
      accent: '#c8b060',
      roof: '#4a4a52',
      emissive: '#ffc060',
      emissiveIntensity: 1.2,
      detail: '#2e2e34',
    },
    descripcion: 'Independencia, guano y salitre. Ferrocarriles, puertos y la Guerra del Pacífico.',
    advanceCost: { comida: 900, madera: 200, acero: 1200, energia: 1000 },
    advanceRequiredBuildings: 3,
  },
  {
    id: Era.CONTEMPORANEO,
    nombre: 'Perú Contemporáneo',
    anos: '1900–hoy',
    palette: {
      primary: '#5a6470',
      secondary: '#8a94a0',
      accent: '#50a8c8',
      roof: '#3a424c',
      emissive: '#60c0e0',
      emissiveIntensity: 1.5,
      detail: '#20262e',
    },
    descripcion: 'El Perú moderno: industria, minería, ciudades y tecnología del siglo XXI.',
    advanceCost: null,
    advanceRequiredBuildings: 0,
  },
];
