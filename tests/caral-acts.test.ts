import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { BuildingKind, Era, UnitKind, type ResourceKind } from '../src/core/types';
import { CARAL_PHASE_PLAN, type CaralMayorPhase } from '../src/model/defs/caralCity';

const CARAL = MISSIONS.find((m) => m.id === 'm1_caral')!;

/** Minimal headless game: every map point resolves to the origin, so one worker stands on all of them. */
function stubGame() {
  const game: any = {
    players: [{ resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.FORMATIVE, techs: new Set<string>() }],
    harvested: new Map<number, Map<ResourceKind, number>>(),
    harvestedBy: (owner: number, kind: ResourceKind) => game.harvested.get(owner)?.get(kind) ?? 0,
    recordHarvest: (owner: number, kind: ResourceKind, amount: number) =>
      game.harvested.set(
        owner,
        (game.harvested.get(owner) ?? new Map()).set(kind, (game.harvested.get(owner)?.get(kind) ?? 0) + amount),
      ),
    units: new Map(
      [1, 2, 3, 4].map((id) => [
        id,
        { id, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } },
      ]),
    ),
    buildings: new Map(),
    buildingName: (kind: BuildingKind) => (kind === BuildingKind.MILL ? 'Depósito comunal' : String(kind)),
    canalOpen: false,
    sitePhase: 'in_use' as CaralMayorPhase,
    sitePhasePlan: CARAL_PHASE_PLAN,
    acts: [] as string[],
    dialogues: [] as string[],
    rituals: [] as string[],
    revealed: [] as string[],
    environmentEvents: [] as string[],
    hasBuildings: () => true,
    getPaused: () => false,
    isCinematicActive: () => false,
    togglePause: () => {},
    playIntro: () => {},
    loop: { start: () => {} },
    toasts: [] as string[],
    hud: {
      showBriefing: (_d: unknown, cb: () => void) => cb(),
      showToast: (text: string) => game.toasts.push(text),
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
    revealDiscovery: (id: string) => game.revealed.push(id),
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
    game.recordHarvest(0, 'fishing', 300);
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

  it('waits for a beach cohort before the community departs', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    expect(CARAL.objectives.find((o) => o.id === 'a4_partida')?.minUnits).toBe(3);
    mission.start();
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a4_partida' ? 'activo' : st]),
    });
    // One fisher at the anchor is not the community.
    for (const id of [2, 3, 4]) game.units.delete(id);
    for (let i = 0; i < 20; i++) mission.update(1, 0);
    expect(mission.getObjectiveState('a4_partida')).toBe('activo');
    expect(mission.getObjectiveProgress('a4_partida')?.current).toBe(0);
    // Three workers gathered on the beach do complete it.
    for (const id of [2, 3]) {
      game.units.set(id, { id, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } });
    }
    for (let i = 0; i < 16; i++) mission.update(1, 0);
    expect(mission.getObjectiveState('a4_partida')).toBe('completed');
  });

  it('announces the assembly with Act III and the pyramid tour only once the walls stand', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.start();
    game.mission = mission;
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a2_excedente' ? 'completed' : st]),
    });
    mission.update(0.1, 0);
    expect(mission.getObjectiveState('obj_asamblea'), 'the assembly is announced, not started').toBe('pendiente');
    expect(
      mission.activeObjectives.map((o) => o.def.id),
      'and listed for the player',
    ).toContain('obj_asamblea');
    expect(mission.getObjectiveState('obj_complejos'), 'no tour before its monuments exist').toBe('pendiente');
    expect(mission.inspectRadiusFor('caral_pyramid_mayor')).toBeNull();

    game.sitePhase = 'finished';
    mission.objState.set('a3_obra_muros', 'completed');
    mission.update(0.1, 0);
    expect(mission.getObjectiveState('obj_complejos')).toBe('activo');
    expect(mission.inspectRadiusFor('caral_pyramid_mayor')).toBe(8);
    expect(game.revealed).toContain('caral_pyramid_mayor');
  });

  it('draws a goal marker for the active reach and hold objectives', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.start();
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a1_valle' ? 'activo' : st]),
    });
    const ids = mission.activeGoals().map((goal) => goal.id);
    expect(ids).toContain('a1_valle');
    expect(
      ids.every((id) => CARAL.objectives.some((o) => o.id === id && (o.kind === 'reach' || o.kind === 'hold'))),
    ).toBe(true);
  });

  it('keeps the optional assembly pending across a load', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a2_excedente' ? 'completed' : st]),
    });
    expect(mission.getObjectiveState('obj_asamblea')).toBe('pendiente');
    // The plaza card can still invite the player to call it.
    expect(mission.canActivateObjective('obj_asamblea')).toBe(true);
  });

  it('puts the departure beach away from the fishing banks', () => {
    const size = CARAL.map.size;
    const departure = CARAL.objectives.find((o) => o.id === 'a4_partida')!;
    const anchor = CARAL.layout!.departure!;
    const point = { x: anchor.x * size, z: anchor.z * size };
    expect(departure.pos?.ref).toBe('departure');
    for (const bank of CARAL.layout!.fishing ?? []) {
      const distance = Math.hypot(point.x - bank.x * size, point.z - bank.z * size);
      expect(distance, `bank at ${bank.x},${bank.z}`).toBeGreaterThan((departure.radius ?? 8) + 4);
    }
  });

  it('pauses construction while the communal store is empty and resumes when refilled', () => {
    const game = stubGame();
    build(game, BuildingKind.MILL, 1);
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

  it('keeps the work turn progress when the crew steps away and resumes on return', () => {
    const game = stubGame();
    build(game, BuildingKind.MILL, 1);
    game.players[0].resources.food = 100;
    const mission = new Mission(game, CARAL, () => {});
    mission.start();
    const save = mission.toSave();
    mission.applySave({
      ...save,
      objState: save.objState.map(([id, st]) => [id, id === 'a3_obra_relleno' ? 'activo' : st]),
    });
    const progress = () => mission.getObjectiveProgress('a3_obra_relleno')?.current ?? -1;

    for (let i = 0; i < 8; i++) mission.update(1, 0);
    expect(progress()).toBe(8);
    const paid = 100 - game.players[0].resources.food;
    // The crew leaves to gather: the turn pauses instead of restarting and charging again.
    game.units.clear();
    for (let i = 0; i < 10; i++) mission.update(1, 0);
    expect(progress()).toBe(8);
    expect(100 - game.players[0].resources.food).toBeCloseTo(paid, 5);
    // Three workers back on site finish the turn with the food already paid plus the rest.
    for (const id of [1, 2, 3]) {
      game.units.set(id, { id, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } });
    }
    for (let i = 0; i < 12; i++) mission.update(1, 0);
    expect(progress()).toBe(20);
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('completed');
    expect(100 - game.players[0].resources.food).toBeCloseTo(30, 5);
  });

  it('waits for the communal store before feeding the work turn', () => {
    const game = stubGame();
    game.players[0].resources.food = 100;
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
    expect(game.players[0].resources.food).toBe(100);
    expect(game.toasts).toHaveLength(1);
    expect(game.toasts[0]).toContain('Depósito comunal');

    build(game, BuildingKind.MILL, 1);
    for (let i = 0; i < 21; i++) mission.update(1, 0);
    expect(progress()).toBe(20);
    expect(mission.getObjectiveState('a3_obra_relleno')).toBe('completed');
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
      fired: ['t_a3_shicras'],
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
