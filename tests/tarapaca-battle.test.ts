import { describe, expect, it } from 'vitest';
import { setAutoStart } from '../src/core/Game';
import { UnitKind } from '../src/core/types';
import { headlessMission } from './headless';

describe('Tarapacá battle simulation', () => {
  it('starts as a bare army, receives the first column and holds the village', () => {
    const game = headlessMission('m_tarapaca');
    try {
      const playerUnits = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead);
      expect(playerUnits).toHaveLength(16);
      expect(playerUnits.some((u) => u.kind === UnitKind.WORKER)).toBe(false);
      expect(game.buildings.size).toBe(0);
      expect(game.players[0].resources).toEqual({ food: 0, wood: 0, silver: 0, stone: 0 });
      expect(game.playerCenter(0).x).toBeCloseTo(96, 1);
      expect(game.playerCenter(0).z).toBeCloseTo(168, 1);

      // The protect objective is a player responsibility: park Cáceres behind the line so this test
      // exercises the village hold and the scripted columns, not an idle commander death.
      const caceres = [...game.units.values()].find((u) => u.owner === 0 && u.tag === 'caceres');
      if (caceres) {
        caceres.pos.set(70, game.terrain.getHeight(70, 190), 190);
        caceres.orderQueue.length = 0;
      }

      let t = 0;
      const run = (seconds: number): void => {
        const end = t + seconds;
        while (t < end && !game.mission!.ended) {
          game.update(1 / 60, t);
          t += 1 / 60;
        }
      };

      run(3.3);
      const firstColumn = [...game.units.values()].filter((u) => u.owner === 1 && !u.dead);
      expect(firstColumn.length).toBeGreaterThanOrEqual(7);
      const closest = Math.min(...firstColumn.map((u) => Math.hypot(u.pos.x - 96, u.pos.z - 168)));
      expect(closest, 'the first column does not spawn on the village').toBeGreaterThan(30);

      run(100);
      expect(game.mission!.getObjectiveState('a1_pueblo')).toBe('completed');
      expect(game.mission!.getObjectiveState('a2_alturas')).toBe('activo');
      expect(game.mission!.getObjectiveState('a2_pachica')).not.toBe('completed');
      expect(game.buildings.size, 'the AI never raises a town').toBe(0);
      expect(game.mission!.ended).toBe(false);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});
