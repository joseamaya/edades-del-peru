import { describe, expect, it } from 'vitest';
import { Unit, type UnitContext } from '../src/entities/Unit';
import { Era, OrderKind, UnitKind } from '../src/core/types';

interface Harness {
  unit: Unit;
  /** Every `nearestWalkable` lookup, so the component hint can be asserted. */
  nearestCalls: { x: number; z: number; fromX?: number; fromZ?: number }[];
}

/**
 * A unit on a flat board. `waterX` marks where the unwalkable sea begins and `shore` the walkable
 * point a move order into it must fall back to; `wall` blocks the route without being a destination.
 */
function harness(opts: {
  x: number;
  z: number;
  waterX?: number;
  shore?: { x: number; z: number } | null;
  wall?: { from: number; to: number };
  /** A solid footprint (a building or resource node): blocked, but not water. */
  building?: { x: number; z: number; r: number };
}): Harness {
  const waterX = opts.waterX ?? Infinity;
  const shore = opts.shore ?? null;
  const wall = opts.wall;
  const building = opts.building;
  const nearestCalls: Harness['nearestCalls'] = [];
  const ctx = {
    getHeight: () => 0,
    findPath: (_sx: number, _sz: number, tx: number, tz: number) => {
      // The unreachable case (a wall) comes back empty; reachable destinations get a straight path.
      if (wall) return [];
      return [{ x: tx, z: tz }];
    },
    findApproachPath: () => [],
    reachableToNode: () => true,
    isWalkable: (x: number, z: number) => {
      if (building && Math.hypot(x - building.x, z - building.z) < building.r) return false;
      if (wall && x >= wall.from && x <= wall.to) return false;
      if (x >= waterX) return !!shore && Math.abs(x - shore.x) < 0.6 && Math.abs(z - shore.z) < 0.6;
      return true;
    },
    isWater: (x: number) => x >= waterX,
    nearestWalkable: (x: number, z: number, fromX?: number, fromZ?: number) => {
      nearestCalls.push({ x, z, fromX, fromZ });
      return x >= waterX && shore ? { ...shore } : null;
    },
    unitsNear: () => [],
    enemiesNear: () => [],
    entitiesById: new Map(),
    resourceNodes: new Map(),
    buildings: new Map(),
    resolveDamage: () => {},
    spawnProjectile: () => {},
    particles: null,
    players: [],
    getPlayer: () => ({}) as never,
    event: () => {},
    gather: () => {},
    recordHarvest: () => {},
    tradeIncome: () => {},
    worldSize: 128,
    period: 0,
    unitSpawn: () => false,
    techComplete: () => {},
  } as unknown as UnitContext;

  const unit = new Unit(UnitKind.WORKER, 0, Era.FORMATIVE, {} as never);
  unit.setContext(ctx);
  unit.pos.set(opts.x, 0, opts.z);
  unit.snapToGround();
  return { unit, nearestCalls };
}

function step(unit: Unit, seconds: number): void {
  let t = 0;
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) {
    unit.update(0.05, t);
    t += 0.05;
  }
}

describe('move orders to unwalkable ground', () => {
  it('goes to the nearest walkable point and ends the order on arrival', () => {
    const shore = { x: 17.5, z: 10 };
    const water = { x: 22, z: 10 };
    const { unit, nearestCalls } = harness({ x: 10, z: 10, waterX: 18, shore });

    unit.issueOrder({ kind: OrderKind.MOVE, target: water });
    expect(unit.orderQueue[0]?.target).toEqual(shore);
    // The lookup is restricted to the unit's component, never the far bank.
    expect(nearestCalls[0]).toMatchObject({ fromX: 10, fromZ: 10 });

    // Walk to the shore, then give the order at most two seconds to end.
    let t = 0;
    for (let i = 0; i < 200 && Math.hypot(unit.pos.x - shore.x, unit.pos.z - shore.z) >= 1.5; i++) {
      unit.update(0.1, t);
      t += 0.1;
    }
    expect(Math.hypot(unit.pos.x - shore.x, unit.pos.z - shore.z)).toBeLessThan(1.5);
    step(unit, 2);
    expect(unit.isBusy(), 'the order must end once the unit reaches the shore').toBe(false);
    expect(unit.orderQueue).toHaveLength(0);
    expect(unit.pos.x).toBeLessThan(18);
  });

  it('ends an attack-move into the water on the shore too', () => {
    const shore = { x: 17.5, z: 10 };
    const water = { x: 22, z: 10 };
    const { unit } = harness({ x: 10, z: 10, waterX: 18, shore });

    unit.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: water });
    step(unit, 8);
    expect(unit.orderQueue).toHaveLength(0);
    expect(unit.pos.x).toBeLessThan(18);
  });

  it('leaves a blocked entity goal alone, so the pathfinder can approach it', () => {
    const { unit, nearestCalls } = harness({
      x: 10,
      z: 10,
      building: { x: 30, z: 10, r: 3 },
    });
    unit.issueOrder({ kind: OrderKind.MOVE, target: { x: 30, z: 10 } });
    expect(unit.orderQueue[0]?.target).toEqual({ x: 30, z: 10 });
    expect(nearestCalls, 'no water clamp for a building').toHaveLength(0);
  });

  it('drops an unreachable order instead of holding it forever', () => {
    const target = { x: 50, z: 10 };
    const { unit } = harness({ x: 10, z: 10, wall: { from: 15, to: 30 } });

    unit.issueOrder({ kind: OrderKind.MOVE, target });
    step(unit, 0.5);
    expect(unit.isBusy(), 'still trying').toBe(true);

    step(unit, 2);
    expect(unit.isBusy(), 'the no-route grace ends the order').toBe(false);
    expect(unit.orderQueue).toHaveLength(0);
  });

  it('keeps the requested goal for a group move over walkable ground', () => {
    const { unit } = harness({ x: 10, z: 10 });
    unit.issueGroupMove({ x: 20, z: 10 }, [{ x: 20, z: 10 }], { x: 1, z: 1 }, 3);
    expect(unit.orderQueue[0]?.target).toEqual({ x: 21, z: 11 });
    expect(unit.orderQueue[0]?.kind).toBe(OrderKind.MOVE);
  });

  it('clamps a group move whose formation offset lands in the water', () => {
    const shore = { x: 17.5, z: 10 };
    const { unit } = harness({ x: 10, z: 10, waterX: 18, shore });
    unit.issueGroupMove({ x: 21, z: 10 }, [{ x: 21, z: 10 }], { x: 1, z: 0 }, 3);
    expect(unit.orderQueue[0]?.target).toEqual(shore);
  });

  it('clamps a patrol destination into the water', () => {
    const shore = { x: 17.5, z: 10 };
    const { unit } = harness({ x: 10, z: 10, waterX: 18, shore });
    unit.issueOrder({ kind: OrderKind.PATROL, target: { x: 22, z: 10 } });
    expect(unit.orderQueue[0]?.target).toEqual(shore);
  });

  it('does not mutate a shared order while each unit resolves its own goal', () => {
    const a = harness({ x: 10, z: 10, waterX: 18, shore: { x: 17.5, z: 10 } });
    const b = harness({ x: 10, z: 30, waterX: 18, shore: { x: 17.5, z: 10 } });
    const order = { kind: OrderKind.MOVE, target: { x: 22, z: 10 } };
    a.unit.issueOrder(order);
    b.unit.issueOrder(order);
    expect(order.target).toEqual({ x: 22, z: 10 });
    expect(a.unit.orderQueue[0]?.target).toEqual({ x: 17.5, z: 10 });
    expect(b.unit.orderQueue[0]?.target).toEqual({ x: 17.5, z: 10 });
  });
});
