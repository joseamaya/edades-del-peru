import { describe, expect, it } from 'vitest';
import {
  areaDamage,
  resolveAttackDamage,
  selectAreaTargets,
  selectNearestTarget,
  type CombatEntity,
} from '../src/game/systems/CombatSystem';

const entity = (id: number, owner: number, x: number, z: number, y = 0, dead = false): CombatEntity => ({
  id,
  owner,
  dead,
  pos: { x, y, z },
});

const teams = (owner: number): number | undefined => (owner === 0 || owner === 1 ? owner : undefined);

describe('selectAreaTargets', () => {
  it('returns enemies inside the radius and skips allies, teammates and dead entities', () => {
    const units = [entity(1, 1, 2, 0), entity(2, 0, 1, 0), entity(3, 1, 10, 0), entity(4, 1, 1, 0, 0, true)];
    const buildings = [entity(5, 1, 0, 2)];
    const targets = selectAreaTargets({ x: 0, y: 0, z: 0 }, 5, units, buildings, 0, teams);
    expect(targets.map((t) => t.target.id)).toEqual([1, 5]);
  });

  it('still damages a same-team building, matching the legacy rule', () => {
    const team = (owner: number): number => (owner === 0 || owner === 1 ? 0 : owner);
    const targets = selectAreaTargets({ x: 0, y: 0, z: 0 }, 5, [], [entity(9, 1, 1, 1)], 0, team);
    expect(targets.map((t) => t.target.id)).toEqual([9]);
  });

  it('reports the 3D distance used by the falloff', () => {
    const targets = selectAreaTargets({ x: 0, y: 0, z: 0 }, 10, [entity(1, 1, 3, 4)], [], 0, teams);
    expect(targets[0].distance).toBeCloseTo(5);
  });
});

describe('selectNearestTarget', () => {
  it('prefers the nearest unit over any building', () => {
    const units = [entity(1, 1, 2, 0)];
    const buildings = [entity(2, 1, 0.5, 0)];
    expect(selectNearestTarget({ x: 0, y: 0, z: 0 }, units, buildings, 0, teams)?.id).toBe(1);
  });

  it('falls back to a same-team building when no enemy unit exists', () => {
    const team = (owner: number): number => (owner === 0 || owner === 1 ? 0 : owner);
    expect(selectNearestTarget({ x: 0, y: 0, z: 0 }, [], [entity(2, 1, 2, 0)], 0, team)?.id).toBe(2);
  });

  it('falls back to a building and rejects targets outside the strict radius', () => {
    expect(selectNearestTarget({ x: 0, y: 0, z: 0 }, [], [entity(2, 1, 2, 0)], 0, teams)?.id).toBe(2);
    expect(selectNearestTarget({ x: 0, y: 0, z: 0 }, [], [entity(2, 1, 3, 0)], 0, teams)).toBeNull();
  });
});

describe('areaFalloff and resolveAttackDamage', () => {
  it('scales damage linearly from the centre to the edge', () => {
    expect(areaDamage(100, 0, 10)).toBe(100);
    expect(areaDamage(100, 5, 10)).toBe(50);
  });

  it('applies armor, class bonus and elevation but never drops below 1', () => {
    const base = {
      damage: 20,
      damageType: 'heavy' as const,
      armor: { light: 2, heavy: 4 },
      armorMultiplier: 1.1,
      classBonus: 0.5,
      elevation: 1.2,
    };
    expect(resolveAttackDamage(base)).toBeGreaterThan(20);
    expect(
      resolveAttackDamage({
        ...base,
        damage: 1,
        armor: { light: 0, heavy: 100 },
        armorMultiplier: 1,
        classBonus: 0,
        elevation: 0.75,
      }),
    ).toBe(1);
  });
});
