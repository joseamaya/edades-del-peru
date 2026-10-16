import { describe, it, expect } from 'vitest';
import { planSettlement, planSettlementSite, type SettlementQuery } from '../src/model/defs/settlementPlan';
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

  it('scans outward for valid land when the nominal ring is too steep', () => {
    const dist = (x: number, z: number) => Math.hypot(x - anchor.x, z - anchor.z);
    const steep: SettlementQuery = { ...world, getSlope: (x, z) => (dist(x, z) < 7 ? 0.8 : 0.1) };
    const spots = planSettlement({ shape: 'grid', seed: 5, anchor, count: 3 }, steep);
    expect(spots).toHaveLength(3);
    for (const s of spots) expect(steep.getSlope(s.x, s.z)).toBeLessThanOrEqual(0.35);
  });

  it('keeps its nominal ring on an all-water map (degenerate)', () => {
    const flooded: SettlementQuery = { ...world, isWater: () => true, isBuildable: () => false };
    expect(planSettlement({ shape: 'riverside', seed: 5, anchor, count: 3 }, flooded)).toHaveLength(3);
  });
});

describe('settlement site planner', () => {
  const req = { shape: 'riverside' as SettlementShape, seed: 5, anchor, count: 3 };

  it('agrees with `planSettlement` on the dwellings', () => {
    const site = planSettlementSite(req, world);
    expect(site.dwellings).toEqual(planSettlement(req, world));
  });

  it('is deterministic: same request yields the same plan', () => {
    expect(planSettlementSite(req, world)).toEqual(planSettlementSite(req, world));
  });

  it('places dwellings, fields and roads on buildable, dry ground', () => {
    const plan = planSettlementSite(req, world);
    expect(plan.center).toEqual(anchor);
    expect(plan.dwellings).toHaveLength(3);
    expect(plan.fields.length).toBeGreaterThan(0);
    for (const f of plan.fields) {
      expect(world.isWater(f.x, f.z)).toBe(false);
      expect(world.isBuildable(f.x, f.z)).toBe(true);
      expect(f.size).toBeGreaterThanOrEqual(3);
      expect(f.size).toBeLessThanOrEqual(5);
    }
    for (const r of plan.roads) {
      expect(world.isWater(r.from.x, r.from.z)).toBe(false);
      expect(world.isBuildable(r.to.x, r.to.z)).toBe(true);
    }
  });

  it('connects the center to every dwelling with a road', () => {
    const plan = planSettlementSite(req, world);
    for (const d of plan.dwellings) {
      expect(
        plan.roads.some((r) => r.to.x === d.x && r.to.z === d.z && r.from.x === anchor.x && r.from.z === anchor.z),
      ).toBe(true);
    }
  });

  it('lays fields on the fertile side of the map', () => {
    // `world` is more humid east of x=55; the fields must follow the moisture
    const plan = planSettlementSite({ ...req, shape: 'dispersed' }, world);
    const cx = plan.fields.reduce((s, f) => s + f.x, 0) / plan.fields.length;
    expect(cx).toBeGreaterThan(anchor.x);
  });

  it('works with a query that has no terrace/canal probes', () => {
    const plain: SettlementQuery = {
      isWater: () => false,
      isBuildable: () => true,
      getSlope: () => 0.1,
      getHeight: () => 5,
      getMoisture: () => 0.9,
    };
    const plan = planSettlementSite({ ...req, shape: 'grid' }, plain);
    expect(plan.dwellings).toHaveLength(3);
    expect(plan.fields.length).toBeGreaterThan(0);
  });

  it('keeps its nominal ring and skips fields on an all-water map', () => {
    const flooded: SettlementQuery = { ...world, isWater: () => true, isBuildable: () => false };
    const plan = planSettlementSite(req, flooded);
    expect(plan.dwellings).toHaveLength(3);
    expect(plan.fields).toHaveLength(0);
    expect(plan.roads).toHaveLength(0);
  });
});
