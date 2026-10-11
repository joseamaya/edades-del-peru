import { Era, MapType, HistoricalPeriod } from '../../core/types';

/**
 * Playable historical periods. `level` maps to the internal tech level (Era 0-5) used by
 * stats and models; matches are **period-locked** (no anachronistic modernization).
 */
export interface PeriodDef {
  id: HistoricalPeriod;
  name: string;
  dates: string;
  /** Internal tech level (reuses the 6 existing model/stat sets). */
  level: Era;
  /** Default map (can be overridden with the civilization's geography). */
  map: MapType;
}

export const PERIODS: PeriodDef[] = [
  { id: HistoricalPeriod.ARCHAIC, name: 'Arcaico Tardío', dates: '3000–1800 a.C.', level: Era.FORMATIVE, map: 'coast' },
  { id: HistoricalPeriod.EARLY_HORIZON, name: 'Horizonte Temprano', dates: '1200–200 a.C.', level: Era.REGIONAL_STATES, map: 'andes' },
  { id: HistoricalPeriod.EARLY_INTERMEDIATE, name: 'Intermedio Temprano', dates: '200 a.C.–600 d.C.', level: Era.REGIONAL_STATES, map: 'coast' },
  { id: HistoricalPeriod.MIDDLE_HORIZON, name: 'Horizonte Medio', dates: '600–1000 d.C.', level: Era.TAHUANTINSUYO, map: 'andes' },
  { id: HistoricalPeriod.LATE_INTERMEDIATE, name: 'Intermedio Tardío', dates: '1000–1476 d.C.', level: Era.TAHUANTINSUYO, map: 'coast' },
  { id: HistoricalPeriod.LATE_HORIZON, name: 'Horizonte Tardío (Inca)', dates: '1438–1533 d.C.', level: Era.TAHUANTINSUYO, map: 'andes' },
  { id: HistoricalPeriod.VICEROYALTY, name: 'Virreinato del Perú', dates: '1542–1821', level: Era.VICEROYALTY, map: 'andes' },
  { id: HistoricalPeriod.INDEPENDENCE, name: 'Independencia', dates: '1821–1824', level: Era.REPUBLIC, map: 'andes' },
  { id: HistoricalPeriod.REPUBLIC, name: 'República', dates: '1821–1900', level: Era.REPUBLIC, map: 'coast' },
  { id: HistoricalPeriod.CONTEMPORARY, name: 'Perú Contemporáneo', dates: '1900–hoy', level: Era.CONTEMPORARY, map: 'coast' },
];

export function getPeriod(id: HistoricalPeriod): PeriodDef {
  return PERIODS.find((p) => p.id === id)!;
}
