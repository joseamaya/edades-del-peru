import { computeDamage, type ArmorProfile } from '../combat';
import type { DamageClass } from '../../model/defs/units';

export interface CombatPoint {
  x: number;
  y: number;
  z: number;
}

export interface CombatEntity {
  id: number;
  owner: number;
  dead: boolean;
  pos: CombatPoint;
}

export interface AreaTarget<T extends CombatEntity> {
  target: T;
  distance: number;
}

export interface AttackDamageInput {
  damage: number;
  damageType: DamageClass;
  armor: ArmorProfile;
  armorMultiplier: number;
  classBonus: number;
  /** Height-advantage multiplier; 1 when the attacker has no position. */
  elevation: number;
}

function distance(a: CombatPoint, b: CombatPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function isEnemy(entity: CombatEntity, attackerOwner: number, teamOf: (owner: number) => number | undefined): boolean {
  if (entity.dead || entity.owner === attackerOwner) return false;
  return teamOf(entity.owner) !== teamOf(attackerOwner);
}

/** Enemies of `attackerOwner` whose centre is inside an area explosion. */
export function selectAreaTargets<T extends CombatEntity>(
  impact: CombatPoint,
  radius: number,
  units: Iterable<T>,
  buildings: Iterable<T>,
  attackerOwner: number,
  teamOf: (owner: number) => number | undefined,
): AreaTarget<T>[] {
  const targets: AreaTarget<T>[] = [];
  for (const unit of units) {
    if (!isEnemy(unit, attackerOwner, teamOf)) continue;
    const d = distance(unit.pos, impact);
    if (d < radius) targets.push({ target: unit, distance: d });
  }
  for (const building of buildings) {
    if (!isEnemy(building, attackerOwner, teamOf)) continue;
    const d = distance(building.pos, impact);
    if (d < radius) targets.push({ target: building, distance: d });
  }
  return targets;
}

/**
 * Nearest enemy to a targetless impact. Matches the legacy fallback: a unit
 * wins over any building, and the hit only happens strictly inside `maxDistance`.
 */
export function selectNearestTarget<T extends CombatEntity>(
  impact: CombatPoint,
  units: Iterable<T>,
  buildings: Iterable<T>,
  attackerOwner: number,
  teamOf: (owner: number) => number | undefined,
  maxDistance = 3,
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const unit of units) {
    if (!isEnemy(unit, attackerOwner, teamOf)) continue;
    const d = distance(unit.pos, impact);
    if (d < bestDistance) {
      bestDistance = d;
      best = unit;
    }
  }
  if (!best) {
    for (const building of buildings) {
      if (!isEnemy(building, attackerOwner, teamOf)) continue;
      const d = distance(building.pos, impact);
      if (d < bestDistance) {
        bestDistance = d;
        best = building;
      }
    }
  }
  return best && bestDistance < maxDistance ? best : null;
}

/** Linear falloff of an area explosion (1 at the centre, 0 at the edge). */
export function areaFalloff(damage: number, distanceFromImpact: number, radius: number): number {
  return damage * (1 - distanceFromImpact / radius);
}

/** Final damage after armor, civilization multiplier, class bonus and elevation. */
export function resolveAttackDamage(input: AttackDamageInput): number {
  return Math.max(
    1,
    computeDamage(input.damage, input.damageType, input.armor, input.armorMultiplier, input.classBonus) *
      input.elevation,
  );
}
