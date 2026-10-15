import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { resolveMapProfile, resolveWorldProfile, regionDefaultMap } from '../src/model/defs/profiles';
import { LANDMARKS } from '../src/model/defs/landmarks';
import { getPeriod } from '../src/model/defs/periods';

describe('campaign map profiles', () => {
  it('every mission declares a region that matches its map type', () => {
    for (const mis of MISSIONS) {
      expect(mis.region, `${mis.id} has no region`).toBeDefined();
      expect(regionDefaultMap(mis.region!), `${mis.id} region/map mismatch`).toBe(mis.map.type);
    }
  });

  it('every mission resolves a valid map and architecture profile', () => {
    for (const mis of MISSIONS) {
      const world = resolveWorldProfile({
        period: mis.period,
        civ: mis.playerCiv,
        mapType: mis.map.type,
        region: mis.region,
      });
      expect(world.map.region, mis.id).toBe(mis.region);
      expect(world.map.baseMapType, mis.id).toBe(mis.map.type);
      expect(world.map.terrain.soil, mis.id).toBeTruthy();
      expect(world.map.provenance, mis.id).toBeTruthy();
      expect(world.architecture.provenance, mis.id).toBeTruthy();
    }
  });

  it('a mission landmark, when present, fits the map region', () => {
    for (const mis of MISSIONS) {
      const map = resolveMapProfile({
        period: mis.period,
        civ: mis.playerCiv,
        mapType: mis.map.type,
        region: mis.region,
      });
      if (!map.landmark) continue;
      expect(regionDefaultMap(LANDMARKS[map.landmark].region), mis.id).toBe(regionDefaultMap(map.region));
    }
  });

  it('m6 keeps the Inca campaign on the Chimú north coast (no high-Andes ushnu)', () => {
    const mis = MISSIONS.find((m) => m.id === 'm6_chimu_inca')!;
    const map = resolveMapProfile({
      period: mis.period,
      civ: mis.playerCiv,
      mapType: mis.map.type,
      region: mis.region,
    });
    expect(map.region).toBe('north_coast');
    expect(map.landmark).toBeNull();
  });

  it('every mission references a valid period', () => {
    for (const mis of MISSIONS) expect(getPeriod(mis.period), mis.id).toBeDefined();
  });
});
