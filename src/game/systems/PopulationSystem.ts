import type { PlayerState } from '../../core/types';
import type { Unit } from '../../entities/Unit';
import type { Building } from '../../entities/Building';

export type PopulationUnit = Pick<Unit, 'owner' | 'dead' | 'garrisonedIn' | 'stats'>;
export type PopulationBuilding = Pick<Building, 'owner' | 'constructionComplete' | 'providesPop'>;
export type PopulationPlayer = Pick<PlayerState, 'id' | 'populationUsed' | 'populationCap' | 'bonus'>;

const STARTING_POP = 3;
const POP_HEADROOM = 4;

/**
 * Recompute population used/cap for every player. Buildings under construction
 * and garrisoned units do not count; a civilization bonus raises the match cap.
 */
export function applyPopulation(
  units: Iterable<PopulationUnit>,
  buildings: Iterable<PopulationBuilding>,
  players: PopulationPlayer[],
  matchCap: number,
): void {
  const used = new Map<number, number>();
  for (const unit of units) {
    if (unit.dead || unit.garrisonedIn !== null) continue;
    used.set(unit.owner, (used.get(unit.owner) ?? 0) + unit.stats.population);
  }

  const capacity = new Map<number, number>();
  for (const building of buildings) {
    if (!building.constructionComplete) continue;
    capacity.set(building.owner, (capacity.get(building.owner) ?? STARTING_POP) + building.providesPop);
  }

  for (const player of players) {
    player.populationUsed = used.get(player.id) ?? 0;
    const base = capacity.get(player.id) ?? STARTING_POP;
    player.populationCap = Math.min(matchCap, base + POP_HEADROOM) + player.bonus.population;
  }
}
