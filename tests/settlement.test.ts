import { describe, it, expect } from 'vitest';
import { planSettlement, type SettlementQuery } from '../src/model/defs/settlementPlan';
import type { SettlementShape } from '../src/model/defs/landscape';

const anchor = { x: 50, z: 50 };

/** Flat buildable plain with a river to the east and a hill to the west. */
const world: SettlementQuery = {
  isWater: (x) => x > 62,
  isBuildable: (x) => x <= 62,
  getSlope: () => 0.1,
  getHeight: (x) => (x < 45 ? 20 : 5),
  getMoisture: (x) => (x > 55 ? 0.9 : 0.3),
};

const centroidX = (pts: { x: number }[]): number => pts.reduce((s, p) => s + p.x, 0) / pts.length;

describe('settlement planner', () => {
  it('is deterministic: same request yields the same plan', () => {
    const a = planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, world);
    const b = planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, world);
    expect(a).toEqual(b);
  });

  it('varies with the seed', () => {
    const a = planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, world);
    const b = planSettlement({ shape: 'riverside', seed: 9, anchor, count: 3 }, world);
    expect(a).not.toEqual(b);
  });

  it('yields exactly the requested dwellings on buildable, dry land', () => {
    for (const shape of ['riverside', 'hilltop', 'dispersed', 'grid'] as SettlementShape[]) {
      const spots = planSettlement({ shape, seed: 5, anchor, count: 3 }, world);
      expect(spots, shape).toHaveLength(3);
      for (const s of spots) {
        expect(world.isWater(s.x, s.z), shape).toBe(false);
        expect(world.isBuildable(s.x, s.z), shape).toBe(true);
      }
    }
  });

  it('keeps the dwellings apart so the base cannot seal itself off', () => {
    const spots = planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, world);
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const d = Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z);
        expect(d).toBeGreaterThanOrEqual(3.5);
      }
    }
  });

  it('leans a riverside town toward the water and a hilltop one toward the height', () => {
    const river = planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, world);
    const hill = planSettlement({ shape: 'hilltop', seed: 5, anchor, count: 3 }, world);
    expect(centroidX(river)).toBeGreaterThan(anchor.x);
    expect(centroidX(hill)).toBeLessThan(anchor.x);
  });

  it('falls back to a fixed ring when nothing near the anchor is walkable', () => {
    const flooded: SettlementQuery = { ...world, isWater: () => true, isBuildable: () => false };
    expect(planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, flooded)).toHaveLength(3);
  });
});
