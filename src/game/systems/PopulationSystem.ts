export interface PopulationUnit {
  owner: number;
  dead: boolean;
  garrisonedIn: number | null;
  stats: { population: number };
}

export interface PopulationBuilding {
  owner: number;
  constructionComplete: boolean;
  providesPop: number;
}

export interface PopulationPlayer {
  id: number;
  populationUsed: number;
  populationCap: number;
  bonus: { population: number };
}

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
    capacity.set(building.owner, (capacity.get(building.owner) ?? 3) + building.providesPop);
  }

  for (const player of players) {
    player.populationUsed = used.get(player.id) ?? 0;
    const base = capacity.get(player.id) ?? 3;
    player.populationCap = Math.min(matchCap, base + 4) + player.bonus.population;
  }
}
