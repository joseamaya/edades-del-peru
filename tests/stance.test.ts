import { describe, it, expect } from 'vitest';
import {
  LEASH_MIN_RADIUS,
  anchorFor,
  distXZ,
  enemyWithinLeash,
  leashRadius,
} from '../src/game/stance';

describe('leashRadius', () => {
  it('uses weapon reach for ranged units', () => {
    expect(leashRadius(9, 12)).toBe(10);
    expect(leashRadius(5, 10)).toBe(6);
  });

  it('gives melee units a sight-based leash, not the melee reach', () => {
    expect(leashRadius(0, 8)).toBe(9);
  });

  it('never goes below the minimum leash', () => {
    expect(leashRadius(0, 3)).toBe(LEASH_MIN_RADIUS);
    expect(leashRadius(2, 2)).toBe(LEASH_MIN_RADIUS);
  });
});

describe('anchorFor', () => {
  it('anchors the post where the unit stands when switching to defensivo', () => {
    expect(anchorFor('defensivo', 4, 7)).toEqual({ x: 4, z: 7 });
  });

  it('releases the post for agresivo and pasivo', () => {
    expect(anchorFor('agresivo', 4, 7)).toBeNull();
    expect(anchorFor('pasivo', 4, 7)).toBeNull();
  });
});

describe('enemyWithinLeash', () => {
  const origin = { x: 0, z: 0 };
  const radius = 6;

  it('keeps enemies inside the leash circle', () => {
    expect(enemyWithinLeash(origin, { x: 6, z: 0 }, radius)).toBe(true);
    expect(enemyWithinLeash(origin, { x: 3, z: 4 }, radius)).toBe(true);
  });

  it('drops enemies that flee past the radius', () => {
    expect(enemyWithinLeash(origin, { x: 6.5, z: 0 }, radius)).toBe(false);
    expect(enemyWithinLeash(origin, { x: 10, z: 10 }, radius)).toBe(false);
  });

  it('is independent of where the unit itself drifted to', () => {
    // the unit chased to (10, 0); the enemy at (6, 0) is still inside the post leash
    expect(enemyWithinLeash(origin, { x: 6, z: 0 }, radius)).toBe(true);
    expect(enemyWithinLeash(origin, { x: 12, z: 0 }, radius)).toBe(false);
  });
});

describe('distXZ', () => {
  it('measures planar distance', () => {
    expect(distXZ(0, 0, 3, 4)).toBe(5);
    expect(distXZ(1, 1, 1, 1)).toBe(0);
  });
});
