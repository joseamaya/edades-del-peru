import { describe, expect, it } from 'vitest';
import {
  CAMPAIGNS,
  CAMPAIGN_SERIES_TITLE,
  RELEASED_MISSIONS,
  campaignRoman,
  campaignSteps,
  missionPosition,
  getCampaign,
  getCampaignForMission,
  getReleasedMission,
  nextReleasedMission,
  romanNumeral,
} from '../src/campaign/defs/campaigns';
import {
  INDEPENDENCIA_PROLOGUE,
  INCA_PROLOGUE,
  SERIES_INTRO,
  PREINCA_PROLOGUE,
  REPUBLICA_PROLOGUE,
  VIRREINATO_PROLOGUE,
} from '../src/campaign/defs/cinematics';
import { EXPANSION_MISSIONS, PLANNED_MISSIONS } from '../src/campaign/defs/plannedMissions';
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

  it('lays out the four-entry launch catalogue per chapter, released and planned interleaved', () => {
    for (const campaign of CAMPAIGNS) {
      const steps = campaignSteps(campaign);
      // every path entry resolves, and no id appears twice
      expect(steps.map((s) => s.id)).toEqual(campaign.path);
      expect(new Set(campaign.path).size).toBe(campaign.path.length);
      expect(campaign.path).toHaveLength(4);
      // released missions keep their release order inside the path
      expect(steps.filter((s) => s.kind === 'released').map((s) => s.id)).toEqual(campaign.releasedMissionIds);
    }
    const planned = CAMPAIGNS.flatMap((c) =>
      campaignSteps(c)
        .filter((s) => s.kind === 'planned')
        .map((s) => s.id),
    );
    // every planned mission of the launch catalogue is placed exactly once and none is playable
    expect(planned.sort()).toEqual(Object.keys(PLANNED_MISSIONS).sort());
    expect(planned).toHaveLength(0);
    for (const id of planned) expect(getReleasedMission(id)).toBeUndefined();
    expect(CAMPAIGNS.map((c) => c.path.length)).toEqual([4, 4, 4, 4, 4]);
  });

  it('keeps the expansion missions out of the catalogue', () => {
    const catalog = new Set(CAMPAIGNS.flatMap((c) => c.path));
    const expansion = Object.keys(EXPANSION_MISSIONS);
    expect(expansion).toHaveLength(13);
    for (const id of expansion) {
      expect(EXPANSION_MISSIONS[id], id).toBeDefined();
      expect(PLANNED_MISSIONS[id], id).toBeUndefined();
      expect(getReleasedMission(id), id).toBeUndefined();
      expect(catalog.has(id), id).toBe(false);
    }
  });

  it('labels the Inca foundation myth as legend', () => {
    const inca = getCampaign('inca')!;
    expect(inca.path[0]).toBe('m_tambotoco');
    const myth = MISSIONS.find((m) => m.id === 'm_tambotoco')!;
    expect(myth.subtitle).toContain('Leyenda');
    expect(myth.period).toBe(HistoricalPeriod.LATE_INTERMEDIATE);
  });

  it('numbers a mission in its four-entry chapter', () => {
    expect(missionPosition('m1_caral')).toEqual({ n: 1, total: 4 });
    expect(missionPosition('m5_yahuar_pampa')).toEqual({ n: 2, total: 4 });
    expect(missionPosition('m6b_guerra_civil')).toEqual({ n: 4, total: 4 });
    expect(missionPosition('m_lima')).toEqual({ n: 1, total: 4 });
    expect(missionPosition('m_cusco_1536')).toEqual({ n: 2, total: 4 });
    expect(missionPosition('m_vilcabamba')).toEqual({ n: 3, total: 4 });
    expect(missionPosition('m7_tupac_amaru')).toEqual({ n: 4, total: 4 });
    expect(missionPosition('m_lima_1821')).toEqual({ n: 2, total: 4 });
    expect(missionPosition('m_real_felipe')).toEqual({ n: 4, total: 4 });
    expect(missionPosition('m_tarapaca')).toEqual({ n: 1, total: 4 });
    expect(missionPosition('m9_guerra_pacifico')).toEqual({ n: 2, total: 4 });
    expect(missionPosition('m_miraflores')).toEqual({ n: 3, total: 4 });
    expect(missionPosition('m_brena')).toEqual({ n: 4, total: 4 });
    expect(missionPosition('p_inca_collao')).toBeNull();
    expect(missionPosition('p_rep_dos_de_mayo')).toBeNull();
  });

  it('numbers the campaigns in Roman numerals', () => {
    expect(campaignRoman('preinca')).toBe('I');
    expect(campaignRoman('virreinato')).toBe('III');
    expect(campaignRoman('republica')).toBe('V');
    expect(romanNumeral(CAMPAIGNS.length)).toBe('V');
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
      'm_cusco_1536',
      'm_vilcabamba',
      'm7_tupac_amaru',
      'm_junta_cusco',
      'm_lima_1821',
      'm8_independencia',
      'm_real_felipe',
      'm_tarapaca',
      'm9_guerra_pacifico',
      'm_miraflores',
      'm_brena',
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
    expect(nextReleasedMission('m_lima')?.id).toBe('m_cusco_1536');
    expect(nextReleasedMission('m_cusco_1536')?.id).toBe('m_vilcabamba');
    expect(nextReleasedMission('m_vilcabamba')?.id).toBe('m7_tupac_amaru');
    expect(nextReleasedMission('m7_tupac_amaru')).toBeUndefined();
    expect(nextReleasedMission('m_junta_cusco')?.id).toBe('m_lima_1821');
    expect(nextReleasedMission('m_lima_1821')?.id).toBe('m8_independencia');
    expect(nextReleasedMission('m8_independencia')?.id).toBe('m_real_felipe');
    expect(nextReleasedMission('m_real_felipe')).toBeUndefined();
    expect(nextReleasedMission('m_tarapaca')?.id).toBe('m9_guerra_pacifico');
    expect(nextReleasedMission('m9_guerra_pacifico')?.id).toBe('m_miraflores');
    expect(nextReleasedMission('m_miraflores')?.id).toBe('m_brena');
    expect(nextReleasedMission('m_brena')).toBeUndefined();
  });

  it('maps every mission to its campaign', () => {
    expect(getCampaignForMission('m1_caral')?.id).toBe('preinca');
    expect(getCampaignForMission('m5_yahuar_pampa')?.id).toBe('inca');
    expect(getCampaignForMission('m6b_guerra_civil')?.id).toBe('inca');
    expect(getCampaignForMission('m_cusco_1536')?.id).toBe('virreinato');
    expect(getCampaignForMission('m_vilcabamba')?.id).toBe('virreinato');
    expect(getCampaignForMission('m7_tupac_amaru')?.id).toBe('virreinato');
    expect(getCampaignForMission('m_junta_cusco')?.id).toBe('independencia');
    expect(getCampaignForMission('m_lima_1821')?.id).toBe('independencia');
    expect(getCampaignForMission('m8_independencia')?.id).toBe('independencia');
    expect(getCampaignForMission('m_real_felipe')?.id).toBe('independencia');
    expect(getCampaignForMission('m9_guerra_pacifico')?.id).toBe('republica');
    expect(getCampaignForMission('m_tarapaca')?.id).toBe('republica');
    expect(getCampaignForMission('m_miraflores')?.id).toBe('republica');
    expect(getCampaignForMission('m_brena')?.id).toBe('republica');
    expect(getCampaign('preinca')?.releasedMissionIds).toEqual(['m1_caral', 'm2_chavin', 'm3_moche_recuay', 'm4_wari']);
    expect(getCampaignForMission('m_cusco_1536')?.id).toBe('virreinato');
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
    expect(INCA_PROLOGUE).toHaveLength(5);
    expect(INCA_PROLOGUE[0].kicker).toContain('LEYENDA');
    expect(VIRREINATO_PROLOGUE).toHaveLength(7);
    expect(VIRREINATO_PROLOGUE[0].source).toBe('docs/historia/campanas/guerra_civil_inca.md');
    expect(VIRREINATO_PROLOGUE.at(-1)?.source).toBe('docs/historia/campanas/tupac_amaru.md');
    expect(INDEPENDENCIA_PROLOGUE).toHaveLength(4);
    expect(INDEPENDENCIA_PROLOGUE.at(-1)?.kicker).toContain('1824–1826');
    expect(REPUBLICA_PROLOGUE).toHaveLength(4);
    expect(REPUBLICA_PROLOGUE[0].kicker).toContain('TARAPACÁ');
    expect(REPUBLICA_PROLOGUE.some((beat) => beat.text.includes('1866'))).toBe(false);
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
    // 0.1.0 counted nine missions in one linear path; keep each one in its current chapter.
    const legacyNine = parseCampaignProgress('9');
    expect(completedMissions(legacyNine, 'inca')).toEqual(['m5_yahuar_pampa', 'm6_chimu_inca']);
    expect(completedMissions(legacyNine, 'virreinato')).toEqual(['m7_tupac_amaru']);
    expect(completedMissions(legacyNine, 'independencia')).toEqual(['m8_independencia']);
    expect(completedMissions(legacyNine, 'republica')).toEqual(['m9_guerra_pacifico']);
    // The migrated completions unlock later missions, not only the campaign openings.
    expect(isMissionUnlocked(legacyNine, 'm6b_guerra_civil')).toBe(true);
    expect(isMissionUnlocked(legacyNine, 'm_real_felipe')).toBe(true);
    expect(isMissionUnlocked(legacyNine, 'm_cusco_1536')).toBe(false);
    expect(isMissionUnlocked(parseCampaignProgress('4'), 'm6b_guerra_civil')).toBe(false);
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
  it('opens every campaign whose opening is released', () => {
    const fresh = parseCampaignProgress(null);
    // Every chapter now starts with a released mission, so all five open from a fresh profile.
    expect(isMissionUnlocked(fresh, 'm1_caral')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm2_chavin')).toBe(false);
    expect(isMissionUnlocked(fresh, 'm_tambotoco')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm_lima')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm_junta_cusco')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm8_independencia')).toBe(false);
    expect(isMissionUnlocked(fresh, 'm_tarapaca')).toBe(true);
    expect(isMissionUnlocked(fresh, 'm9_guerra_pacifico')).toBe(false);
    for (const campaign of CAMPAIGNS) {
      expect(isCampaignUnlocked(fresh, campaign.id), campaign.id).toBe(true);
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
