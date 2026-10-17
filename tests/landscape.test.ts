import { describe, it, expect } from 'vitest';
import { LANDSCAPE, landscapeWeight, type LandscapeFeature } from '../src/model/defs/landscape';
import { planCulturalLandscape, RENDERED_FEATURES, type LandscapeQuery } from '../src/model/defs/landscapePlan';
import { MAP_PROFILES, type GeographicRegion } from '../src/model/defs/profiles';

const REGIONS = Object.keys(LANDSCAPE) as GeographicRegion[];

/** Flat, dry, buildable world with terraces at x < 20. */
const flat: LandscapeQuery = {
  size: 100,
  isWater: () => false,
  isBuildable: () => true,
  getSlope: () => 0.1,
  getTerrace: (x) => (x < 20 ? 0.5 : 0),
};

describe('cultural landscape data', () => {
  it('defines a profile with provenance for every region', () => {
    for (const region of REGIONS) {
      expect(LANDSCAPE[region].provenance, region).toBeTruthy();
      expect(['riverside', 'hilltop', 'dispersed', 'grid']).toContain(LANDSCAPE[region].settlementShape);
      for (const rule of LANDSCAPE[region].features) {
        expect(rule.weight).toBeGreaterThan(0);
        expect(rule.weight).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is attached to every map profile', () => {
    for (const region of REGIONS) {
      expect(MAP_PROFILES[region].culturalLandscape).toBe(LANDSCAPE[region]);
    }
  });

  it('gives the coast irrigation features', () => {
    expect(landscapeWeight(LANDSCAPE.north_coast, 'canal')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.central_coast, 'canal')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.central_coast, 'plaza')).toBeGreaterThan(0);
  });

  it('fills every region with a plausible feature set', () => {
    expect(landscapeWeight(LANDSCAPE.high_andes, 'terrace')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.andean_valley, 'terrace')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.altiplano, 'corral')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.amazon, 'path')).toBeGreaterThan(0);
    for (const region of REGIONS) expect(LANDSCAPE[region].features.length).toBeGreaterThan(0);
  });
});

describe('cultural landscape plan', () => {
  it('is deterministic: same seed + profile yields the same plan', () => {
    const a = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    const b = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    expect(a).toEqual(b);
  });

  it('varies with the seed', () => {
    const a = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    const b = planCulturalLandscape(LANDSCAPE.north_coast, 8, flat);
    expect(a).not.toEqual(b);
  });

  it('plans each region a distinct feature set', () => {
    const kinds = (region: GeographicRegion) =>
      new Set(planCulturalLandscape(LANDSCAPE[region], 7, flat).map((p) => p.feature));
    expect(kinds('north_coast').has('road')).toBe(true);
    expect(kinds('north_coast').has('plaza')).toBe(true);
    expect(kinds('south_coast').has('road')).toBe(true);
    expect(kinds('andean_valley').has('terrace')).toBe(true);
    expect(kinds('high_andes').has('terrace')).toBe(true);
    expect(kinds('high_andes').has('wall')).toBe(true);
    expect(kinds('altiplano').has('corral')).toBe(true);
    expect(kinds('amazon').has('path')).toBe(true);
  });

  it('never draws a feature the region does not list', () => {
    for (const region of REGIONS) {
      const listed = new Set(LANDSCAPE[region].features.map((f) => f.feature));
      for (const p of planCulturalLandscape(LANDSCAPE[region], 7, flat)) {
        expect(listed.has(p.feature), `${region} drew unlisted ${p.feature}`).toBe(true);
      }
    }
  });

  it('only emits implemented features and places everything on buildable land', () => {
    const implemented = new Set<LandscapeFeature>(RENDERED_FEATURES);
    for (const region of REGIONS) {
      const plan = planCulturalLandscape(LANDSCAPE[region], 7, flat);
      expect(plan.length, region).toBeGreaterThan(0);
      for (const p of plan) {
        expect(implemented.has(p.feature), p.feature).toBe(true);
        expect(flat.isBuildable(p.x, p.z)).toBe(true);
        expect(flat.isWater(p.x, p.z)).toBe(false);
      }
    }
  });

  it('emits roads and paths as ordered, gap-free chains', () => {
    const plan = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    const chained = plan.filter((p) => p.feature === 'road' || p.feature === 'path');
    expect(chained.length).toBeGreaterThan(0);
    const byChain = new Map<string, typeof chained>();
    for (const p of chained) {
      expect(p.chain, 'chained sample needs a chain id').toBeTypeOf('number');
      expect(p.order, 'chained sample needs an order').toBeTypeOf('number');
      const key = `${p.feature}:${p.chain}`;
      (byChain.get(key) ?? byChain.set(key, []).get(key)!).push(p);
    }
    for (const [key, samples] of byChain) {
      const orders = samples.map((s) => s.order!).sort((a, b) => a - b);
      // contiguous from 0: no dropped sample in the middle (which would leave a gap)
      expect(orders, key).toEqual(orders.map((_, i) => i));
    }
  });
});
