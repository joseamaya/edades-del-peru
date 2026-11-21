import { describe, expect, it } from 'vitest';
import { Unit } from '../src/entities/Unit';
import { Era, OrderKind, UnitKind, type CombatStance } from '../src/core/types';

const noBuildContext = {} as never;

/**
 * Two rifle-armed units on flat ground. The fake context mirrors the parts of `Game` the combat
 * loop reads, so acquisition, chasing and firing run without a renderer.
 */
function duel(
  defenderDistance: number,
  stance: CombatStance = 'defensivo',
  attackerStance: CombatStance = 'agresivo',
  defenderKind: UnitKind = UnitKind.REPUBLICA_DEFENSOR,
  attackerKind: UnitKind = UnitKind.CHILE_INFANTE,
  era: Era = Era.REPUBLIC,
) {
  const defender = new Unit(defenderKind, 0, era, noBuildContext);
  const attacker = new Unit(attackerKind, 1, era, noBuildContext);
  defender.pos.set(100, 0, 100);
  attacker.pos.set(100 + defenderDistance, 0, 100);
  defender.setCombatStance(stance);
  attacker.setCombatStance(attackerStance);
  const units = [defender, attacker];
  const entitiesById = new Map(units.map((unit) => [unit.id, unit]));
  const near = (x: number, z: number, radius: number) =>
    units.filter((u) => !u.dead && Math.hypot(u.pos.x - x, u.pos.z - z) < radius + u.radius);
  const fired: number[] = [];
  const ctx = {
    getHeight: () => 0,
    findPath: () => [],
    findApproachPath: () => [],
    reachableToNode: () => false,
    isWalkable: () => true,
    isWater: () => false,
    nearestWalkable: () => null,
    unitsNear: near,
    enemiesNear: (x: number, z: number, radius: number, owner: number) =>
      near(x, z, radius).filter((u) => u.owner !== owner),
    entitiesById,
    resourceNodes: new Map(),
    buildings: new Map(),
    resolveDamage: (attackerId: number, targetId: number, damage: number) => {
      const target = entitiesById.get(targetId);
      if (target) target.takeDamage(damage, attackerId);
    },
    spawnProjectile: (opts: { owner: number }) => {
      fired.push(opts.owner);
    },
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
  defender.setContext(ctx);
  attacker.setContext(ctx);
  return { defender, attacker, fired };
}

function run(units: Unit[], seconds: number): void {
  const dt = 1 / 60;
  for (let i = 0; i < Math.ceil(seconds / dt); i++) {
    for (const unit of units) unit.update(dt, i * dt);
  }
}

describe('combat engagement radius', () => {
  it('a defensive unit returns fire at the distance a rifleman can already be shot from', () => {
    // The Chilean stops ~15-16 m away, inside its own 13.5 m firing envelope; the defender's
    // acquisition must cover the same band instead of stopping at its 13.2 m nominal range.
    const { defender, attacker, fired } = duel(15);
    run([defender, attacker], 4);
    expect(fired, 'the defender never returned fire').toContain(0);
  });

  it('an aggressive unit engages inside its own weapon reach', () => {
    const { defender, attacker, fired } = duel(14, 'agresivo');
    run([defender, attacker], 4);
    expect(fired).toContain(0);
  });

  it('an aggressive unit answers fire from beyond its idle pick', () => {
    const { defender, attacker, fired } = duel(16, 'agresivo', 'pasivo');
    run([defender, attacker], 1);
    expect(fired, 'an idle aggressive unit does not pick a target at 16 m').toEqual([]);
    defender.takeDamage(5, attacker.id);
    run([defender, attacker], 4);
    expect(fired, 'being shot must still pull the unit into the fight').toContain(0);
  });

  it('answers the unit that shot it even from just outside its own envelope', () => {
    const { defender, attacker, fired } = duel(22, 'defensivo', 'pasivo');
    run([defender, attacker], 1);
    expect(
      fired.filter((owner) => owner === 0),
      'the defender should not acquire an idle enemy 22 m away',
    ).toEqual([]);
    defender.takeDamage(5, attacker.id);
    run([defender, attacker], 4);
    expect(fired, 'a unit that is shot must return fire').toContain(0);
  });

  it('keeps melee sight-based acquisition in both stances', () => {
    for (const stance of ['defensivo', 'agresivo'] as const) {
      const { defender, attacker } = duel(5, stance, 'pasivo', UnitKind.SOLDIER, UnitKind.RIFLEMAN);
      run([defender, attacker], 3);
      expect(attacker.hp, `${stance} melee should close and strike`).toBeLessThan(attacker.maxHp);
    }
  });

  it('answers fire with a sling, the pre-Hispanic ranged weapon', () => {
    // `MUSKETEER` is the legacy id of the basic ranged line (sling -> arquebus -> rifle). A sling reaches
    // 9 m while an archer reaches 11: the defender must still answer fire from beyond its own reach.
    const { defender, attacker, fired } = duel(
      15,
      'defensivo',
      'pasivo',
      UnitKind.MUSKETEER,
      UnitKind.RIFLEMAN,
      Era.FORMATIVE,
    );
    run([defender, attacker], 4);
    expect(fired, 'the slinger never returned fire').toContain(0);
  });

  it('does not chase an enemy that is out of reach', () => {
    const { defender, attacker, fired } = duel(40);
    run([defender, attacker], 5);
    expect(fired.filter((owner) => owner === 0)).toEqual([]);
    const detail = JSON.stringify({
      x: defender.pos.x,
      z: defender.pos.z,
      order: defender.orderQueue[0]?.kind,
      path: (defender as unknown as { path: unknown[] }).path.length,
      vx: defender.vel.x,
      vz: defender.vel.z,
    });
    expect(
      Math.hypot(defender.pos.x - 100, defender.pos.z - 100),
      `the defender left its post: ${detail}`,
    ).toBeLessThan(1);
  });

  it('engages while executing an attack-move instead of walking past the enemy', () => {
    const { defender, attacker, fired } = duel(15);
    defender.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: 160, z: 100 } });
    run([defender, attacker], 3);
    const detail = JSON.stringify({
      fired,
      x: defender.pos.x,
      z: defender.pos.z,
      target: defender.targetEntityId,
      attacking: defender.attackingTarget,
      order: defender.orderQueue[0]?.kind,
      cooldown: defender.attackCooldown,
      nearby: (defender as unknown as { ctx: { unitsNear: (x: number, z: number, r: number) => { id: number }[] } }).ctx
        .unitsNear(100, 100, 18)
        .map((u) => u.id),
      attacker: attacker.id,
    });
    expect(fired, `the attack-move ignored the enemy: ${detail}`).toContain(0);
    expect(defender.pos.x, 'the unit should stop to fight, not run to the destination').toBeLessThan(130);
  });
});
