import { describe, expect, it } from 'vitest';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';

describe('headless Game', () => {
  it('runs an AI-vs-AI match without DOM or renderer', () => {
    setAutoStart(false);
    const game = new Game(
      { ...DEFAULT_SETTINGS, mapSize: 128, fogOfWar: false, cinematic: false, showHints: false, soundEnabled: false },
      null,
      null,
      false,
      true,
    );
    game.ais.length = 0;
    game.addAI(0, 'normal');
    game.addAI(1, 'normal');
    for (let i = 0; i < 600; i++) game.update(1 / 60, i / 60);
    expect(game.stepCount).toBe(600);
    expect(game.units.size).toBeGreaterThan(0);
    expect(game.buildings.size).toBeGreaterThan(0);
    game.destroy();
  });
});
