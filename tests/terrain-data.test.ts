import { describe, expect, it } from 'vitest';
import { TerrainData } from '../src/sim/TerrainData';
import { MAP_PROFILES } from '../src/model/defs/profiles';

const PROFILE = Object.values(MAP_PROFILES)[0];

describe('TerrainData', () => {
  it('generates the same grid for the same seed', () => {
    const a = new TerrainData(128, 96, 777, PROFILE);
    const b = new TerrainData(128, 96, 777, PROFILE);
    expect(a.heightMap).toEqual(b.heightMap);
    expect(a.waterLevel).toBe(b.waterLevel);
  });

  it('samples height, moisture and slope without a renderer', () => {
    const data = new TerrainData(128, 96, 777, PROFILE);
    expect(Number.isFinite(data.getHeight(64, 64))).toBe(true);
    expect(data.getMoisture(64, 64)).toBeGreaterThanOrEqual(0);
    expect(data.getSlope(64, 64)).toBeGreaterThanOrEqual(0);
    expect(typeof data.isWater(0, 0)).toBe('boolean');
  });
});
