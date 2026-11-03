import { describe, expect, it } from 'vitest';
import { MatchStatsCollector } from '../src/game/matchStats';
import { Era, type Resources } from '../src/core/types';
import { stateHashOf } from '../src/game/stateHash';

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

  it('stays outside the gameplay state hash', () => {
    const input = {
      units: [],
      buildings: [],
      nodes: [],
      players: [
        {
          id: 0,
          era: Era.FORMATIVE,
          resources: { food: 1, wood: 2, silver: 3, stone: 4 },
          populationUsed: 0,
          techs: new Set<string>(),
          alive: true,
        },
      ],
      rngState: 7,
    };
    const before = stateHashOf(input);
    const stats = new MatchStatsCollector();
    stats.recordGather(0, 'food', 10);
    stats.update(5, [player(0, res(1, 2))], [], []);
    expect(stateHashOf(input)).toBe(before);
  });

  it('keeps eliminated players for the defeat screen and round-trips through saves', () => {
    const stats = new MatchStatsCollector();
    const p = { ...player(0, res(10, 5)), alive: false };
    stats.recordGather(0, 'food', 4);
    stats.update(5, [p], [], []);
    expect(stats.samples[0].players[0]).toMatchObject({ id: 0, alive: false, kills: 0 });
    const restored = new MatchStatsCollector();
    restored.applySave(JSON.parse(JSON.stringify(stats.toSave())));
    expect(restored.samples).toEqual(stats.samples);
    expect(restored.toSave().gathered).toEqual([[0, { food: 4, wood: 0, silver: 0, stone: 0 }]]);
  });

  it('does not sample every frame', () => {
    const stats = new MatchStatsCollector();
    const p = player(0, res(0, 0));
    for (let i = 0; i < 360; i++) stats.update(1 / 60, [p], [], []);
    expect(stats.samples).toHaveLength(1);
  });
});
