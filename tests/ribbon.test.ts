import { describe, expect, it } from 'vitest';
import { buildRibbon } from '../src/rendering/ribbon';
import { planCulturalLandscape } from '../src/model/defs/landscapePlan';
import { LANDSCAPE } from '../src/model/defs/landscape';

describe('buildRibbon', () => {
  it('returns null for fewer than two points', () => {
    expect(buildRibbon([], 1, () => 0)).toBeNull();
    expect(buildRibbon([{ x: 0, z: 0 }], 1, () => 0)).toBeNull();
  });

  it('builds a continuous strip with two vertices per point and no gaps', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 0, z: 2 },
      { x: 0, z: 4 },
      { x: 0, z: 6 },
    ];
    const geo = buildRibbon(pts, 1, (x, z) => z + 1);
    const pos = geo!.getAttribute('position');
    expect(pos.count).toBe(pts.length * 2);
    // one quad (two triangles) per segment, sharing vertices → no gaps
    expect(geo!.getIndex()!.count).toBe((pts.length - 1) * 6);
  });

  it('drapes every vertex on the terrain', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 3, z: 3 },
      { x: 6, z: 3 },
    ];
    const height = (x: number, z: number) => x * 0.5 + z;
    const pos = buildRibbon(pts, 2, height)!.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeCloseTo(height(pos.getX(i), pos.getZ(i)), 5);
    }
  });

  it('offsets the strip by half the width on each side', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 0, z: 4 },
    ];
    const pos = buildRibbon(pts, 2, () => 0)!.getAttribute('position');
    // a straight line along +z: the two edges sit at x = ±1
    expect(Math.min(pos.getX(0), pos.getX(1))).toBeCloseTo(-1, 5);
    expect(Math.max(pos.getX(0), pos.getX(1))).toBeCloseTo(1, 5);
  });

  it('turns the planned road/path chains into gap-free ribbons', () => {
    const q = { size: 100, isWater: () => false, isBuildable: () => true, getSlope: () => 0.1, getTerrace: () => 0 };
    const plan = planCulturalLandscape(LANDSCAPE.north_coast, 7, q);
    const byChain = new Map<string, { x: number; z: number; order?: number }[]>();
    for (const p of plan) {
      if (p.chain === undefined) continue;
      const key = `${p.feature}:${p.chain}`;
      (byChain.get(key) ?? byChain.set(key, []).get(key)!).push(p);
    }
    expect(byChain.size).toBeGreaterThan(0);
    for (const samples of byChain.values()) {
      const pts = samples.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((p) => ({ x: p.x, z: p.z }));
      const geo = buildRibbon(pts, 1.5, () => 0)!;
      expect(geo.getAttribute('position').count).toBe(pts.length * 2);
      expect(geo.getIndex()!.count).toBe((pts.length - 1) * 6);
    }
  });
});
