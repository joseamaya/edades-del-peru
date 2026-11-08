import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { BuildingKind, Era, UnitKind } from '../src/core/types';
import type { CaralMayorPhase } from '../src/model/defs/caralCity';

const CARAL = MISSIONS.find((m) => m.id === 'm1_caral')!;

/** Minimal headless game: every map point resolves to the origin, so one worker stands on all of them. */
function stubGame() {
  const game: any = {
    players: [{ resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.FORMATIVE, techs: new Set<string>() }],
    units: new Map([[1, { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } }]]),
    buildings: new Map(),
    canalOpen: false,
    sitePhase: 'in_use' as CaralMayorPhase,
    acts: [] as string[],
    dialogues: [] as string[],
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
    drought: 0,
    droughtInstant: false,
    startEnvironmentalEvent: (event: string, instant = false) => {
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

    // Act I: fishing surplus, then the scout finds the valley.
    game.players[0].resources.food = 300;
    tick(2);
    expect(game.acts).toEqual(['Acto II · Generaciones después']);

    // Act II: fields, canal, storehouse and surplus.
    build(game, BuildingKind.FARM, 2);
    tick(2);
    game.canalOpen = true;
    tick(2);
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
    tick(1);
    expect(game.sitePhase).toBe('fill');
    deliverAll(mission, game);
    tick(1);
    expect(game.sitePhase).toBe('finished');
    tick(25);
    expect(game.sitePhase).toBe('in_use');
    expect(game.acts).toHaveLength(3);

    // Act IV: the drought starts; seal the pyramid and gather on the beach.
    expect(game.drought).toBe(1);
    deliverAll(mission, game);
    tick(1);
    expect(won).toBeNull();
    tick(20);
    expect(won).toBe(true);
  });

  it('restores the pyramid phase from the fired triggers of a save', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    const save = mission.toSave();
    mission.applySave({ ...save, fired: ['t_a3_shicras', 't_a3_muros'] });
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
      fired: ['t_a3_shicras', 't_a3_muros'],
      lastFired: [
        ['t_a3_shicras', 900],
        ['t_a3_muros', 600],
      ],
    });
    expect(game.sitePhase).toBe('fill');
  });

  it('restores the drought of a save that passed act IV without replaying its effects', () => {
    const game = stubGame();
    const mission = new Mission(game, CARAL, () => {});
    mission.applySave({ ...mission.toSave(), fired: ['t_a4_acto'] });
    expect(game.drought).toBe(1);
    expect(game.droughtInstant).toBe(true);
  });
});
