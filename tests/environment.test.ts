import { describe, expect, it } from 'vitest';
import { ENVIRONMENT_EVENTS, WATER_LEVEL_OFFSET, waterLevelOffset } from '../src/core/environment';

describe('environment events', () => {
  it('moves the water plane for the winter flood and lets the drought override it', () => {
    expect(waterLevelOffset({})).toBe(0);
    expect(waterLevelOffset({ wet_season: 1 })).toBeCloseTo(WATER_LEVEL_OFFSET.wetSeason, 6);
    expect(waterLevelOffset({ drought: 1 })).toBeCloseTo(WATER_LEVEL_OFFSET.drought, 6);
    expect(waterLevelOffset({ wet_season: 1, drought: 1 })).toBeCloseTo(WATER_LEVEL_OFFSET.drought, 6);
    // Halfway through the drought the flood still holds back part of the drop.
    expect(waterLevelOffset({ wet_season: 1, drought: 0.5 })).toBeCloseTo(-0.15, 6);
  });

  it('gives every event a duration', () => {
    for (const def of Object.values(ENVIRONMENT_EVENTS)) expect(def.duration).toBeGreaterThan(0);
  });
});
