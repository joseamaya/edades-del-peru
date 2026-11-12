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
  /** Missions authored for this campaign, including drafts that are not released yet. */
  missionIds: string[];
  /** Missions playable in the current build. */
  releasedMissionIds: string[];
  status: CampaignStatus;
  /** Short label for the campaign map (dates are historical, not release dates). */
  era: string;
  accent: string;
  prologue: CinematicBeat[];
  /**
   * The chapter in play order: released mission ids and planned mission ids (`PLANNED_MISSIONS`)
   * interleaved. Planned entries are shown in the menu as in development and are never playable.
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
    missionIds: ['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari'],
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
      'Del valle del Cusco al imperio más extenso de América: la leyenda de origen, la expansión por los cuatro suyos y la guerra entre Huáscar y Atahualpa.',
    summary:
      'Según la leyenda, los hermanos Ayar salieron de Pacaritambo y tomaron el valle del Cusco. En el siglo XV, el Cusco pasó de señorío regional a cabeza del Tahuantinsuyo: defiende la ciudad frente a los chancas, gana el Collao, reconstruye la capital, lleva la guerra al reino chimú y a la costa sur, abre la frontera norte y vive la guerra civil entre Huáscar y Atahualpa en vísperas de la conquista.',
    missionIds: ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
    releasedMissionIds: ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
    status: 'available',
    era: 'Leyenda — 1532',
    accent: '#d8b35a',
    prologue: INCA_PROLOGUE,
    path: [
      'p_inca_tambotoco',
      'm5_yahuar_pampa',
      'p_inca_collao',
      'p_inca_cusco',
      'm6_chimu_inca',
      'p_inca_tumipampa',
      'p_inca_huarco',
      'p_inca_pucaras',
      'p_inca_yahuarcocha',
      'm6b_guerra_civil',
    ],
  },
  {
    id: 'virreinato',
    title: 'El Virreinato',
    subtitle: 'De la fundación de Lima a Túpac Amaru II',
    description:
      'La conquista, las guerras civiles, la resistencia inca y las rebeliones de dos siglos y medio de dominio hispánico.',
    summary:
      'Tras Cajamarca, Lima se funda junto al Rímac y Manco Inca se alza contra los conquistadores. Pizarristas y almagristas se enfrentan entre sí, nace el Virreinato y la resistencia inca sobrevive en Vilcabamba hasta 1572. Defiende el Callao de las flotas extranjeras, vive la rebelión de Juan Santos Atahualpa en la selva central y el mayor desafío al poder colonial: la rebelión de Túpac Amaru II en 1780.',
    missionIds: ['m7_tupac_amaru'],
    releasedMissionIds: ['m7_tupac_amaru'],
    status: 'available',
    era: '1535 — 1781',
    accent: '#9d7a4c',
    prologue: VIRREINATO_PROLOGUE,
    path: [
      'p_vir_lima',
      'p_vir_cusco',
      'p_vir_ollantaytambo',
      'p_vir_salinas',
      'p_vir_gasca',
      'p_vir_vilcabamba',
      'p_vir_callao',
      'p_vir_juan_santos',
      'm7_tupac_amaru',
    ],
  },
  {
    id: 'independencia',
    title: 'La Independencia',
    subtitle: 'De Pumacahua al Real Felipe',
    description: 'De la rebelión del Cusco de 1814 a las batallas que sellaron la independencia del Perú.',
    summary:
      'En 1814 el Cusco se alza con Pumacahua y los hermanos Angulo. Seis años después desembarca la Expedición Libertadora de San Martín, las montoneras cercan Lima y en 1821 se proclama la independencia. Junín y Ayacucho la sellan en 1824, y el Callao resiste hasta 1826 como último bastión realista.',
    missionIds: ['m8_independencia'],
    releasedMissionIds: ['m8_independencia'],
    status: 'available',
    era: '1814 — 1826',
    accent: '#8b6b43',
    prologue: INDEPENDENCIA_PROLOGUE,
    path: ['p_ind_cusco', 'p_ind_pisco', 'p_ind_lima', 'm8_independencia', 'p_ind_real_felipe'],
  },
  {
    id: 'republica',
    title: 'La República',
    subtitle: 'Del Callao a la Breña',
    description: 'La defensa de la joven república: la escuadra española en el Callao y la Guerra del Pacífico.',
    summary:
      'En 1866 las baterías del Callao enfrentan a la escuadra española. En la Guerra del Pacífico, el Perú resiste en Tarapacá, en el morro de Arica y en las líneas de San Juan y Miraflores, y Andrés A. Cáceres sostiene la Campaña de la Breña en la sierra central.',
    missionIds: ['m9_guerra_pacifico'],
    releasedMissionIds: ['m9_guerra_pacifico'],
    status: 'available',
    era: '1866 — 1883',
    accent: '#7a6a52',
    prologue: REPUBLICA_PROLOGUE,
    path: ['p_rep_dos_de_mayo', 'p_rep_tarapaca', 'm9_guerra_pacifico', 'p_rep_lima', 'p_rep_brena'],
  },
];

export function getCampaign(id: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

/** 1-based position of a campaign in the series. */
export function campaignNumber(id: CampaignId): number {
  return CAMPAIGNS.findIndex((c) => c.id === id) + 1;
}

export function getCampaignForMission(missionId: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.missionIds.includes(missionId));
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

/** The chapter in play order, released and planned missions interleaved (unknown ids are skipped). */
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

/** 1-based position of a mission in its chapter's path, with the path length (planned missions count). */
export function missionPosition(missionId: string): { n: number; total: number } | null {
  const campaign = getCampaignForMission(missionId);
  if (!campaign) return null;
  const index = campaign.path.indexOf(missionId);
  return index < 0 ? null : { n: index + 1, total: campaign.path.length };
}
