import { describe, expect, it } from 'vitest';
import {
  applyPopulation,
  type PopulationBuilding,
  type PopulationPlayer,
  type PopulationUnit,
} from '../src/game/systems/PopulationSystem';

const player = (id: number, bonus = 0): PopulationPlayer => ({
  id,
  populationUsed: 0,
  populationCap: 0,
  bonus: { population: bonus },
});

const unit = (owner: number, population: number, extra: Partial<PopulationUnit> = {}): PopulationUnit => ({
  owner,
  dead: false,
  garrisonedIn: null,
  stats: { population },
  ...extra,
});

const building = (owner: number, providesPop: number, complete = true): PopulationBuilding => ({
  owner,
  constructionComplete: complete,
  providesPop,
});

describe('applyPopulation', () => {
  it('counts living units per owner and excludes dead and garrisoned units', () => {
    const players = [player(0), player(1)];
    applyPopulation(
      [unit(0, 2), unit(0, 1, { dead: true }), unit(0, 1, { garrisonedIn: 5 }), unit(1, 3)],
      [building(0, 10), building(1, 5), building(1, 99, false)],
      players,
      200,
    );
    expect(players[0].populationUsed).toBe(2);
    expect(players[1].populationUsed).toBe(3);
  });

  it('uses the initial centre plus completed buildings and applies the 4-headroom rule', () => {
    const players = [player(0)];
    applyPopulation([], [building(0, 10), building(0, 99, false)], players, 200);
    expect(players[0].populationCap).toBe(17);
  });

  it('gives a player with no completed buildings the base plus headroom', () => {
    const players = [player(0)];
    applyPopulation([], [], players, 200);
    expect(players[0].populationCap).toBe(7);
  });

  it('clamps to the match cap before adding the civilization bonus', () => {
    const players = [player(0, 5)];
    applyPopulation([], [building(0, 50)], players, 20);
    expect(players[0].populationCap).toBe(25);
  });
});
