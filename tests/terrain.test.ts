import { describe, it, expect } from 'vitest';
import { generateHeightField } from '../src/rendering/heightField';
import { MAP_PROFILES } from '../src/model/defs/profiles';

function hash(a: Float32Array): number {
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
