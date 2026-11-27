import { describe, it, expect, vi } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { CAMERA_PITCH } from '../src/core/cameraMath';
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
    // The stub claims a standing base; the centre is what can still train after an army is lost.
    buildings: new Map([
      [
        99,
        { id: 99, owner: 0, kind: BuildingKind.CENTER, constructionComplete: true, dead: false, pos: { x: 0, z: 0 } },
      ],
    ]),
    hasBuildings: () => true,
    getPaused: () => false,
    isCinematicActive: () => false,
    togglePause: () => {},
    playIntro: () => {},
    loop: { start: () => {} },
    hud: {
      showBriefing: (_d: MissionDef, cb: () => void) => cb(),
      isMissionCardOpen: () => false,
      showToast: () => {},
      showDialogue: () => {},
    },
    audio: { uiClick: () => {} },
    camera: { focusOn: () => {}, flyTo: () => {}, getYaw: () => 0, getZoom: () => 30 },
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
  it('measures a defend objective from activation, not from the mission start', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } };
    const camp = {
      id: 2,
      tag: 'camp',
      owner: 0,
      dead: false,
      kind: BuildingKind.CENTER,
      pos: { x: 0, z: 0 },
    };
    const game = stubGame(unit) as any;
    game.buildings = new Map([[camp.id, camp]]);
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'def',
          kind: 'defend',
          entityTag: 'camp',
          time: 60,
          hidden: true,
          title: 'defender',
        },
      ],
      triggers: [
        {
          id: 'activate',
          condition: { type: 'time', seconds: 5 },
          effects: [{ type: 'objective', objectiveId: 'def', state: 'activate' }],
        },
      ],
    };
    const mission = new Mission(game, missionDef, () => {});
    mission.start();
    const step = (seconds: number) => {
      for (let i = 0; i < seconds * 60; i++) mission.update(1 / 60, i / 60);
    };
    step(6);
    expect(mission.getObjectiveState('def')).toBe('activo');
    step(30);
    expect(mission.getObjectiveState('def'), '30 s after activation is not enough').toBe('activo');
    step(35);
    expect(mission.getObjectiveState('def')).toBe('completed');
  });

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

  it('caps a repeating trigger at maxFires', () => {
    const guard = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(guard) as any;
    let lines = 0;
    game.hud.showDialogue = () => {
      lines++;
    };
    const missionDef: MissionDef = {
      ...def,
      objectives: [{ id: 'req', kind: 'gather', resource: 'food', count: 99, title: 'required' }],
      triggers: [
        {
          id: 'relief',
          condition: { type: 'time', seconds: 1 },
          repeat: true,
          cooldown: 1,
          maxFires: 2,
          effects: [{ type: 'dialogue', text: 'Llega una columna de socorro.' }],
        },
      ],
    };
    const m = new Mission(game, missionDef, () => {});
    m.start();
    const startLines = lines;
    for (let i = 0; i < 20; i++) m.update(0.5, i * 0.5);
    expect(lines - startLines, 'the relief column kept arriving').toBe(2);
  });

  it('keeps a repeating trigger capped across a save', () => {
    const guard = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const missionDef: MissionDef = {
      ...def,
      objectives: [{ id: 'req', kind: 'gather', resource: 'food', count: 99, title: 'required' }],
      triggers: [
        {
          id: 'relief',
          condition: { type: 'time', seconds: 1 },
          repeat: true,
          cooldown: 1,
          maxFires: 2,
          effects: [{ type: 'dialogue', text: 'Llega una columna de socorro.' }],
        },
      ],
    };
    const linesOf = (): { mission: Mission; count: () => number } => {
      let lines = 0;
      const game = stubGame(guard) as any;
      game.hud.showDialogue = () => {
        lines++;
      };
      return { mission: new Mission(game, missionDef, () => {}), count: () => lines };
    };

    const first = linesOf();
    first.mission.start();
    for (let i = 0; i < 20; i++) first.mission.update(0.5, i * 0.5);
    expect(first.count(), 'the relief column kept arriving').toBeGreaterThanOrEqual(2);
    const save = first.mission.toSave();

    const loaded = linesOf();
    loaded.mission.start();
    const before = loaded.count();
    loaded.mission.applySave(save);
    for (let i = 0; i < 10; i++) loaded.mission.update(0.5, 10 + i * 0.5);
    expect(loaded.count() - before, 'a reload restarted the relief columns').toBe(0);

    // A save written before `fireCounts` existed counts the fired trigger as one: one column may still come.
    const legacy = { ...save, fireCounts: undefined };
    const old = linesOf();
    old.mission.start();
    const beforeOld = old.count();
    old.mission.applySave(legacy);
    for (let i = 0; i < 10; i++) old.mission.update(0.5, 10 + i * 0.5);
    expect(old.count() - beforeOld).toBe(1);
  });

  it('fails a protected unit that dies before its act opens', () => {
    const guard = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(guard) as any;
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'req', kind: 'gather', resource: 'food', count: 1, title: 'required' },
        { id: 'guard', kind: 'protect', entityTag: 'guarda', hidden: true, title: 'protégelo' },
      ],
      triggers: [],
    };
    const m = new Mission(game, missionDef, () => {});
    m.start();
    expect(m.getObjectiveState('guard'), 'a hidden goal waits for its act').toBe('pendiente');
    // An escort on the field is at risk before its act card appears: dying must not be a silent, late defeat.
    guard.dead = true;
    m.update(0.1, 0);
    expect(m.getObjectiveState('guard')).toBe('failed');
    expect(m.ended).toBe(true);
    expect(m.won).toBe(false);
  });

  it('does not take a contested position until the last defender is gone', () => {
    const player = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.SOLDIER, pos: { x: 0, z: 0 } };
    const enemy = { id: 2, tag: '', owner: 1, dead: false, kind: UnitKind.RIFLEMAN, pos: { x: 8, z: 0 } };
    const game = stubGame(player) as any;
    game.players[0].team = 0;
    game.players.push({ ...game.players[0], team: 1 });
    game.units.set(enemy.id, enemy);
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'heights',
          kind: 'reach',
          pos: { dx: 0, dz: 0 },
          radius: 6,
          clearEnemies: true,
          clearRadius: 10,
          title: 'reconquistar',
        },
      ],
      triggers: [],
    };
    const m = new Mission(game, missionDef, () => {});
    m.start();
    m.update(0.1, 0);
    expect(m.getObjectiveState('heights'), 'the enemy still holds the position').toBe('activo');

    enemy.dead = true;
    m.update(0.1, 0);
    expect(m.getObjectiveState('heights')).toBe('completed');
  });
});

describe('mission canal objectives', () => {
  it('wins a canal_closed goal only when the crew closes the gate at the canal', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } };
    const game = stubGame(unit) as any;
    let open = true;
    game.canalSite = { x: 30, z: 40 };
    game.landmark = { position: { x: 10, z: 10 } };
    game.isCanalOpen = () => open;
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'corta',
          kind: 'canal_closed',
          pos: { ref: 'landmark', dx: 0, dz: 0 },
          radius: 5,
          title: 'cierra la compuerta',
        },
      ],
      triggers: [],
    };
    const m = new Mission(game, missionDef, () => {});
    m.start();

    expect(m.getObjectiveAnchor('corta')).toEqual({ x: 30, z: 40 });
    expect(m.getObjectiveProgress('corta')).toEqual({ current: 0, target: 1, format: 'count' });
    m.update(0.1, 0);
    expect(m.getObjectiveState('corta')).toBe('activo');

    // Closing the gate from a distance is not cutting the canal.
    open = false;
    expect(m.getObjectiveProgress('corta')).toEqual({ current: 0, target: 1, format: 'count' });
    m.update(0.1, 0.1);
    expect(m.getObjectiveState('corta')).toBe('activo');

    unit.pos = { x: 10, z: 10 };
    expect(m.getObjectiveProgress('corta')).toEqual({ current: 1, target: 1, format: 'count' });
    m.update(0.1, 0.2);
    expect(m.getObjectiveState('corta')).toBe('completed');
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

  it('a party with no base is lost only when it has neither buildings nor units', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    game.hasBuildings = () => false;
    const m = new Mission(game as any, { ...def, start: { ...def.start, base: false } }, () => {});
    m.start();
    m.update(0.1, 0);
    expect(m.ended, 'no buildings yet, but the party is alive').toBe(false);
    unit.dead = true;
    m.update(0.1, 0);
    expect(m.ended).toBe(true);
    expect(m.won).toBe(false);
  });

  it('a mission with a base is lost when its buildings are gone', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    game.hasBuildings = () => false;
    const m = new Mission(game as any, def, () => {});
    m.start();
    m.update(0.1, 0);
    expect(m.won).toBe(false);
    expect(m.ended).toBe(true);
  });

  it('a truce effect makes the AI side yield', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    const calls: Array<[number, boolean | undefined]> = [];
    game.declareTruce = (owner: number, restored?: boolean) => calls.push([owner, restored]);
    const m = new Mission(
      game as any,
      {
        ...def,
        triggers: [{ id: 't_truce', condition: { type: 'time', seconds: 0 }, effects: [{ type: 'truce' }] }],
      },
      () => {},
    );
    m.start();
    m.update(0.1, 0);
    expect(calls).toEqual([[1, undefined]]);
  });

  it('fires the closing trigger of the goal that wins the mission', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    const game = stubGame(unit);
    const m = new Mission(
      game as any,
      {
        ...def,
        objectives: [{ id: 'req', kind: 'gather', resource: 'food', count: 1, title: 'required' }],
        triggers: [
          {
            id: 't_closing',
            condition: { type: 'objective', objectiveId: 'req', state: 'completed' },
            effects: [{ type: 'resources', amount: { wood: 5 } }],
          },
        ],
      },
      () => {},
    );
    m.start();
    game.players[0].resources.food = 1;
    m.update(0.1, 0);
    expect(m.won).toBe(true);
    // Tambotoco's «fundada» phase lives in such a trigger; it used to be skipped on the victory tick.
    expect(game.players[0].resources.wood).toBe(5);
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

describe('mission alternative branches', () => {
  it('wins when one branch of a group completes and fails only when all branches fail', () => {
    const unit = { id: 1, tag: 'guarda', owner: 0, dead: false, kind: UnitKind.WORKER };
    let ended: boolean | null = null;
    const winDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'a', kind: 'wait', time: 2, group: 'go', title: 'a' },
        { id: 'b', kind: 'wait', time: 8, group: 'go', title: 'b' },
      ],
      triggers: [],
    };
    const winGame = stubGame({ ...unit });
    const winMission = new Mission(winGame as any, winDef, (win) => (ended = win));
    winMission.start();
    winMission.update(2.1, 0);
    expect(ended).toBe(true);

    let lost: boolean | null = null;
    const failDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'a', kind: 'protect', entityTag: 'guarda', group: 'go', title: 'a' },
        { id: 'b', kind: 'protect', entityTag: 'guarda', group: 'go', title: 'b' },
      ],
      triggers: [],
    };
    const failGame = stubGame({ ...unit });
    const failMission = new Mission(failGame as any, failDef, (win) => (lost = win));
    failMission.start();
    (failGame.units.get(1) as any).dead = true;
    failMission.update(0.1, 0);
    expect(lost).toBe(false);
  });
});

describe('mission camera beats', () => {
  it('frames a shot along the current yaw and keeps the instant focus without a framing', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.SCOUT };
    const game = stubGame(unit) as any;
    const focusOn = vi.fn();
    const flyTo = vi.fn();
    let yaw = 0;
    game.camera = { focusOn, flyTo, getYaw: () => yaw, getZoom: () => 30 };
    game.terrain = { getHeight: () => 9 };
    game.fow = { explore: vi.fn() };
    const lift = 9 / Math.tan(CAMERA_PITCH);
    const shotDef: MissionDef = {
      ...def,
      objectives: [],
      triggers: [
        {
          id: 'shot',
          condition: { type: 'time', seconds: 0.5 },
          effects: [{ type: 'camera', pos: { dx: 20, dz: 30 }, zoom: 34, seconds: 2, reveal: 45 }],
        },
        {
          id: 'cut',
          condition: { type: 'time', seconds: 5 },
          effects: [{ type: 'camera', pos: { dx: 1, dz: 2 } }],
        },
        {
          id: 'yaw',
          condition: { type: 'time', seconds: 7 },
          effects: [{ type: 'camera', pos: { dx: 7, dz: 8 }, zoom: 34, seconds: 2 }],
        },
        {
          id: 'pan',
          condition: { type: 'time', seconds: 9 },
          effects: [{ type: 'camera', pos: { dx: 5, dz: 6 }, seconds: 1 }],
        },
      ],
    };
    const mission = new Mission(game, shotDef, () => {});
    mission.start();
    mission.update(1, 0);
    // The RTS camera looks at sea level; the glide aims short of the elevated subject so it is framed.
    expect(flyTo).toHaveBeenLastCalledWith(20, 30 - lift, 34, 2, false);
    expect(game.fow.explore).toHaveBeenCalledWith(20, 30, 45);
    mission.update(5, 1);
    expect(focusOn).toHaveBeenCalledWith(1, 2);
    // A turned camera aims along its own forward axis, not the world Z.
    yaw = Math.PI / 2;
    mission.update(2, 6);
    expect(flyTo).toHaveBeenLastCalledWith(7 - lift, 8, 34, 2, false);
    // `seconds` without `zoom` glides at the current framing instead of being ignored.
    mission.update(2, 8);
    expect(flyTo).toHaveBeenLastCalledWith(5 - lift, 6, 30, 1, false);
  });
});

describe('withdraw effect', () => {
  it('marches the owner units inside the radius back to the retreat point', () => {
    const issueOrder = vi.fn();
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.CAVALRY, pos: { x: 0, z: 0 }, issueOrder };
    const game = stubGame(unit) as any;
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'gate',
          kind: 'hold',
          hidden: true,
          pos: { dx: 0, dz: 0 },
          radius: 2,
          time: 60,
          minUnits: 1,
          title: 'gate',
        },
      ],
      triggers: [
        {
          id: 't_withdraw',
          condition: { type: 'time', seconds: 0 },
          effects: [{ type: 'withdraw', owner: 0, pos: { dx: 10, dz: 0 }, from: { dx: 0, dz: 0 }, radius: 5 }],
        },
      ],
    };
    const mission = new Mission(game, missionDef, () => {});
    mission.start();
    mission.update(1, 0);
    expect(issueOrder).toHaveBeenCalledWith({ kind: 'move', target: { x: 10, z: 0 } });
  });
});

describe('trigger conditions', () => {
  it('fires an activation trigger only once the hidden goal is active, never while pending', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } };
    const game = stubGame(unit) as any;
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        {
          id: 'gate',
          kind: 'hold',
          hidden: true,
          pos: { dx: 0, dz: 0 },
          radius: 2,
          time: 60,
          minUnits: 1,
          title: 'gate',
        },
        ...def.objectives,
      ],
      triggers: [
        {
          id: 't_gate',
          condition: { type: 'objective', objectiveId: 'gate', state: 'activate' },
          effects: [{ type: 'resources', player: 0, amount: { food: 5 } }],
        },
      ],
    };
    const mission = new Mission(game, missionDef, () => {});
    mission.start();
    mission.update(1, 0);
    expect(game.players[0].resources.food, 'a pending goal is not an active one').toBe(0);
    mission.activateObjective('gate');
    mission.update(1, 0);
    expect(game.players[0].resources.food).toBe(5);
  });
});

describe('mission fires', () => {
  it('lights a fire only while its objective is completed', () => {
    const unit = { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } };
    const game = stubGame(unit) as any;
    game.terrain = { getHeight: () => 0 };
    game.particles = { emit: vi.fn() };
    const missionDef: MissionDef = {
      ...def,
      objectives: [
        { id: 'fire_gate', kind: 'reach', pos: { dx: 0, dz: 0 }, radius: 2, title: 'fire' },
        ...def.objectives,
      ],
      fires: [{ objectiveId: 'fire_gate', pos: { dx: 0, dz: 0 }, count: 2 }],
      triggers: [],
    };
    const mission = new Mission(game, missionDef, () => {});
    mission.start();
    mission.update(0.2, 0);
    expect(game.particles.emit).not.toHaveBeenCalled();
    mission.objState.set('fire_gate', 'completed');
    mission.update(0.2, 0);
    expect(game.particles.emit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'fire', count: 2 }));
    expect(game.particles.emit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'smoke' }));
  });
});
