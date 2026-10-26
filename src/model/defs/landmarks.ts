import { CivId, HistoricalPeriod } from '../../core/types';
import type { GeographicRegion } from './profiles';

/**
 * Historical landmarks (visual only). Each entry abstracts a documented structure
 * from the civilization's architecture; models are built in Phase 5.
 * `status` separates an attested structure ('documented') from an archaeological
 * reading ('plausible') and a gameplay abstraction ('abstraction').
 * Sources: `docs/historia/` dossiers.
 */
export type LandmarkId =
  | 'caral_ceremonial'
  | 'chavin_temple'
  | 'cupisnique_huaca'
  | 'paracas_necropolis'
  | 'moche_huaca'
  | 'nazca_geoglyph'
  | 'wari_compound'
  | 'tiahuanaco_complex'
  | 'chimu_compound'
  | 'chincha_complex'
  | 'chanca_fortress'
  | 'collas_chullpa'
  | 'huanca_center'
  | 'recuay_pashash'
  | 'inca_ushnu'
  | 'colonial_church'
  | 'patriotas_camp'
  | 'republican_fort'
  | 'chile_apostadero';

export type CaralModularPlacement = 'central' | 'quarry' | 'lesser' | 'gallery' | 'huanca' | 'amphitheatre';

export type LandmarkSceneryModel =
  | 'caral_pyramid_mayor'
  | 'caral_pyramid_central'
  | 'caral_pyramid_quarry'
  | 'caral_pyramid_lesser'
  | 'caral_pyramid_gallery'
  | 'caral_pyramid_huanca'
  | 'caral_anfiteatro';

export interface PadSize {
  x: number;
  z: number;
}

export interface LandmarkSetpiece {
  model: LandmarkSceneryModel;
  /** Placement name in the authored scene plan; falls back to a random site for older scenery. */
  placement?: CaralModularPlacement;
  /** Search radius; the height radius includes the rectangular pad circumradius. */
  padRadius: number;
  padSize?: PadSize;
  /** Set false when the surrounding authored terrain flat already supports the module. */
  platform?: boolean;
}

export function setpiecePadRadius(setpiece: LandmarkSetpiece): number {
  if (!setpiece.padSize) return setpiece.padRadius;
  return Math.max(setpiece.padRadius, Math.hypot(setpiece.padSize.x, setpiece.padSize.z) / 2);
}

export interface LandmarkScenery {
  model: LandmarkSceneryModel;
  padRadius: number;
  /** Secondary structures placed around the landmark (visual only). */
  setpieces?: LandmarkSetpiece[];
}

export interface LandmarkDef {
  id: LandmarkId;
  name: string;
  civ: CivId;
  period: HistoricalPeriod;
  region: GeographicRegion;
  status: 'documented' | 'plausible' | 'abstraction';
  source: string;
  scenery?: LandmarkScenery;
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
    scenery: {
      model: 'caral_pyramid_mayor',
      padRadius: 11,
      setpieces: [
        { model: 'caral_anfiteatro', placement: 'amphitheatre', padRadius: 10, padSize: { x: 21, z: 9 } },
        { model: 'caral_pyramid_central', placement: 'central', padRadius: 6, platform: false },
        { model: 'caral_pyramid_quarry', placement: 'quarry', padRadius: 6, platform: false },
        { model: 'caral_pyramid_lesser', placement: 'lesser', padRadius: 5, platform: false },
        { model: 'caral_pyramid_gallery', placement: 'gallery', padRadius: 6, platform: false },
        { model: 'caral_pyramid_huanca', placement: 'huanca', padRadius: 5.5, platform: false },
      ],
    },
  },
  chavin_temple: {
    id: 'chavin_temple',
    name: 'Templo / plaza ceremonial',
    civ: CivId.CHAVIN,
    period: HistoricalPeriod.EARLY_HORIZON,
    region: 'andean_valley',
    status: 'documented',
    source:
      'docs/historia/civilizaciones/chavin.md (Chavín de Huántar: templo, cabezas clavas y Lanzón interior; Rick et al. 1998)',
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
  wari_compound: {
    id: 'wari_compound',
    name: 'Complejo urbano amurallado',
    civ: CivId.WARI,
    period: HistoricalPeriod.MIDDLE_HORIZON,
    region: 'high_andes',
    status: 'documented',
    source: 'docs/historia/civilizaciones/wari.md (centros provinciales planificados)',
  },
  tiahuanaco_complex: {
    id: 'tiahuanaco_complex',
    name: 'Complejo monumental megalítico',
    civ: CivId.TIAHUANACO,
    period: HistoricalPeriod.MIDDLE_HORIZON,
    region: 'altiplano',
    status: 'documented',
    source: 'docs/historia/civilizaciones/tiahuanaco.md (arquitectura monumental; Puerta del Sol, monolitos)',
  },
  chimu_compound: {
    id: 'chimu_compound',
    name: 'Ciudadela de adobe (recinto amurallado)',
    civ: CivId.CHIMU,
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    region: 'north_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/chimu.md (Chan Chan, ciudadelas; UNESCO)',
  },
  inca_ushnu: {
    id: 'inca_ushnu',
    name: 'Ushnu / plaza ceremonial',
    civ: CivId.INCA,
    period: HistoricalPeriod.LATE_HORIZON,
    region: 'high_andes',
    status: 'abstraction',
    source: 'docs/historia/civilizaciones/inca.md (Arquitectura ceremonial: ushnu; Wikipedia: Ushnu)',
  },
  colonial_church: {
    id: 'colonial_church',
    name: 'Iglesia colonial',
    civ: CivId.REALISTAS,
    period: HistoricalPeriod.VICEROYALTY,
    region: 'andean_valley',
    status: 'abstraction',
    source: 'docs/historia/arquitectura.md (colonial: iglesias, campanario, cubierta de teja)',
  },
  republican_fort: {
    id: 'republican_fort',
    name: 'Fortificación portuaria',
    civ: CivId.REPUBLIC,
    period: HistoricalPeriod.REPUBLIC,
    region: 'south_coast',
    status: 'abstraction',
    source: 'docs/historia/civilizaciones/republica.md (defensa del puerto; Guerra del Pacífico)',
  },
  cupisnique_huaca: {
    id: 'cupisnique_huaca',
    name: 'Huaca de adobe con frisos',
    civ: CivId.CUPISNIQUE,
    period: HistoricalPeriod.EARLY_HORIZON,
    region: 'north_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/cupisnique.md (Huaca de los Reyes, Caballo Muerto)',
  },
  paracas_necropolis: {
    id: 'paracas_necropolis',
    name: 'Necrópolis con fardos funerarios',
    civ: CivId.PARACAS,
    period: HistoricalPeriod.EARLY_HORIZON,
    region: 'south_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/paracas.md (Cerro Colorado; fardos funerarios y textiles)',
  },
  nazca_geoglyph: {
    id: 'nazca_geoglyph',
    name: 'Geoglifo y líneas de la pampa',
    civ: CivId.NAZCA,
    period: HistoricalPeriod.EARLY_INTERMEDIATE,
    region: 'south_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/nazca.md (Líneas y geoglifos; UNESCO whc.unesco.org/en/list/700/)',
  },
  chincha_complex: {
    id: 'chincha_complex',
    name: 'Complejo de La Centinela',
    civ: CivId.CHINCHA,
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    region: 'south_coast',
    status: 'documented',
    source: 'docs/historia/civilizaciones/chincha.md (La Centinela y Tambo de Mora)',
  },
  chanca_fortress: {
    id: 'chanca_fortress',
    name: 'Pucará de altura',
    civ: CivId.CHANCA,
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    region: 'high_andes',
    status: 'documented',
    source: 'docs/historia/civilizaciones/chanca.md (Huaman Karpa; asentamientos en cimas de cerros)',
  },
  collas_chullpa: {
    id: 'collas_chullpa',
    name: 'Torres funerarias (chullpas)',
    civ: CivId.COLLAS_LUPACA,
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    region: 'altiplano',
    status: 'documented',
    source: 'docs/historia/civilizaciones/collas_lupaca.md (chullpas; señoríos aimaras del Collao)',
  },
  huanca_center: {
    id: 'huanca_center',
    name: 'Centro de ayllu (Hatun Xauxa)',
    civ: CivId.HUANCA,
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    region: 'andean_valley',
    status: 'abstraction',
    source: 'docs/historia/civilizaciones/huanca.md (Hatun Xauxa; confederación de ayllus)',
  },
  recuay_pashash: {
    id: 'recuay_pashash',
    name: 'Centro fortificado de Pashash',
    civ: CivId.RECUAY,
    period: HistoricalPeriod.EARLY_INTERMEDIATE,
    region: 'high_andes',
    status: 'plausible',
    source: 'docs/historia/civilizaciones/recuay.md (Pashash y Chinchawas; escultura lítica y fortificaciones)',
  },
  patriotas_camp: {
    id: 'patriotas_camp',
    name: 'Campamento patriota',
    civ: CivId.PATRIOTAS,
    period: HistoricalPeriod.INDEPENDENCE,
    region: 'andean_valley',
    status: 'abstraction',
    source: 'docs/historia/civilizaciones/patriotas.md (campañas de la sierra; montoneras)',
  },
  chile_apostadero: {
    id: 'chile_apostadero',
    name: 'Apostadero naval con blindado',
    civ: CivId.CHILE,
    period: HistoricalPeriod.REPUBLIC,
    region: 'south_coast',
    status: 'plausible',
    source: 'docs/historia/civilizaciones/chile.md (escuadra blindada: Cochrane, Esmeralda; Guerra del Pacífico)',
  },
};

/** Landmark that stands for a civilization. */
export const CIV_LANDMARK: Partial<Record<CivId, LandmarkId>> = {
  [CivId.CARAL]: 'caral_ceremonial',
  [CivId.CHAVIN]: 'chavin_temple',
  [CivId.CUPISNIQUE]: 'cupisnique_huaca',
  [CivId.PARACAS]: 'paracas_necropolis',
  [CivId.MOCHE]: 'moche_huaca',
  [CivId.NAZCA]: 'nazca_geoglyph',
  [CivId.WARI]: 'wari_compound',
  [CivId.TIAHUANACO]: 'tiahuanaco_complex',
  [CivId.CHIMU]: 'chimu_compound',
  [CivId.CHINCHA]: 'chincha_complex',
  [CivId.CHANCA]: 'chanca_fortress',
  [CivId.COLLAS_LUPACA]: 'collas_chullpa',
  [CivId.HUANCA]: 'huanca_center',
  [CivId.RECUAY]: 'recuay_pashash',
  [CivId.INCA]: 'inca_ushnu',
  [CivId.REALISTAS]: 'colonial_church',
  [CivId.PATRIOTAS]: 'patriotas_camp',
  [CivId.REPUBLIC]: 'republican_fort',
  [CivId.CHILE]: 'chile_apostadero',
};

/**
 * Landmark of a civilization in a period. It only applies in the landmark's own
 * period, so a culture played outside it (e.g. the Inca in the Viceroyalty) does
 * not carry an anachronistic landmark.
 */
export function landmarkForCiv(id: CivId, period: HistoricalPeriod): LandmarkId | null {
  const landmark = CIV_LANDMARK[id];
  if (!landmark) return null;
  return LANDMARKS[landmark].period === period ? landmark : null;
}
