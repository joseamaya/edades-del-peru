import { describe, expect, it } from 'vitest';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { BuildingKind } from '../src/core/types';
import { bus } from '../src/core/EventBus';

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
    const alerts: string[] = [];
    const onAlert = (payload: { text: string }): void => {
      alerts.push(payload.text);
    };
    bus.on('alert', onAlert);
    const center = [...game.buildings.values()].find((building) => building.owner === 0 && building.kind === 'center');
    expect(center).toBeDefined();
    game.lastBaseAlert = -10_000;
    game.resolveDamage(0, center!.id, 1, { owner: 0 }, 'heavy');
    expect(alerts.length).toBeGreaterThan(0);
    bus.off('alert', onAlert);
    game.destroy();
    setAutoStart(true);
  });
});

describe('drought on standing fields', () => {
  it('dries the harvest down and replanting does not refill it', () => {
    setAutoStart(false);
    const game = new Game(
      { ...DEFAULT_SETTINGS, mapSize: 128, fogOfWar: false, cinematic: false, showHints: false, soundEnabled: false },
      null,
      null,
      false,
      true,
    );
    game.ais.length = 0;
    const farm = game.spawnScriptedBuilding(BuildingKind.FARM, 0, 64, 64);
    const before = farm.foodAmount;
    expect(before).toBeGreaterThan(0);

    game.startEnvironmentalEvent('drought');
    for (let i = 0; i < 45; i++) game.updateEnvironment(1);
    expect(game.environment.drought).toBe(1);
    expect(farm.foodAmount).toBeLessThan(before);
    expect(farm.foodAmount).toBeCloseTo(before * 0.5, -1);

    // A field sown during the drought yields less than the one it replaces, never a full irrigated crop.
    const dry = farm.foodAmount;
    farm.foodAmount = 0;
    game.players[0].resources.wood = 100;
    expect(game.replantFarm(farm.id)).toBe(true);
    expect(farm.foodAmount).toBeGreaterThan(0);
    expect(farm.foodAmount).toBeLessThan(dry);
    expect(farm.foodAmount).toBeLessThan(before);
    // The rescale is ratio-based: applying it again (the load path does) does not dry the field twice.
    const once = farm.foodAmount;
    game.refreshFarmYields();
    expect(farm.foodAmount).toBe(once);

    game.destroy();
    setAutoStart(true);
  });
});
