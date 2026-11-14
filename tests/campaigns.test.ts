import { describe, expect, it } from 'vitest';
import {
  CAMPAIGNS,
  CAMPAIGN_SERIES_TITLE,
  RELEASED_MISSIONS,
  campaignSteps,
  missionPosition,
  getCampaign,
  getCampaignForMission,
  getReleasedMission,
  nextReleasedMission,
} from '../src/campaign/defs/campaigns';
import {
  INDEPENDENCIA_PROLOGUE,
  INCA_PROLOGUE,
  SERIES_INTRO,
  PREINCA_PROLOGUE,
  REPUBLICA_PROLOGUE,
  VIRREINATO_PROLOGUE,
} from '../src/campaign/defs/cinematics';
import { PLANNED_MISSIONS } from '../src/campaign/defs/plannedMissions';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { HistoricalPeriod } from '../src/core/types';
import {
  completedMissions,
  isCampaignUnlocked,
  isMissionUnlocked,
  markMissionComplete,
  nextSeriesMission,
  parseCampaignProgress,
  seriesMissions,
} from '../src/campaign/progress';

describe('campaign series', () => {
  it('groups the saga into five campaigns', () => {
    expect(CAMPAIGN_SERIES_TITLE).toBe('La Senda del Sol');
    expect(CAMPAIGNS.map((c) => c.id)).toEqual(['preinca', 'inca', 'virreinato', 'independencia', 'republica']);
    expect(CAMPAIGNS.filter((c) => c.status === 'available').map((c) => c.id)).toEqual([
      'preinca',
      'inca',
      'virreinato',
      'independencia',
      'republica',
    ]);
  });

  it('lays every chapter out in play order, released and planned missions interleaved', () => {
    for (const campaign of CAMPAIGNS) {
      const steps = campaignSteps(campaign);
      // every path entry resolves, and no id appears twice
      expect(steps.map((s) => s.id)).toEqual(campaign.path);
      expect(new Set(campaign.path).size).toBe(campaign.path.length);
      // released missions keep their release order inside the path
      expect(steps.filter((s) => s.kind === 'released').map((s) => s.id)).toEqual(campaign.releasedMissionIds);
    }
    const planned = CAMPAIGNS.flatMap((c) =>
      campaignSteps(c)
        .filter((s) => s.kind === 'planned')
        .map((s) => s.id),
    );
    // every planned mission is placed exactly once and none of them is playable
    expect(planned.sort()).toEqual(Object.keys(PLANNED_MISSIONS).sort());
    for (const id of planned) expect(getReleasedMission(id)).toBeUndefined();
    expect(CAMPAIGNS.map((c) => c.path.length)).toEqual([4, 10, 9, 5, 5]);
  });

  it('labels the Inca foundation myth as legend', () => {
    const inca = getCampaign('inca')!;
    expect(inca.path[0]).toBe('m_tambotoco');
    const myth = MISSIONS.find((m) => m.id === 'm_tambotoco')!;
    expect(myth.subtitle).toContain('Leyenda');
    expect(myth.period).toBe(HistoricalPeriod.LATE_INTERMEDIATE);
  });

  it('numbers a mission on its chapter path', () => {
    expect(missionPosition('m1_caral')).toEqual({ n: 1, total: 4 });
    expect(missionPosition('m5_yahuar_pampa')).toEqual({ n: 2, total: 10 });
    expect(missionPosition('m6b_guerra_civil')).toEqual({ n: 10, total: 10 });
    expect(missionPosition('m7_tupac_amaru')).toEqual({ n: 9, total: 9 });
    expect(missionPosition('m9_guerra_pacifico')).toEqual({ n: 3, total: 5 });
    expect(missionPosition('p_inca_collao')).toBeNull();
  });

  it('releases the preinca, Inca and colonial chapters in order', () => {
    expect(RELEASED_MISSIONS.map((m) => m.id)).toEqual([
      'm1_caral',
      'm2_chavin',
      'm3_moche_recuay',
      'm4_wari',
      'm_tambotoco',
      'm5_yahuar_pampa',
      'm6_chimu_inca',
      'm6b_guerra_civil',
      'm_lima',
      'm7_tupac_amaru',
      'm_junta_cusco',
      'm8_independencia',
      'm9_guerra_pacifico',
    ]);
    expect(getReleasedMission('m1_caral')?.title).toBe('La Ciudad Sagrada');
    expect(getReleasedMission('m2_chavin')?.title).toBe('El Oráculo de Chavín');
    expect(getReleasedMission('m5_yahuar_pampa')?.title).toBe('Yahuar Pampa');
    expect(nextReleasedMission('m1_caral')?.id).toBe('m2_chavin');
    expect(nextReleasedMission('m4_wari')).toBeUndefined();
    expect(nextReleasedMission('m_tambotoco')?.id).toBe('m5_yahuar_pampa');
    expect(nextReleasedMission('m5_yahuar_pampa')?.id).toBe('m6_chimu_inca');
    expect(nextReleasedMission('m6_chimu_inca')?.id).toBe('m6b_guerra_civil');
    expect(nextReleasedMission('m6b_guerra_civil')).toBeUndefined();
    expect(nextReleasedMission('m_lima')?.id).toBe('m7_tupac_amaru');
    expect(nextReleasedMission('m7_tupac_amaru')).toBeUndefined();
    expect(nextReleasedMission('m_junta_cusco')?.id).toBe('m8_independencia');
    expect(nextReleasedMission('m8_independencia')).toBeUndefined();
    expect(nextReleasedMission('m9_guerra_pacifico')).toBeUndefined();
  });

  it('maps every mission to its campaign', () => {
    expect(getCampaignForMission('m1_caral')?.id).toBe('preinca');
    expect(getCampaignForMission('m5_yahuar_pampa')?.id).toBe('inca');
    expect(getCampaignForMission('m6b_guerra_civil')?.id).toBe('inca');
    expect(getCampaignForMission('m7_tupac_amaru')?.id).toBe('virreinato');
    expect(getCampaignForMission('m_junta_cusco')?.id).toBe('independencia');
    expect(getCampaignForMission('m8_independencia')?.id).toBe('independencia');
    expect(getCampaignForMission('m9_guerra_pacifico')?.id).toBe('republica');
    expect(getCampaign('preinca')?.missionIds).toEqual(['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari']);
  });

  it('ships the title and chapter prologues with readable beats', () => {
    for (const beat of [
      ...SERIES_INTRO,
      ...PREINCA_PROLOGUE,
      ...INCA_PROLOGUE,
      ...VIRREINATO_PROLOGUE,
      ...INDEPENDENCIA_PROLOGUE,
      ...REPUBLICA_PROLOGUE,
    ]) {
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

describe('campaign unlocks', () => {
  it('opens the released opening of a campaign, and waits when that opening is still planned', () => {
    const fresh = parseCampaignProgress(null);
    // Preinca and Independencia publish their opening, so their chapters are open.
    expect(isMissionUnlocked(fresh, 'm1_caral')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm2_chavin')).toBe(false);
    expect(isMissionUnlocked(fresh, 'm_junta_cusco')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm_tambotoco')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm_lima')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm8_independencia')).toBe(false);
    expect(isCampaignUnlocked(fresh, 'preinca')).toBe(true);
    expect(isCampaignUnlocked(fresh, 'independencia')).toBe(true);
    expect(isCampaignUnlocked(fresh, 'inca')).toBe(true);
    // The chapters still opening with a planned mission wait for the predecessor.
    for (const campaign of CAMPAIGNS.filter(
      (c) => c.id !== 'preinca' && c.id !== 'independencia' && c.id !== 'inca' && c.id !== 'virreinato',
    )) {
      expect(isMissionUnlocked(fresh, campaign.releasedMissionIds[0]!), campaign.id).toBe(false);
      expect(isCampaignUnlocked(fresh, campaign.id), campaign.id).toBe(false);
    }
    expect(nextSeriesMission(fresh)?.missionId).toBe('m1_caral');
  });

  it('opens the next mission inside a campaign, and the next campaign after its predecessor ends', () => {
    let progress = markMissionComplete(parseCampaignProgress(null), 'preinca', 'm1_caral');
    expect(isMissionUnlocked(progress, 'm2_chavin')).toBe(true);
    expect(isMissionUnlocked(progress, 'm3_moche_recuay')).toBe(false);
    expect(nextSeriesMission(progress)?.missionId).toBe('m2_chavin');
    for (const id of ['m2_chavin', 'm3_moche_recuay']) progress = markMissionComplete(progress, 'preinca', id);
    expect(nextSeriesMission(progress)?.missionId).toBe('m4_wari');
    progress = markMissionComplete(progress, 'preinca', 'm4_wari');
    expect(isCampaignUnlocked(progress, 'inca')).toBe(true);
    expect(nextSeriesMission(progress)?.missionId).toBe('m_tambotoco');
    expect(isMissionUnlocked(progress, 'm5_yahuar_pampa')).toBe(false);
    expect(isMissionUnlocked(progress, 'm1_caral')).toBe(true);
  });

  it('reports the end of the path', () => {
    let progress = parseCampaignProgress(null);
    for (const m of seriesMissions()) progress = markMissionComplete(progress, m.campaignId, m.missionId);
    expect(nextSeriesMission(progress)).toBeNull();
  });
});
