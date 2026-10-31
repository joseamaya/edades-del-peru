import type { CombatStance } from '../core/types';

/** A defensive unit never strays further than this from its post, even with long-range weapons. */
export const LEASH_MIN_RADIUS = 6;

export type LeashOrigin = { x: number; z: number };

/** Chase radius for a stance: weapon reach, but never below the minimum leash. */
export function leashRadius(range: number, los: number): number {
  return Math.max(range > 0 ? range + 1 : los + 1, LEASH_MIN_RADIUS);
}

/** A stance switch re-anchors the post for 'defensivo' and releases it for the others. */
export function anchorFor(stance: CombatStance, x: number, z: number): LeashOrigin | null {
  return stance === 'defensivo' ? { x, z } : null;
}

export function distXZ(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** True when the enemy still sits inside the leash circle around the post. */
export function enemyWithinLeash(origin: LeashOrigin, enemy: { x: number; z: number }, radius: number): boolean {
  return distXZ(origin.x, origin.z, enemy.x, enemy.z) <= radius + 1e-6;
}
