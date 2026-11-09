import { describe, it, expect } from 'vitest';
import { Tutorial } from '../src/campaign/Tutorial';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import type { TutorialDef } from '../src/campaign/types';
import { UnitKind } from '../src/core/types';

function stubGame() {
  return { buildings: new Map(), units: new Map() };
}

const base = { houses: 0, barracks: 0, soldiers: 0 };

describe('tutorial save compatibility', () => {
  it('restores a save by step id after the step list changes', () => {
    const tutorial = new Tutorial(stubGame() as any, tutorialForMission('m1_caral')!);
    tutorial.applySave({
      idx: 0,
      stepId: 'pyramid',
      begun: true,
      finished: false,
      delay: 0,
      base,
    });
    expect(tutorial.toSave().stepId).toBe('pyramid');
  });

  it('maps the legacy indices to the closest current step', () => {
    const tutorial = new Tutorial(stubGame() as any, tutorialForMission('m1_caral')!);
    // Legacy index 3 was the removed market step; the coast is its closest replacement.
    tutorial.applySave({ idx: 3, begun: true, finished: false, delay: 0, base });
    expect(tutorial.toSave().stepId).toBe('coast');
  });

  it('keeps the elapsed time of an informational step across save/load', () => {
    const def: TutorialDef = {
      steps: [
        { id: 'info', text: 'lee esto', check: { type: 'elapsed', seconds: 5 } },
        { id: 'select', text: 'selecciona', check: { type: 'selectUnit', unitKind: UnitKind.WORKER } },
      ],
    };
    const tutorial = new Tutorial(gameForSteps() as any, def);
    tutorial.applySave({ idx: 0, stepId: 'info', begun: true, finished: false, delay: 0, base });
    tutorial.update(0);
    tutorial.update(2);
    expect(tutorial.toSave().stepTime).toBeCloseTo(2, 6);

    const loaded = new Tutorial(gameForSteps() as any, def);
    loaded.applySave(tutorial.toSave());
    loaded.update(0);
    expect(loaded.toSave().stepId).toBe('info');
    loaded.update(3.1);
    expect(loaded.toSave().stepId).toBe('select');
  });

  it('advances a positioning step when a unit reaches the tagged entity', () => {
    const game = gameForSteps();
    game.buildings.set(10, {
      owner: 0,
      kind: 'fortress',
      dead: false,
      constructionComplete: true,
      tag: 'puerto',
      pos: { x: 0, z: 0 },
    } as never);
    game.units.set(1, { owner: 0, kind: 'rifleman', dead: false, pos: { x: 12, z: 0 } });
    const def: TutorialDef = {
      steps: [
        {
          id: 'battery',
          text: 'lleva fusileros a la batería',
          check: { type: 'unitNearEntity', entityTag: 'puerto', unitKind: UnitKind.RIFLEMAN, radius: 8 },
        },
        { id: 'next', text: 'siguiente', check: { type: 'elapsed', seconds: 1 } },
      ],
    };
    const tutorial = new Tutorial(game as any, def);
    tutorial.applySave({ idx: 0, stepId: 'battery', begun: true, finished: false, delay: 0, base });
    tutorial.update(0);
    tutorial.update(0.1);
    expect(tutorial.toSave().stepId).toBe('battery');

    game.units.get(1)!.pos = { x: 4, z: 0 };
    tutorial.update(0.1);
    expect(tutorial.toSave().stepId).toBe('next');
  });
});

function gameForSteps() {
  const hud = {
    last: '',
    showTutorialStep(text: string) {
      this.last = text;
    },
    highlightHud() {},
    clearHudHighlight() {},
    hideTutorial() {
      this.last = '';
    },
    showToast() {},
  };
  return {
    hud,
    selectedUnits: [] as number[],
    units: new Map<number, { owner: number; kind: string; dead: boolean; pos: { x: number; z: number } }>(),
    buildings: new Map<number, { owner: number; kind: string; dead: boolean; constructionComplete: boolean }>(),
    resourceNodes: new Map<number, { kind: string; dead: boolean; pos: { x: number; z: number } }>(),
    landmark: { position: { x: 100, z: 30 } },
    siteCenter: { x: 100, z: 30 },
    getPaused: () => false,
    isCinematicActive: () => false,
    mission: {
      activeObjectives: [{}],
      getObjectiveState: () => 'activo',
    },
  };
}

function tutorialAt(game: ReturnType<typeof gameForSteps>, stepId: string): Tutorial {
  const tutorial = new Tutorial(game as any, tutorialForMission('m1_caral')!);
  tutorial.applySave({ idx: 0, stepId, begun: true, finished: false, delay: 0, base });
  return tutorial;
}

describe('tutorial checks', () => {
  it('advances when a worker is selected', () => {
    const game = gameForSteps();
    game.units.set(1, { owner: 0, kind: 'worker', dead: false, pos: { x: 0, z: 0 } });
    game.selectedUnits.push(1);
    const tutorial = tutorialAt(game, 'select');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('coast');
  });

  it('advances when a scout reaches a fishing ground', () => {
    const game = gameForSteps();
    game.units.set(1, { owner: 0, kind: 'scout', dead: false, pos: { x: 10, z: 10 } });
    game.resourceNodes.set(1, { kind: 'fishing', dead: false, pos: { x: 12, z: 10 } });
    const tutorial = tutorialAt(game, 'coast');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('house');
  });

  it('advances when a completed house is built', () => {
    const game = gameForSteps();
    game.buildings.set(1, { owner: 0, kind: 'house', dead: false, constructionComplete: true });
    const tutorial = tutorialAt(game, 'house');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('valley');
  });

  it('advances from the communal store to the pyramid construction', () => {
    const game = gameForSteps();
    game.buildings.set(1, { owner: 0, kind: 'mill', dead: false, constructionComplete: true });
    const tutorial = tutorialAt(game, 'storage');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('nets');
  });

  it('advances from the first materials to the construction supply step', () => {
    const game = gameForSteps();
    game.mission.getObjectiveState = () => 'completed';
    const tutorial = tutorialAt(game, 'pyramid');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('works');
  });

  it('finishes after the construction work turn', () => {
    const game = gameForSteps();
    game.mission.getObjectiveState = () => 'completed';
    const tutorial = tutorialAt(game, 'works');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().finished).toBe(true);
  });
});

describe('tutorial gates', () => {
  it('fills a missing markets baseline from older saves', () => {
    const tutorial = new Tutorial(stubGame() as any, tutorialForMission('m1_caral')!);
    tutorial.applySave({ idx: 0, stepId: 'select', begun: true, finished: false, delay: 0, base });
    expect(tutorial.toSave().base.markets).toBe(0);
  });

  it('advances when any objective in a strategic group is completed', () => {
    const game = gameForSteps();
    game.mission.activeObjectives = [
      { def: { group: 'victoria' }, state: 'activo' },
      { def: { group: 'victoria' }, state: 'activo' },
    ] as any;
    const def: TutorialDef = {
      steps: [
        {
          id: 'victory',
          text: 'Elige una ruta de victoria',
          check: { type: 'objectiveGroupCompleted', group: 'victoria' },
        },
      ],
    };
    const tutorial = new Tutorial(game as any, def);
    tutorial.applySave({ idx: 0, stepId: 'victory', begun: true, finished: false, delay: 0, base });
    tutorial.update(0);
    expect(tutorial.toSave().finished).toBe(false);
    game.mission.activeObjectives = [
      { def: { group: 'victoria' }, state: 'completed' },
      { def: { group: 'victoria' }, state: 'activo' },
    ] as any;
    tutorial.update(0);
    expect(tutorial.toSave().finished).toBe(true);
  });

  it('waits for a gated step instead of silently skipping it', () => {
    const game = gameForSteps();
    let state = 'activo';
    game.mission.getObjectiveState = () => state;
    const def: TutorialDef = {
      steps: [
        {
          id: 'gated',
          text: 'Paso condicionado',
          gateObjective: 'obj',
          check: { type: 'objectiveCompleted', objectiveId: 'obj' },
        },
      ],
    };
    const tutorial = new Tutorial(game as any, def);
    tutorial.update(2);
    expect(game.hud.last).toBe('Paso condicionado');
    state = 'pendiente';
    tutorial.update(0);
    expect(game.hud.last).toBe('');
    state = 'activo';
    tutorial.update(0);
    expect(game.hud.last).toBe('Paso condicionado');
    state = 'completed';
    tutorial.update(0);
    expect(tutorial.toSave().finished).toBe(true);
  });
});
