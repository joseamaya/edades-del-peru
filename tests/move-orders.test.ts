import { describe, expect, it } from 'vitest';
import { Unit, type UnitContext } from '../src/entities/Unit';
import { Era, OrderKind, UnitKind } from '../src/core/types';

interface Harness {
  unit: Unit;
  blocked: () => void;
}

/**
 * A unit on a flat board. `water` marks the unwalkable ground (x >= waterX by default) and
 * `shore` the walkable point a move order into it must fall back to.
 */
function harness(opts: {
  x: number;
  z: number;
  target?: { x: number; z: number };
  waterX?: number;
  shore?: { x: number; z: number } | null;
  /** Band of ground that blocks the route without being a destination (a ridge). */
  wall?: { from: number; to: number };
  reachable?: boolean;
}): Harness {
  const waterX = opts.waterX ?? Infinity;
  const shore = opts.shore ?? null;
  const wall = opts.wall;
  const reachable = opts.reachable ?? false;
  const blocked: { done: boolean } = { done: false };
  const ctx = {
    getHeight: () => 0,
    findPath: (_sx: number, _sz: number, tx: number, tz: number) => {
      // Reachable destinations get a straight path; the unreachable one comes back empty.
      if (!reachable) return [];
      const goal = opts.target && tx === opts.target.x && tz === opts.target.z ? opts.target : { x: tx, z: tz };
      return [goal];
    },
    findApproachPath: () => [],
    reachableToNode: () => true,
    isWalkable: (x: number, z: number) => {
      if (wall && x >= wall.from && x <= wall.to) return false;
      // Inside the water region nothing is walkable except the shore point the order falls back to.
      if (x >= waterX) return !!shore && Math.abs(x - shore.x) < 0.6 && Math.abs(z - shore.z) < 0.6;
      return true;
    },
    nearestWalkable: (x: number) => (x >= waterX && shore ? { ...shore } : null),
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
  return { unit, blocked: () => void blocked };
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
    const { unit } = harness({ x: 10, z: 10, target: water, waterX: 18, shore, reachable: true });

    unit.issueOrder({ kind: OrderKind.MOVE, target: water });
    expect(unit.orderQueue[0]?.target).toEqual(shore);

    step(unit, 8);
    expect(unit.isBusy(), 'the order must end once the unit reaches the shore').toBe(false);
    expect(unit.pos.x).toBeLessThan(18);
    expect(Math.hypot(unit.pos.x - shore.x, unit.pos.z - shore.z)).toBeLessThan(2);
  });

  it('drops an unreachable order instead of holding it forever', () => {
    const target = { x: 50, z: 10 };
    const { unit } = harness({ x: 10, z: 10, target, wall: { from: 15, to: 30 }, reachable: false });

    unit.issueOrder({ kind: OrderKind.MOVE, target });
    step(unit, 0.5);
    expect(unit.isBusy(), 'still trying').toBe(true);

    step(unit, 2);
    expect(unit.isBusy(), 'the no-route grace ends the order').toBe(false);
    expect(unit.orderQueue).toHaveLength(0);
  });

  it('keeps the requested goal for a group move over walkable ground', () => {
    const { unit } = harness({ x: 10, z: 10, reachable: true });
    unit.issueGroupMove({ x: 20, z: 10 }, [{ x: 20, z: 10 }], { x: 1, z: 1 }, 3);
    expect(unit.orderQueue[0]?.target).toEqual({ x: 21, z: 11 });
    expect(unit.orderQueue[0]?.kind).toBe(OrderKind.MOVE);
  });
});
