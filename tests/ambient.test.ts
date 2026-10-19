import { describe, it, expect } from 'vitest';
import { planProps, PROP_IDS, type PlacementSample } from '../src/model/defs/props';
import { planWildlife, SPECIES_IDS } from '../src/model/defs/wildlife';
import type { GeographicRegion } from '../src/model/defs/profiles';

const SIZE = 192;

function makeSample(over: Partial<PlacementSample> = {}): (x: number, z: number) => PlacementSample {
  const base: PlacementSample = { height: 0, water: false, beach: false, slope: 0.2, moisture: 0.5, ...over };
  return () => base;
}

describe('ambient props planning', () => {
  it('is deterministic per seed and varies with the seed', () => {
    const a = planProps('south_coast', 1234, SIZE, 40, makeSample());
    const b = planProps('south_coast', 1234, SIZE, 40, makeSample());
    const c = planProps('south_coast', 9999, SIZE, 40, makeSample());
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('places only known props within the map bounds', () => {
    const out = planProps('high_andes', 7, SIZE, 50, makeSample({ height: 8, slope: 0.5, moisture: 0.3 }));
    expect(out.length).toBeGreaterThan(0);
    for (const p of out) {
      expect(PROP_IDS).toContain(p.id);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(SIZE);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeLessThanOrEqual(SIZE);
    }
  });

  it('places nothing on all-water ground', () => {
    expect(planProps('north_coast', 5, SIZE, 40, makeSample({ water: true }))).toEqual([]);
  });
});

describe('ambient wildlife planning', () => {
  it('is deterministic per seed', () => {
    const sample = makeSample({ height: 8, beach: false });
    expect(planWildlife('high_andes', 42, SIZE, 12, sample)).toEqual(planWildlife('high_andes', 42, SIZE, 12, sample));
  });

  it('needs a matching habitat (nothing on low, dry, non-beach ground)', () => {
    const out = planWildlife('high_andes', 42, SIZE, 12, makeSample({ height: 0, beach: false }));
    expect(out).toEqual([]);
  });

  it('places highland fauna with known species', () => {
    const out = planWildlife('high_andes', 42, SIZE, 12, makeSample({ height: 8, beach: false }));
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) expect(SPECIES_IDS).toContain(s.id);
  });

  it('only pelicans live on the shore', () => {
    for (const region of ['north_coast', 'south_coast'] as GeographicRegion[]) {
      const out = planWildlife(region, 11, SIZE, 20, makeSample({ height: 0, beach: true }));
      expect(out.length).toBeGreaterThan(0);
      for (const s of out) expect(s.id, `${region} on the beach`).toBe('pelican');
    }
  });
});
