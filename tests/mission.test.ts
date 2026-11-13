import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import type { MissionDef } from '../src/campaign/types';
import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../src/core/types';

/** A mission with a required goal and a bonus that can fail (a protected unit). */
const def: MissionDef = {
  id: 'test_mission',
  title: 'Test',
  subtitle: '',
  history: 'Test',
  victory: 'ok',
  defeat: 'no',
  period: HistoricalPeriod.ARCHAIC,
  playerCiv: CivId.CARAL,
  enemyCiv: CivId.CARAL,
  map: { seed: 1, type: 'coast', size: 64 },
  timeOfDay: 'noon',
  startingEra: Era.FORMATIVE,
  startingResources: { food: 0, wood: 0, silver: 0, stone: 0 },
  start: { units: [{ kind: UnitKind.WORKER, dx: 0, dz: 0, tag: 'guarda', count: 1 }] },
  enemy: { active: false, difficulty: 'easy', aggression: 0 },
  objectives: [
    { id: 'req', kind: 'gather', resource: 'food', count: 1, title: 'required' },
    { id: 'bonus', kind: 'protect', entityTag: 'guarda', optional: true, title: 'bonus' },
  ],
  triggers: [],
};

function stubGame(unit: { id: number; tag: string; owner: number; dead: boolean; kind: UnitKind }) {
  const game: any = {
    players: [{ resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.FORMATIVE }],
    units: new Map([[unit.id, unit]]),
    buildings: new Map(),
    hasBuildings: () => true,
    getPaused: () => false,
    isCinematicActive: () => false,
    togglePause: () => {},
    playIntro: () => {},
    loop: { start: () => {} },
    hud: {
      showBriefing: (_d: MissionDef, cb: () => void) => cb(),
      showToast: () => {},
      showDialogue: () => {},
    },
    audio: { uiClick: () => {} },
    camera: { focusOn: () => {} },
    rng: { float: () => 0.5 },
    getVisitedHeritage: () => [],
    setVisitedHeritage: () => {},
    resolveMissionPoint: (p: { ref?: string; dx: number; dz: number }) => {
      const ref = p.ref === 'landmark' ? (game.landmark?.position ?? { x: 0, z: 0 }) : { x: 0, z: 0 };
      return { x: ref.x + p.dx, z: ref.z + p.dz };
    },
  };
  return game;
}

describe('mission objective progress', () => {
  it('reports count/time progress and accepts an untagged reach objective', () => {
    const unit = {
      id: 1,
      tag: '',
      owner: 0,
      dead: false,
      kind: UnitKind.SCOUT,
      pos: { x: 0, z: 0 },
    };
    const game = stubGame(unit) as any;
    game.landmark = { position: { x: 10, z: 10 } };
    const missionDef: MissionDef = {
      ...def,
      start: { units: [{ kind: UnitKind.SCOUT, dx: 0, dz: 0 }] },
      objectives: [
        { id: 'observe', kind: 'reach', pos: { ref: 'landmark', dx: 0, dz: 0 }, radius: 5, title: 'observar' },
        { id: 'food', kind: 'gather', resource: 'food', count: 10, title: 'comida' },
        { id: 'farms', kind: 'build', buildingKind: BuildingKind.FARM, count: 2, title: 'andenes' },
      ],
      triggers: [],
    };
    const m = new Mission(game, missionDef, () => {});
    m.start();

    expect(m.getObjectiveProgress('observe')).toEqual({ current: 0, target: 1, format: 'count' });
    expect(m.getObjectiveAnchor('observe')).toEqual({ x: 10, z: 10 });
    expect(m.getObjectiveProgress('food')).toEqual({ current: 0, target: 10, format: 'count' });

    unit.pos = { x: 10, z: 10 };
    game.players[0].resources.food = 4;
    game.buildings = new Map([
      [10, { owner: 0, kind: BuildingKind.FARM, constructionComplete: true, dead: false, pos: { x: 0, z: 0 } }],
    ]);
    m.update(0.1, 0);

    expect(m.getObjectiveState('observe')).toBe('completed');
    expect(m.getObjectiveProgress('food')).toEqual({ current: 4, target: 10, format: 'count' });
    expect(m.getObjectiveProgress('farms')).toEqual({ current: 1, target: 2, format: 'count' });
  });
});

describe('mission optional (bonus) objectives', () => {
  it('initializes objectives added after a save was created', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    const m = new Mission(game as any, def, () => {});
    m.start();
    const save = m.toSave();
    // Simulate an older save that only knew the required objective.
    save.objState = [['req', 'completed']];
    m.applySave(save);
    expect(m.getObjectiveState('req')).toBe('completed');
    expect(m.getObjectiveState('bonus')).toBe('activo');
  });

  it('a failed bonus does not defeat and does not block victory', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    const m = new Mission(game as any, def, () => {});
    m.start();
    m.update(0.1, 0);
    expect(m.ended).toBe(false);
    expect(m.getObjectiveState('bonus')).not.toBe('failed');

    // the guarded unit dies: the bonus fails, but the mission must not end
    unit.dead = true;
    m.update(0.1, 0);
    expect(m.getObjectiveState('bonus')).toBe('failed');
    expect(m.ended, 'a failed bonus must not defeat the mission').toBe(false);

    // satisfying the required goal wins, even with the bonus failed
    game.players[0].resources.food = 1;
    m.update(0.1, 0);
    expect(m.won).toBe(true);
    expect(m.getObjectiveState('bonus'), 'a failed protect goal stays failed').toBe('failed');
  });

  it('credits a protect goal whose unit survives to victory', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    const m = new Mission(game as any, def, () => {});
    m.start();
    m.update(0.1, 0);
    expect(m.getObjectiveState('bonus')).toBe('activo');
    game.players[0].resources.food = 1;
    m.update(0.1, 0);
    expect(m.won).toBe(true);
    expect(m.getObjectiveState('bonus')).toBe('completed');
  });
});

describe('mission hidden-objective reveals', () => {
  it('activates a hidden goal through a trigger and announces it', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const toasts: string[] = [];
    game.hud.showToast = (msg: string) => toasts.push(msg);
    const revealDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'req', kind: 'gather', resource: 'food', count: 1, title: 'required' },
        { id: 'secret', kind: 'gather', resource: 'food', count: 10, hidden: true, title: 'secreto' },
      ],
      triggers: [
        {
          id: 'reveal',
          condition: { type: 'objective', objectiveId: 'req', state: 'completed' },
          effects: [{ type: 'objective', objectiveId: 'secret', state: 'activate', announce: true }],
        },
      ],
    };
    const m = new Mission(game, revealDef, () => {});
    m.start();
    game.players[0].resources.food = 1;
    m.update(0.1, 0);
    expect(m.getObjectiveState('secret')).toBe('activo');
    expect(toasts.some((t) => t.includes('Nuevo objetivo: secreto'))).toBe(true);

    game.players[0].resources.food = 10;
    m.update(0.1, 0);
    expect(m.getObjectiveState('secret')).toBe('completed');
    expect(m.won).toBe(true);
  });

  it('completes a hidden goal quietly when it was already satisfied before reveal', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const toasts: string[] = [];
    game.hud.showToast = (msg: string) => toasts.push(msg);
    const revealDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'req', kind: 'gather', resource: 'food', count: 1, title: 'required' },
        { id: 'secret', kind: 'gather', resource: 'food', count: 10, hidden: true, title: 'secreto' },
      ],
      triggers: [
        {
          id: 'reveal',
          condition: { type: 'objective', objectiveId: 'req', state: 'completed' },
          effects: [{ type: 'objective', objectiveId: 'secret', state: 'activate', announce: true }],
        },
      ],
    };
    const m = new Mission(game, revealDef, () => {});
    m.start();
    game.players[0].resources.food = 10;
    m.update(0.1, 0);
    expect(m.getObjectiveState('secret')).toBe('completed');
    expect(toasts.some((t) => t.includes('Nuevo objetivo: secreto'))).toBe(false);
    expect(toasts.some((t) => t.includes('Objetivo completado: secreto'))).toBe(true);
  });
});

describe('mission delivery objectives', () => {
  it('tracks delivered resources, wins at the target and round-trips through a save', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const deliverDef: MissionDef = {
      ...def,
      objectives: [{ id: 'offer', kind: 'deliver', resource: 'silver', count: 10, title: 'ofrenda' }],
      triggers: [],
    };
    const m = new Mission(game, deliverDef, () => {});
    m.start();
    expect(m.recordDelivery('silver', 4)).toBe(4);
    expect(m.getObjectiveProgress('offer')).toEqual({ current: 4, target: 10, format: 'count' });
    const saved = m.toSave();
    const loaded = new Mission(game, deliverDef, () => {});
    loaded.start();
    loaded.applySave(saved);
    expect(loaded.getObjectiveProgress('offer')).toEqual({ current: 4, target: 10, format: 'count' });
    expect(loaded.recordDelivery('silver', 6)).toBe(6);
    expect(loaded.getObjectiveState('offer')).toBe('completed');
    expect(loaded.won).toBe(true);
  });

  it('counts one offering once when two delivery goals are active', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const deliverDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'offer', kind: 'deliver', resource: 'silver', count: 10, title: 'ofrenda' },
        { id: 'bonus', kind: 'deliver', resource: 'silver', count: 20, optional: true, title: 'bonus' },
      ],
      triggers: [],
    };
    const m = new Mission(game, deliverDef, () => {});
    m.start();
    expect(m.recordDelivery('silver', 5)).toBe(5);
    expect(m.getObjectiveProgress('offer')).toEqual({ current: 5, target: 10, format: 'count' });
    expect(m.getObjectiveProgress('bonus')).toEqual({ current: 0, target: 20, format: 'count' });
    expect(m.recordDelivery('silver', 10)).toBe(10);
    expect(m.getObjectiveProgress('offer')).toEqual({ current: 10, target: 10, format: 'count' });
    expect(m.getObjectiveProgress('bonus')).toEqual({ current: 5, target: 20, format: 'count' });
  });

  it('counts completed buildings at every network node', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const networkDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'red',
          kind: 'network',
          buildingKind: BuildingKind.MARKET,
          count: 2,
          radius: 6,
          nodes: [
            { dx: 10, dz: 10 },
            { dx: 30, dz: 10 },
          ],
          title: 'red',
        },
      ],
      triggers: [],
    };
    game.buildings = new Map([
      [1, { owner: 0, kind: BuildingKind.MARKET, constructionComplete: true, dead: false, pos: { x: 10, z: 10 } }],
    ]);
    const m = new Mission(game, networkDef, () => {});
    m.start();
    expect(m.getObjectiveProgress('red')).toEqual({ current: 1, target: 2, format: 'count' });
    game.buildings.set(2, {
      owner: 0,
      kind: BuildingKind.MARKET,
      constructionComplete: true,
      dead: false,
      pos: { x: 30, z: 10 },
    });
    m.update(0.1, 0);
    expect(m.getObjectiveProgress('red')).toEqual({ current: 2, target: 2, format: 'count' });
    expect(m.getObjectiveState('red')).toBe('completed');
  });

  it('loads an older save without delivered state', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const deliverDef: MissionDef = {
      ...def,
      objectives: [{ id: 'offer', kind: 'deliver', resource: 'silver', count: 10, title: 'ofrenda' }],
      triggers: [],
    };
    const m = new Mission(game, deliverDef, () => {});
    m.start();
    m.recordDelivery('silver', 4);
    const save = m.toSave();
    delete save.delivered;
    const loaded = new Mission(game, deliverDef, () => {});
    loaded.start();
    loaded.applySave(save);
    expect(loaded.getObjectiveProgress('offer')).toEqual({ current: 0, target: 10, format: 'count' });
  });

  it('ignores deliveries before a hidden goal is active', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const deliverDef: MissionDef = {
      ...def,
      objectives: [{ id: 'offer', kind: 'deliver', resource: 'silver', count: 10, hidden: true, title: 'ofrenda' }],
      triggers: [],
    };
    const m = new Mission(game, deliverDef, () => {});
    m.start();
    expect(m.recordDelivery('silver', 5)).toBe(0);
    expect(m.getObjectiveState('offer')).toBe('pendiente');
  });

  it('activates a goal whose one-shot trigger fired before its prerequisite completed', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    // Chavín's Act III: the act trigger names every goal, but `gated` depends on a goal that may finish
    // after the trigger has already fired (the fair). It must not stay pending forever.
    const gatedDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'prereq', kind: 'gather', resource: 'food', count: 1, title: 'prereq' },
        { id: 'trigger', kind: 'gather', resource: 'wood', count: 1, title: 'trigger' },
        { id: 'gated', kind: 'gather', resource: 'silver', count: 1, requires: 'prereq', hidden: true, title: 'gated' },
      ],
      triggers: [
        {
          id: 't_gate',
          condition: { type: 'objective', objectiveId: 'trigger', state: 'completed' },
          effects: [{ type: 'objective', objectiveId: 'gated', state: 'activate' }],
        },
      ],
    };
    const m = new Mission(game, gatedDef, () => {});
    m.start();

    game.players[0].resources.wood = 1;
    m.update(0.1, 0);
    expect(m.getObjectiveState('trigger')).toBe('completed');
    expect(m.getObjectiveState('gated'), 'still waiting for its prerequisite').toBe('pendiente');

    game.players[0].resources.food = 1;
    m.update(0.1, 0);
    expect(m.getObjectiveState('prereq')).toBe('completed');
    expect(m.getObjectiveState('gated')).toBe('activo');
  });

  it('restores a deferred activation across save/load', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit) as any;
    const gatedDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'prereq', kind: 'gather', resource: 'food', count: 1, title: 'prereq' },
        { id: 'trigger', kind: 'gather', resource: 'wood', count: 1, title: 'trigger' },
        { id: 'gated', kind: 'gather', resource: 'silver', count: 1, requires: 'prereq', hidden: true, title: 'gated' },
      ],
      triggers: [
        {
          id: 't_gate',
          condition: { type: 'objective', objectiveId: 'trigger', state: 'completed' },
          effects: [{ type: 'objective', objectiveId: 'gated', state: 'activate' }],
        },
      ],
    };
    const m = new Mission(game, gatedDef, () => {});
    m.start();
    game.players[0].resources.wood = 1;
    m.update(0.1, 0);
    expect(m.getObjectiveState('gated')).toBe('pendiente');
    const save = m.toSave();

    // The trigger already fired, so a loaded match must not rely on it firing again.
    const loaded = new Mission(game, gatedDef, () => {});
    loaded.start();
    loaded.applySave(save);
    game.players[0].resources.food = 1;
    loaded.update(0.1, 0);
    expect(loaded.getObjectiveState('prereq')).toBe('completed');
    expect(loaded.getObjectiveState('gated')).toBe('activo');
  });
});

function mythSetup() {
  const unit = {
    id: 1,
    tag: 'ayar_cachi',
    owner: 0,
    dead: false,
    kind: UnitKind.SOLDIER,
    pos: { x: 4, z: 5 },
  };
  const game = stubGame(unit) as any;
  const calls = { retired: [] as string[], stones: [] as { id: string; x: number; z: number; label: string }[] };
  game.retireCharacter = (tag: string) => {
    calls.retired.push(tag);
    return { x: 70, z: 91 };
  };
  game.raiseMemoryStone = (id: string, x: number, z: number, label: string) => calls.stones.push({ id, x, z, label });
  const mythDef: MissionDef = {
    ...def,
    objectives: [{ id: 'wait', kind: 'wait', time: 60, title: 'esperar' }],
    triggers: [
      {
        id: 't_cachi',
        condition: { type: 'time', seconds: 1 },
        effects: [{ type: 'memory', tag: 'ayar_cachi', pos: { dx: 70, dz: 91 }, label: 'Huaca de Ayar Cachi' }],
      },
    ],
  };
  return { game, calls, mythDef };
}

describe('mission site phases', () => {
  it('restores the site phase of a trigger that already fired', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } };
    const game = stubGame(unit) as any;
    const phases: string[] = [];
    game.setSitePhase = (phase: string) => phases.push(phase);
    game.sitePhasePlan = { phases: ['cave', 'huanacaure'], initial: 'cave' };
    const siteDef: MissionDef = {
      ...def,
      objectives: [{ id: 'wait', kind: 'wait', time: 60, title: 'esperar' }],
      triggers: [
        {
          id: 't_huaca',
          condition: { type: 'time', seconds: 1 },
          effects: [{ type: 'site_phase', phase: 'huanacaure' }],
        },
      ],
    };
    const m = new Mission(game, siteDef, () => {});
    m.start();
    m.update(1.2, 0);
    const save = m.toSave();
    phases.length = 0;
    const loaded = new Mission(game, siteDef, () => {});
    loaded.start();
    loaded.applySave(save);
    expect(phases).toEqual(['huanacaure']);
  });
});

describe('mission myth beats', () => {
  it('retires the character and raises the huaca at the scripted point', () => {
    const { game, calls, mythDef } = mythSetup();
    const m = new Mission(game, mythDef, () => {});
    m.start();
    m.update(1.2, 0);
    expect(calls.retired).toEqual(['ayar_cachi']);
    expect(calls.stones).toEqual([{ id: 'ayar_cachi', x: 70, z: 91, label: 'Huaca de Ayar Cachi' }]);
  });

  it('rebuilds the huaca markers of triggers that already ran on load', () => {
    const { game, calls, mythDef } = mythSetup();
    const m = new Mission(game, mythDef, () => {});
    m.start();
    m.update(1.2, 0);
    const save = m.toSave();
    calls.retired.length = 0;
    calls.stones.length = 0;

    const loaded = new Mission(game, mythDef, () => {});
    loaded.start();
    loaded.applySave(save);
    expect(calls.stones).toEqual([{ id: 'ayar_cachi', x: 70, z: 91, label: 'Huaca de Ayar Cachi' }]);
  });
});
