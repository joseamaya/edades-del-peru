import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { MISSIONS } from '../src/campaign/defs/campaign';
import {
  TAMBOTOCO_CANAL_GATE,
  TAMBOTOCO_HOLD,
  TAMBOTOCO_OUTLET,
  TAMBOTOCO_WAVE,
} from '../src/campaign/defs/missions/m_tambotoco';
import { getEducational } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { canalIrrigationAt } from '../src/model/defs/canal';
import {
  TAMBOTOCO_INTICANCHA as TAMBOTOCO_INTICANCHA_LAYOUT,
  TAMBOTOCO_SHRINE,
} from '../src/model/defs/tambotocoLayout';
import { getAuthoredSite } from '../src/model/defs/sites';
import { commanderById } from '../src/model/defs/commanders';
import { unitTrainableInPeriod } from '../src/model/defs/units';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';

const TAMBOTOCO = MISSIONS.find((m) => m.id === 'm_tambotoco')!;
const HIDDEN_OBJECTIVE_IDS = [
  'a1_campamento',
  'a1_caza',
  'a2_huanacaure',
  'a3_oleada',
  'a3_acequia',
  'a3_riego',
  'a4_inticancha',
  'a4_canchas',
] as const;

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
    for (const id of HIDDEN_OBJECTIVE_IDS) {
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
    for (const id of HIDDEN_OBJECTIVE_IDS) {
      expect(activated.has(id), id).toBe(true);
    }
  });

  it('frames the narrated beats with a hero/detail/wide shot grammar', () => {
    const cameras = (triggerId: string) => {
      const trigger = TAMBOTOCO.triggers.find((t) => t.id === triggerId)!;
      return trigger.effects.filter((fx) => fx.type === 'camera');
    };
    const shot = (triggerId: string) => {
      const [fx] = cameras(triggerId);
      expect(fx, triggerId).toBeDefined();
      if (fx?.type !== 'camera') throw new Error(`${triggerId} has no camera effect`);
      return fx;
    };

    // Detail: the huaca is framed where the pilgrimage arrives, and the ground is revealed before the card closes.
    const huanacaure = shot('t_caza');
    expect(huanacaure.pos).toEqual({ dx: TAMBOTOCO_SHRINE.x, dz: TAMBOTOCO_SHRINE.z });
    expect(huanacaure.zoom).toBe(34);
    expect(huanacaure.reveal).toBe(45);

    // Wide: the wave's approach, not the far valley.
    const valley = shot('t_huanacaure');
    expect(valley.pos).toEqual({ dx: TAMBOTOCO_WAVE.x, dz: TAMBOTOCO_WAVE.z });
    expect(valley.zoom).toBeGreaterThan(huanacaure.zoom!);

    // Detail: the stone plug that the wave unlocks.
    const gate = shot('t_oleada');
    expect(gate.pos).toEqual({ dx: TAMBOTOCO_CANAL_GATE.x + 1, dz: TAMBOTOCO_CANAL_GATE.z + 1 });
    expect(gate.zoom).toBe(36);
    expect(gate.reveal).toBe(45);

    // Wide: the traced Inticancha.
    const traced = shot('t_acequia');
    expect(traced.pos).toEqual({ dx: TAMBOTOCO_INTICANCHA_LAYOUT.x, dz: TAMBOTOCO_INTICANCHA_LAYOUT.z });
    expect(traced.zoom).toBeGreaterThan(huanacaure.zoom!);

    // Hero: the foundation reward, with the stone rising and the ritual dust.
    const foundation = shot('t_inticancha');
    expect(foundation.zoom).toBe(29);
    expect(foundation.seconds).toBeGreaterThanOrEqual(2);
    const effects = TAMBOTOCO.triggers.find((t) => t.id === 't_inticancha')!.effects;
    expect(effects.some((fx) => fx.type === 'memory' && fx.tag === 'ayar_auca')).toBe(true);
  });

  it('makes the defended intake the gate to the water', () => {
    const wave = TAMBOTOCO.objectives.find((o) => o.id === 'a3_oleada')!;
    expect(wave.kind).toBe('hold');
    expect(wave.pos).toEqual({ dx: TAMBOTOCO_HOLD.x, dz: TAMBOTOCO_HOLD.z });
    expect(wave.radius).toBe(10);
    expect(wave.minUnits).toBe(3);
    expect(wave.time).toBe(60);
    expect(wave.hidden).toBe(true);

    const gate = TAMBOTOCO.triggers.find((t) => t.id === 't_huanacaure')!;
    expect(gate.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === 'a3_acequia')).toBe(false);
    expect(gate.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === 'a3_oleada')).toBe(true);
    const spawn = gate.effects.find((fx) => fx.type === 'wave')!;
    expect(spawn.type).toBe('wave');
    if (spawn.type === 'wave') {
      expect(spawn.pos).toEqual({ dx: TAMBOTOCO_WAVE.x, dz: TAMBOTOCO_WAVE.z });
      expect(spawn.target).toEqual({ dx: TAMBOTOCO_HOLD.x, dz: TAMBOTOCO_HOLD.z });
      expect(spawn.units.reduce((n, u) => n + u.count, 0)).toBe(5);
    }

    const afterWave = TAMBOTOCO.triggers.find((t) => t.id === 't_oleada')!;
    expect(afterWave.condition).toEqual({ type: 'objective', objectiveId: 'a3_oleada', state: 'completed' });
    expect(
      afterWave.effects.some(
        (fx) => fx.type === 'objective' && fx.objectiveId === 'a3_acequia' && fx.state === 'activate',
      ),
    ).toBe(true);

    const riego = TAMBOTOCO.objectives.find((o) => o.id === 'a3_riego')!;
    expect(riego.kind).toBe('build');
    expect(riego.buildingKind).toBe(BuildingKind.FARM);
    expect(riego.optional).toBe(true);
    expect(riego.pos).toEqual({ dx: TAMBOTOCO_OUTLET.x, dz: TAMBOTOCO_OUTLET.z });
    expect(riego.radius).toBe(4);
    const water = TAMBOTOCO.triggers.find((t) => t.id === 't_acequia')!;
    expect(
      water.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === 'a3_riego' && fx.state === 'activate'),
    ).toBe(true);

    const agua = tutorialForMission('m_tambotoco')!.steps.find((step) => step.id === 'agua')!;
    expect(agua.gateObjective).toBe('a3_oleada');
    expect(agua.check).toEqual({ type: 'objectiveCompleted', objectiveId: 'a3_acequia' });
  });

  it('starts with the party only: no centre or dwellings, and the workers raise the first camp', () => {
    expect(TAMBOTOCO.start.base).toBe(false);
    expect(TAMBOTOCO.start.buildings ?? []).toHaveLength(0);
    expect(TAMBOTOCO.allowedBuildings).not.toContain(BuildingKind.CENTER);
    // A movement of families: no fortress, walls, gate or towers.
    for (const kind of [BuildingKind.FORTRESS, BuildingKind.WALL, BuildingKind.GATE, BuildingKind.TOWER]) {
      expect(TAMBOTOCO.allowedBuildings, kind).not.toContain(kind);
    }
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
    // Opening the acequia makes the valley ayllus yield, so Act IV is not fought next to their base.
    const water = TAMBOTOCO.triggers.find((t) => t.id === 't_acequia')!;
    expect(water.condition).toEqual({ type: 'objective', objectiveId: 'a3_acequia', state: 'completed' });
    expect(water.effects.some((fx) => fx.type === 'truce')).toBe(true);
    expect(TAMBOTOCO.objectives.find((o) => o.id === 'a3_acequia')!.kind).toBe('canal_open');
    expect(TAMBOTOCO.layout?.canal?.heritageId).toBe('tambotoco_acequia');
    expect(TAMBOTOCO.layout?.canal?.lockedUntilObjective).toBe('a3_acequia');
    // Its own locked-gate hint: the gate waits for the defended intake, not Caral's valley fields.
    expect(TAMBOTOCO.layout?.canal?.lockedHint).toContain('oleada');
    expect(TAMBOTOCO.layout?.canal?.lockedHint).toContain('compuerta');
    const inticancha = TAMBOTOCO.objectives.find((o) => o.id === 'a4_inticancha')!;
    expect(inticancha.kind).toBe('build');
    expect(inticancha.buildingKind).toBe(BuildingKind.MILL);
    const canchas = TAMBOTOCO.objectives.find((o) => o.id === 'a4_canchas')!;
    expect(canchas.kind).toBe('network');
    expect(canchas.buildingKind).toBe(BuildingKind.HOUSE);
    expect(canchas.nodes).toHaveLength(4);
  });

  it('keeps the opening hunt short and its title in step with the count', () => {
    const caza = TAMBOTOCO.objectives.find((o) => o.id === 'a1_caza')!;
    expect(caza.count).toBe(60);
    expect(caza.title).toContain('60');
  });

  it('makes the optional hualla visit pay stores once and never gate victory', () => {
    const goal = TAMBOTOCO.objectives.find((o) => o.id === 'a3_hualla')!;
    expect(goal.optional).toBe(true);
    const hualla = TAMBOTOCO.triggers.find((t) => t.id === 't_hualla')!;
    expect(hualla.condition).toEqual({ type: 'objective', objectiveId: 'a3_hualla', state: 'completed' });
    expect(hualla.effects).toContainEqual({ type: 'resources', player: 0, amount: { food: 150, wood: 100 } });
    expect(hualla.effects.some((fx) => fx.type === 'dialogue')).toBe(true);
    expect(hualla.repeat).toBeFalsy();
  });

  it('keeps each cancha house on its marked plot and never lets one house satisfy two', () => {
    const canchas = TAMBOTOCO.objectives.find((o) => o.id === 'a4_canchas')!;
    expect(canchas.radius).toBe(6);
    const nodes = canchas.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const ax = a.x ?? a.dx ?? 0;
        const az = a.z ?? a.dz ?? 0;
        const bx = b.x ?? b.dx ?? 0;
        const bz = b.z ?? b.dz ?? 0;
        expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThan(2 * (canchas.radius ?? 0));
      }
    }
  });

  it('puts the optional farm inside the acequia reach and not on the plaza', () => {
    const size = TAMBOTOCO.map.size;
    const path = (TAMBOTOCO.layout?.canal?.path ?? []).map((p) => ({ x: p.x * size, z: p.z * size }));
    const reach = TAMBOTOCO.layout?.canal?.irrigationReach;
    expect(reach).toBe(4.5);
    // A farm centre 3.8 m from the outlet is legal (keepout 3.2 m) and gets a real yield (>0.1).
    expect(canalIrrigationAt(path, TAMBOTOCO_OUTLET.x + 3.8, TAMBOTOCO_OUTLET.z, reach)).toBeGreaterThan(0.1);
    // The reach is local: the west side of the plaza and the cave stay dry.
    expect(canalIrrigationAt(path, 160, 190, reach)).toBe(0);
    expect(canalIrrigationAt(path, 40, 55, reach)).toBe(0);
  });

  it('keeps the roster inside the Intermedio Tardío', () => {
    // The party starts with workers and a scout but has no centre, so only militia and slingers train.
    expect(TAMBOTOCO.allowedUnits).toEqual([UnitKind.SOLDIER, UnitKind.MUSKETEER]);
    expect(TAMBOTOCO.start.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: UnitKind.WORKER }),
        expect.objectContaining({ kind: UnitKind.SCOUT }),
      ]),
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
    expect(ids).toEqual(['mover', 'campamento', 'caza', 'huanacaure', 'agua', 'canchas']);
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
    expect(phases).toEqual(['huanacaure', 'inticancha', 'fundada']);
    const site = getAuthoredSite('tambotoco_site')!;
    expect(site.modelName).toBe('ayllu_site');
    expect(site.phases?.phases).toEqual(['cave', 'huanacaure', 'inticancha', 'fundada']);
  });

  it('is covered by the performance gate, opening and founded Inticancha', () => {
    expect(pkg.scripts['bench:check']).toContain('--mission=m_tambotoco --assert');
    expect(pkg.scripts['bench:check']).toContain('--mission=m_tambotoco --stage=late --assert');
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
