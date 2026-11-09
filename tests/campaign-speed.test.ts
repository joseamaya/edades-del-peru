import { describe, expect, it } from 'vitest';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getUnitStats } from '../src/model/defs/units';
import { Era, UnitKind } from '../src/core/types';

function headlessFor(missionId: string): Game {
  setAutoStart(false);
  return new Game(
    {
      ...DEFAULT_SETTINGS,
      missionId,
      showHints: false,
      soundEnabled: false,
      musicEnabled: false,
      fogOfWar: false,
      cinematic: false,
    },
    null,
    null,
    false,
    true,
  );
}

describe('campaign unit speed scale', () => {
  it('halves every Caral unit so the 256 m transect takes about 3:33 to cross', () => {
    const caral = MISSIONS.find((m) => m.id === 'm1_caral')!;
    const game = headlessFor('m1_caral');
    try {
      expect(game.unitSpeedScale).toBe(0.5);
      for (const kind of [UnitKind.WORKER, UnitKind.SCOUT]) {
        const unit = game.spawnScriptedUnit(kind, 0, 20, 20);
        const base = getUnitStats(kind, Era.FORMATIVE).speed;
        expect(unit.stats.speed).toBeCloseTo(base * 0.5, 6);
      }
      const worker = [...game.units.values()].find((u) => u.kind === UnitKind.WORKER)!;
      const crossing = caral.map.size / worker.stats.speed;
      expect(crossing).toBeGreaterThan(200);
      expect(crossing).toBeLessThan(220);
      // ~0.30 city centres per second: between 0 A.D. (0.28) and AoE2 (0.20).
      expect(caral.map.size / 4 / crossing).toBeCloseTo(0.3, 1);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('keeps the scale after an era modernisation and leaves unscaled missions untouched', () => {
    const caral = headlessFor('m1_caral');
    const chavin = headlessFor('m2_chavin');
    try {
      const unit = caral.spawnScriptedUnit(UnitKind.WORKER, 0, 20, 20);
      // `modernizeUnits` rebuilds the stats and re-applies the player bonuses; do the same here
      // without its visual model rebuild (which needs a DOM).
      unit.stats = getUnitStats(UnitKind.WORKER, caral.players[0].era);
      caral.runtime.applyPlayerBonuses(unit, caral.players[0]);
      expect(unit.stats.speed).toBeCloseTo(getUnitStats(UnitKind.WORKER, caral.players[0].era).speed * 0.5, 6);

      expect(chavin.unitSpeedScale).toBe(1);
      const base = getUnitStats(UnitKind.WORKER, Era.REGIONAL_STATES).speed;
      const unscaled = chavin.spawnScriptedUnit(UnitKind.WORKER, 0, 20, 20);
      expect(unscaled.stats.speed).toBeCloseTo(base, 6);
    } finally {
      caral.destroy();
      chavin.destroy();
      setAutoStart(true);
    }
  });
});
