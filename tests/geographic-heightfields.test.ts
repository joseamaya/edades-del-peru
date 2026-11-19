import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { AUTHORED_SITES, getAuthoredSite } from '../src/model/defs/sites';
import { sampleAuthoredHeight } from '../src/model/defs/authoredTerrain';
import { resolveMapProfile } from '../src/model/defs/profiles';
import { TerrainData } from '../src/sim/TerrainData';
import type { MissionDef } from '../src/campaign/types';
import type { AuthoredHeightField } from '../src/model/defs/authoredTerrain';

interface Case {
  mission: MissionDef;
  base: AuthoredHeightField;
  override: AuthoredHeightField;
}

const CASES: Array<{ id: string; size: number; hasRiver: boolean }> = [
  { id: 'm6b_guerra_civil', size: 257, hasRiver: false },
  { id: 'm_lima_1821', size: 129, hasRiver: true },
  { id: 'm_miraflores', size: 129, hasRiver: true },
  { id: 'm_real_felipe', size: 129, hasRiver: false },
  { id: 'm_tarapaca', size: 257, hasRiver: false },
  { id: 'm_vilcabamba', size: 257, hasRiver: false },
  { id: 'm_brena', size: 257, hasRiver: false },
];

function resolve(id: string): Case {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`missing mission ${id}`);
  const base = getAuthoredSite(mission.layout?.site?.id)?.heightField;
  const override = mission.layout?.site?.heightField;
  if (!base || !override) throw new Error(`missing heightfield for ${id}`);
  return { mission, base, override };
}

function missionProfile(mission: MissionDef) {
  return resolveMapProfile({
    period: mission.period,
    civ: mission.playerCiv,
    mapType: mission.map.type,
    region: mission.region,
  });
}

describe('geographic phase 1 heightfields', () => {
  it('gives every reused site mission its own field', () => {
    for (const { id, size } of CASES) {
      const { base, override } = resolve(id);
      expect(override.worldSize, id).toBe(256);
      expect(override.size, id).toBe(size);
      expect(override.heights.length, id).toBe(size * size);
      expect(override.heights, id).not.toBe(base.heights);
      expect(Array.from(override.heights.slice(0, 64)), id).not.toEqual(Array.from(base.heights.slice(0, 64)));
    }
  });

  it('does not reuse geometry between missions', () => {
    const resolved = CASES.map(({ id }) => resolve(id).override.heights);
    for (let a = 0; a < resolved.length; a++) {
      for (let b = a + 1; b < resolved.length; b++) {
        const first = resolved[a]!;
        const second = resolved[b]!;
        const n = Math.min(first.length, second.length);
        let same = 0;
        for (let i = 0; i < n; i++) if (first[i] === second[i]) same++;
        expect(same / n, `${CASES[a]!.id} vs ${CASES[b]!.id}`).toBeLessThan(0.5);
      }
    }
  });

  it('keeps each landmark grounded on the elevation its base field used', () => {
    for (const { id } of CASES) {
      const { mission, base, override } = resolve(id);
      const anchor = AUTHORED_SITES[mission.layout!.site!.id]!.anchor;
      const expected = sampleAuthoredHeight(base, anchor.x, anchor.z);
      expect(sampleAuthoredHeight(override, anchor.x, anchor.z), id).toBeCloseTo(expected, 2);
      for (const [dx, dz] of [
        [3, 0],
        [-3, 0],
        [0, 3],
        [0, -3],
      ]) {
        expect(sampleAuthoredHeight(override, anchor.x + dx!, anchor.z + dz!), id).toBeCloseTo(expected, 1);
      }
    }
  });

  it('keeps the authored ground paint and river metadata', () => {
    for (const { id, hasRiver } of CASES) {
      const { base, override } = resolve(id);
      expect(override.ground, id).toBeDefined();
      expect(override.ground!.size, id).toBe(base.ground!.size);
      expect(override.ground!.weights, id).toBe(base.ground!.weights);
      if (hasRiver) {
        expect(override.river, id).toEqual(base.river);
      }
    }
  });

  it('is consumed by TerrainData, not just stored in the campaign data', () => {
    for (const { id } of CASES) {
      const { mission, base, override } = resolve(id);
      const site = getAuthoredSite(mission.layout!.site!.id)!;
      const profile = missionProfile(mission);
      const data = new TerrainData(256, 96, mission.map.seed, profile, mission.layout, {
        ...site,
        heightField: override,
      });
      const anchor = site.anchor;
      expect(data.getHeight(anchor.x, anchor.z), id).toBeCloseTo(sampleAuthoredHeight(base, anchor.x, anchor.z), 1);
      if (override.river) {
        const [x, z] = override.river.path[Math.floor(override.river.path.length / 2)]!;
        expect(data.isRiver(x!, z!), id).toBe(true);
      }
    }
  });
});
