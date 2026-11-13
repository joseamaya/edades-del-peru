import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getEducational } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { getAuthoredSite } from '../src/model/defs/sites';
import { commanderById } from '../src/model/defs/commanders';
import { unitTrainableInPeriod } from '../src/model/defs/units';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';

const TAMBOTOCO = MISSIONS.find((m) => m.id === 'm_tambotoco')!;

describe('Los hijos de Tambotoco', () => {
  it('is the 256 m legendary opening of El Tahuantinsuyo', () => {
    expect(TAMBOTOCO.modelMission).toBe(true);
    expect(TAMBOTOCO.map.size).toBe(256);
    expect(TAMBOTOCO.map.type).toBe('andes');
    expect(TAMBOTOCO.unitSpeedScale).toBe(0.75);
    expect(TAMBOTOCO.period).toBe(HistoricalPeriod.LATE_INTERMEDIATE);
    expect(TAMBOTOCO.startingEra).toBe(Era.TAHUANTINSUYO);
    expect(TAMBOTOCO.playerCiv).toBe(CivId.INCA_KILLKE);
    expect(TAMBOTOCO.enemyCiv).toBe(CivId.AYLLUS);
    expect(TAMBOTOCO.subtitle).toContain('Leyenda');
    expect(TAMBOTOCO.narrator).toBeTruthy();

    const site = getAuthoredSite(TAMBOTOCO.layout?.site?.id);
    expect(site?.id).toBe('tambotoco_site');
    expect(site?.heightField?.worldSize).toBe(256);
    expect(site?.heightField?.size).toBe(129);
    expect(site?.heightField?.ground?.size).toBe(128);
    expect(site?.heritageProxies.map((p) => p.id)).toEqual(['tambotoco_huanacaure']);
  });

  it('plays four acts with the later ones hidden and revealed by triggers', () => {
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a1_salida')!.hidden).toBeFalsy();
    for (const id of ['a1_caza', 'a2_huanacaure', 'a3_acequia', 'a4_inticancha', 'a4_canchas']) {
      expect(TAMBOTOCO.objectives.find((o) => o.id === id)!.hidden, id).toBe(true);
    }
    const acts = TAMBOTOCO.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'act'));
    expect(acts.map((fx) => (fx.type === 'act' ? fx.kicker.split(' ·')[0] : ''))).toEqual([
      'Acto II',
      'Acto III',
      'Acto IV',
    ]);
    const activated = new Set(
      TAMBOTOCO.triggers.flatMap((t) =>
        t.effects.flatMap((fx) => (fx.type === 'objective' && fx.state === 'activate' ? [fx.objectiveId] : [])),
      ),
    );
    for (const id of ['a1_caza', 'a2_huanacaure', 'a3_acequia', 'a4_inticancha', 'a4_canchas']) {
      expect(activated.has(id), id).toBe(true);
    }
  });

  it('makes water the lever and the foundation the goal', () => {
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a3_acequia')!.kind).toBe('canal_open');
    expect(TAMBOTOCO.layout?.canal?.heritageId).toBe('tambotoco_acequia');
    expect(TAMBOTOCO.layout?.canal?.lockedUntilObjective).toBe('a3_acequia');
    const inticancha = TAMBOTOCO.objectives.find((o) => o.id === 'a4_inticancha')!;
    expect(inticancha.kind).toBe('build');
    expect(inticancha.buildingKind).toBe(BuildingKind.MILL);
    const canchas = TAMBOTOCO.objectives.find((o) => o.id === 'a4_canchas')!;
    expect(canchas.kind).toBe('network');
    expect(canchas.buildingKind).toBe(BuildingKind.HOUSE);
    expect(canchas.nodes).toHaveLength(4);
  });

  it('keeps the roster inside the Intermedio Tardío', () => {
    expect(TAMBOTOCO.allowedUnits).toEqual(
      expect.arrayContaining([UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.MUSKETEER, UnitKind.SCOUT]),
    );
    for (const unit of TAMBOTOCO.allowedUnits!) {
      expect(unitTrainableInPeriod(unit, HistoricalPeriod.LATE_INTERMEDIATE, CivId.INCA_KILLKE), unit).toBe(true);
    }
    expect(TAMBOTOCO.allowedUnits).not.toContain(UnitKind.CAVALRY);
    expect(TAMBOTOCO.allowedUnits).not.toContain(UnitKind.ARTILLERY);
    expect(TAMBOTOCO.startingResources.silver).toBe(0);
  });

  it('ships a tutorial and an epilogue that names the versions of the myth', () => {
    const tutorial = tutorialForMission('m_tambotoco')!;
    const ids = tutorial.steps.map((step) => step.id);
    expect(ids).toContain('huanacaure');
    expect(ids).toContain('canchas');
    expect(ids).toContain('ayar');
    const edu = getEducational('m_tambotoco')!;
    expect(edu.epilogue).toContain('Sarmiento');
    expect(edu.epilogue).toContain('Garcilaso');
    expect(edu.sources.length).toBeGreaterThan(0);
  });

  it('puts the eight siblings in the briefing', () => {
    expect(TAMBOTOCO.commanders).toEqual([
      'manco_capac',
      'ayar_auca',
      'ayar_cachi',
      'ayar_uchu',
      'mama_huaco',
      'mama_ocllo',
      'mama_ipacura',
      'mama_raua',
    ]);
    for (const id of TAMBOTOCO.commanders!) {
      expect(commanderById(id)?.civ).toBe(CivId.INCA_KILLKE);
    }
    expect(commanderById('manco_capac')?.name).toBe('Ayar Manco');
  });

  it('marches Ayar Manco, Mama Huaco and Ayar Auca with the party', () => {
    const tagged = (TAMBOTOCO.start.units ?? []).filter((u) => u.tag);
    expect(tagged.map((u) => u.tag)).toEqual(['manco_capac', 'mama_huaco', 'ayar_cachi', 'ayar_uchu', 'ayar_auca']);
    const manco = tagged.find((u) => u.tag === 'manco_capac')!;
    expect(manco.count).toBe(1);
    const protect = TAMBOTOCO.objectives.find((o) => o.id === 'a1_manco')!;
    expect(protect.kind).toBe('protect');
    expect(protect.entityTag).toBe('manco_capac');
    expect(protect.optional).toBe(true);
  });

  it('raises a huaca when the legend leaves a sibling behind', () => {
    const memories = TAMBOTOCO.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'memory'));
    expect(memories.map((fx) => (fx.type === 'memory' ? fx.tag : ''))).toEqual([
      'ayar_cachi',
      'ayar_uchu',
      'ayar_auca',
    ]);
    expect(memories.map((fx) => (fx.type === 'memory' ? fx.label : ''))).toEqual([
      'Huaca de Ayar Cachi',
      'Huaca de Ayar Uchu',
      'Piedra de Ayar Auca',
    ]);
    for (const fx of memories) {
      if (fx.type !== 'memory') continue;
      expect(fx.pos, fx.tag).toBeDefined();
      expect(commanderById(fx.tag), fx.tag).toBeDefined();
    }
  });
});
