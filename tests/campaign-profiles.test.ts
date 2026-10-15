import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import {
  resolveMapProfile,
  resolveWorldProfile,
  regionDefaultMap,
  type GeographicRegion,
} from '../src/model/defs/profiles';
import { getPeriod } from '../src/model/defs/periods';

type Mission = (typeof MISSIONS)[number];

/** Expected region per mission (documented in `docs/historia/fichas_campana.md`). */
const EXPECTED_REGION: Record<string, GeographicRegion> = {
  m1_caral: 'central_coast',
  m2_chavin: 'andean_valley',
  m3_moche_recuay: 'north_coast',
  m4_wari: 'high_andes',
  m5_yahuar_pampa: 'high_andes',
  m6_chimu_inca: 'north_coast',
  m7_tupac_amaru: 'high_andes',
  m8_independencia: 'andean_valley',
  m9_guerra_pacifico: 'south_coast',
};

function resolve(mis: Mission) {
  return resolveMapProfile({
    period: mis.period,
    civ: mis.playerCiv,
    mapType: mis.map.type,
    region: mis.region,
  });
}

describe('campaign map profiles', () => {
  it('documents an expected region for every mission', () => {
    for (const mis of MISSIONS) expect(EXPECTED_REGION[mis.id], mis.id).toBeDefined();
    expect(Object.keys(EXPECTED_REGION).sort()).toEqual(MISSIONS.map((m) => m.id).sort());
  });

  it('every mission resolves the expected region, consistent with its map type', () => {
    for (const mis of MISSIONS) {
      const map = resolve(mis);
      expect(map.region, mis.id).toBe(EXPECTED_REGION[mis.id]);
      expect(map.baseMapType, mis.id).toBe(mis.map.type);
      expect(regionDefaultMap(map.region), mis.id).toBe(mis.map.type);
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
      expect(world.map.terrain.soil, mis.id).toBeTruthy();
      expect(world.map.provenance, mis.id).toBeTruthy();
      expect(world.architecture.provenance, mis.id).toBeTruthy();
    }
  });

  it('only the slice missions place a landmark', () => {
    const withLandmark = MISSIONS.filter((mis) => resolve(mis).landmark).map((m) => m.id);
    expect(withLandmark).toEqual(['m1_caral', 'm3_moche_recuay', 'm5_yahuar_pampa']);
  });

  it('keeps the Inca campaign on the Chimú north coast (m6)', () => {
    const mis = MISSIONS.find((m) => m.id === 'm6_chimu_inca')!;
    const map = resolve(mis);
    expect(map.region).toBe('north_coast');
    expect(map.landmark).toBeNull();
  });

  it('every mission references a valid period', () => {
    for (const mis of MISSIONS) expect(getPeriod(mis.period), mis.id).toBeDefined();
  });
});
