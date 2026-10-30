import { describe, it, expect } from 'vitest';
import { Tutorial } from '../src/campaign/Tutorial';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import type { TutorialDef } from '../src/campaign/types';

function stubGame() {
  return { buildings: new Map(), units: new Map() };
}

const base = { houses: 0, barracks: 0, soldiers: 0 };

describe('tutorial save compatibility', () => {
  it('restores a save by step id after the step list changes', () => {
    const tutorial = new Tutorial(stubGame() as any, tutorialForMission('m1_caral')!);
    tutorial.applySave({
      idx: 0,
      stepId: 'landmark',
      begun: true,
      finished: false,
      delay: 0,
      base,
    });
    expect(tutorial.toSave().stepId).toBe('landmark');
  });

  it('maps the legacy indices to the closest current step', () => {
    const tutorial = new Tutorial(stubGame() as any, tutorialForMission('m1_caral')!);
    // Legacy index 3 was the removed market step; the coast is its closest replacement.
    tutorial.applySave({ idx: 3, begun: true, finished: false, delay: 0, base });
    expect(tutorial.toSave().stepId).toBe('coast');
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
    expect(tutorial.toSave().stepId).toBe('farm');
  });

  it('advances when a scout reaches the site', () => {
    const game = gameForSteps();
    game.units.set(1, { owner: 0, kind: 'scout', dead: false, pos: { x: 100, z: 30 } });
    const tutorial = tutorialAt(game, 'landmark');
    tutorial.update(0);
    tutorial.update(0);
    expect(tutorial.toSave().stepId).toBe('storage');
  });

  it('finishes after the gated communal store is completed', () => {
    const game = gameForSteps();
    game.buildings.set(1, { owner: 0, kind: 'mill', dead: false, constructionComplete: true });
    const tutorial = tutorialAt(game, 'storage');
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
