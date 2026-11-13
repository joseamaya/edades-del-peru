import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getEducational } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { getAuthoredSite } from '../src/model/defs/sites';
import { unitTrainableInPeriod } from '../src/model/defs/units';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';

const LIMA = MISSIONS.find((m) => m.id === 'm_lima')!;

describe('La Ciudad de los Reyes', () => {
  it('is the 256 m conquest opening of El Virreinato', () => {
    expect(LIMA.modelMission).toBe(true);
    expect(LIMA.map.size).toBe(256);
    expect(LIMA.map.type).toBe('coast');
    expect(LIMA.unitSpeedScale).toBe(0.75);
    expect(LIMA.period).toBe(HistoricalPeriod.VICEROYALTY);
    expect(LIMA.periodNote).toContain('1535');
    expect(LIMA.startingEra).toBe(Era.VICEROYALTY);
    expect(LIMA.playerCiv).toBe(CivId.HUESTE_INDIANA);
    expect(LIMA.enemyCiv).toBe(CivId.INCA);
    expect(LIMA.playerName).toBe('Hueste indiana');

    const site = getAuthoredSite(LIMA.layout?.site?.id);
    expect(site?.id).toBe('lima_site');
    expect(site?.heightField?.worldSize).toBe(256);
    expect(site?.heightField?.size).toBe(129);
    expect(site?.heightField?.ground?.size).toBe(128);
    expect(site?.heritageProxies.map((p) => p.id)).toEqual(['lima_plaza']);
    expect(site?.style).toBe('colonial');
    expect(site?.phases?.phases).toEqual(['traza', 'ciudad']);
    const phases = LIMA.triggers.flatMap((t) =>
      t.effects.filter((fx) => fx.type === 'site_phase').map((fx) => (fx.type === 'site_phase' ? fx.phase : '')),
    );
    expect(phases).toEqual(['ciudad']);
  });

  it('plays three acts: found, hold and break the siege', () => {
    expect(LIMA.objectives.find((o) => o.id === 'a1_traza')!.kind).toBe('inspect');
    expect(LIMA.objectives.find((o) => o.id === 'a1_cabildo')!.buildingKind).toBe(BuildingKind.MARKET);
    expect(LIMA.objectives.find((o) => o.id === 'a2_cerco')!.kind).toBe('hold');
    expect(LIMA.objectives.find((o) => o.id === 'a3_ruptura')!.kind).toBe('destroy');
    expect(LIMA.objectives.find((o) => o.id === 'a3_pizarro')!.kind).toBe('protect');
    const acts = LIMA.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'act'));
    expect(acts.map((fx) => (fx.type === 'act' ? fx.kicker.split(' ·')[0] : ''))).toEqual(['Acto II', 'Acto III']);
  });

  it('keeps the founding and the siege as the historical problem', () => {
    expect(LIMA.layout?.canal).toBeUndefined();
    expect(LIMA.history).toContain('1535');
    expect(LIMA.victory).toContain('Cusco');
    expect(LIMA.objectives.find((o) => o.id === 'a2_curacas')!.optional).toBe(true);
  });

  it('keeps the roster inside the conquest', () => {
    expect(LIMA.allowedUnits).toEqual(
      expect.arrayContaining([UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.MUSKETEER, UnitKind.CAVALRY]),
    );
    for (const unit of LIMA.allowedUnits!) {
      expect(unitTrainableInPeriod(unit, HistoricalPeriod.VICEROYALTY, CivId.HUESTE_INDIANA), unit).toBe(true);
    }
    expect(LIMA.allowedUnits).not.toContain(UnitKind.RIFLEMAN);
    expect(LIMA.allowedUnits).not.toContain(UnitKind.SNIPER);
    expect(LIMA.allowedUnits).not.toContain(UnitKind.TANK);
  });

  it('ships a tutorial and an epilogue that leaves Cusco besieged', () => {
    const tutorial = tutorialForMission('m_lima')!;
    expect(tutorial.steps.map((s) => s.id)).toEqual(expect.arrayContaining(['traza', 'cabildo', 'cerco', 'ruptura']));
    const edu = getEducational('m_lima')!;
    expect(edu.epilogue).toContain('Cusco');
    expect(edu.sources.length).toBeGreaterThan(0);
    expect(LIMA.commanders).toEqual(['pizarro', 'quizu_yupanqui']);
  });
});
