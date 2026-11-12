import { describe, expect, it } from 'vitest';
import {
  planSettlementDressing,
  propClearance,
  propSeparation,
  type DressingQuery,
} from '../src/model/defs/settlementDressing';
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

const anchors = [{ ...plan.center, center: true }, ...plan.dwellings.map((d) => ({ ...d, center: false }))];

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
      // The rendered walls overhang the footprint; the clearance grows with the prop's radius.
      for (const a of anchors) {
        const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
        expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThanOrEqual(clearance);
      }
      for (const q of out) {
        if (q === p) continue;
        expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThanOrEqual(
          propSeparation(p.kind, p.scale, q.kind, q.scale),
        );
      }
      // The ring around a dwelling at the edge of the plan can reach a little past 12 from the centre.
      expect(Math.hypot(plan.center.x - p.x, plan.center.z - p.z)).toBeLessThan(14);
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

  it('never overlaps a wall or another prop across 1,000 seeds', () => {
    let violation = '';
    for (const profile of ['caral', 'chavin'] as const) {
      const expected = profile === 'caral' ? 14 : 10;
      for (let seed = 1; seed <= 1000; seed++) {
        const out = planSettlementDressing(plan, seed, flat, profile);
        if (out.length !== expected) {
          violation = `${profile} seed ${seed}: placed ${out.length}/${expected}`;
          break;
        }
        for (const p of out) {
          for (const a of anchors) {
            const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
            if (Math.hypot(a.x - p.x, a.z - p.z) < clearance - 1e-6) {
              violation = `${profile} seed ${seed}: ${p.kind} at ${Math.hypot(a.x - p.x, a.z - p.z).toFixed(2)} < ${clearance.toFixed(2)}`;
              break;
            }
          }
          if (violation) break;
          for (const q of out) {
            if (q === p) continue;
            const separation = propSeparation(p.kind, p.scale, q.kind, q.scale);
            if (Math.hypot(q.x - p.x, q.z - p.z) < separation - 1e-6) {
              violation = `${profile} seed ${seed}: ${p.kind}/${q.kind} at ${Math.hypot(q.x - p.x, q.z - p.z).toFixed(2)} < ${separation.toFixed(2)}`;
              break;
            }
          }
          if (violation) break;
        }
        if (violation) break;
      }
      if (violation) break;
    }
    expect(violation).toBe('');
  });
});

describe('Chavín settlement dressing', () => {
  it('is deterministic and uses the ritual/megalithic set', () => {
    const out = planSettlementDressing(plan, 7, flat, 'chavin');
    expect(out).toEqual(planSettlementDressing(plan, 7, flat, 'chavin'));
    expect(out.some((p) => p.kind === 'stela')).toBe(true);
    expect(out.some((p) => p.kind === 'offering')).toBe(true);
    expect(out.some((p) => p.kind === 'stone_head')).toBe(true);
    expect(out.some((p) => p.kind === 'megalith')).toBe(true);
    expect(out.some((p) => p.kind === 'hearth')).toBe(false);
  });

  it('keeps props clear of the buildings and each other', () => {
    const out = planSettlementDressing(plan, 7, flat, 'chavin');
    for (const p of out) {
      // The rendered walls overhang the footprint; the clearance grows with the prop's radius.
      for (const a of anchors) {
        const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
        expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThanOrEqual(clearance);
      }
      for (const q of out) {
        if (q === p) continue;
        expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThanOrEqual(
          propSeparation(p.kind, p.scale, q.kind, q.scale),
        );
      }
    }
  });
});
