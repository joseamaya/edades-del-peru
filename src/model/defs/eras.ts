import { Era } from '../../core/types';

export interface EraDef {
  id: Era;
  name: string;
  years: string;
  /** Era construction palette. */
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    roof: string;
    emissive: string;
    emissiveIntensity: number;
    detail: string;
  };
  description: string;
  /** Resource cost to advance to the NEXT era. */
  advanceCost: { food: number; wood: number; silver: number; stone: number } | null;
  /** Buildings required (count) to advance. */
  advanceRequiredBuildings: number;
}

export const ERA_DEFS: EraDef[] = [
  {
    id: Era.FORMATIVE,
    name: 'Perú Antiguo',
    years: '3000–200 a.C.',
    palette: {
      primary: '#9a7a52',
      secondary: '#c8b088',
      accent: '#b0885a',
      roof: '#6a4a2a',
      emissive: '#ffb060',
      emissiveIntensity: 0.5,
      detail: '#4a3520',
    },
    description:
      'Caral y Chavín: las primeras ciudades de América. Pirámides de piedra, plazas hundidas y canales de regadío.',
    advanceCost: { food: 400, wood: 300, silver: 0, stone: 0 },
    advanceRequiredBuildings: 1,
  },
  {
    id: Era.REGIONAL_STATES,
    name: 'Estados Regionales',
    years: '200 a.C.–1100 d.C.',
    palette: {
      primary: '#8a4a32',
      secondary: '#c86a48',
      accent: '#d8a040',
      roof: '#5a2e22',
      emissive: '#ff8030',
      emissiveIntensity: 0.7,
      detail: '#3a1e16',
    },
    description: 'Moche, Nazca, Tiahuanaco y Wari: huacas de adobe, geoglifos, cerámica maestra y orfebrería.',
    advanceCost: { food: 600, wood: 400, silver: 400, stone: 0 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.TAHUANTINSUYO,
    name: 'Tahuantinsuyo',
    years: '1100–1532',
    palette: {
      primary: '#7a7a80',
      secondary: '#b8b0a0',
      accent: '#e0b83a',
      roof: '#4a4a52',
      emissive: '#ffd060',
      emissiveIntensity: 0.9,
      detail: '#3a3a40',
    },
    description: 'El Imperio Inca: mampostería de piedra pulida, andenes, el Qhapaq Ñan y el Coricancha dorado.',
    advanceCost: { food: 700, wood: 400, silver: 800, stone: 200 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.VICEROYALTY,
    name: 'Virreinato',
    years: '1532–1821',
    palette: {
      primary: '#8a6a5a',
      secondary: '#c8a888',
      accent: '#c8a040',
      roof: '#7a3a2a',
      emissive: '#ffb050',
      emissiveIntensity: 1.0,
      detail: '#4a3428',
    },
    description: 'El Virreinato del Perú: iglesias barrocas, obrajes, mita minera y la plata de Potosí.',
    advanceCost: { food: 800, wood: 300, silver: 1000, stone: 600 },
    advanceRequiredBuildings: 2,
  },
  {
    id: Era.REPUBLIC,
    name: 'República',
    years: '1821–1900',
    palette: {
      primary: '#6a6a72',
      secondary: '#a8a8b0',
      accent: '#c8b060',
      roof: '#4a4a52',
      emissive: '#ffc060',
      emissiveIntensity: 1.2,
      detail: '#2e2e34',
    },
    description: 'Independencia, guano y salitre. Ferrocarriles, puertos y la Guerra del Pacífico.',
    advanceCost: { food: 900, wood: 200, silver: 1200, stone: 1000 },
    advanceRequiredBuildings: 3,
  },
  {
    id: Era.CONTEMPORARY,
    name: 'Perú Contemporáneo',
    years: '1900–hoy',
    palette: {
      primary: '#5a6470',
      secondary: '#8a94a0',
      accent: '#50a8c8',
      roof: '#3a424c',
      emissive: '#60c0e0',
      emissiveIntensity: 1.5,
      detail: '#20262e',
    },
    description: 'El Perú moderno: industria, minería, ciudades y tecnología del siglo XXI.',
    advanceCost: null,
    advanceRequiredBuildings: 0,
  },
];
