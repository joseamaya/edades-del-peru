import { describe, it, expect } from 'vitest';
import { RNG, mulberry32, hashCode } from '../src/util/rng';

describe('RNG', () => {
  it('is deterministic with the same seed', () => {
    const a = new RNG(12345);
    const b = new RNG(12345);
    const seqA = Array.from({ length: 10 }, () => a.float());
    const seqB = Array.from({ length: 10 }, () => b.float());
    expect(seqA).toEqual(seqB);
  });

  it('float stays in [0,1)', () => {
    const r = new RNG(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.float();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('range respects the bounds', () => {
    const r = new RNG(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.range(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });

  it('mulberry32 matches RNG for the same seed', () => {
    const f = mulberry32(42);
    const r = new RNG(42);
    expect(f()).toBe(r.float());
  });

  it('hashCode is stable and non-negative', () => {
    expect(hashCode('inca')).toBe(hashCode('inca'));
    expect(hashCode('inca')).toBeGreaterThanOrEqual(0);
  });
});
