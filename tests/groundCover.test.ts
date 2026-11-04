import { describe, expect, it } from 'vitest';
import {
  GROUND_COVER_INSTANCE_BUDGET,
  groundCoverCount,
  planGroundCover,
  type GroundCoverQuery,
  type GroundCoverWeights,
} from '../src/model/defs/groundCover';
import { MAP_PROFILES, type HistoricalMapProfile } from '../src/model/defs/profiles';

function fakeQuery(overrides: Partial<GroundCoverQuery> = {}): GroundCoverQuery {
  const weights: GroundCoverWeights = { grass: 0.5, dirt: 0.1, sand: 0.2, rock: 0.2 };
  return {
    size: 96,
    getHeight: () => 5,
    getSlope: () => 0.1,
    getMoisture: () => 0.6,
    isWater: () => false,
    isBeach: () => false,
    getSplatWeights: () => weights,
    isExcluded: () => false,
    ...overrides,
  };
}

describe('ground cover planner', () => {
  it('is deterministic for the same seed and profile', () => {
    const profile = MAP_PROFILES.andean_valley;
    const a = planGroundCover(profile, 777, 500, fakeQuery());
    const b = planGroundCover(profile, 777, 500, fakeQuery());
    expect(b).toEqual(a);
  });

  it('never places cover on water, excluded footprints, steep ground or painted dirt', () => {
    const placements = planGroundCover(
      MAP_PROFILES.central_coast,
      11,
      800,
      fakeQuery({
        isWater: (_x, z) => z < 12,
        isExcluded: (x) => x < 12,
        getSlope: (x) => (x > 80 ? 0.95 : 0.1),
        getSplatWeights: (_x, z) =>
          z > 82 ? { grass: 0, dirt: 1, sand: 0, rock: 0 } : { grass: 0.5, dirt: 0.1, sand: 0.2, rock: 0.2 },
      }),
    );
    expect(placements.length).toBeGreaterThan(0);
    for (const p of placements) {
      expect(p.x).toBeGreaterThanOrEqual(12);
      expect(p.z).toBeGreaterThanOrEqual(12);
      expect(p.x).toBeLessThanOrEqual(80);
      expect(p.z).toBeLessThanOrEqual(82);
    }
  });

  it('picks ferns in the humid Amazon and ichu in the high Andes', () => {
    const amazon = planGroundCover(MAP_PROFILES.amazon, 5, 1200, fakeQuery());
    const andes = planGroundCover(
      MAP_PROFILES.high_andes,
      5,
      1200,
      fakeQuery({
        getMoisture: () => 0.15,
        getSplatWeights: () => ({ grass: 0.2, dirt: 0.05, sand: 0.05, rock: 0.7 }),
      }),
    );
    expect(amazon.some((p) => p.species === 'fern')).toBe(true);
    expect(andes.some((p) => p.species === 'ichu')).toBe(true);
  });

  it('scales the target with vegetation density and respects the budget', () => {
    expect(groundCoverCount(192, 0, GROUND_COVER_INSTANCE_BUDGET)).toBeLessThan(
      groundCoverCount(192, 1, GROUND_COVER_INSTANCE_BUDGET),
    );
    expect(groundCoverCount(320, 1, GROUND_COVER_INSTANCE_BUDGET)).toBe(GROUND_COVER_INSTANCE_BUDGET);
  });

  it('keeps every region within the instance budget', () => {
    for (const profile of Object.values(MAP_PROFILES) as HistoricalMapProfile[]) {
      const placements = planGroundCover(
        profile,
        3,
        groundCoverCount(192, profile.vegetation.density, GROUND_COVER_INSTANCE_BUDGET),
        fakeQuery(),
      );
      expect(placements.length).toBeLessThanOrEqual(GROUND_COVER_INSTANCE_BUDGET);
    }
  });
});
