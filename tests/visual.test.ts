import { describe, it, expect } from 'vitest';
import { signature, compareSignatures } from '../scripts/visual_lib.mjs';

function solid(w: number, h: number, [r, g, b]: [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

describe('visual signature', () => {
  it('scores identical images as zero', () => {
    const a = signature(solid(8, 8, [10, 20, 30]));
    const { score, worst } = compareSignatures(a, a);
    expect(score).toBe(0);
    expect(worst).toBe(0);
  });

  it('detects a fully different image', () => {
    const a = signature(solid(8, 8, [10, 20, 30]));
    const b = signature(solid(8, 8, [200, 180, 40]));
    expect(compareSignatures(a, b).score).toBeGreaterThan(50);
  });

  it('catches a localized change via the worst cell (not just the global mean)', () => {
    const base = solid(8, 8, [100, 100, 100]);
    const changed = solid(8, 8, [100, 100, 100]);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 8 + x) * 4;
        changed.data[i] = 250;
        changed.data[i + 1] = 250;
        changed.data[i + 2] = 250;
      }
    }
    const { score, worst } = compareSignatures(signature(base), signature(changed));
    // a quarter of the frame changes: the global mean shifts little, the worst cell a lot
    expect(score).toBeGreaterThan(3);
    expect(worst).toBeGreaterThan(50);
  });
});
