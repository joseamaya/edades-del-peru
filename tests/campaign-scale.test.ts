import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getAuthoredSite } from '../src/model/defs/sites';
import { getUnitStats } from '../src/model/defs/units';
import { UnitKind } from '../src/core/types';

/**
 * The model-mission pattern (`docs/design/model-mission-pattern.md` §3) fixes the scale of a rebuilt
 * mission: a 256 m map, painted ground at ~2 m per point and a worker crossing inside the AoE2/0 A.D.
 * band. Add a mission here when it is promoted to model-mission status; do not relax the numbers for a
 * single mission without documenting the exception in that guide.
 */
const MODEL_MISSION_IDS = ['m1_caral', 'm2_chavin'] as const;

const CROSSING_MIN = 180;
const CROSSING_MAX = 240;

describe('model-mission scale', () => {
  for (const id of MODEL_MISSION_IDS) {
    it(`${id} keeps the 256 m map, 2 m ground and crossing band`, () => {
      const mission = MISSIONS.find((m) => m.id === id)!;
      expect(mission, `${id} is missing from the campaign defs`).toBeDefined();
      expect(mission.map.size, `${id} map size`).toBe(256);

      const siteId = mission.layout?.site?.id;
      expect(siteId, `${id} has no authored site`).toBeTruthy();
      const site = getAuthoredSite(siteId!)!;
      const field = site.heightField!;
      expect(field.worldSize, `${id} heightfield world size`).toBe(256);
      const groundStep = field.worldSize / ((field.ground?.size ?? 0) - 1);
      expect(groundStep, `${id} painted ground spacing`).toBeLessThanOrEqual(2.5);

      const speed = getUnitStats(UnitKind.WORKER, mission.startingEra).speed * (mission.unitSpeedScale ?? 1);
      const crossing = mission.map.size / speed;
      expect(crossing, `${id} worker crossing time`).toBeGreaterThanOrEqual(CROSSING_MIN);
      expect(crossing, `${id} worker crossing time`).toBeLessThanOrEqual(CROSSING_MAX);
    });
  }
});
