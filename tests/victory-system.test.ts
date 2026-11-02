import { describe, expect, it } from 'vitest';
import { conquestVictory } from '../src/game/systems/VictorySystem';

describe('conquestVictory', () => {
  it('ends the match when an alive player has no buildings', () => {
    expect(
      conquestVictory(
        [
          { id: 0, alive: true },
          { id: 1, alive: true },
        ],
        (id) => id === 0,
      ),
    ).toEqual({
      defeated: 1,
      winner: 0,
    });
  });

  it('ignores already defeated players', () => {
    expect(
      conquestVictory(
        [
          { id: 0, alive: false },
          { id: 1, alive: false },
        ],
        () => false,
      ),
    ).toBeNull();
  });

  it('reports no winner when the other player is also gone', () => {
    expect(
      conquestVictory(
        [
          { id: 0, alive: true },
          { id: 1, alive: false },
        ],
        () => false,
      ),
    ).toEqual({
      defeated: 0,
      winner: null,
    });
  });

  it('does nothing while every alive player still has a building', () => {
    expect(
      conquestVictory(
        [
          { id: 0, alive: true },
          { id: 1, alive: true },
        ],
        () => true,
      ),
    ).toBeNull();
  });
});
