import { describe, expect, it } from 'vitest';
import { MatchStatsCollector } from '../src/game/matchStats';
import { Era, type Resources } from '../src/core/types';

const res = (food: number, wood: number): Resources => ({ food, wood, silver: 0, stone: 0 });

function player(id: number, resources: Resources) {
  return {
    id,
    name: `P${id}`,
    civ: 'caral',
    colorHex: '#fff',
    resources,
    populationUsed: 4,
    populationCap: 10,
    era: Era.FORMATIVE,
    techs: new Set<string>(),
    kills: 0,
    totalLost: 0,
    alive: true,
  };
}

function run(): MatchStatsCollector {
  const stats = new MatchStatsCollector();
  const p = player(0, res(50, 20));
  const units = [
    { owner: 0, kind: 'worker', dead: false },
    { owner: 0, kind: 'soldier', dead: false },
  ];
  const buildings = [{ owner: 0, dead: false }];
  stats.recordGather(0, 'food', 10);
  stats.update(5, [p], units, buildings);
  stats.recordGather(0, 'wood', 7);
  stats.update(5, [p], units, buildings);
  return stats;
}

describe('match stats', () => {
  it('samples deterministically and accumulates gathered resources', () => {
    const first = run();
    const second = run();
    expect(first.samples).toEqual(second.samples);
    expect(first.samples).toHaveLength(2);
    expect(first.samples[0].t).toBe(5);
    expect(first.samples[1].players[0].gathered).toEqual({ food: 10, wood: 7, silver: 0, stone: 0 });
    expect(first.samples[1].players[0].army).toBe(1);
    expect(first.samples[1].players[0].workers).toBe(1);
    expect(first.samples[1].players[0].buildings).toBe(1);
  });

  it('does not sample every frame', () => {
    const stats = new MatchStatsCollector();
    const p = player(0, res(0, 0));
    for (let i = 0; i < 360; i++) stats.update(1 / 60, [p], [], []);
    expect(stats.samples).toHaveLength(1);
  });
});
