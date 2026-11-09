import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getAuthoredSite } from '../src/model/defs/sites';
import { getUnitStats } from '../src/model/defs/units';
import { UnitKind } from '../src/core/types';

/**
 * The model-mission pattern (`docs/design/model-mission-pattern.md` §3) fixes the scale of a rebuilt
 * mission: a 256 m map, painted ground at ~2 m per point and a worker crossing inside the AoE2/0 A.D.
 * band. Mark a promoted mission with `modelMission: true`; the guard follows the flag, not a list.
 */
const CROSSING_MIN = 180;
const CROSSING_MAX = 240;

describe('model-mission scale', () => {
  for (const mission of MISSIONS.filter((m) => m.modelMission)) {
    it(`${mission.id} keeps the 256 m map, 2 m ground and crossing band`, () => {
      expect(mission.map.size, `${mission.id} map size`).toBe(256);

      const siteId = mission.layout?.site?.id;
      expect(siteId, `${mission.id} has no authored site`).toBeTruthy();
      const site = getAuthoredSite(siteId!)!;
      const field = site.heightField!;
      expect(field.worldSize, `${mission.id} heightfield world size`).toBe(256);
      expect(field.ground?.size, `${mission.id} painted ground samples`).toBe(128);
      const groundStep = field.worldSize / ((field.ground?.size ?? 0) - 1);
      expect(groundStep, `${mission.id} painted ground spacing`).toBeLessThanOrEqual(2.1);

      const speed = getUnitStats(UnitKind.WORKER, mission.startingEra).speed * (mission.unitSpeedScale ?? 1);
      const crossing = mission.map.size / speed;
      expect(crossing, `${mission.id} worker crossing time`).toBeGreaterThanOrEqual(CROSSING_MIN);
      expect(crossing, `${mission.id} worker crossing time`).toBeLessThanOrEqual(CROSSING_MAX);
    });
  }

  it('marks the rebuilt model missions', () => {
    expect(MISSIONS.filter((m) => m.modelMission).map((m) => m.id)).toEqual(['m1_caral', 'm2_chavin']);
  });
});
