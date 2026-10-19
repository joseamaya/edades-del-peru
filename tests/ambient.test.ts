import { describe, it, expect } from 'vitest';
import { planProps, propCountFor, PROP_IDS } from '../src/model/defs/props';
import { planWildlife, faunaCountFor, SPECIES_IDS } from '../src/model/defs/wildlife';
import type { AmbientQuery } from '../src/model/defs/ambientQuery';
import type { GeographicRegion } from '../src/model/defs/profiles';

const SIZE = 192;

interface Sample {
  height: number;
  water: boolean;
  beach: boolean;
  slope: number;
  moisture: number;
}

function makeQuery(over: Partial<Sample> = {}): AmbientQuery {
  const s: Sample = { height: 0, water: false, beach: false, slope: 0.2, moisture: 0.5, ...over };
  return {
    isWater: () => s.water,
    isBuildable: () => !s.water,
    getSlope: () => s.slope,
    getHeight: () => s.height,
    isBeach: () => s.beach,
    getMoisture: () => s.moisture,
  };
}

const REGIONS: GeographicRegion[] = [
  'north_coast',
  'central_coast',
  'south_coast',
  'andean_valley',
  'high_andes',
  'altiplano',
  'amazon',
];

describe('ambient props planning', () => {
  it('is deterministic per seed and varies with the seed', () => {
    const a = planProps('south_coast', 1234, SIZE, 40, makeQuery());
    const b = planProps('south_coast', 1234, SIZE, 40, makeQuery());
    const c = planProps('south_coast', 9999, SIZE, 40, makeQuery());
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('places only known props within the map bounds', () => {
    const out = planProps('high_andes', 7, SIZE, 50, makeQuery({ height: 8, slope: 0.5, moisture: 0.3 }));
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
    expect(planProps('north_coast', 5, SIZE, 40, makeQuery({ water: true }))).toEqual([]);
  });

  it('scales the count with the map size', () => {
    expect(propCountFor(256)).toBeGreaterThan(propCountFor(128));
  });
});

describe('ambient wildlife planning', () => {
  it('is deterministic per seed', () => {
    const q = makeQuery({ height: 8 });
    expect(planWildlife('high_andes', 42, SIZE, 12, q)).toEqual(planWildlife('high_andes', 42, SIZE, 12, q));
  });

  it('needs a matching habitat (nothing on low, dry, non-beach ground)', () => {
    expect(planWildlife('high_andes', 42, SIZE, 12, makeQuery({ height: 0 }))).toEqual([]);
  });

  it('places highland fauna with known species', () => {
    const out = planWildlife('high_andes', 42, SIZE, 12, makeQuery({ height: 8 }));
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) expect(SPECIES_IDS).toContain(s.id);
  });

  it('only pelicans live on the shore', () => {
    for (const region of ['north_coast', 'south_coast'] as GeographicRegion[]) {
      const out = planWildlife(region, 11, SIZE, 20, makeQuery({ height: 0, beach: true }));
      expect(out.length).toBeGreaterThan(0);
      for (const s of out) expect(s.id, `${region} on the beach`).toBe('pelican');
    }
  });

  it('treats land near water as shore (isBeach is a thin strip)', () => {
    // checkerboard water: every land column is within 3 units of water
    const nearWater: AmbientQuery = {
      isWater: (x) => Math.floor(x) % 2 === 0,
      isBuildable: () => true,
      getSlope: () => 0.2,
      getHeight: () => 8,
      isBeach: () => false,
      getMoisture: () => 0.5,
    };
    const out = planWildlife('north_coast', 21, SIZE, 12, nearWater);
    expect(out.length).toBeGreaterThan(0);
    // land is always near water here, so pelicans dominate (llamas can still win the weighted pick)
    expect(out.filter((s) => s.id === 'pelican').length).toBeGreaterThanOrEqual(out.length / 2);
  });

  it('defines a fauna count for every region', () => {
    for (const r of REGIONS) expect(faunaCountFor(r)).toBeGreaterThan(0);
  });
});
