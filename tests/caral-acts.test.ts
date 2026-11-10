import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { BuildingKind, Era, UnitKind } from '../src/core/types';
import { CARAL_PHASE_PLAN, type CaralMayorPhase } from '../src/model/defs/caralCity';

const CARAL = MISSIONS.find((m) => m.id === 'm1_caral')!;

/** Minimal headless game: every map point resolves to the origin, so one worker stands on all of them. */
function stubGame() {
  const game: any = {
    players: [{ resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.FORMATIVE, techs: new Set<string>() }],
    harvested: new Map<number, Map<string, number>>(),
    harvestedBy: (owner: number, kind: string) => game.harvested.get(owner)?.get(kind) ?? 0,
    units: new Map([[1, { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } }]]),
    buildings: new Map(),
    canalOpen: false,
    sitePhase: 'in_use' as CaralMayorPhase,
    sitePhasePlan: CARAL_PHASE_PLAN,
    acts: [] as string[],
    dialogues: [] as string[],
    rituals: [] as string[],
    environmentEvents: [] as string[],
    hasBuildings: () => true,
    getPaused: () => false,
    isCinematicActive: () => false,
    togglePause: () => {},
    playIntro: () => {},
    loop: { start: () => {} },
    hud: {
      showBriefing: (_d: unknown, cb: () => void) => cb(),
      showToast: () => {},
      showDialogue: (name: string) => game.dialogues.push(name),
      showActCard: (kicker: string) => game.acts.push(kicker),
    },
    audio: { uiClick: () => {} },
    camera: { focusOn: () => {} },
    rng: { float: () => 0.5 },
    isCanalOpen: () => game.canalOpen,
    isHeritageVisited: () => false,
    getVisitedHeritage: () => [],
    setVisitedHeritage: () => {},
    setSitePhase: (phase: CaralMayorPhase) => (game.sitePhase = phase),
    playSiteRitual: () => game.rituals.push('burial'),
    drought: 0,
    droughtInstant: false,
    startEnvironmentalEvent: (event: string, instant = false) => {
      game.environmentEvents.push(event);
      if (event !== 'drought') return;
      game.drought = 1;
      game.droughtInstant = instant;
    },
    resolveMissionPoint: () => ({ x: 0, z: 0 }),
  };
  return game;
}

function build(game: any, kind: BuildingKind, count: number): void {
  for (let i = 0; i < count; i++) {
    const id = game.buildings.size + 100;
    game.buildings.set(id, { id, owner: 0, kind, constructionComplete: true, dead: false, pos: { x: 0, z: 0 } });
  }
}

function deliverAll(mission: Mission, game: any): void {
  const delivery = mission.activeDeliveryFor('caral_pyramid_mayor')!;
  const resource = delivery.def.resource!;
  while (mission.activeDeliveryFor('caral_pyramid_mayor')?.def.id === delivery.def.id) {
    game.players[0].resources[resource] = 1000;
    expect(mission.recordDelivery(resource, delivery.def.step ?? 50)).toBeGreaterThan(0);
  }
}

describe('Caral model mission', () => {
  it('plays the four acts in order and ends with the community leaving for the coast', () => {
    const game = stubGame();
    let won: boolean | null = null;
    const mission = new Mission(game, CARAL, (win) => (won = win));
    expect(game.sitePhase).toBe('foundation');
    mission.start();
    const tick = (seconds = 1) => {
      for (let i = 0; i < seconds; i++) mission.update(1, 0);
    };
    tick(5);
    expect(game.dialogues[0]).toBe('Voz del valle');

    // Act I: fishing surplus, not a food balance (issue 378).
    game.players[0].resources.food = 300;
    tick(2);
    expect(mission.getObjectiveState('a1_pesca'), 'food in the bank is not fishing').toBe('activo');
    game.players[0].resources.food = 150;
    tick(2);
    expect(mission.getObjectiveProgress('a1_pesca')?.current).toBe(0);
    game.harvested.set(0, new Map([['fishing', 300]]));
    tick(2);
    expect(game.acts).toEqual(['Acto II · Generaciones después']);

    // Act II: fields, canal, storehouse and surplus.
    build(game, BuildingKind.FARM, 2);
    tick(2);
    game.canalOpen = true;
    tick(2);
    expect(game.environmentEvents).toContain('wet_season');
    build(game, BuildingKind.MILL, 1);
    tick(2);
    game.players[0].techs.add('cotton_nets');
    tick(2);
    game.players[0].resources.food = 500;
    tick(2);
    expect(game.acts).toHaveLength(2);
    expect(game.sitePhase).toBe('foundation');

    // Act III: shicras, retaining walls, then the fire offering with the community gathered.
    deliverAll(mission, game);
    tick(21);
    expect(game.sitePhase).toBe('fill');
    deliverAll(mission, game);
    tick(21);
    expect(game.sitePhase).toBe('finished');
    tick(25);
    expect(game.sitePhase).toBe('in_use');
    expect(game.acts).toHaveLength(3);
    expect(game.rituals).toEqual(['burial', 'burial']);

    // Act IV: the drought starts; seal the pyramid and gather on the beach.
    expect(game.drought).toBe(1);
    expect(game.environmentEvents).toContain('drought');
    deliverAll(mission, game);
    tick(1);
    expect(won).toBeNull();
    tick(20);
    expect(won).toBe(true);
  });

  it('pauses construction while the communal store is empty and resumes when refilled', () => {
    const game = stubGame();
    game.players[0].resources.food = 0;
    const mission = new Mission(game, CARAL, () => {});
    mission.start();
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a3_obra_relleno' ? 'activo' : st]),
    });
    const progress = () => mission.getObjectiveProgress('a3_obra_relleno')?.current ?? -1;

    for (let i = 0; i < 21; i++) mission.update(1, 0);
    expect(progress()).toBe(0);
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('activo');

    game.players[0].resources.food = 31;
    for (let i = 0; i < 20; i++) mission.update(1, 0);
    expect(progress()).toBe(20);
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('completed');
    expect(game.sitePhase).toBe('fill');
    expect(game.players[0].resources.food).toBeCloseTo(1, 5);
  });

  it('does not replay the new work-trigger effects when an old save is past them', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.start();
    game.sitePhase = 'in_use';
    game.sitePhaseRestored = true;
    const save = mission.toSave();
    const moved = save.objState.map(([id, st]) => [
      id,
      ['a3_shicras', 'a3_muros', 'a3_fuego'].includes(id) ? 'completed' : id.startsWith('a3_obra_') ? 'pendiente' : st,
    ]);
    mission.applySave({
      ...save,
      objState: moved,
      fired: ['t_a3_shicras', 't_a3_muros', 't_a4_acto'],
    });
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('completed');
    expect(mission.getObjectiveState('a3_obra_muros')).toBe('completed');
    expect(mission.toSave().fired).toEqual(expect.arrayContaining(['t_a3_obra_relleno', 't_a3_obra_muros']));
    mission.update(0.1, 0);
    expect(game.sitePhase).toBe('in_use');
    expect(game.rituals).toEqual([]);
  });

  it('restores an older save phase from the latest completed act', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({
      ...save,
      fired: ['t_a3_shicras', 't_a3_muros'],
      objState: save.objState.map(([id, st]) => [id, ['a3_shicras', 'a3_muros'].includes(id) ? 'completed' : st]),
    });
    expect(game.sitePhase).toBe('finished');
  });

  it('repairs a pre-hold save from the saved site phase', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    game.sitePhase = 'fill';
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id.startsWith('a3_obra_') ? 'pendiente' : st]),
    });
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('completed');
    expect(mission.getObjectiveState('a3_obra_muros')).toBe('pendiente');
  });

  it('activates a new work turn when its prerequisite completed before the phase advanced', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    game.sitePhase = 'foundation';
    game.sitePhaseRestored = true;
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a3_shicras' ? 'completed' : st]),
    });
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('activo');
  });

  it('restores the pyramid phase from the fired triggers of a save', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({ ...save, fired: ['t_a3_obra_relleno', 't_a3_obra_muros'] });
    expect(game.sitePhase).toBe('finished');
  });

  it('credits a hand-over only to the objective it was made for', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a3_muros' || id === 'a4_sellar' ? 'activo' : st]),
    });
    expect(mission.recordDelivery('stone', 50, 'a4_sellar')).toBe(50);
    expect(mission.activeDeliveryFor('caral_pyramid_mayor')).toEqual(
      expect.objectContaining({ delivered: 0, def: expect.objectContaining({ id: 'a3_muros' }) }),
    );
  });

  it('restores the most recently fired phase, not the last one listed', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({
      ...save,
      fired: ['t_a3_obra_relleno', 't_a3_obra_muros'],
      lastFired: [
        ['t_a3_obra_relleno', 900],
        ['t_a3_obra_muros', 600],
      ],
    });
    expect(game.sitePhase).toBe('fill');
  });

  it('restores the winter flood from a save that already opened the canal', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.applySave({ ...mission.toSave(), fired: ['t_a2_canal'] });
    expect(game.environmentEvents).toContain('wet_season');
  });

  it('restores the drought of a save that passed act IV without replaying its effects', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.applySave({ ...mission.toSave(), fired: ['t_a4_acto'] });
    expect(game.drought).toBe(1);
    expect(game.droughtInstant).toBe(true);
  });
});
