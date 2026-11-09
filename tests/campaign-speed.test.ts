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
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('leaves missions without a scale at the skirmish speed', () => {
    const chavin = headlessFor('m2_chavin');
    try {
      expect(chavin.unitSpeedScale).toBe(1);
      const base = getUnitStats(UnitKind.WORKER, Era.REGIONAL_STATES).speed;
      const worker = chavin.spawnScriptedUnit(UnitKind.WORKER, 0, 20, 20);
      expect(worker.stats.speed).toBeCloseTo(base, 6);
    } finally {
      chavin.destroy();
      setAutoStart(true);
    }
  });
});
