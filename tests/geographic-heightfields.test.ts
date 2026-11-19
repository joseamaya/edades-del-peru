import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { AUTHORED_SITES, getAuthoredSite } from '../src/model/defs/sites';
import { sampleAuthoredHeight } from '../src/model/defs/authoredTerrain';
import { WATER_LEVEL, resolveMapProfile } from '../src/model/defs/profiles';
import { TerrainData } from '../src/sim/TerrainData';
import type { MissionDef } from '../src/campaign/types';
import type { AuthoredHeightField } from '../src/model/defs/authoredTerrain';

interface Case {
  mission: MissionDef;
  override: AuthoredHeightField;
}

const CASES: Array<{ id: string; size: number; hasRiver: boolean; keepsWater: boolean }> = [
  { id: 'm6b_guerra_civil', size: 257, hasRiver: false, keepsWater: false },
  { id: 'm_cusco_1536', size: 129, hasRiver: false, keepsWater: false },
  { id: 'm_lima_1821', size: 129, hasRiver: true, keepsWater: true },
  { id: 'm_miraflores', size: 129, hasRiver: true, keepsWater: true },
  { id: 'm_real_felipe', size: 129, hasRiver: false, keepsWater: true },
  { id: 'm_tarapaca', size: 257, hasRiver: false, keepsWater: false },
  { id: 'm_vilcabamba', size: 257, hasRiver: false, keepsWater: false },
  { id: 'm_brena', size: 257, hasRiver: false, keepsWater: false },
];

const SAMPLE_STEPS = 65;

const RING: Array<[number, number]> = [
  [12, 0],
  [-12, 0],
  [0, 12],
  [0, -12],
  [8.5, 8.5],
  [-8.5, 8.5],
  [8.5, -8.5],
  [-8.5, -8.5],
];

function countWater(field: AuthoredHeightField): number {
  let water = 0;
  for (const [x, z] of sampleGrid(SAMPLE_STEPS)) {
    if (sampleAuthoredHeight(field, x, z) < WATER_LEVEL - 0.15) water++;
  }
  return water;
}

function sampleGrid(steps: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let zi = 0; zi < steps; zi++) {
    for (let xi = 0; xi < steps; xi++) {
      out.push([(xi / (steps - 1)) * 256, (zi / (steps - 1)) * 256]);
    }
  }
  return out;
}

function resolve(id: string): Case {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`missing mission ${id}`);
  const override = mission.layout?.site?.heightField;
  if (!override) throw new Error(`missing heightfield for ${id}`);
  return { mission, override };
}

function missionProfile(mission: MissionDef) {
  return resolveMapProfile({
    period: mission.period,
    civ: mission.playerCiv,
    mapType: mission.map.type,
    region: mission.region,
  });
}

describe('mission-scoped heightfields', () => {
  it('gives every reuse-chain mission its own field', () => {
    for (const { id, size } of CASES) {
      const { override } = resolve(id);
      expect(override.worldSize, id).toBe(256);
      expect(override.size, id).toBe(size);
      expect(override.heights.length, id).toBe(size * size);
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

  it('keeps every pair of fields visibly apart on a common grid', () => {
    const grids = CASES.map(({ id }) => {
      const { override } = resolve(id);
      return sampleGrid(SAMPLE_STEPS).map(([x, z]) => sampleAuthoredHeight(override, x, z));
    });
    for (let a = 0; a < grids.length; a++) {
      for (let b = a + 1; b < grids.length; b++) {
        const first = grids[a]!;
        const second = grids[b]!;
        const label = `${CASES[a]!.id} vs ${CASES[b]!.id}`;
        let sum = 0;
        let near = 0;
        for (let i = 0; i < first.length; i++) {
          const delta = Math.abs(first[i]! - second[i]!);
          sum += delta;
          if (delta < 0.25) near++;
        }
        // A renamed copy of a field would keep both numbers high; the shapes must also disagree.
        expect(sum / first.length, `${label} mean height delta`).toBeGreaterThan(0.75);
        expect(near / first.length, `${label} flat-agreement share`).toBeLessThan(0.6);
      }
    }
  });

  it('grounds each landmark at its mission site elevation', () => {
    for (const { id } of CASES) {
      const { mission, override } = resolve(id);
      const site = AUTHORED_SITES[mission.layout!.site!.id]!;
      const expected = mission.layout!.site!.y!;
      expect(sampleAuthoredHeight(override, site.anchor.x, site.anchor.z), id).toBeCloseTo(expected, 2);
      // The flat pad must clear the largest site model footprint (half-diagonal ~11 m).
      for (const [dx, dz] of RING) {
        expect(sampleAuthoredHeight(override, site.anchor.x + dx, site.anchor.z + dz), `${id} ${dx},${dz}`).toBeCloseTo(
          expected,
          1,
        );
      }
    }
  });

  it('keeps the coast missions wet and the inland missions dry', () => {
    for (const { id, keepsWater } of CASES) {
      const { override } = resolve(id);
      const water = countWater(override);
      if (keepsWater) {
        // The bay or sea must survive the reshape: a lost coastline is as wrong as a new lake.
        expect(water, id).toBeGreaterThan(0);
      } else {
        // A carved channel below the waterline with no river/ford metadata splits the map in two.
        expect(water, id).toBe(0);
      }
    }
  });

  it('paints its own ground and keeps the Rímac metadata', () => {
    for (const { id, hasRiver } of CASES) {
      const { override } = resolve(id);
      expect(override.ground, id).toBeDefined();
      expect(override.ground!.size, id).toBe(128);
      expect(override.ground!.weights.length, id).toBe(128 * 128 * 4);
      let total = 0;
      for (let i = 0; i < override.ground!.weights.length; i += 4) {
        total +=
          override.ground!.weights[i]! +
          override.ground!.weights[i + 1]! +
          override.ground!.weights[i + 2]! +
          override.ground!.weights[i + 3]!;
      }
      // Palette entries are normalized weights (sum 255) rounded per channel.
      const average = total / (128 * 128);
      expect(average, id).toBeGreaterThan(250);
      expect(average, id).toBeLessThan(260);
      if (hasRiver) expect(override.river, id).toBeDefined();
    }
  });

  it('is consumed by TerrainData, not just stored in the campaign data', () => {
    for (const { id } of CASES) {
      const { mission, override } = resolve(id);
      const site = getAuthoredSite(mission.layout!.site!.id)!;
      const profile = missionProfile(mission);
      const data = new TerrainData(256, 96, mission.map.seed, profile, mission.layout, {
        ...site,
        heightField: override,
      });
      const anchor = site.anchor;
      expect(data.getHeight(anchor.x, anchor.z), id).toBeCloseTo(mission.layout!.site!.y!, 1);
      expect(data.getAuthoredGround(anchor.x, anchor.z), id).not.toBeNull();
      if (override.river) {
        const [x, z] = override.river.path[Math.floor(override.river.path.length / 2)]!;
        expect(data.isRiver(x!, z!), id).toBe(true);
      }
    }
  });
});
