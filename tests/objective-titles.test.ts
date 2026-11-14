import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';

/**
 * A rebalance once lowered the Caral and Chavín hand-overs from 150 to 120 but left «Entrega 150»
 * in the titles, so the goal promised one number and the bar counted to another.
 */
describe('objective titles agree with their targets', () => {
  for (const mission of MISSIONS) {
    for (const o of mission.objectives) {
      if (o.kind !== 'deliver' || o.count === undefined) continue;
      it(`${mission.id} · ${o.id} names the ${o.count} it asks for`, () => {
        const numbers = o.title.match(/\d+/g) ?? [];
        if (numbers.length === 0) return;
        expect(numbers, o.title).toContain(String(o.count));
      });
    }
  }
});

describe('peaceful missions build no war', () => {
  // A guard post (barracks) can stay for a documented unit such as the Wari guardian; fortifications,
  // siege and cavalry cannot.
  const MILITARY = ['fortress', 'wall', 'gate', 'tower', 'arsenal', 'stable'];
  for (const mission of MISSIONS.filter((m) => !m.enemy.active)) {
    it(`${mission.id} restricts its build roster and leaves out military buildings`, () => {
      expect(mission.allowedBuildings, 'a mission with no enemy must list what it can build').toBeDefined();
      for (const kind of MILITARY) expect(mission.allowedBuildings as string[], kind).not.toContain(kind);
    });
  }
});
