import { describe, expect, it } from 'vitest';
import { QUARRY_OBSTACLE_RADIUS, quarryObstacleRadius } from '../src/model/defs/profiles';
import {
  HARVEST_RANGE,
  HARVEST_STAND_RANGE,
  gatherApproachFor,
  gatherRangeFor,
  gatherStandRangeFor,
} from '../src/entities/Unit';

describe('quarry obstacle footprint', () => {
  it('gives the granodiorite kit an enclosing footprint and keeps workers able to reach it', () => {
    const radius = QUARRY_OBSTACLE_RADIUS.granodiorite;
    const node = { navRadius: radius };
    expect(radius).toBe(4);
    expect(gatherRangeFor(node)).toBeGreaterThan(radius);
    expect(gatherStandRangeFor(node)).toBeGreaterThan(radius);
  });

  it('leaves every standard resource node and other maps at their original reach', () => {
    expect(quarryObstacleRadius()).toBe(1.1);
    expect(gatherRangeFor({})).toBe(HARVEST_RANGE);
    expect(gatherStandRangeFor({})).toBe(HARVEST_STAND_RANGE);
    // AI passes no water option; the player worker still keeps its fishing behaviour.
    expect(gatherApproachFor({ kind: 'fishing' })).toBeUndefined();
    expect(gatherApproachFor({ kind: 'fishing' }, 1, true)?.allowWater).toBe(true);
  });
});
