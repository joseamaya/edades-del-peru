import { MISSIONS, getMission } from './campaign';
import type { MissionDef } from '../types';
import type { CinematicBeat } from './cinematics';
import { INDEPENDENCIA_PROLOGUE, INCA_PROLOGUE, PREINCA_PROLOGUE, VIRREINATO_PROLOGUE } from './cinematics';

export type CampaignId = 'preinca' | 'inca' | 'virreinato' | 'independencia';

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
  /** Named future missions shown inside this campaign, without release promises. */
  upcoming: string[];
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
      'Miles de años antes de los incas, los pueblos de los Andes levantaron ciudades, templos y redes de intercambio. Recorre Caral, la ciudad más antigua de América; el oráculo de Chavín; la frontera entre moches y recuay en los valles del norte; y Wari, el primer estado expansivo de los Andes.',
    missionIds: ['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari'],
    releasedMissionIds: ['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari'],
    status: 'available',
    era: '3000 a.C. — 1000 d.C.',
    accent: '#c99a55',
    prologue: PREINCA_PROLOGUE,
    upcoming: [],
  },
  {
    id: 'inca',
    title: 'El Tahuantinsuyo',
    subtitle: 'Los hitos del imperio inca',
    description:
      'Desde la defensa del Cusco frente a los chancas hasta la expansión imperial por la costa y la sierra.',
    summary:
      'En el siglo XV, el Cusco pasó de señorío regional a cabeza del Tahuantinsuyo. Defiende el Cusco frente a los chancas en Yahuar Pampa, lleva la guerra al reino chimú en la costa norte y vive la guerra civil entre Huáscar y Atahualpa en vísperas de la conquista.',
    missionIds: ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
    releasedMissionIds: ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil'],
    status: 'available',
    era: '1438 — 1532',
    accent: '#d8b35a',
    prologue: INCA_PROLOGUE,
    upcoming: [],
  },
  {
    id: 'virreinato',
    title: 'El Virreinato',
    subtitle: 'El Perú colonial',
    description: 'Instituciones, sociedades y resistencias de tres siglos bajo la monarquía hispánica.',
    summary:
      'Durante casi tres siglos, el Perú fue el centro del poder hispánico en Sudamérica. Vive su mayor desafío: la rebelión de Túpac Amaru II, que en 1780 se alzó contra la mita, el reparto y los obrajes.',
    missionIds: ['m7_tupac_amaru'],
    releasedMissionIds: ['m7_tupac_amaru'],
    status: 'available',
    era: '1542 — 1821',
    accent: '#9d7a4c',
    prologue: VIRREINATO_PROLOGUE,
    upcoming: [],
  },
  {
    id: 'independencia',
    title: 'Independencia y República',
    subtitle: 'Del Perú colonial al Perú contemporáneo',
    description: 'Las guerras de independencia, la construcción de la República y los desafíos del Perú moderno.',
    summary:
      'Tras la proclamación de 1821 en Lima, las batallas de Junín y Ayacucho sellaron en 1824 la independencia del Perú. Medio siglo después, la Guerra del Pacífico puso a prueba a la joven república en la defensa del morro de Arica.',
    missionIds: ['m8_independencia', 'm9_guerra_pacifico'],
    releasedMissionIds: ['m8_independencia', 'm9_guerra_pacifico'],
    status: 'available',
    era: '1821 — hoy',
    accent: '#8b6b43',
    prologue: INDEPENDENCIA_PROLOGUE,
    upcoming: [],
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

export function campaignProgressCount(campaign: CampaignDef, completed: readonly string[]): number {
  return campaign.releasedMissionIds.filter((id) => completed.includes(id)).length;
}
