export interface VictoryPlayer {
  id: number;
  alive: boolean;
}

export interface ConquestResult {
  defeated: number;
  winner: number | null;
}

/**
 * Conquest rule: a player is defeated when they own no standing building. The
 * first defeated player ends the match for the first other surviving player.
 */
export function conquestVictory(
  players: readonly VictoryPlayer[],
  hasBuildings: (playerId: number) => boolean,
): ConquestResult | null {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player.alive || hasBuildings(player.id)) continue;
    const other = players.find((candidate) => candidate.id !== player.id && candidate.alive);
    return { defeated: player.id, winner: other ? other.id : null };
  }
  return null;
}
