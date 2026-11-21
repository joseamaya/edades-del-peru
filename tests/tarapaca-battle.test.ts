import { describe, expect, it } from 'vitest';
import { setAutoStart } from '../src/core/Game';
import { UnitKind } from '../src/core/types';
import { headlessMission } from './headless';

describe('Tarapacá battle simulation', () => {
  it('starts as a bare army and answers the first column instead of dying for free', () => {
    const game = headlessMission('m_tarapaca');
    try {
      const playerUnits = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead);
      expect(playerUnits).toHaveLength(16);
      expect(playerUnits.some((u) => u.kind === UnitKind.WORKER)).toBe(false);
      expect(game.buildings.size).toBe(0);
      expect(game.players[0].resources).toEqual({ food: 0, wood: 0, silver: 0, stone: 0 });
      expect(game.playerCenter(0).x).toBeCloseTo(96, 1);
      expect(game.playerCenter(0).z).toBeCloseTo(168, 1);
      // Cáceres commands from the rear of the village, not from the first volley's line.
      const caceresStart = [...game.units.values()].find((u) => u.tag === 'caceres')!;
      expect(caceresStart.pos.z, 'Cáceres must start behind the line').toBeGreaterThan(185);

      let t = 0;
      const run = (seconds: number): void => {
        const end = t + seconds;
        while (t < end && !game.mission!.ended) {
          game.update(1 / 60, t);
          t += 1 / 60;
        }
      };

      // The first column enters after the briefing window; measure the exchange once it is on the field.
      run(25);
      const firstColumn = [...game.units.values()].filter((u) => u.owner === 1 && !u.dead);
      expect(firstColumn.length).toBeGreaterThanOrEqual(5);
      const closest = Math.min(...firstColumn.map((u) => Math.hypot(u.pos.x - 96, u.pos.z - 168)));
      expect(closest, 'the first column does not spawn on the village').toBeGreaterThan(30);

      // Track the opening roster by id: Act II's Pachica reinforcement must not read as "no casualties".
      const roster = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead).map((u) => u.id);
      const rosterHp = (): number =>
        roster.reduce((sum, id) => {
          const unit = game.units.get(id);
          return sum + (unit && !unit.dead ? unit.hp : 0);
        }, 0);
      const playerHp = rosterHp();
      const column = firstColumn.map((u) => u.id);
      const columnHp = firstColumn.reduce((sum, u) => sum + u.hp, 0);
      run(45);
      const columnHpAfter = column.reduce((sum, id) => {
        const unit = game.units.get(id);
        return sum + (unit && !unit.dead ? unit.hp : 0);
      }, 0);

      expect(game.mission!.ended, 'the village fell to the first column without a fight').toBe(false);
      expect([...game.units.values()].some((u) => u.tag === 'caceres' && !u.dead)).toBe(true);
      expect(rosterHp(), 'the defenders should take casualties in the exchange').toBeLessThan(playerHp);
      expect(columnHpAfter, 'the defenders never returned fire').toBeLessThan(columnHp);
      expect(game.buildings.size, 'the AI never raises a town').toBe(0);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
    // The fixed-step simulation runs 70 s of game time; CI workers need more than Vitest's 5 s default.
  }, 20_000);

  it('has no harvestable nodes on a one-day battle map', () => {
    const game = headlessMission('m_tarapaca');
    try {
      expect(game.mapProfile.resources.scatter).toBe(0);
      expect(game.resourceNodes.size, 'the quebrada must not grow a resource ring').toBe(0);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});
