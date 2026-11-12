import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getEducational } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { getAuthoredSite } from '../src/model/defs/sites';
import { unitTrainableInPeriod } from '../src/model/defs/units';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';

const JUNTA = MISSIONS.find((m) => m.id === 'm_junta_cusco')!;

describe('La Junta del Cusco', () => {
  it('is the 256 m model mission of La Independencia', () => {
    expect(JUNTA.modelMission).toBe(true);
    expect(JUNTA.map.size).toBe(256);
    expect(JUNTA.map.type).toBe('andes');
    expect(JUNTA.unitSpeedScale).toBe(0.75);
    expect(JUNTA.period).toBe(HistoricalPeriod.INDEPENDENCE);
    expect(JUNTA.startingEra).toBe(Era.REPUBLIC);
    expect(JUNTA.playerCiv).toBe(CivId.PATRIOTAS);
    expect(JUNTA.enemyCiv).toBe(CivId.REALISTAS);
    expect(JUNTA.playerName).toBe('Junta del Cusco');

    const site = getAuthoredSite(JUNTA.layout?.site?.id);
    expect(site?.id).toBe('cusco_junta_site');
    expect(site?.heightField?.worldSize).toBe(256);
    expect(site?.heightField?.ground?.size).toBe(128);
  });

  it('plays three acts with the later ones hidden and revealed by triggers', () => {
    const first = JUNTA.objectives.find((o) => o.id === 'a1_cabildo')!;
    expect(first.kind).toBe('inspect');
    expect(first.hidden).toBeFalsy();
    for (const id of ['a1_cuartel', 'a2_apacheta', 'a2_batalla', 'a3_umachiri', 'a3_resistir']) {
      expect(JUNTA.objectives.find((o) => o.id === id)!.hidden, id).toBe(true);
    }
    // The leader is protected from the start: losing him before Act III must fail the mission.
    expect(JUNTA.objectives.find((o) => o.id === 'a3_pumacahua')!.hidden).toBeFalsy();

    const acts = JUNTA.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'act'));
    expect(acts.map((fx) => (fx.type === 'act' ? fx.kicker.split(' ·')[0] : ''))).toEqual(['Acto II', 'Acto III']);

    const activated = new Set(
      JUNTA.triggers.flatMap((t) =>
        t.effects.flatMap((fx) => (fx.type === 'objective' && fx.state === 'activate' ? [fx.objectiveId] : [])),
      ),
    );
    expect(activated).toEqual(
      new Set(['a1_cuartel', 'a2_apacheta', 'a2_batalla', 'a3_umachiri', 'a3_resistir', 'a3_melgar', 'a3_cuartel']),
    );
  });

  it('makes the historical dilemma playable: hold the pass and save the leaders', () => {
    const apacheta = JUNTA.objectives.find((o) => o.id === 'a2_batalla')!;
    expect(apacheta.kind).toBe('hold');
    expect(apacheta.minUnits).toBeGreaterThan(1);
    const umachiri = JUNTA.objectives.find((o) => o.id === 'a3_resistir')!;
    expect(umachiri.kind).toBe('hold');
    expect(umachiri.time).toBeGreaterThan(0);
    expect(JUNTA.objectives.find((o) => o.id === 'a3_pumacahua')!.kind).toBe('protect');
    expect(JUNTA.objectives.find((o) => o.id === 'a3_melgar')!.optional).toBe(true);
    // The optional goals never gate victory.
    const required = JUNTA.objectives.filter((o) => !o.optional).map((o) => o.id);
    expect(required).not.toContain('a3_cuartel');
  });

  it('keeps the roster inside the Independence period', () => {
    expect(JUNTA.allowedUnits).toEqual(expect.arrayContaining([UnitKind.WORKER, UnitKind.PATRIOTA_MONTONERA]));
    for (const unit of JUNTA.allowedUnits!) {
      expect(unitTrainableInPeriod(unit, HistoricalPeriod.INDEPENDENCE, CivId.PATRIOTAS), unit).toBe(true);
    }
    for (const unit of [UnitKind.TANK, UnitKind.ANTI_AIR, UnitKind.NUCLEAR]) {
      expect(JUNTA.allowedUnits).not.toContain(unit);
    }
    expect(JUNTA.allowedBuildings).toEqual(expect.arrayContaining([BuildingKind.BARRACKS, BuildingKind.FORTRESS]));
  });

  it('ships a tutorial and an epilogue that tells the documented defeat', () => {
    const tutorial = tutorialForMission('m_junta_cusco')!;
    const ids = tutorial.steps.map((step) => step.id);
    expect(ids).toContain('cabildo');
    expect(ids).toContain('umachiri');
    const edu = getEducational('m_junta_cusco')!;
    expect(edu.epilogue).toContain('Umachiri');
    expect(edu.epilogue).toContain('Melgar');
    expect(edu.sources.length).toBeGreaterThan(0);
    expect(JUNTA.commanders).toEqual(['pumacahua', 'melgar', 'ramirez_orozco']);
  });
});
