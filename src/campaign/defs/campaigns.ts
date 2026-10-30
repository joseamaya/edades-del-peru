import { MISSIONS, getMission } from './campaign';
import type { MissionDef } from '../types';
import type { CinematicBeat } from './cinematics';
import { INDEPENDENCIA_PROLOGUE, INCA_PROLOGUE, PREINCA_PROLOGUE, VIRREINATO_PROLOGUE } from './cinematics';

export type CampaignId = 'preinca' | 'inca' | 'virreinato' | 'independencia';

export type CampaignStatus = 'available' | 'coming-soon';

/** A chapter of the La Senda del Sol saga. */
export interface CampaignDef {
  id: CampaignId;
  title: string;
  subtitle: string;
  description: string;
  /** Missions authored for this campaign, including drafts that are not released yet. */
  missionIds: string[];
  /** Missions playable in the current build. */
  releasedMissionIds: string[];
  status: CampaignStatus;
  /** Short label for the campaign map (dates are historical, not release dates). */
  era: string;
  accent: string;
  prologue: CinematicBeat[];
  /** Named future missions shown inside this chapter, without release promises. */
  upcoming: string[];
}

export const CAMPAIGN_SERIES_TITLE = 'La Senda del Sol';
export const CAMPAIGN_SERIES_SUBTITLE = 'Cuatro campañas a través de cinco mil años de historia peruana';

export const CAMPAIGNS: CampaignDef[] = [
  {
    id: 'preinca',
    title: 'Culturas Preincas',
    subtitle: 'Caral, Chavín, Moche y Wari',
    description:
      'Antes de los incas, los Andes ya habían construido ciudades, templos, redes de intercambio y estados regionales.',
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
    missionIds: ['m5_yahuar_pampa', 'm6_chimu_inca'],
    releasedMissionIds: ['m5_yahuar_pampa', 'm6_chimu_inca'],
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

/** Next playable mission in the same campaign, or undefined when the chapter ends. */
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
