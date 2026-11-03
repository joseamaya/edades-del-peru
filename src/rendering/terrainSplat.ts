import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainData } from '../sim/TerrainData';
import { smoothstep } from '../util/math';

/** Splat texture resolution: one texel per ~0.375 m on the 192 m maps. */
export const TERRAIN_SPLAT_SIZE = 512;

/** Four material weights, packed into RGBA in this order. */
export interface TerrainSplat {
  size: number;
  /** RGBA: grass, dirt, sand, rock (0-255 each). */
  data: Uint8Array;
}

export interface TerrainSplatOptions {
  size?: number;
  seed?: number;
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency, seed + i * 101) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return value / norm;
}

/**
 * Build the per-match material weights from the pure terrain data. The result is
 * deterministic for the same terrain, profile and seed; it never touches the
 * simulation or the GPU.
 */
export function buildTerrainSplat(
  data: TerrainData,
  profile: HistoricalMapProfile,
  options: TerrainSplatOptions = {},
): TerrainSplat {
  const size = Math.max(2, Math.round(options.size ?? TERRAIN_SPLAT_SIZE));
  const seed = options.seed ?? 0;
  const out = new Uint8Array(size * size * 4);
  const water = data.waterLevel;
  const aridity = profile.climate.aridity;
  const veg = profile.vegetation.density;

  for (let z = 0; z < size; z++) {
    const wz = ((z + 0.5) / size) * data.size;
    for (let x = 0; x < size; x++) {
      const wx = ((x + 0.5) / size) * data.size;
      const h = data.getHeight(wx, wz);
      const slope = data.getSlope(wx, wz);
      const moisture = data.getMoisture(wx, wz);
      const terrace = data.getTerrace(wx, wz);
      const canal = data.getCanal(wx, wz);

      // Perturb the hard thresholds so material borders are irregular instead
      // of contour lines. The noise is low frequency and seed-stable.
      const thr = (fbm(wx * 0.055, wz * 0.055, seed + 1) - 0.5) * 1.1;
      const thrSlope = (fbm(wx * 0.085 + 17, wz * 0.085 - 9, seed + 2) - 0.5) * 0.12;
      const hN = h + thr;
      const slopeN = Math.min(1, Math.max(0, slope + thrSlope));

      const sandNear = 1 - smoothstep(water + 0.2, water + 1.8, hN);
      const sandArid = aridity * (1 - smoothstep(6, 10, hN));
      let sand = Math.max(sandNear, sandArid);
      let rock = smoothstep(4.5, 9, hN) * 0.7 + smoothstep(0.25, 0.6, slopeN) * 0.85;
      let dirt = Math.max((1 - smoothstep(0.6, 2.8, hN)) * 0.4, aridity * 0.4);
      dirt += terrace * 0.18 + canal * 0.35;

      // Humid, vegetated ground pushes back the bare/rocky masks.
      const green = veg * (0.18 + moisture * 0.35);
      sand = Math.max(0, sand - green * 0.35);
      dirt = Math.max(0, dirt - green * 0.2);
      rock = Math.max(0, rock - green * 0.1);

      sand = Math.min(1, Math.max(0, sand));
      dirt = Math.min(1, Math.max(0, dirt));
      rock = Math.min(1, Math.max(0, rock));
      let grass = Math.max(0, 1 - dirt - sand - rock);

      const sum = grass + dirt + sand + rock;
      if (sum > 1) {
        const inv = 1 / sum;
        grass *= inv;
        dirt *= inv;
        sand *= inv;
        rock *= inv;
      }

      const i = (z * size + x) * 4;
      out[i] = Math.round(grass * 255);
      out[i + 1] = Math.round(dirt * 255);
      out[i + 2] = Math.round(sand * 255);
      out[i + 3] = Math.round(rock * 255);
    }
  }

  return { size, data: out };
}
