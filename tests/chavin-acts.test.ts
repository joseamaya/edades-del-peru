import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { BuildingKind, Era, UnitKind } from '../src/core/types';

const CHAVIN = MISSIONS.find((m) => m.id === 'm2_chavin')!;

function stubGame() {
  const game: any = {
    players: [
      { resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.REGIONAL_STATES, techs: new Set<string>() },
    ],
    units: new Map([[1, { id: 1, tag: '', owner: 0, dead: false, kind: UnitKind.WORKER, pos: { x: 0, z: 0 } }]]),
    buildings: new Map(),
    canalOpen: false,
    sitePhase: 'old_temple_foundation',
    acts: [] as string[],
    dialogues: [] as string[],
    visited: new Set<string>(),
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
    isHeritageVisited: (id: string) => game.visited.has(id),
    getVisitedHeritage: () => [...game.visited],
    setVisitedHeritage: (ids: string[]) => (game.visited = new Set(ids)),
    setSitePhase: (phase: string) => (game.sitePhase = phase),
    startEnvironmentalEvent: () => {},
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

function deliver(mission: Mission, game: any, heritage: string, resource: 'silver' | 'stone', amount: number): void {
  while (mission.activeDeliveryFor(heritage)) {
    game.players[0].resources[resource] = 1000;
    if (mission.recordDelivery(resource, 50) <= 0) break;
    if (amount-- <= 0) break;
  }
}

describe('Chavín model mission', () => {
  it('plays the four acts from the oracle to the documented decline', () => {
    const game = stubGame();
    let won: boolean | null = null;
    const mission = new Mission(game, CHAVIN, (win) => (won = win));
    expect(game.sitePhase).toBe('old_temple_foundation');
    mission.start();
    const tick = (seconds = 1) => {
      for (let i = 0; i < seconds; i++) mission.update(1, 0);
    };

    tick(5);
    expect(game.dialogues[0]).toBe('Voz de los peregrinos');
    // Act I: reach the site and hand over the first offerings.
    tick(2);
    expect(mission.getObjectiveState('a1_ofrenda')).toBe('activo');
    deliver(mission, game, 'chavin_edificio_b', 'silver', 2);
    tick(2);
    expect(game.acts).toEqual(['Acto II · Generaciones después']);

    // Act II: finish the Old Temple, receive pilgrims and open the fair.
    deliver(mission, game, 'chavin_edificio_b', 'stone', 3);
    tick(2);
    expect(game.sitePhase).toBe('old_temple');
    build(game, BuildingKind.MARKET, 1);
    tick(2);
    tick(61);
    expect(game.acts).toHaveLength(2);

    // Act III: raise the New Temple, research the pilgrimage and receive the great pilgrimage.
    tick(3);
    expect(game.sitePhase).toBe('new_temple_foundation');
    deliver(mission, game, 'chavin_edificio_a', 'stone', 4);
    tick(2);
    expect(game.sitePhase).toBe('new_temple');
    game.players[0].techs.add('chavin_pilgrimage');
    tick(2);
    tick(91);
    expect(game.acts).toHaveLength(3);
    expect(game.sitePhase).toBe('apogee');

    // Act IV: the last offering and the farewell.
    tick(2);
    deliver(mission, game, 'chavin_edificio_b', 'silver', 4);
    tick(2);
    tick(31);
    expect(won).toBe(true);
  });

  it('restores the site phase from a save that already passed the acts', () => {
    const game = stubGame();
    const mission = new Mission(game, CHAVIN, () => {});
    mission.start();
    mission.applySave({
      started: true,
      ended: false,
      won: null,
      timer: 100,
      objState: [['a2_templo', 'completed']],
      fired: ['t_a2_templo'],
      lastFired: [['t_a2_templo', 100]],
      spawnedCount: [],
    });
    expect(game.sitePhase).toBe('old_temple');
  });
});
