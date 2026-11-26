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
function harness(options: { blocked?: Blocked; team?: (owner: number) => number } = {}): Harness {
  const blocked = options.blocked;
  const teamOf = (owner: number): number => options.team?.(owner) ?? owner;
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
      near(x, z, radius).filter((u) => teamOf(u.owner) !== teamOf(owner)),
    entitiesById,
    resourceNodes: new Map(),
    buildings: new Map(),
    resolveDamage: (attackerId: number, targetId: number, damage: number) => {
      damageEvents++;
      entitiesById.get(targetId)?.takeDamage(damage, attackerId);
    },
    spawnProjectile: () => {},
    particles: null,
    players: [0, 1].map((id) => ({ id, team: teamOf(id) })),
    getPlayer: (id: number) => ({ id, team: teamOf(id) }),
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
    expect(closestPair(dragons)).toBeGreaterThanOrEqual(1.88);
  });

  it('keeps ten cavalry from stacking while they fight fourteen soldiers', () => {
    const game = harness();
    const dragons = Array.from({ length: 10 }, (_, i) => game.spawn(UnitKind.REALISTA_DRAGON, 1, 84 + i * 1.4, 96));
    const soldiers = Array.from({ length: 14 }, (_, i) => game.spawn(UnitKind.SOLDIER, 0, 84 + i * 1.1, 112));
    // Two dragons per soldier, the shape that used to put three riders on two horses.
    dragons.forEach((dragon, i) => dragon.issueOrder({ kind: OrderKind.ATTACK, entityId: soldiers[i % 5].id }));

    game.run(8);

    expect(game.damageEvents).toBeGreaterThan(0);
    // The mounted pass settles just under the nominal 0.8 (a soldier in the ring leaves less room).
    expect(closestPair(dragons)).toBeGreaterThanOrEqual(1.8);
  });

  it('leaves the foot line packed: infantry keeps the m6b hold stance', () => {
    const game = harness();
    // Shoulder to shoulder, just under the 1.4 m marching spacing: the idle pass must not open the line.
    const line = [0, 1, 2, 3].map((i) => game.spawn(UnitKind.SOLDIER, 1, 100 + i * 1.0, 100));

    game.run(3);

    line.forEach((u, i) => expect(Math.hypot(u.pos.x - (100 + i * 1.0), u.pos.z - 100)).toBeLessThan(0.05));
  });

  it('opens idle infantry that ended a move on the same point', () => {
    const game = harness();
    const soldiers = Array.from({ length: 11 }, (_, i) => game.spawn(UnitKind.SOLDIER, 0, 100 + i * 0.6, 90));
    for (const s of soldiers) s.issueOrder({ kind: OrderKind.MOVE, target: { x: 110, z: 110 } });

    game.run(14);

    expect(soldiers.every((s) => !s.isBusy())).toBe(true);
    expect(closestPair(soldiers)).toBeGreaterThanOrEqual(0.8);
  });

  it('leaves an idle packed line alone while an enemy is near (the m6b hold)', () => {
    const game = harness();
    const soldiers = Array.from({ length: 6 }, (_, i) => game.spawn(UnitKind.SOLDIER, 0, 100 + i * 0.2, 100));
    // Out of reach of a fight, but inside the engagement envelope: the line keeps the battle's shape.
    const enemy = game.spawn(UnitKind.SOLDIER, 1, 112, 100);
    enemy.setCombatStance('pasivo');
    for (const s of soldiers) s.setCombatStance('pasivo');

    game.run(3);

    expect(closestPair(soldiers)).toBeLessThan(0.3);
  });

  it('keeps charging riders of both sides from running through each other', () => {
    const game = harness();
    // Two ranks a side, the files offset by a metre so the horses meet head to shoulder (Junín).
    const rider = (kind: UnitKind, owner: number, i: number, x0: number, z0: number, dz: number) =>
      game.spawn(kind, owner, x0 + (i % 4) * 2.6, z0 + Math.floor(i / 4) * dz);
    const hussars = Array.from({ length: 8 }, (_, i) => rider(UnitKind.HUSSAR, 0, i, 100, 90, -3));
    const dragons = Array.from({ length: 8 }, (_, i) => rider(UnitKind.REALISTA_DRAGON, 1, i, 101, 106, 3));
    for (const h of hussars) h.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: h.pos.x, z: 130 } });
    for (const d of dragons) d.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: d.pos.x, z: 60 } });

    let closest = Infinity;
    game.run(2);
    for (let s = 0; s < 4; s++) {
      game.run(1);
      for (const h of hussars)
        for (const d of dragons) closest = Math.min(closest, Math.hypot(h.pos.x - d.pos.x, h.pos.z - d.pos.z));
    }

    expect(game.damageEvents).toBeGreaterThan(0);
    // Half the 2.4 m horse spacing, with slack for the per-tick push cap (it was 0.3 m before).
    expect(closest).toBeGreaterThanOrEqual(1.08);
  });

  it('separates two idle cavalry that start inside each other', () => {
    const game = harness();
    const a = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100, 100);
    const b = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.2, 100);

    game.run(3);

    expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeGreaterThanOrEqual(1.8);
  });

  it('separates allied owners on the same team', () => {
    const game = harness({ team: () => 0 });
    const a = game.spawn(UnitKind.REALISTA_DRAGON, 0, 100, 100);
    const b = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.2, 100);

    game.run(3);

    expect(Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z)).toBeGreaterThanOrEqual(1.8);
  });

  it('does not push a unit into a blocked footprint', () => {
    const game = harness({ blocked: { x: 102.5, z: 100, radius: 1.2 } });
    const a = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.1, 100);
    const b = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100.7, 100);

    game.run(4);

    for (const unit of [a, b]) {
      expect(Math.hypot(unit.pos.x - 102.5, unit.pos.z - 100)).toBeGreaterThanOrEqual(1.2);
    }
    expect(game.units.length).toBe(2);
  });

  it('drops the engagement target as soon as an attack-move stops engaging', () => {
    const game = harness();
    const dragon = game.spawn(UnitKind.REALISTA_DRAGON, 1, 100, 100);
    const soldier = game.spawn(UnitKind.SOLDIER, 0, 100, 104);
    dragon.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: 100, z: 120 } });

    game.run(1);
    expect(dragon.targetEntityId).toBe(soldier.id);

    // The enemy withdraws out of the engagement envelope; the march resumes.
    soldier.pos.set(200, 0, 200);
    game.run(0.2);
    expect(dragon.targetEntityId).toBeNull();
    expect(Math.hypot(dragon.pos.x - 100, dragon.pos.z - 120)).toBeGreaterThan(2);

    game.run(20);
    expect(dragon.targetEntityId).toBeNull();
    expect(Math.hypot(dragon.pos.x - 100, dragon.pos.z - 120)).toBeLessThan(2);
  });

  it('drops the conversion target once the enemy converts', () => {
    const game = harness();
    const missionary = game.spawn(UnitKind.MISSIONARY, 0, 100, 100);
    const soldier = game.spawn(UnitKind.SOLDIER, 1, 100.5, 100);
    missionary.issueOrder({ kind: OrderKind.CONVERT, entityId: soldier.id });

    game.run(6);

    expect(soldier.owner).toBe(0);
    expect(missionary.targetEntityId).toBeNull();
  });

  it('drops the conversion target when it dies mid-cast', () => {
    const game = harness();
    const missionary = game.spawn(UnitKind.MISSIONARY, 0, 100, 100);
    const soldier = game.spawn(UnitKind.SOLDIER, 1, 100.5, 100);
    missionary.issueOrder({ kind: OrderKind.CONVERT, entityId: soldier.id });

    game.run(1);
    expect(missionary.targetEntityId).toBe(soldier.id);

    soldier.takeDamage(1e9);
    game.run(0.2);

    expect(soldier.dead).toBe(true);
    expect(missionary.targetEntityId).toBeNull();
    expect(missionary.isBusy()).toBe(false);
  });

  it('stops an attack when its target converts to the attacker side', () => {
    const game = harness();
    const missionary = game.spawn(UnitKind.MISSIONARY, 0, 100, 100);
    const soldier = game.spawn(UnitKind.SOLDIER, 1, 100.5, 100.5);
    const dragon = game.spawn(UnitKind.REALISTA_DRAGON, 0, 100, 103);
    dragon.issueOrder({ kind: OrderKind.ATTACK, entityId: soldier.id });
    missionary.issueOrder({ kind: OrderKind.CONVERT, entityId: soldier.id });

    game.run(6);
    expect(soldier.owner).toBe(0);
    expect(dragon.targetEntityId).toBeNull();

    const hp = soldier.hp;
    game.run(2);
    expect(soldier.hp).toBe(hp);
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
