import { describe, it, expect } from 'vitest';
import { SKIRT_RINGS, skirtRing, skirtSea, skirtWave } from '../src/rendering/terrainSkirt';

describe('terrain apron', () => {
  it('rises to a land ridge and falls back to the horizon', () => {
    expect(skirtRing(0, 0, 0).lift).toBe(0);
    const lifts = SKIRT_RINGS.map((t) => skirtRing(t, 0, 0).lift);
    expect(Math.max(...lifts)).toBeGreaterThan(1);
    expect(lifts[lifts.length - 1]).toBeCloseTo(0, 5);
  });

  it('keeps the sea edge below the water instead of building a ridge', () => {
    for (const t of [0, ...SKIRT_RINGS, 1]) expect(skirtRing(t, 0, 1).lift).toBeLessThanOrEqual(0);
  });

  it('fades the edge colour towards the horizon haze', () => {
    const blends = [0, ...SKIRT_RINGS].map((t) => skirtRing(t, 0, 0).blend);
    expect(blends[1]).toBeGreaterThan(0.4);
    for (let i = 1; i < blends.length; i++) expect(blends[i]).toBeGreaterThanOrEqual(blends[i - 1]);
    expect(blends[blends.length - 1]).toBe(1);
  });

  it('treats the west edge as sea on coastal maps and as land inland', () => {
    expect(skirtSea(0)).toBe(1);
    expect(skirtSea(40)).toBe(0);
    expect(skirtSea(28)).toBeGreaterThan(0);
    expect(skirtSea(28)).toBeLessThan(1);
    expect(skirtSea(0, false)).toBe(0);
  });

  it('keeps the relief wave deterministic and bounded', () => {
    expect(skirtWave(12, 34)).toBe(skirtWave(12, 34));
    for (const [x, z] of [
      [0, 0],
      [128, 256],
      [-512, 1200],
    ]) {
      expect(Math.abs(skirtWave(x!, z!))).toBeLessThanOrEqual(1);
    }
  });
});
