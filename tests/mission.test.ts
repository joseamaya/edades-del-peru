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
  return {
    players: [{ resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.FORMATIVE }],
    units: new Map([[unit.id, unit]]),
    buildings: new Map(),
    hasBuildings: () => true,
    getPaused: () => false,
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
  };
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
    expect(m.getObjectiveProgress('bonus')).toEqual({ current: 5, target: 20, format: 'count' });
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
});
