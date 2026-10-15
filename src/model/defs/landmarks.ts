import { CivId, HistoricalPeriod } from '../../core/types';
import type { GeographicRegion } from './profiles';

/**
 * Historical landmarks (visual only). Each entry abstracts a documented structure
 * from the civilization's architecture; models are built in Phase 5.
 * `status` separates an attested structure ('documented') from an archaeological
 * reading ('plausible') and a gameplay abstraction ('abstraction').
 * Sources: `docs/historia/` dossiers.
 */
export type LandmarkId = 'caral_ceremonial' | 'moche_huaca' | 'inca_ushnu';

export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  civ: CivId;
  period: HistoricalPeriod;
  region: GeographicRegion;
  status: 'documented' | 'plausible' | 'abstraction';
  source: string;
}

export const LANDMARKS: Record<LandmarkId, LandmarkDef> = {
  caral_ceremonial: {
    id: 'caral_ceremonial',
    name: 'Complejo ceremonial de Caral',
    civ: CivId.CARAL,
    period: HistoricalPeriod.ARCHAIC,
    region: 'central_coast',
    status: 'documented',
    source:
      'docs/historia/civilizaciones/caral.md (UNESCO: Ciudad Sagrada de Caral-Supe, whc.unesco.org/en/list/1269/)',
  },
  moche_huaca: {
    id: 'moche_huaca',
    name: 'Huaca (plataforma ceremonial)',
    civ: CivId.MOCHE,
    period: HistoricalPeriod.EARLY_INTERMEDIATE,
    region: 'north_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/moche.md (Huacas del Sol y de la Luna)',
  },
  inca_ushnu: {
    id: 'inca_ushnu',
    name: 'Ushnu / plaza ceremonial',
    civ: CivId.INCA,
    period: HistoricalPeriod.LATE_HORIZON,
    region: 'high_andes',
    status: 'documented',
    source: 'docs/historia/civilizaciones/inca.md (plaza y ushnu; reconstrucción abstracta)',
  },
};

/** Landmark that stands for a civilization (slice: Caral, Moche, Inca). */
export const CIV_LANDMARK: Partial<Record<CivId, LandmarkId>> = {
  [CivId.CARAL]: 'caral_ceremonial',
  [CivId.MOCHE]: 'moche_huaca',
  [CivId.INCA]: 'inca_ushnu',
};

export function landmarkForCiv(id: CivId): LandmarkId | null {
  return CIV_LANDMARK[id] ?? null;
}
