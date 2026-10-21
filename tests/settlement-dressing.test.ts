import { describe, expect, it } from 'vitest';
import { planSettlementDressing, type DressingQuery } from '../src/model/defs/settlementDressing';
import type { SettlementPlan } from '../src/model/defs/settlementPlan';

const plan: SettlementPlan = {
  center: { x: 50, z: 50 },
  dwellings: [
    { x: 56, z: 50, yaw: 0 },
    { x: 47, z: 53, yaw: 1 },
    { x: 53, z: 57, yaw: 2 },
  ],
  fields: [],
  roads: [],
};

const flat: DressingQuery = {
  isWater: () => false,
  isBuildable: () => true,
  getSlope: () => 0.1,
  getHeight: () => 0,
};

const anchors = [plan.center, ...plan.dwellings];

describe('Caral settlement dressing', () => {
  it('is deterministic for the same plan and seed', () => {
    expect(planSettlementDressing(plan, 7, flat)).toEqual(planSettlementDressing(plan, 7, flat));
  });

  it('places the documented household set, clear of the buildings', () => {
    const out = planSettlementDressing(plan, 7, flat);
    expect(out.length).toBeGreaterThan(8);
    expect(out.some((p) => p.kind === 'hearth')).toBe(true);
    expect(out.some((p) => p.kind === 'drying_rack')).toBe(true);
    for (const p of out) {
      for (const a of anchors) expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThanOrEqual(1.55);
      for (const q of out) {
        if (q === p) continue;
        expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThanOrEqual(0.8);
      }
      expect(Math.hypot(plan.center.x - p.x, plan.center.z - p.z)).toBeLessThan(12);
    }
  });

  it('avoids water, unbuildable and steep ground', () => {
    const bad: DressingQuery = {
      isWater: (x) => x > 54,
      isBuildable: (_x, z) => z >= 52,
      getSlope: (_x, z) => (z > 56 ? 0.9 : 0.1),
      getHeight: () => 0,
    };
    const out = planSettlementDressing(plan, 11, bad);
    for (const p of out) {
      expect(p.x).toBeLessThanOrEqual(54);
      expect(p.z).toBeGreaterThanOrEqual(52);
      expect(p.z).toBeLessThanOrEqual(56);
    }
  });

  it('produces a different layout for a different seed', () => {
    expect(planSettlementDressing(plan, 7, flat)).not.toEqual(planSettlementDressing(plan, 8, flat));
  });
});
