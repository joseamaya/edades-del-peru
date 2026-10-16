import { describe, it, expect } from 'vitest';
import { LANDSCAPE, landscapeWeight, type LandscapeFeature } from '../src/model/defs/landscape';
import { planCulturalLandscape, type LandscapeQuery } from '../src/model/defs/landscapePlan';
import { MAP_PROFILES, type GeographicRegion } from '../src/model/defs/profiles';

const REGIONS = Object.keys(LANDSCAPE) as GeographicRegion[];

/** Flat, dry, buildable world with a canal strip around x = 50. */
const flat: LandscapeQuery = {
  size: 100,
  isWater: () => false,
  isBuildable: () => true,
  getSlope: () => 0.1,
  getCanal: (x) => (x > 48 && x < 52 ? 1 : 0),
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

  it('gives the coast slice canals and fields, and the jungle none yet', () => {
    expect(landscapeWeight(LANDSCAPE.north_coast, 'canal')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.central_coast, 'canal')).toBeGreaterThan(0);
    expect(landscapeWeight(LANDSCAPE.central_coast, 'plaza')).toBeGreaterThan(0);
    expect(LANDSCAPE.amazon.features).toHaveLength(0);
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

  it('plans the coast features and nothing for a region without features', () => {
    const coast = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    const kinds = new Set(coast.map((p) => p.feature));
    expect(kinds.has('plaza')).toBe(true);
    expect(kinds.has('canal')).toBe(true);
    expect(coast.length).toBeGreaterThan(0);
    expect(planCulturalLandscape(LANDSCAPE.amazon, 7, flat)).toHaveLength(0);
  });

  it('only emits implemented features and places everything on buildable land', () => {
    const implemented = new Set<LandscapeFeature>(['plaza', 'road', 'field', 'canal']);
    const plan = planCulturalLandscape(LANDSCAPE.central_coast, 7, flat);
    for (const p of plan) {
      expect(implemented.has(p.feature), p.feature).toBe(true);
      expect(flat.isBuildable(p.x, p.z)).toBe(true);
      expect(flat.isWater(p.x, p.z)).toBe(false);
    }
  });

  it('places canals on the carved canal mask', () => {
    const plan = planCulturalLandscape(LANDSCAPE.north_coast, 7, flat);
    const canals = plan.filter((p) => p.feature === 'canal');
    expect(canals.length).toBeGreaterThan(0);
    for (const c of canals) expect(flat.getCanal(c.x, c.z)).toBeGreaterThan(0);
  });
});
