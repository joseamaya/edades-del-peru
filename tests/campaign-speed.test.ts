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
  it('slows every Caral unit to 0.75 so the 256 m transect takes about 2:22 to cross', () => {
    const caral = MISSIONS.find((m) => m.id === 'm1_caral')!;
    const game = headlessFor('m1_caral');
    try {
      expect(game.unitSpeedScale).toBe(0.75);
      for (const kind of [UnitKind.WORKER, UnitKind.SCOUT]) {
        const unit = game.spawnScriptedUnit(kind, 0, 20, 20);
        const base = getUnitStats(kind, Era.FORMATIVE).speed;
        expect(unit.stats.speed).toBeCloseTo(base * 0.75, 6);
      }
      const worker = [...game.units.values()].find((u) => u.kind === UnitKind.WORKER)!;
      const crossing = caral.map.size / worker.stats.speed;
      expect(crossing).toBeGreaterThan(135);
      expect(crossing).toBeLessThan(150);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('leaves missions without a scale at the skirmish speed', () => {
    const moche = headlessFor('m3_moche_recuay');
    try {
      expect(moche.unitSpeedScale).toBe(1);
      const base = getUnitStats(UnitKind.WORKER, Era.REGIONAL_STATES).speed;
      const worker = moche.spawnScriptedUnit(UnitKind.WORKER, 0, 20, 20);
      expect(worker.stats.speed).toBeCloseTo(base, 6);
    } finally {
      moche.destroy();
      setAutoStart(true);
    }
  });
});
