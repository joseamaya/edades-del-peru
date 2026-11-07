import { describe, it, expect } from 'vitest';
import { generateHeightField } from '../src/sim/heightField';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import {
  CARAL_GROUND,
  CARAL_GROUND_SIZE,
  CARAL_HEIGHTMAP,
  CARAL_HEIGHTMAP_SIZE,
  CARAL_HEIGHTMAP_WORLD_SIZE,
} from '../src/model/defs/caralHeightmap';
import { sampleAuthoredGround, sampleAuthoredHeight } from '../src/model/defs/authoredTerrain';

const CARAL_GROUND_FIELD = { size: CARAL_GROUND_SIZE, weights: CARAL_GROUND };
import { TerrainData } from '../src/sim/TerrainData';
import { buildTerrainSplat } from '../src/rendering/terrainSplat';

function hash(a: ArrayLike<number>): number {
  let h = 2166136261;
  for (let i = 0; i < a.length; i++) {
    h ^= Math.round(a[i] * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function maxOf(a: Float32Array): number {
  let m = -Infinity;
  for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i];
  return m;
}
function countNonZero(a: Float32Array): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i] > 0) c++;
  return c;
}

describe('deterministic height field', () => {
  it('produces the same map for the same seed and profile', () => {
    const a = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    const b = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    expect(a.heightMap.length).toBe(b.heightMap.length);
    expect(hash(a.heightMap)).toBe(hash(b.heightMap));
    expect(hash(a.moistureMap)).toBe(hash(b.moistureMap));
    expect(hash(a.terraceMap)).toBe(hash(b.terraceMap));
    expect(hash(a.canalMap)).toBe(hash(b.canalMap));
  });

  it('a different seed produces a different map', () => {
    const a = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    const b = generateHeightField(64, 778, MAP_PROFILES.central_coast);
    expect(hash(a.heightMap)).not.toBe(hash(b.heightMap));
  });

  it('a different profile produces a different map', () => {
    const a = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    const b = generateHeightField(64, 777, MAP_PROFILES.high_andes);
    expect(hash(a.heightMap)).not.toBe(hash(b.heightMap));
  });

  it('the high Andes rise higher than the central coast', () => {
    const coast = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    const andes = generateHeightField(64, 777, MAP_PROFILES.high_andes);
    expect(maxOf(andes.heightMap)).toBeGreaterThan(maxOf(coast.heightMap));
  });

  it('carries the profile water level', () => {
    const f = generateHeightField(64, 777, MAP_PROFILES.altiplano);
    expect(f.waterLevel).toBe(MAP_PROFILES.altiplano.water.level);
  });

  it('carves more terracing (andenes) where the profile allows it', () => {
    const andes = generateHeightField(96, 777, MAP_PROFILES.high_andes);
    const jungle = generateHeightField(96, 777, MAP_PROFILES.amazon);
    // the high Andes terraces its slopes; the jungle barely does (terraceChance 0.05)
    expect(countNonZero(andes.terraceMap)).toBeGreaterThan(0);
    expect(countNonZero(jungle.terraceMap)).toBeLessThan(countNonZero(andes.terraceMap) / 4);
  });

  it('carves no terraces when terraceChance is zero', () => {
    const flat = { ...MAP_PROFILES.high_andes, terrain: { ...MAP_PROFILES.high_andes.terrain, terraceChance: 0 } };
    expect(countNonZero(generateHeightField(96, 777, flat).terraceMap)).toBe(0);
  });

  it('carves canals only where the cultural landscape asks for them', () => {
    const coast = generateHeightField(96, 777, MAP_PROFILES.central_coast); // canal weight 0.7
    const amazon = generateHeightField(96, 777, MAP_PROFILES.amazon); // no canal feature
    expect(countNonZero(coast.canalMap)).toBeGreaterThan(0);
    expect(countNonZero(amazon.canalMap)).toBe(0);
  });

  it('keeps every canal bed above the waterline', () => {
    const f = generateHeightField(128, 777, MAP_PROFILES.north_coast);
    for (let i = 0; i < f.canalMap.length; i++) {
      if (f.canalMap[i] > 0) expect(f.heightMap[i]).toBeGreaterThan(f.waterLevel);
    }
  });

  it('traces canal centre-lines on the carved canal mask (several profiles/seeds)', () => {
    const n = 97;
    const cases = [
      [MAP_PROFILES.central_coast, 777],
      [MAP_PROFILES.north_coast, 42],
      [MAP_PROFILES.north_coast, 2024],
    ] as const;
    for (const [profile, seed] of cases) {
      const f = generateHeightField(96, seed, profile);
      expect(f.canalPaths.length, `seed ${seed}`).toBeGreaterThan(0);
      for (const path of f.canalPaths) {
        expect(path.length).toBeGreaterThan(3);
        // most centre-line points sit on the carved mask (a canal may cross a river, where no cut is needed)
        const onMask = path.filter((p) => f.canalMap[p.z * n + Math.round(p.x)] > 0).length;
        expect(onMask / path.length, `seed ${seed}`).toBeGreaterThan(0.5);
      }
    }
    expect(generateHeightField(96, 777, MAP_PROFILES.amazon).canalPaths.length).toBe(0);
  });

  it('never terraces below the waterline', () => {
    const f = generateHeightField(96, 777, MAP_PROFILES.high_andes);
    for (let i = 0; i < f.terraceMap.length; i++) {
      if (f.terraceMap[i] > 0) expect(f.heightMap[i]).toBeGreaterThan(f.waterLevel);
    }
  });
});

describe('deterministic terrain splat', () => {
  const profile = MAP_PROFILES.central_coast;
  const data = new TerrainData(192, 96, 777, profile);

  it('packs four material weights that sum to one', () => {
    const splat = buildTerrainSplat(data, profile, { size: 64, seed: 777 });
    for (let i = 0; i < splat.data.length; i += 4) {
      const sum = (splat.data[i] + splat.data[i + 1] + splat.data[i + 2] + splat.data[i + 3]) / 255;
      expect(sum).toBeGreaterThan(0.97);
      expect(sum).toBeLessThan(1.03);
    }
  });

  it('produces the same splat for the same seed and profile', () => {
    const a = buildTerrainSplat(data, profile, { size: 64, seed: 777 });
    const b = buildTerrainSplat(data, profile, { size: 64, seed: 777 });
    expect(hash(a.data)).toBe(hash(b.data));
  });

  it('a different seed changes the noisy material borders', () => {
    const a = buildTerrainSplat(data, profile, { size: 64, seed: 777 });
    const b = buildTerrainSplat(data, profile, { size: 64, seed: 778 });
    expect(hash(a.data)).not.toBe(hash(b.data));
  });

  it('puts sand in the water and rock on the highest ground', () => {
    const splat = buildTerrainSplat(data, profile, { size: 64, seed: 777 });
    const heightColumns = 97;
    let low = 0;
    let high = 0;
    for (let i = 1; i < data.heightMap.length; i++) {
      if (data.heightMap[i] < data.heightMap[low]) low = i;
      if (data.heightMap[i] > data.heightMap[high]) high = i;
    }
    const at = (index: number) => {
      const x = Math.min(63, Math.floor(((index % heightColumns) / (heightColumns - 1)) * 64));
      const z = Math.min(63, Math.floor((Math.floor(index / heightColumns) / (heightColumns - 1)) * 64));
      return (z * 64 + x) * 4;
    };
    const wet = at(low);
    const peak = at(high);
    expect(splat.data[wet + 2]).toBeGreaterThan(splat.data[wet]);
    expect(splat.data[peak + 3]).toBeGreaterThan(splat.data[peak]);
  });
});

describe('authored river fords', () => {
  it('raises a dry ford above the pathfinding waterline and keeps the river beside it', () => {
    const res = 128;
    const layout = {
      river: {
        z: 0.55,
        width: 0.04,
        valleyWidth: 0.16,
        amplitude: 0,
        phase: 0,
        fords: [{ x: 0.5, width: 0.08 }],
      },
    };
    const f = generateHeightField(res, 3000, MAP_PROFILES.central_coast, layout);
    const n = res + 1;
    const at = (x: number, z: number) => f.heightMap[z * n + x];
    // centre of the ford: above the pathfinder's `waterLevel + 0.35` cut-off
    expect(at(64, 70)).toBeGreaterThan(f.waterLevel + 0.35);
    // river beside the ford: still below the waterline
    expect(at(50, 70)).toBeLessThan(f.waterLevel);
  });
});

describe('authored Caral heightfield', () => {
  const field = {
    size: CARAL_HEIGHTMAP_SIZE,
    worldSize: CARAL_HEIGHTMAP_WORLD_SIZE,
    heights: CARAL_HEIGHTMAP,
  };

  it('covers the 256 m Supe transect at 1 m resolution', () => {
    expect(field.size).toBe(257);
    expect(field.worldSize).toBe(256);
    expect(field.heights.length).toBe(257 * 257);
  });

  // The city keeps its former 192 m layout, shifted east by 64 m.
  it('keeps the site terrace flat at 8 m, with the sunken plaza basin', () => {
    expect(sampleAuthoredHeight(field, 164, 84)).toBeCloseTo(8, 3);
    expect(sampleAuthoredHeight(field, 164, 30)).toBeCloseTo(8, 3);
    expect(sampleAuthoredHeight(field, 164, 53)).toBeCloseTo(7.45, 2);
  });

  it('runs the sea, the beach and Áspero along the west edge', () => {
    expect(sampleAuthoredHeight(field, 4, 120)).toBeLessThan(1);
    expect(sampleAuthoredHeight(field, 42, 172)).toBeGreaterThan(4);
    expect(sampleAuthoredHeight(field, 42, 172)).toBeLessThan(6);
  });

  it('keeps the Supe below the waterline from the city to its mouth', () => {
    for (const [x, z] of [
      [70, 40],
      [72, 120],
      [70, 180],
      [40, 208],
      [16, 210],
    ]) {
      expect(sampleAuthoredHeight(field, x!, z!), `${x},${z}`).toBeLessThan(2.05);
    }
    expect(sampleAuthoredHeight(field, 164, 84)).toBeGreaterThan(2.2);
  });

  it('carves a green floodplain and an eroded terrace edge between the river and the city', () => {
    const river = sampleAuthoredHeight(field, 71, 90);
    const bank = sampleAuthoredHeight(field, 80, 90);
    const floodplain = sampleAuthoredHeight(field, 94, 90);
    const edge = sampleAuthoredHeight(field, 106, 90);
    expect(bank).toBeGreaterThan(river);
    expect(floodplain).toBeGreaterThan(bank - 0.2);
    expect(edge).toBeGreaterThan(floodplain);
    expect(edge).toBeLessThan(8);
  });

  it('keeps the floodplain/terrace seam walkable between the river and the city', () => {
    let maxStep = 0;
    for (let z = 15; z <= 160; z++) {
      for (let x = 94; x < 116; x++) {
        maxStep = Math.max(
          maxStep,
          Math.abs(sampleAuthoredHeight(field, x + 1, z) - sampleAuthoredHeight(field, x, z)),
        );
      }
    }
    expect(maxStep).toBeLessThan(1);
  });

  it('paints the floodplain green and the terrace as desert', () => {
    const at = (x: number, z: number) => sampleAuthoredGround({ ...field, ground: CARAL_GROUND_FIELD }, x, z)!;
    expect(at(88, 100)[0]).toBeGreaterThan(at(170, 100)[0]);
    expect(at(170, 100)[2]).toBeGreaterThan(at(88, 100)[2]);
  });

  it('frames the valley with dry Andean foothills and coastal lomas', () => {
    expect(sampleAuthoredHeight(field, 249, 100)).toBeGreaterThan(20);
    expect(sampleAuthoredHeight(field, 164, 188)).toBeGreaterThan(12);
    expect(sampleAuthoredHeight(field, 60, 252)).toBeGreaterThan(8);
  });
});
