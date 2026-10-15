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

describe('deterministic height field', () => {
  it('produces the same map for the same seed and profile', () => {
    const a = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    const b = generateHeightField(64, 777, MAP_PROFILES.central_coast);
    expect(a.heightMap.length).toBe(b.heightMap.length);
    expect(hash(a.heightMap)).toBe(hash(b.heightMap));
    expect(hash(a.moistureMap)).toBe(hash(b.moistureMap));
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
});
