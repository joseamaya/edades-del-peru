import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { HARVEST_STAND_RANGE } from '../src/entities/Unit';
import { OrderKind, UnitKind } from '../src/core/types';

const CARAL = MISSIONS.find((mission) => mission.id === 'm1_caral')!;

/** A bank must feed a group, not just one lucky fisher. */
const MIN_FISHERS_PER_GROUND = 4;

describe('Caral fishing grounds', () => {
  let game: Game;

  beforeAll(() => {
    setAutoStart(false);
    game = new Game(
      {
        ...DEFAULT_SETTINGS,
        missionId: 'm1_caral',
        fogOfWar: false,
        cinematic: false,
        showHints: false,
        soundEnabled: false,
      },
      null,
      null,
      false,
      true,
    );
  });

  afterAll(() => {
    game.destroy();
    setAutoStart(true);
  });

  it('places the authored sea banks on the checked shore', () => {
    const fish = [...game.resourceNodes.values()].filter((node) => node.kind === 'fishing' && !node.dead);
    for (const anchor of CARAL.layout?.fishing ?? []) {
      const x = anchor.x * game.settings.mapSize;
      const z = anchor.z * game.settings.mapSize;
      expect(
        fish.some((node) => Math.hypot(node.pos.x - x, node.pos.z - z) < 0.5),
        `missing authored fishing ground at (${x}, ${z})`,
      ).toBe(true);
    }
    const sea = fish.filter((node) => node.pos.x < 30);
    expect(sea.length, 'the coast of Áspero needs its own grounds').toBeGreaterThanOrEqual(3);
  });

  it('gives every bank room for a fishing group and enough reserve for acts II-IV', () => {
    const fish = [...game.resourceNodes.values()].filter((node) => node.kind === 'fishing' && !node.dead);
    expect(fish.length).toBeGreaterThanOrEqual(8);
    const component = game.pathfinder.mainComponent();
    for (const node of fish) {
      const capacity = game.pathfinder.standCapacity(node.pos.x, node.pos.z, HARVEST_STAND_RANGE, undefined, {
        allowWater: true,
        component,
      });
      expect(capacity, `bank ${node.id} at (${node.pos.x}, ${node.pos.z})`).toBeGreaterThanOrEqual(
        MIN_FISHERS_PER_GROUND,
      );
    }
    const reserve = fish.reduce((sum, node) => sum + node.amount, 0);
    expect(reserve).toBeGreaterThanOrEqual(2400);
  });

  it('counts only fished food for the Act I objective', () => {
    const mission = game.mission!;
    const objective = CARAL.objectives.find((entry) => entry.id === 'a1_pesca')!;
    expect(objective.fromNode).toBe('fishing');

    game.players[0].resources.food = 1000;
    expect(mission.getObjectiveProgress('a1_pesca')?.current).toBe(0);
    game.recordHarvest(0, 'fishing', 120);
    expect(mission.getObjectiveProgress('a1_pesca')?.current).toBe(120);
    // Spending the bank on units must not move a harvest counter backwards.
    game.players[0].resources.food = 0;
    expect(mission.getObjectiveProgress('a1_pesca')?.current).toBe(120);

    game.recordHarvest(0, 'fishing', 30);
    game.restoreHarvested(game.harvestedSave());
    expect(game.harvestedBy(0, 'fishing')).toBe(150);
  });

  it('spreads a group of eight fishers over nearby banks and keeps them working', () => {
    const base = game.playerCenter(0);
    const workers = [];
    for (let i = 0; i < 8; i++) {
      workers.push(
        game.spawnScriptedUnit(UnitKind.WORKER, 0, base.x + (i % 3) * 1.5 - 1.5, base.z + Math.floor(i / 3) * 1.5),
      );
    }
    const sea = [...game.resourceNodes.values()].find(
      (node) => node.kind === 'fishing' && !node.dead && node.pos.x < 30 && node.pos.z < 170,
    )!;
    game.executeCommand(
      {
        kind: 'order',
        unitIds: workers.map((worker) => worker.id),
        order: { kind: OrderKind.GATHER, entityId: sea.id },
        clear: true,
      },
      false,
    );
    const assignment = new Map<number, number>();
    for (const worker of workers) {
      const bank = worker.orderQueue[0]?.entityId;
      if (bank !== undefined) assignment.set(bank, (assignment.get(bank) ?? 0) + 1);
    }
    expect(assignment.size, 'eight fishers do not fit on one bank').toBeGreaterThanOrEqual(2);
    for (const count of assignment.values()) expect(count).toBeLessThanOrEqual(4);

    const reserveNow = (): number =>
      [...game.resourceNodes.values()]
        .filter((node) => node.kind === 'fishing' && !node.dead)
        .reduce((sum, node) => sum + node.amount, 0);
    const before = reserveNow();
    for (let i = 0; i < 20 * 90; i++) game.update(1 / 20, i / 20);
    for (const worker of workers) {
      expect(worker.dead).toBe(false);
      expect(worker.isBusy(), `worker ${worker.id} abandoned its fishing order`).toBe(true);
      if (worker.carryCountNow() > 0) {
        expect(worker.orderQueue[0]?.kind, `worker ${worker.id} idles with a load`).not.toBeUndefined();
      }
    }
    expect(reserveNow(), 'the group keeps harvesting').toBeLessThan(before);
  });
});
