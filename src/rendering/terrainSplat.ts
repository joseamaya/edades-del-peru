import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainData } from '../sim/TerrainData';
import { smoothstep } from '../util/math';
import { fbm2 } from '../util/noise';

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
      const seedOffset = (seed % 997) * 0.37;
      const heightJitter = (fbm2(wx * 0.055 + seedOffset, wz * 0.055 - seedOffset * 0.7, 3) - 0.5) * 1.1;
      const slopeJitter = (fbm2(wx * 0.085 + 17 + seedOffset * 0.3, wz * 0.085 - 9 - seedOffset * 0.2, 3) - 0.5) * 0.12;
      const noisyHeight = h + heightJitter;
      const noisySlope = Math.min(1, Math.max(0, slope + slopeJitter));

      const painted = data.getAuthoredGround(wx, wz);
      if (painted) {
        // Authored sites paint their own zones; jitter and slope only break up the borders.
        const j = heightJitter * 0.18;
        const steep = smoothstep(0.35, 0.7, noisySlope);
        const w = [
          Math.max(0, painted[0] + j) * (1 - steep),
          Math.max(0, painted[1] - j * 0.5) * (1 - steep),
          Math.max(0, painted[2] - j * 0.5) * (1 - steep),
          painted[3] * (1 - steep) + steep,
        ];
        const total = Math.max(1e-6, w[0]! + w[1]! + w[2]! + w[3]!);
        const i = (z * size + x) * 4;
        for (let c = 0; c < 4; c++) out[i + c] = Math.round((w[c]! / total) * 255);
        continue;
      }

      const sandNear = 1 - smoothstep(water + 0.2, water + 1.8, noisyHeight);
      const sandArid = aridity * (1 - smoothstep(6, 10, noisyHeight));
      let sand = Math.max(sandNear, sandArid);
      let rock = smoothstep(4.5, 9, noisyHeight) * 0.7 + smoothstep(0.25, 0.6, noisySlope) * 0.85;
      let dirt = Math.max((1 - smoothstep(0.6, 2.8, noisyHeight)) * 0.4, aridity * 0.4);
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
