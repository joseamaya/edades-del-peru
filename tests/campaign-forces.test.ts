import { describe, expect, it } from 'vitest';
import { setAutoStart } from '../src/core/Game';
import { UnitKind } from '../src/core/types';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { headlessMission } from './headless';

describe('campaign force contract', () => {
  it('never gives a base-less party the generic four workers and scout', () => {
    const game = headlessMission('m_tambotoco');
    try {
      expect(game.startBaseFor(0)).toBe(false);
      expect(game.openingUnitsFor(0), 'opening units default to the seat base flag').toBe(false);
      expect(game.startBaseFor(1)).toBe(true);
      expect(game.openingUnitsFor(1)).toBe(true);
      const workers = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.WORKER);
      // Tambotoco's authored party is five workers, not five plus the generic four.
      expect(workers).toHaveLength(5);
      const playerBuildings = [...game.buildings.values()].filter((b) => b.owner === 0 && !b.dead);
      expect(playerBuildings).toHaveLength(0);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('keeps a documented scripted defence without an enemy economy', () => {
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    // Its dossier says the enemy runs no economy; the pressure is the authored bombardment and assault.
    expect(m9.enemy.economy).toBe(false);
    expect(m9.enemy.attacks).toBe(false);
  });

  it('lets a scripted battle disable both seats and skip the opening resource ring', () => {
    const game = headlessMission('m_tarapaca');
    try {
      expect(game.startBaseFor(0)).toBe(false);
      expect(game.startBaseFor(1)).toBe(false);
      expect(game.openingUnitsFor(0)).toBe(false);
      expect(game.openingUnitsFor(1)).toBe(false);
      const workers = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.WORKER);
      expect(workers).toHaveLength(0);
      expect(game.buildings.size).toBe(0);
      expect(game.players[0].resources).toEqual({ food: 0, wood: 0, silver: 0, stone: 0 });
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});
