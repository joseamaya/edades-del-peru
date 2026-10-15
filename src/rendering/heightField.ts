import { fbm2, ridged2 } from '../util/noise';
import { RNG } from '../util/rng';
import { smoothstep } from '../util/math';
import type { HistoricalMapProfile } from '../model/defs/profiles';

export interface HeightField {
  heightMap: Float32Array;
  moistureMap: Float32Array;
  waterLevel: number;
}

/** Vertical scale of the base heightfield (before mountains). */
const HEIGHT_SCALE = 6.6;

/**
 * Deterministic heightfield generation driven by a `HistoricalMapProfile`. Pure
 * (no THREE): the same `seed` + `profile` always yields the same map, which is
 * what `tests/terrain.test.ts` pins.
 */
export function generateHeightField(resolution: number, seed: number, profile: HistoricalMapProfile): HeightField {
  const n = resolution + 1;
  const heightMap = new Float32Array(n * n);
  const moistureMap = new Float32Array(n * n);
  const t = profile.terrain;
  const aridity = profile.climate.aridity;

  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const nx = x / (resolution / 2) - 1;
      const nz = z / (resolution / 2) - 1;
      const border = Math.max(Math.abs(nx), Math.abs(nz)); // 0 center -> 1 edge

      let base = fbm2(nx * t.fbmScale + t.fbmOffset, nz * t.fbmScale, t.fbmOctaves) * t.baseGain + t.baseBias;
      if (t.borderCarve > 0) base -= smoothstep(0.9, 1.02, border) * t.borderCarve;

      // mountains (flattened at the edge to avoid spikes and artifacts)
      const mtn = ridged2(nx * 1.7 + 11, nz * 1.7, 4);
      const mtnMask = smoothstep(0.45, 0.82, mtn);
      const edgeBlend = 1 - smoothstep(0.92, 1.06, border);
      const height = base * HEIGHT_SCALE + Math.max(0, mtn - 0.52) * t.mtnAmp * mtnMask * edgeBlend;

      const i = z * n + x;
      heightMap[i] = height;
      const moist = fbm2(nx * 2.2 + 40, nz * 2.2, 3) * 0.6 + fbm2(nx * 0.4 + 3, nz * 0.4, 2) * 0.4;
      moistureMap[i] = moist * (1 - aridity * 0.72);
    }
  }

  carveRivers(heightMap, n, profile, new RNG(seed * 7919 + 17));
  return { heightMap, moistureMap, waterLevel: profile.water.level };
}

/** Carve rivers with directional noise, dropping the terrain toward the water level. */
function carveRivers(heightMap: Float32Array, n: number, profile: HistoricalMapProfile, rng: RNG): void {
  const waterLevel = profile.water.level;
  const width = profile.terrain.riverWidth;
  for (let r = 0; r < profile.terrain.riverCount; r++) {
    const startX = rng.int(0, n - 1);
    const endX = rng.int(0, n - 1);
    let cx = startX;
    let cz = 0;
    let wander = rng.range(-1, 1);
    while (cz < n) {
      wander += rng.range(-0.5, 0.5);
      wander = Math.max(-2.4, Math.min(2.4, wander));
      for (let dx = -Math.ceil(width * 2); dx <= Math.ceil(width * 2); dx++) {
        for (let dz = 0; dz < 3; dz++) {
          const x = Math.round(cx + dx + (endX - cx) * (cz / n));
          const z = Math.min(cz + dz, n - 1);
          if (x < 0 || x >= n) continue;
          const d = Math.abs(dx);
          const drop = (1 - d / (width * 2)) * 3.4;
          const i = z * n + x;
          if (heightMap[i] > waterLevel - 0.4) {
            heightMap[i] = Math.max(waterLevel - 0.6 - drop * 0.6, heightMap[i] - drop);
          }
        }
      }
      cz += rng.int(2, 4);
      cx += wander;
      cx = Math.max(2, Math.min(n - 3, cx));
    }
  }
}
