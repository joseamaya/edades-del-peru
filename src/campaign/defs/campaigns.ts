import { MISSIONS, getMission } from './campaign';
import type { MissionDef } from '../types';
import type { CinematicBeat } from './cinematics';
import {
  INDEPENDENCIA_PROLOGUE,
  INCA_PROLOGUE,
  PREINCA_PROLOGUE,
  REPUBLICA_PROLOGUE,
  VIRREINATO_PROLOGUE,
} from './cinematics';
import { getPlannedMission, type PlannedMission } from './plannedMissions';

export type CampaignId = 'preinca' | 'inca' | 'virreinato' | 'independencia' | 'republica';

export type CampaignStatus = 'available' | 'coming-soon';

/** A campaign of the La Senda del Sol series. */
export interface CampaignDef {
  id: CampaignId;
  title: string;
  subtitle: string;
  description: string;
  /** Longer menu text: what the campaign covers, in the order its missions play it. */
  summary: string;
  /** Missions playable in the current build. */
  releasedMissionIds: string[];
  status: CampaignStatus;
  /** Short label for the campaign map (dates are historical, not release dates). */
  era: string;
  accent: string;
  prologue: CinematicBeat[];
  /**
   * The launch catalogue in play order: four entries per campaign, released and planned
   * interleaved. Planned entries are shown in the menu as in development and are never playable.
   * Expansion missions (`EXPANSION_MISSIONS`) are never listed here.
   */
  path: string[];
}

export const CAMPAIGN_SERIES_TITLE = 'La Senda del Sol';

export const CAMPAIGNS: CampaignDef[] = [
  {
    id: 'preinca',
    title: 'Culturas Preincas',
    subtitle: 'Caral, Chavín, Moche y Wari',
    description:
      'Antes de los incas, los Andes ya habían construido ciudades, templos, redes de intercambio y estados regionales.',
    summary:
      'Miles de años antes de los incas, los pueblos de los Andes levantaron ciudades, templos y redes de intercambio. Recorre Caral, una de las ciudades más antiguas de América; el oráculo de Chavín; la frontera entre moches y recuay en los valles del norte; y Wari, el primer estado expansivo de los Andes.',
    releasedMissionIds: ['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari'],
    status: 'available',
    era: '3000 a.C. — 1000 d.C.',
    accent: '#c99a55',
    prologue: PREINCA_PROLOGUE,
    path: ['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari'],
  },
  {
    id: 'inca',
    title: 'El Tahuantinsuyo',
    subtitle: 'Del mito de los Ayar a la guerra civil',
    description:
      'Del valle del Cusco al imperio más extenso de América: la leyenda de origen, la defensa frente a los chancas, la guerra chimú y la guerra entre Huáscar y Atahualpa.',
    summary:
      'Según la leyenda, los hermanos Ayar salieron de Pacaritambo y tomaron el valle del Cusco. En 1438 el Cusco resiste a la confederación chanca; en el siglo XV el Inca lleva la guerra al reino chimú; y en 1529–1532 la guerra civil entre Huáscar y Atahualpa deja al Tahuantinsuyo dividido antes de la conquista.',
    releasedMissionIds: ['m_tambotoco', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
    status: 'available',
    era: 'Leyenda — 1532',
    accent: '#d8b35a',
    prologue: INCA_PROLOGUE,
    path: ['m_tambotoco', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
  },
  {
    id: 'virreinato',
    title: 'El Virreinato',
    subtitle: 'De la fundación de Lima a Túpac Amaru II',
    description: 'La conquista, el cerco del Cusco, la resistencia de Vilcabamba y la gran rebelión de Túpac Amaru II.',
    summary:
      'Lima se funda junto al Rímac y resiste el cerco de Quizu Yupanqui. Manco Inca cerca el Cusco y combate en Sacsayhuamán; la resistencia inca sobrevive en Vilcabamba hasta 1572. Dos siglos y medio después, la rebelión de Túpac Amaru II desafía al Virreinato.',
    releasedMissionIds: ['m_lima', 'm7_tupac_amaru'],
    status: 'available',
    era: '1535 — 1781',
    accent: '#9d7a4c',
    prologue: VIRREINATO_PROLOGUE,
    path: ['m_lima', 'p_vir_cusco', 'p_vir_vilcabamba', 'm7_tupac_amaru'],
  },
  {
    id: 'independencia',
    title: 'La Independencia',
    subtitle: 'De Pumacahua al Real Felipe',
    description: 'De la rebelión del Cusco de 1814 a las batallas que sellaron la independencia del Perú.',
    summary:
      'En 1814 el Cusco se alza con Pumacahua y los hermanos Angulo. Seis años después desembarca la Expedición Libertadora de San Martín, las montoneras cercan Lima y en 1821 se proclama la independencia. Junín y Ayacucho la sellan en 1824, y el Callao resiste hasta 1826 como último bastión realista.',
    releasedMissionIds: ['m_junta_cusco', 'm_lima_1821', 'm8_independencia', 'm_real_felipe'],
    status: 'available',
    era: '1814 — 1826',
    accent: '#8b6b43',
    prologue: INDEPENDENCIA_PROLOGUE,
    path: ['m_junta_cusco', 'm_lima_1821', 'm8_independencia', 'm_real_felipe'],
  },
  {
    id: 'republica',
    title: 'La República',
    subtitle: 'De Tarapacá a la Breña',
    description: 'La defensa de la joven república en la Guerra del Pacífico: de Tarapacá a la Breña.',
    summary:
      'En la Guerra del Pacífico, el Perú resiste en la quebrada de Tarapacá, defiende Arica, cae en las líneas de San Juan y Miraflores y sostiene la Campaña de la Breña en la sierra central con Andrés A. Cáceres.',
    releasedMissionIds: ['m_tarapaca', 'm9_guerra_pacifico', 'm_miraflores', 'm_brena'],
    status: 'available',
    era: '1879 — 1883',
    accent: '#7a6a52',
    prologue: REPUBLICA_PROLOGUE,
    path: ['m_tarapaca', 'm9_guerra_pacifico', 'm_miraflores', 'm_brena'],
  },
];

export function getCampaign(id: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Roman numeral for a 1-based count; falls back to the Arabic number outside the table. */
export function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

/** Roman numeral of a campaign in the series. */
export function campaignRoman(id: CampaignId): string {
  return romanNumeral(CAMPAIGNS.findIndex((c) => c.id === id) + 1);
}

export function getCampaignForMission(missionId: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.path.includes(missionId));
}

/** Missions visible to players in menus, Codex and progress. */
export const RELEASED_MISSIONS: MissionDef[] = CAMPAIGNS.flatMap((c) =>
  c.releasedMissionIds.flatMap((id) => {
    const mission = MISSIONS.find((m) => m.id === id);
    return mission ? [mission] : [];
  }),
);

export function getReleasedMission(id: string): MissionDef | undefined {
  return RELEASED_MISSIONS.find((m) => m.id === id);
}

/** Next playable mission in the same campaign, or undefined when the campaign ends. */
export function nextReleasedMission(id: string): MissionDef | undefined {
  const campaign = getCampaignForMission(id);
  if (!campaign) return undefined;
  const index = campaign.releasedMissionIds.indexOf(id);
  if (index < 0) return undefined;
  const nextId = campaign.releasedMissionIds[index + 1];
  return nextId ? getMission(nextId) : undefined;
}

/** One step of a chapter in play order: a released mission or one announced as in development. */
export type CampaignStep =
  { kind: 'released'; id: string; mission: MissionDef } | { kind: 'planned'; id: string; planned: PlannedMission };

/** The launch catalogue in play order, released and planned entries interleaved. */
export function campaignSteps(campaign: CampaignDef): CampaignStep[] {
  return campaign.path.flatMap((id): CampaignStep[] => {
    if (campaign.releasedMissionIds.includes(id)) {
      const mission = getReleasedMission(id);
      return mission ? [{ kind: 'released', id, mission }] : [];
    }
    const planned = getPlannedMission(id);
    return planned ? [{ kind: 'planned', id, planned }] : [];
  });
}

/** 1-based position of a mission in its chapter's four-entry launch catalogue. */
export function missionPosition(missionId: string): { n: number; total: number } | null {
  const campaign = getCampaignForMission(missionId);
  if (!campaign) return null;
  const index = campaign.path.indexOf(missionId);
  return index < 0 ? null : { n: index + 1, total: campaign.path.length };
}
