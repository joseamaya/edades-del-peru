import { Era, UnitKind } from '../core/types';

/** Combat roles used to shape the AI army composition. */
export type UnitCategory = 'melee' | 'ranged' | 'cavalry' | 'siege';
export const CATEGORIES: UnitCategory[] = ['melee', 'ranged', 'cavalry', 'siege'];

/** Which category a trainable unit belongs to (scouts/support units have none). */
export const UNIT_CATEGORY: Partial<Record<UnitKind, UnitCategory>> = {
  [UnitKind.SOLDIER]: 'melee',
  [UnitKind.MECH]: 'melee',
  [UnitKind.MUSKETEER]: 'ranged',
  [UnitKind.RIFLEMAN]: 'ranged',
  [UnitKind.SNIPER]: 'ranged',
  [UnitKind.ANTI_AIR]: 'ranged',
  [UnitKind.HUSSAR]: 'cavalry',
  [UnitKind.CAVALRY]: 'cavalry',
  [UnitKind.TANK]: 'cavalry',
  [UnitKind.ARTILLERY]: 'siege',
  [UnitKind.MORTAR]: 'siege',
  [UnitKind.NUCLEAR]: 'siege',
};

/** Desired army mix per era (indexed by `Era`), before countering the enemy. */
export const ARMY_MIX: Record<UnitCategory, number>[] = [
  { melee: 1, ranged: 0, cavalry: 0, siege: 0 },
  { melee: 2, ranged: 1, cavalry: 0, siege: 0 },
  { melee: 2, ranged: 1, cavalry: 0.5, siege: 0 },
  { melee: 1, ranged: 2, cavalry: 1, siege: 0.5 },
  { melee: 1, ranged: 2, cavalry: 1, siege: 0.5 },
  { melee: 1, ranged: 2, cavalry: 1, siege: 1 },
];

/** The era's army mix, nudged to counter the enemy's composition. */
export function armyWeightsFor(
  era: Era,
  enemy: { melee: number; ranged: number; cavalry: number },
): Record<UnitCategory, number> {
  const w = { ...(ARMY_MIX[era] ?? ARMY_MIX[0]) };
  if (enemy.ranged > enemy.melee) w.cavalry += 0.5; // close the distance against shooters
  if (enemy.melee > enemy.ranged) w.ranged += 0.5; // shoot the melee
  if (enemy.cavalry > 0) w.melee += 0.5; // hold the line against cavalry
  return w;
}
