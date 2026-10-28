import { describe, expect, it } from 'vitest';
import {
  planCaralValley,
  planCaralValleyProps,
  type CaralValleyQuery,
  type CaralValleyPlan,
} from '../src/model/defs/caralValley';

const BASE = { x: 60, z: 160 };

function valleyQuery(overrides: Partial<CaralValleyQuery> = {}): CaralValleyQuery {
  return {
    isWater: () => false,
    isBuildable: () => true,
    getSlope: () => 0,
    getHeight: () => 4,
    getMoisture: () => 0.8,
    isReserved: () => false,
    ...overrides,
  };
}

describe('Caral valley plan', () => {
  it('is deterministic and keeps fields on open, flat ground', () => {
    const siteTarget = { x: 74, z: 151 };
    const a = planCaralValley(7, BASE, valleyQuery(), siteTarget);
    const b = planCaralValley(7, BASE, valleyQuery(), siteTarget);
    expect(b).toEqual(a);
    expect(a.fields.length).toBeGreaterThanOrEqual(3);
    for (const f of a.fields) {
      expect(f.size).toBeGreaterThan(3);
      expect(Math.abs(f.yaw)).toBeLessThan(0.5);
    }
    const sitePath = a.roads[a.roads.length - 1];
    expect(sitePath.to).toEqual(siteTarget);
  });

  it('drops plots over water, reserved ground or steep slopes', () => {
    const plan = planCaralValley(
      7,
      BASE,
      valleyQuery({ isReserved: () => true, isBuildable: () => false, getSlope: () => 0.6 }),
    );
    expect(plan.fields).toHaveLength(0);
    expect(plan.roads).toHaveLength(0);
  });

  it('rejects plots and fields that are underwater', () => {
    const plan = planCaralValley(7, BASE, valleyQuery({ isWater: () => true }), { x: 74, z: 151 });
    expect(plan.fields).toHaveLength(0);
    expect(plan.roads).toHaveLength(0);
  });

  it('places deterministic riverside reeds and shrubs away from the plots', () => {
    const river = valleyQuery({ isWater: (x) => x < 12 });
    const plan = planCaralValley(7, BASE, river);
    const props = planCaralValleyProps(7, BASE, plan.fields, river);
    const again = planCaralValleyProps(7, BASE, plan.fields, river);
    expect(props.length).toBeGreaterThan(8);
    expect(again).toEqual(props);
    for (const p of props) {
      expect(['totora', 'shrub']).toContain(p.id);
      expect(plan.fields.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < f.size / 2)).toBe(false);
    }
  });

  it('does not invent fields on a fully reserved map', () => {
    const plan: CaralValleyPlan = planCaralValley(11, BASE, valleyQuery({ isReserved: () => true }));
    expect(plan.fields).toHaveLength(0);
  });
});
