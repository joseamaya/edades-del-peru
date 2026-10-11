import { Era, MapType, Periodo } from '../../core/types';

/**
 * Periodos históricos jugables. `nivel` mapea al nivel tecnológico interno (Era 0-5) usado por
 * stats y modelos; las partidas son **bloqueadas por periodo** (sin modernización anacrónica).
 */
export interface PeriodoDef {
  id: Periodo;
  nombre: string;
  fechas: string;
  /** Nivel tecnológico interno (reutiliza los 6 sets de modelos/stats existentes). */
  nivel: Era;
  /** Mapa por defecto (puede sobreescribirse con la geografía de la civilización). */
  mapa: MapType;
}

export const PERIODOS: PeriodoDef[] = [
  { id: Periodo.ARCAICO, nombre: 'Arcaico Tardío', fechas: '3000–1800 a.C.', nivel: Era.FORMATIVO, mapa: 'costa' },
  { id: Periodo.HORIZONTE_TEMPRANO, nombre: 'Horizonte Temprano', fechas: '1200–200 a.C.', nivel: Era.ESTADOS_REGIONALES, mapa: 'andes' },
  { id: Periodo.INTERMEDIO_TEMPRANO, nombre: 'Intermedio Temprano', fechas: '200 a.C.–600 d.C.', nivel: Era.ESTADOS_REGIONALES, mapa: 'costa' },
  { id: Periodo.HORIZONTE_MEDIO, nombre: 'Horizonte Medio', fechas: '600–1000 d.C.', nivel: Era.TAHUANTINSUYO, mapa: 'andes' },
  { id: Periodo.INTERMEDIO_TARDIO, nombre: 'Intermedio Tardío', fechas: '1000–1476 d.C.', nivel: Era.TAHUANTINSUYO, mapa: 'costa' },
  { id: Periodo.HORIZONTE_TARDIO, nombre: 'Horizonte Tardío (Inca)', fechas: '1438–1533 d.C.', nivel: Era.TAHUANTINSUYO, mapa: 'andes' },
  { id: Periodo.VIRREINATO, nombre: 'Virreinato del Perú', fechas: '1542–1821', nivel: Era.VIRREINATO, mapa: 'andes' },
  { id: Periodo.INDEPENDENCIA, nombre: 'Independencia', fechas: '1821–1824', nivel: Era.REPUBLICA, mapa: 'andes' },
  { id: Periodo.REPUBLICA, nombre: 'República', fechas: '1821–1900', nivel: Era.REPUBLICA, mapa: 'costa' },
  { id: Periodo.CONTEMPORANEO, nombre: 'Perú Contemporáneo', fechas: '1900–hoy', nivel: Era.CONTEMPORANEO, mapa: 'costa' },
];

export function getPeriodo(id: Periodo): PeriodoDef {
  return PERIODOS.find((p) => p.id === id)!;
}
