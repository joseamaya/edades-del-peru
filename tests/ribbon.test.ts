import { describe, expect, it } from 'vitest';
import { buildRibbon } from '../src/rendering/ribbon';

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
});
