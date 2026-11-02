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

function hostileUnit(
  entity: CombatEntity,
  attackerOwner: number,
  teamOf: (owner: number) => number | undefined,
): boolean {
  if (entity.dead || entity.owner === attackerOwner) return false;
  return teamOf(entity.owner) !== teamOf(attackerOwner);
}

function hostileBuilding(entity: CombatEntity, attackerOwner: number): boolean {
  return !entity.dead && entity.owner !== attackerOwner;
}

function insideRadius<T extends CombatEntity>(
  entities: Iterable<T>,
  impact: CombatPoint,
  radius: number,
  hostile: (entity: T) => boolean,
): AreaTarget<T>[] {
  const targets: AreaTarget<T>[] = [];
  for (const entity of entities) {
    if (!hostile(entity)) continue;
    const d = distance(entity.pos, impact);
    if (d < radius) targets.push({ target: entity, distance: d });
  }
  return targets;
}

function nearest<T extends CombatEntity>(
  entities: Iterable<T>,
  impact: CombatPoint,
  hostile: (entity: T) => boolean,
  best: { target: T; distance: number } | null,
): { target: T; distance: number } | null {
  for (const entity of entities) {
    if (!hostile(entity)) continue;
    const d = distance(entity.pos, impact);
    if (!best || d < best.distance) best = { target: entity, distance: d };
  }
  return best;
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
  return [
    ...insideRadius(units, impact, radius, (unit) => hostileUnit(unit, attackerOwner, teamOf)),
    ...insideRadius(buildings, impact, radius, (building) => hostileBuilding(building, attackerOwner)),
  ];
}

/**
 * Nearest enemy to a targetless impact. A unit wins over any building; a
 * same-team building still absorbs the hit when no enemy unit is available.
 */
export function selectNearestTarget<T extends CombatEntity>(
  impact: CombatPoint,
  units: Iterable<T>,
  buildings: Iterable<T>,
  attackerOwner: number,
  teamOf: (owner: number) => number | undefined,
  maxDistance = 3,
): T | null {
  const best =
    nearest(units, impact, (unit) => hostileUnit(unit, attackerOwner, teamOf), null) ??
    nearest(buildings, impact, (building) => hostileBuilding(building, attackerOwner), null);
  return best && best.distance < maxDistance ? best.target : null;
}

/** Linear falloff of an area explosion (1 at the centre, 0 at the edge). */
export function areaDamage(damage: number, distanceFromImpact: number, radius: number): number {
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
