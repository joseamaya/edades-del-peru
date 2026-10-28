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
import { SERIES_INTRO, PREINCA_PROLOGUE } from '../src/campaign/defs/cinematics';
import { completedMissions, markMissionComplete, parseCampaignProgress } from '../src/campaign/progress';

describe('campaign series', () => {
  it('groups the saga into four campaigns', () => {
    expect(CAMPAIGN_SERIES_TITLE).toBe('La Senda del Sol');
    expect(CAMPAIGNS.map((c) => c.id)).toEqual(['preinca', 'inca', 'virreinato', 'independencia']);
    expect(CAMPAIGNS.filter((c) => c.status === 'available').map((c) => c.id)).toEqual(['preinca']);
  });

  it('releases only Caral in this build', () => {
    expect(RELEASED_MISSIONS.map((m) => m.id)).toEqual(['m1_caral']);
    expect(getReleasedMission('m1_caral')?.title).toBe('La Ciudad Sagrada');
    expect(getReleasedMission('m2_chavin')).toBeUndefined();
    expect(nextReleasedMission('m1_caral')).toBeUndefined();
  });

  it('keeps authored drafts mapped to their eventual campaign', () => {
    expect(getCampaignForMission('m1_caral')?.id).toBe('preinca');
    expect(getCampaignForMission('m5_yahuar_pampa')?.id).toBe('inca');
    expect(getCampaignForMission('m7_tupac_amaru')?.id).toBe('virreinato');
    expect(getCampaignForMission('m9_guerra_pacifico')?.id).toBe('independencia');
    expect(getCampaign('preinca')?.missionIds).toEqual(['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari']);
  });

  it('ships the title and Caral prologues with readable beats', () => {
    for (const beat of [...SERIES_INTRO, ...PREINCA_PROLOGUE]) {
      expect(beat.title.trim()).not.toBe('');
      expect(beat.text.trim().length).toBeGreaterThan(60);
      expect(beat.seconds).toBeGreaterThan(0);
    }
    expect(PREINCA_PROLOGUE[0].text).toContain('una de las primeras civilizaciones del mundo');
  });
});

describe('campaign progress', () => {
  it('migrates the legacy numeric progress to Caral', () => {
    expect(completedMissions(parseCampaignProgress('2'), 'preinca')).toEqual(['m1_caral']);
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
    expect(completedMissions(parseCampaignProgress('{"version":2,"completed":[]}'), 'preinca')).toEqual([]);
  });
});
