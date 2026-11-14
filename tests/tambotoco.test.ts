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
    for (const id of ['a1_campamento', 'a1_caza', 'a2_huanacaure', 'a3_acequia', 'a4_inticancha', 'a4_canchas']) {
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
    for (const id of ['a1_campamento', 'a1_caza', 'a2_huanacaure', 'a3_acequia', 'a4_inticancha', 'a4_canchas']) {
      expect(activated.has(id), id).toBe(true);
    }
  });

  it('starts with the party only: no centre or dwellings, and the workers raise the first camp', () => {
    expect(TAMBOTOCO.start.base).toBe(false);
    expect(TAMBOTOCO.start.buildings ?? []).toHaveLength(0);
    expect(TAMBOTOCO.allowedBuildings).not.toContain(BuildingKind.CENTER);
    const camp = TAMBOTOCO.objectives.find((o) => o.id === 'a1_campamento')!;
    expect(camp.kind).toBe('build');
    expect(camp.buildingKind).toBe(BuildingKind.MILL);
    // The hunt opens only once there is somewhere to store it.
    const huntTrigger = TAMBOTOCO.triggers.find((t) =>
      t.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === 'a1_caza' && fx.state === 'activate'),
    )!;
    expect(huntTrigger.condition).toEqual({ type: 'objective', objectiveId: 'a1_campamento', state: 'completed' });
    expect(tutorialForMission('m_tambotoco')!.steps.map((step) => step.id)).toContain('campamento');
  });

  it('draws a visible path from the cave mouth through the Act I exit marker', () => {
    const roads = TAMBOTOCO.layout!.roads!;
    const salida = TAMBOTOCO.objectives.find((o) => o.id === 'a1_salida')!.pos!;
    const first = roads[0]!;
    // Starts at the cave (blocker centred on 40,55) and ends on the exit marker the tutorial points at.
    expect(Math.hypot(first.from.dx - 40, first.from.dz - 55)).toBeLessThan(8);
    expect(first.to).toEqual({ dx: salida.dx, dz: salida.dz });
    for (const road of roads) expect(road.stonePath).toBe(true);
    expect(tutorialForMission('m_tambotoco')!.steps[0]!.text).toContain('círculo dorado');
  });

  it('makes water the lever and the foundation the goal', () => {
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a3_acequia')!.kind).toBe('canal_open');
    expect(TAMBOTOCO.layout?.canal?.heritageId).toBe('tambotoco_acequia');
    expect(TAMBOTOCO.layout?.canal?.lockedUntilObjective).toBe('a3_acequia');
    // Its own locked-gate hint: the shared default talks about Caral's valley fields.
    expect(TAMBOTOCO.layout?.canal?.lockedHint).toContain('Huanacaure');
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
    // The tutorial teaches controls; the cast and the myth live in the briefing and the dialogue.
    expect(ids).not.toContain('ayar');
    expect(ids).toEqual(['mover', 'campamento', 'caza', 'huanacaure', 'defensa', 'agua', 'canchas']);
    const objectiveIds = new Set(TAMBOTOCO.objectives.map((o) => o.id));
    for (const step of tutorial.steps.slice(1)) {
      expect(step.gateObjective && objectiveIds.has(step.gateObjective), step.id).toBe(true);
    }
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

  it('marches the eight siblings with the party', () => {
    const tagged = (TAMBOTOCO.start.units ?? []).filter((u) => u.tag);
    expect(tagged.map((u) => u.tag)).toEqual([
      'mama_ocllo',
      'mama_ipacura',
      'mama_raua',
      'manco_capac',
      'mama_huaco',
      'ayar_cachi',
      'ayar_uchu',
      'ayar_auca',
    ]);
    for (const id of TAMBOTOCO.commanders!) {
      expect(
        tagged.some((u) => u.tag === id),
        id,
      ).toBe(true);
    }
    for (const unit of tagged) expect(unit.count, unit.tag).toBe(1);
    const protect = TAMBOTOCO.objectives.find((o) => o.id === 'a1_manco')!;
    expect(protect.kind).toBe('protect');
    expect(protect.entityTag).toBe('manco_capac');
    expect(protect.optional).toBe(true);
  });

  it('opens at the cave with the eight siblings and names the myth in the acts', () => {
    expect(TAMBOTOCO.layout?.base).toEqual({ x: 44 / 256, z: 65 / 256 });
    expect(TAMBOTOCO.layout?.opening).toEqual({ x: 41 / 256, z: 62 / 256 });
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a1_salida')!.title).toContain('Tambotoco');
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a1_caza')!.title).toContain('familias');
    // Each title names the action the objective measures.
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a2_huanacaure')!.title).toContain('abre la ficha');
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a4_canchas')!.title).toContain('cuatro viviendas');
    const acts = TAMBOTOCO.triggers.flatMap((t) => t.effects.filter((fx) => fx.type === 'act'));
    expect(acts.map((fx) => (fx.type === 'act' ? fx.title : ''))).toEqual([
      'Ayar Uchu en Huanacaure',
      'El agua de los alcabizas',
      'Ayar Auca en Inticancha',
    ]);
  });

  it('grows the ayllu site with the acts and replaces the reused pucará', () => {
    const phases = TAMBOTOCO.triggers.flatMap((t) =>
      t.effects.filter((fx) => fx.type === 'site_phase').map((fx) => (fx.type === 'site_phase' ? fx.phase : '')),
    );
    expect(phases).toEqual(['huanacaure', 'inticancha']);
    const site = getAuthoredSite('tambotoco_site')!;
    expect(site.modelName).toBe('ayllu_site');
    expect(site.phases?.phases).toEqual(['cave', 'huanacaure', 'inticancha']);
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
