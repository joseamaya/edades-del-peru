import { describe, expect, it } from 'vitest';
import { Unit, unitSpacing } from '../src/entities/Unit';
import { Era, OrderKind, UnitKind } from '../src/core/types';

const noBuildContext = {} as never;

interface Blocked {
  x: number;
  z: number;
  radius: number;
}

interface Harness {
  units: Unit[];
  spawn(kind: UnitKind, owner: number, x: number, z: number): Unit;
  run(seconds: number): void;
  damageEvents: number;
}

/**
 * A flat, walkable board with two owners. The context mirrors the pieces of `Game` the movement and
 * combat loops read; `blocked` makes a circular footprint unwalkable for the push-out test.
 */
function harness(blocked?: Blocked): Harness {
  const units: Unit[] = [];
  const entitiesById = new Map<number, Unit>();
  let damageEvents = 0;
  const near = (x: number, z: number, radius: number) =>
    units.filter((u) => !u.dead && Math.hypot(u.pos.x - x, u.pos.z - z) < radius + u.radius);
  const walkable = (x: number, z: number): boolean =>
    !blocked || Math.hypot(x - blocked.x, z - blocked.z) >= blocked.radius;
  const ctx = {
    getHeight: () => 0,
    findPath: () => [],
    findApproachPath: () => [],
    reachableToNode: () => false,
    isWalkable: walkable,
    isWater: () => false,
    nearestWalkable: () => null,
    unitsNear: near,
    enemiesNear: (x: number, z: number, radius: number, owner: number) =>
      near(x, z, radius).filter((u) => u.owner !== owner),
    entitiesById,
    resourceNodes: new Map(),
    buildings: new Map(),
    resolveDamage: (attackerId: number, targetId: number, damage: number) => {
      damageEvents++;
      entitiesById.get(targetId)?.takeDamage(damage, attackerId);
    },
    spawnProjectile: () => {},
    particles: null,
    players: [
      { id: 0, team: 0 },
      { id: 1, team: 1 },
    ],
    getPlayer: (id: number) => ({ id, team: id }),
    event: () => {},
    gather: () => {},
    recordHarvest: () => {},
    tradeIncome: () => {},
    worldSize: 256,
    period: 8,
    unitSpawn: () => false,
    techComplete: () => {},
  } as never;

  const spawn = (kind: UnitKind, owner: number, x: number, z: number): Unit => {
    const unit = new Unit(kind, owner, Era.REPUBLIC, noBuildContext);
    unit.pos.set(x, 0, z);
    unit.setContext(ctx);
    unit.setCombatStance('agresivo');
    // The melee has to last long enough to settle; damage still resolves and is counted.
    unit.hp = unit.maxHp = 100_000;
    units.push(unit);
    entitiesById.set(unit.id, unit);
    return unit;
  };

  return {
    units,
    spawn,
    get damageEvents(): number {
      return damageEvents;
    },
    run(seconds: number): void {
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt); i++) {
        for (const unit of units) if (!unit.dead) unit.update(dt, i * dt);
      }
    },
  };
}

function closestPair(units: Unit[]): number {
  let closest = Infinity;
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      if (units[i].dead || units[j].dead) continue;
      closest = Math.min(closest, Math.hypot(units[i].pos.x - units[j].pos.x, units[i].pos.z - units[j].pos.z));
    }
  }
  return closest;
}

describe('stop-and-fight separation', () => {
  it('keeps three cavalry from collapsing onto two soldiers', () => {
    const game = harness();
    const dragons = [0, 1, 2].map((i) => game.spawn(UnitKind.REALISTA_DRAGON, 1, 100 + i * 0.3, 100));
    const soldiers = [0, 1].map((i) => game.spawn(UnitKind.SOLDIER, 0, 100 + i * 0.5, 104));
    dragons[0].issueOrder({ kind: OrderKind.ATTACK, entityId: soldiers[0].id });
    dragons[1].issueOrder({ kind: OrderKind.ATTACK, entityId: soldiers[0].id });
    dragons[2].issueOrder({ kind: OrderKind.ATTACK, entityId: soldiers[1].id });

    game.run(8);

    expect(game.damageEvents).toBeGreaterThan(0);
    expect(closestPair(dragons)).toBeGreaterThanOrEqual(1.75);
  });

  it('keeps ten cavalry and fourteen soldiers from stacking while they fight', () => {
    const game = harness();
    const dragons = Array.from({ length: 10 }, (_, i) => game.spawn(UnitKind.REALISTA_DRAGON, 1, 84 + i * 1.4, 96));
    const soldiers = Array.from({ length: 14 }, (_, i) => game.spawn(UnitKind.SOLDIER, 0, 84 + i * 1.1, 112));
    // Two dragons per soldier, the shape that used to put three riders on two horses.
    dragons.forEach((dragon, i) => dragon.issueOrder({ kind: OrderKind.ATTACK, entityId: soldiers[i % 5].id }));

    game.run(8);

    expect(game.damageEvents).toBeGreaterThan(0);
    expect(closestPair(dragons)).toBeGreaterThanOrEqual(1.75);
    expect(closestPair(soldiers)).toBeGreaterThanOrEqual(1.0);
  });

  it('does not push a unit into a blocked footprint', () => {
    const game = harness({ x: 102.5, z: 100, radius: 1.2 });
    const a = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.1, 100);
    const b = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.7, 100);

    game.run(4);

    for (const unit of [a, b]) {
      expect(Math.hypot(unit.pos.x - 102.5, unit.pos.z - 100)).toBeGreaterThanOrEqual(1.2);
    }
    expect(game.units.length).toBe(2);
  });

  it('uses the larger body spacing and leaves enemy melee contact alone', () => {
    expect(unitSpacing(UnitKind.REALISTA_DRAGON)).toBe(2.4);
    expect(unitSpacing(UnitKind.SOLDIER)).toBe(1.4);
    const game = harness();
    const dragon = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100, 100);
    const target = game.spawn(UnitKind.SOLDIER, 0, 100, 101);
    dragon.issueOrder({ kind: OrderKind.ATTACK, entityId: target.id });

    game.run(1);

    // The positional pass must not count the enemy target as a body to push away from.
    expect(Math.hypot(dragon.pos.x - target.pos.x, dragon.pos.z - target.pos.z)).toBeLessThan(1.6);
  });
});
