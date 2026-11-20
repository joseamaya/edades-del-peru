import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { AUTHORED_SITES, getAuthoredSite } from '../src/model/defs/sites';
import { sampleAuthoredHeight } from '../src/model/defs/authoredTerrain';
import { WATER_LEVEL, resolveMapProfile } from '../src/model/defs/profiles';
import { MAX_WALKABLE_SLOPE } from '../src/game/Pathfinding';
import { terrainSlope } from '../src/util/math';
import { TerrainData } from '../src/sim/TerrainData';
import type { MissionDef } from '../src/campaign/types';
import type { AuthoredHeightField } from '../src/model/defs/authoredTerrain';

interface Case {
  mission: MissionDef;
  override: AuthoredHeightField;
}

interface CaseSpec {
  id: string;
  size: number;
  hasRiver: boolean;
  keepsWater: boolean;
  /** Painted grass above 0.6: the game only plants groves on cells this green. */
  groves: boolean;
  /** Painted sand/rock: `treeless` keeps trees off these, so a beach or cliff needs some. */
  bare: boolean;
}

const CASES: CaseSpec[] = [
  { id: 'm6b_guerra_civil', size: 257, hasRiver: false, keepsWater: false, groves: true, bare: true },
  { id: 'm_cusco_1536', size: 129, hasRiver: false, keepsWater: false, groves: true, bare: true },
  { id: 'm_lima_1821', size: 129, hasRiver: true, keepsWater: true, groves: true, bare: true },
  { id: 'm_miraflores', size: 129, hasRiver: true, keepsWater: true, groves: true, bare: true },
  { id: 'm_real_felipe', size: 129, hasRiver: false, keepsWater: true, groves: false, bare: true },
  { id: 'm_tarapaca', size: 257, hasRiver: false, keepsWater: false, groves: false, bare: true },
  { id: 'm_vilcabamba', size: 257, hasRiver: true, keepsWater: true, groves: true, bare: true },
  { id: 'm_brena', size: 257, hasRiver: false, keepsWater: false, groves: true, bare: true },
];

function countWeight(field: AuthoredHeightField, channel: number, min: number): number {
  const weights = field.ground!.weights;
  let count = 0;
  for (let i = 0; i < weights.length; i += 4) if (weights[i + channel]! > min * 255) count++;
  return count;
}

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

function walkableComponents(field: AuthoredHeightField): number[] {
  const size = field.worldSize;
  const heightAt = (x: number, z: number): number => sampleAuthoredHeight(field, x, z);
  const blocked = (x: number, z: number): boolean =>
    // Same rule and scale as the pathfinder: `terrainSlope` already halves the gradient.
    terrainSlope(heightAt, x, z, 1) > MAX_WALKABLE_SLOPE;
  const open = new Uint8Array(size * size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) open[z * size + x] = blocked(x, z) ? 0 : 1;
  }
  const seen = new Uint8Array(size * size);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let i = 0; i < open.length; i++) {
    if (!open[i] || seen[i]) continue;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    let count = 0;
    while (stack.length) {
      const cell = stack.pop()!;
      count++;
      const cx = cell % size;
      const cz = (cell - cx) / size;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
          const ni = nz * size + nx;
          if (!open[ni] || seen[ni]) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
    }
    sizes.push(count);
  }
  return sizes.sort((a, b) => b - a);
}

function walkable(field: AuthoredHeightField, wx: number, wz: number): boolean {
  const heightAt = (x: number, z: number): number => sampleAuthoredHeight(field, x, z);
  return terrainSlope(heightAt, wx, wz, 1) <= MAX_WALKABLE_SLOPE;
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
      // A site whose GLB is replaced by procedural landmarks grounds its buildings with foundations
      // (`minGround`/`padHeight`); the model-footprint ring is a contract of the authored GLB, not loaded.
      if (site.hideModel) continue;
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

  it('keeps the resource and treeless thresholds the game reads', () => {
    for (const { id, groves, bare } of CASES) {
      const { override } = resolve(id);
      // `spawnResources` only places a grove where painted grass is above 0.6.
      const green = countWeight(override, 0, 0.6);
      if (groves) expect(green, `${id} grove-capable cells`).toBeGreaterThan(2000);
      else expect(green, `${id} must stay as bare as its base field`).toBe(0);
      if (bare) expect(countWeight(override, 3, 0.6), `${id} treeless rock`).toBeGreaterThan(200);
    }
  });

  it('keeps the steep missions reachable on the path grid', () => {
    // The steep fields must not fence areas off: the pathfinder blocks a 1 m cell above
    // MAX_WALKABLE_SLOPE, so a sharp ridge can leave whole pockets unreachable (it did once).
    for (const id of ['m_vilcabamba', 'm_brena', 'm_tarapaca', 'm6b_guerra_civil']) {
      const { mission, override } = resolve(id);
      const field = override;
      const cells = walkableComponents(field);
      const main = Math.max(...cells);
      const total = cells.reduce((sum, n) => sum + n, 0);
      expect(cells.length, `${id} walkable components`).toBe(1);
      expect(main / total, `${id} share in the main component`).toBeGreaterThan(0.99);
      // The players' anchors must sit on the one reachable region.
      const site = AUTHORED_SITES[mission.layout!.site!.id]!;
      for (const [label, point] of [
        ['base', mission.layout!.base],
        ['enemyBase', mission.layout!.enemyBase],
        ['anchor', { x: site.anchor.x / 256, z: site.anchor.z / 256 }],
      ] as const) {
        if (!point) continue;
        expect(walkable(field, point.x * 256, point.z * 256), `${id} ${label} is on the path grid`).toBe(true);
      }
    }
  });

  it('carves the Urubamba with one shallow ford under both mission roads', () => {
    // The bed stays under the waterline (so it is water) and above `waterLevel - 0.75` (so `isFordAt`
    // wades it). Without the ford the river splits the map and the hold objective becomes unreachable;
    // the m_vilcabamba E2E proves the crossing with real move orders.
    const { override } = resolve('m_vilcabamba');
    expect(override.river, 'm_vilcabamba river metadata').toBeDefined();
    expect(override.fords?.length, 'm_vilcabamba ford metadata').toBeGreaterThan(0);
    for (const z of [134, 144]) {
      const nearest = override.river!.path.reduce((best, p) =>
        Math.abs(p[1]! - z) < Math.abs(best[1]! - z) ? p : best,
      );
      const h = sampleAuthoredHeight(override, nearest[0]!, z);
      expect(h, `m_vilcabamba ford depth at z=${z}`).toBeGreaterThan(0.45);
      expect(h, `m_vilcabamba ford is water at z=${z}`).toBeLessThan(2.55);
    }
  });

  it('keeps the coastal and arid pairs apart by water and incision', () => {
    // Callao's bay must reach the fortress frame (the blind test swapped it with Miraflores otherwise).
    const callao = resolve('m_real_felipe').override;
    const site = AUTHORED_SITES['real_felipe_site']!.anchor;
    let waterCells = 0;
    for (let dz = -45; dz <= 45; dz += 5) {
      for (let dx = -45; dx <= 45; dx += 5) {
        if (Math.hypot(dx, dz) > 45) continue;
        if (sampleAuthoredHeight(callao, site.x + dx, site.z + dz) < WATER_LEVEL - 0.15) waterCells++;
      }
    }
    expect(waterCells, 'Callao has no water in the fortress frame').toBeGreaterThan(10);
    // Quipaipan's dry arroyo is a real incision, not a painted stripe.
    const pampa = resolve('m6b_guerra_civil').override;
    const drop = sampleAuthoredHeight(pampa, 120, 150) - sampleAuthoredHeight(pampa, 120, 128);
    expect(drop, 'Quipaipan arroyo depth').toBeGreaterThan(1.5);
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
