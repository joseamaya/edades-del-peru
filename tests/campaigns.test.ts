import { describe, expect, it } from 'vitest';
import {
  CAMPAIGNS,
  CAMPAIGN_SERIES_TITLE,
  RELEASED_MISSIONS,
  getCampaign,
  getCampaignForMission,
  getReleasedMission,
  nextReleasedMission,
} from '../src/campaign/defs/campaigns';
import { SERIES_INTRO, PREINCA_PROLOGUE, VIRREINATO_PROLOGUE } from '../src/campaign/defs/cinematics';
import { completedMissions, markMissionComplete, parseCampaignProgress } from '../src/campaign/progress';

describe('campaign series', () => {
  it('groups the saga into four campaigns', () => {
    expect(CAMPAIGN_SERIES_TITLE).toBe('La Senda del Sol');
    expect(CAMPAIGNS.map((c) => c.id)).toEqual(['preinca', 'inca', 'virreinato', 'independencia']);
    expect(CAMPAIGNS.filter((c) => c.status === 'available').map((c) => c.id)).toEqual([
      'preinca',
      'inca',
      'virreinato',
    ]);
  });

  it('releases the preinca, Inca and colonial chapters in order', () => {
    expect(RELEASED_MISSIONS.map((m) => m.id)).toEqual([
      'm1_caral',
      'm2_chavin',
      'm3_moche_recuay',
      'm4_wari',
      'm5_yahuar_pampa',
      'm6_chimu_inca',
      'm7_tupac_amaru',
    ]);
    expect(getReleasedMission('m1_caral')?.title).toBe('La Ciudad Sagrada');
    expect(getReleasedMission('m2_chavin')?.title).toBe('El Oráculo de Chavín');
    expect(getReleasedMission('m5_yahuar_pampa')?.title).toBe('Yahuar Pampa');
    expect(nextReleasedMission('m1_caral')?.id).toBe('m2_chavin');
    expect(nextReleasedMission('m4_wari')).toBeUndefined();
    expect(nextReleasedMission('m5_yahuar_pampa')?.id).toBe('m6_chimu_inca');
    expect(nextReleasedMission('m6_chimu_inca')).toBeUndefined();
    expect(nextReleasedMission('m7_tupac_amaru')).toBeUndefined();
  });

  it('keeps authored drafts mapped to their eventual campaign', () => {
    expect(getCampaignForMission('m1_caral')?.id).toBe('preinca');
    expect(getCampaignForMission('m5_yahuar_pampa')?.id).toBe('inca');
    expect(getCampaignForMission('m7_tupac_amaru')?.id).toBe('virreinato');
    expect(getCampaignForMission('m9_guerra_pacifico')?.id).toBe('independencia');
    expect(getCampaign('preinca')?.missionIds).toEqual(['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari']);
  });

  it('ships the title, Caral and Virreinato prologues with readable beats', () => {
    for (const beat of [...SERIES_INTRO, ...PREINCA_PROLOGUE, ...VIRREINATO_PROLOGUE]) {
      expect(beat.title.trim()).not.toBe('');
      expect(beat.text.trim().length).toBeGreaterThan(60);
      expect(beat.seconds).toBeGreaterThan(0);
      expect(beat.source).toMatch(/^docs\/historia\//);
    }
    expect(PREINCA_PROLOGUE[0].text).toContain('una de las primeras civilizaciones del mundo');
    expect(PREINCA_PROLOGUE.slice(0, 3).every((beat) => beat.source === 'docs/historia/campanas/caral.md')).toBe(true);
    expect(PREINCA_PROLOGUE[3].source).toBe('docs/historia/periodizacion.md');
    expect(VIRREINATO_PROLOGUE).toHaveLength(3);
    expect(VIRREINATO_PROLOGUE.every((beat) => beat.source === 'docs/historia/campanas/tupac_amaru.md')).toBe(true);
  });
});

describe('campaign progress', () => {
  it('migrates the legacy numeric progress to the released mission order', () => {
    expect(completedMissions(parseCampaignProgress('2'), 'preinca')).toEqual(['m1_caral', 'm2_chavin']);
    expect(completedMissions(parseCampaignProgress('9'), 'preinca')).toEqual([
      'm1_caral',
      'm2_chavin',
      'm3_moche_recuay',
      'm4_wari',
    ]);
    expect(completedMissions(parseCampaignProgress('0'), 'preinca')).toEqual([]);
  });

  it('reads and writes versioned progress without losing other campaigns', () => {
    const start = markMissionComplete(parseCampaignProgress(null), 'inca', 'm5_yahuar_pampa');
    const next = markMissionComplete(start, 'preinca', 'm1_caral');
    expect(completedMissions(next, 'inca')).toEqual(['m5_yahuar_pampa']);
    expect(completedMissions(next, 'preinca')).toEqual(['m1_caral']);
    expect(completedMissions(parseCampaignProgress(JSON.stringify(next)), 'preinca')).toEqual(['m1_caral']);
  });

  it('is idempotent', () => {
    const once = markMissionComplete(parseCampaignProgress(null), 'preinca', 'm1_caral');
    expect(markMissionComplete(once, 'preinca', 'm1_caral')).toBe(once);
  });

  it('ignores malformed values', () => {
    expect(completedMissions(parseCampaignProgress('not-json'), 'preinca')).toEqual([]);
    expect(completedMissions(parseCampaignProgress('2x'), 'preinca')).toEqual([]);
    expect(completedMissions(parseCampaignProgress('{"version":2,"completed":[]}'), 'preinca')).toEqual([]);
  });
});
