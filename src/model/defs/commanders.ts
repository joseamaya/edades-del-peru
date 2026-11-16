import { CivId } from '../../core/types';
import type { PersonGender } from './people';

/** Portraits are stylized medallions; `status` describes the *likeness*, not the role. */
export const PORTRAIT_IDS = [
  'cusi_yupanqui',
  'tupac_yupanqui',
  'minchancaman',
  'anccu_hualloc',
  'tupac_amaru',
  'micaela_bastidas',
  'san_martin',
  'bolivar',
  'sucre',
  'grau',
  'bolognesi',
  'atahualpa',
  'huascar',
  'pumacahua',
  'melgar',
  'ramirez_orozco',
  'manco_capac',
  'ayar_auca',
  'ayar_cachi',
  'ayar_uchu',
  'mama_huaco',
  'mama_ocllo',
  'mama_ipacura',
  'mama_raua',
  'pizarro',
  'quizu_yupanqui',
] as const;

export type PortraitId = (typeof PORTRAIT_IDS)[number];

/** Field-marker crest shape for heroes; presentation only, not a historical emblem. */
export type HeroCrest = 'diamond' | 'tetra' | 'stone' | 'spire';

/** Accent used when a hero has none declared (all current Ayar declare one). */
export const DEFAULT_HERO_ACCENT = '#e0b84a';

/**
 * Campaign commanders shown in briefings and dialogue. Portraits are stylized
 * medallions (not attested likenesses): pre-Hispanic figures have no documented
 * face, and pre-Hispanic or early-conquest figures without an attested likeness are `abstraction`.
 */
export interface CommanderDef {
  id: PortraitId;
  name: string;
  /** Player-facing role, e.g. "Inca · Cusco". */
  role: string;
  civ: CivId;
  /** `documented` = an attested likeness exists; `abstraction` = stylized. */
  status: 'documented' | 'abstraction';
  source?: string;
  /** Lead figure: gets a field banner, a hero ring and the hero card in the HUD. */
  hero?: boolean;
  /** Presentation accent for the field marker, nameplate, medallion and hero attire (not a historical colour). */
  accent?: string;
  /**
   * Presentation gender. It picks the shared rig's body/garments and the portrait silhouette; it is not
   * a claim beyond the documented name. A named hero keeps its declared gender instead of the unit-id split.
   */
  gender: PersonGender;
  /** Field-marker crest shape; a hero without one keeps the diamond. */
  crest?: HeroCrest;
  /** Hero mantle length; the Mamas wear the long cloth, everyone else the short one. */
  mantle?: 'short' | 'long';
}

export const COMMANDERS: Record<PortraitId, CommanderDef> = {
  cusi_yupanqui: {
    gender: 'male',
    id: 'cusi_yupanqui',
    name: 'Cusi Yupanqui',
    role: 'Inca · Cusco',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/yahuar_pampa.md',
  },
  tupac_yupanqui: {
    gender: 'male',
    id: 'tupac_yupanqui',
    name: 'Túpac Yupanqui',
    role: 'Inca · auqui',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/chimu_inca.md',
  },
  minchancaman: {
    gender: 'male',
    id: 'minchancaman',
    name: 'Minchancaman',
    role: 'Chimú · Chan Chan',
    civ: CivId.CHIMU,
    status: 'abstraction',
    source: 'docs/historia/campanas/chimu_inca.md',
  },
  anccu_hualloc: {
    gender: 'male',
    id: 'anccu_hualloc',
    name: 'Anccu Hualloc',
    role: 'Chanca · general',
    civ: CivId.CHANCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/yahuar_pampa.md',
  },
  tupac_amaru: {
    gender: 'male',
    id: 'tupac_amaru',
    name: 'Túpac Amaru II',
    role: 'Rebelión · Cusco',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  micaela_bastidas: {
    gender: 'female',
    id: 'micaela_bastidas',
    name: 'Micaela Bastidas',
    role: 'Rebelión · intendencia',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  san_martin: {
    gender: 'male',
    id: 'san_martin',
    name: 'José de San Martín',
    role: 'Patriotas · Protector',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  bolivar: {
    gender: 'male',
    id: 'bolivar',
    name: 'Simón Bolívar',
    role: 'Patriotas · Libertador',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  sucre: {
    gender: 'male',
    id: 'sucre',
    name: 'Antonio José de Sucre',
    role: 'Patriotas · Ayacucho',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  grau: {
    gender: 'male',
    id: 'grau',
    name: 'Miguel Grau',
    role: 'Perú · Huáscar',
    civ: CivId.REPUBLIC,
    status: 'documented',
    source: 'docs/historia/campanas/guerra_del_pacifico.md',
  },
  bolognesi: {
    gender: 'male',
    id: 'bolognesi',
    name: 'Francisco Bolognesi',
    role: 'Perú · Arica',
    civ: CivId.REPUBLIC,
    status: 'documented',
    source: 'docs/historia/campanas/guerra_del_pacifico.md',
  },
  atahualpa: {
    gender: 'male',
    id: 'atahualpa',
    name: 'Atahualpa',
    role: 'Inca · Quito',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
  huascar: {
    gender: 'male',
    id: 'huascar',
    name: 'Huáscar',
    role: 'Inca · Cusco',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
  pumacahua: {
    gender: 'male',
    id: 'pumacahua',
    name: 'Mateo García Pumacahua',
    role: 'Junta del Cusco · Chinchero',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/junta_cusco.md',
  },
  melgar: {
    gender: 'male',
    id: 'melgar',
    name: 'Mariano Melgar',
    role: 'Junta del Cusco · auditor de guerra',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/junta_cusco.md',
  },
  ramirez_orozco: {
    gender: 'male',
    id: 'ramirez_orozco',
    name: 'Juan Ramírez Orozco',
    role: 'Realistas · Alto Perú',
    civ: CivId.REALISTAS,
    status: 'documented',
    source: 'docs/historia/campanas/junta_cusco.md',
  },
  manco_capac: {
    gender: 'male',
    id: 'manco_capac',
    name: 'Ayar Manco',
    role: 'Ayar · jefe de la peregrinación',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#e0b84a',
    crest: 'spire',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  ayar_auca: {
    gender: 'male',
    id: 'ayar_auca',
    name: 'Ayar Auca',
    role: 'Ayar · nombre del Cusco',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#4a9a5a',
    crest: 'diamond',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  ayar_cachi: {
    gender: 'male',
    id: 'ayar_cachi',
    name: 'Ayar Cachi',
    role: 'Ayar · sepultado en Tambo Quiro',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#c98a3a',
    crest: 'stone',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  ayar_uchu: {
    gender: 'male',
    id: 'ayar_uchu',
    name: 'Ayar Uchu',
    role: 'Ayar · piedra de Huanacaure',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#4a7ab6',
    crest: 'tetra',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  mama_huaco: {
    gender: 'female',
    id: 'mama_huaco',
    name: 'Mama Huaco',
    role: 'Ayar · hermana de la peregrinación',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#b64a3a',
    crest: 'tetra',
    mantle: 'long',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  mama_ocllo: {
    gender: 'female',
    id: 'mama_ocllo',
    name: 'Mama Ocllo',
    role: 'Ayar · hermana de la peregrinación',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#8a5aa8',
    crest: 'diamond',
    mantle: 'long',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  mama_ipacura: {
    gender: 'female',
    id: 'mama_ipacura',
    name: 'Mama Ipacura',
    role: 'Ayar · hermana de la peregrinación',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#3a9a9a',
    crest: 'stone',
    mantle: 'long',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  mama_raua: {
    gender: 'female',
    id: 'mama_raua',
    name: 'Mama Raua',
    role: 'Ayar · hermana de la peregrinación',
    civ: CivId.INCA_KILLKE,
    hero: true,
    accent: '#c86a2a',
    crest: 'spire',
    mantle: 'long',
    status: 'abstraction',
    source: 'docs/historia/campanas/tambotoco.md',
  },
  pizarro: {
    gender: 'male',
    id: 'pizarro',
    name: 'Francisco Pizarro',
    role: 'Hueste indiana · Ciudad de los Reyes',
    civ: CivId.HUESTE_INDIANA,
    status: 'documented',
    source: 'docs/historia/campanas/lima.md',
  },
  quizu_yupanqui: {
    gender: 'male',
    id: 'quizu_yupanqui',
    name: 'Quizu Yupanqui',
    role: 'Inca · general del cerco',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/lima.md',
  },
};

/** Normalize a speaker label ("Miguel Grau", "TUPÁC AMARU II") for lookup. */
export function normalizeCommanderName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_NAME = new Map<string, CommanderDef>();
for (const c of Object.values(COMMANDERS)) BY_NAME.set(normalizeCommanderName(c.name), c);

const BY_ID = new Map<string, CommanderDef>(Object.values(COMMANDERS).map((c) => [c.id, c]));

/** Resolve a commander by display name (accent/case insensitive). */
export function commanderFor(name: string): CommanderDef | undefined {
  return BY_NAME.get(normalizeCommanderName(name));
}

/**
 * Resolve a commander by id. A unit's mission tag uses the same id, so a named
 * character can be labelled in the world and in the selection panel.
 */
export function commanderById(id: string | undefined): CommanderDef | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Nameplate / HUD title for a commander; heroes carry the star. */
export function commanderLabel(commander: CommanderDef): string {
  return commander.hero ? `★ ${commander.name}` : commander.name;
}
