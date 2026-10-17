import { fbm2, ridged2 } from '../util/noise';
import { RNG } from '../util/rng';
import { smoothstep } from '../util/math';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import { landscapeWeight } from '../model/defs/landscape';

export interface HeightField {
  heightMap: Float32Array;
  moistureMap: Float32Array;
  /** Strength of agricultural terracing (andenes) per cell, 0 (none) .. ~0.55 (full shelf). */
  terraceMap: Float32Array;
  /** Strength of irrigation canals per cell (0 none .. 1 centre), for the water ribbon. */
  canalMap: Float32Array;
  /** Irrigation canal centre-lines (cell coordinates), the source of truth for the canal ribbon. */
  canalPaths: { x: number; z: number }[][];
  waterLevel: number;
}

/** Vertical scale of the base heightfield (before mountains). */
const HEIGHT_SCALE = 6.6;

/** Vertical spacing between terraced shelves (world units). */
const TERRACE_STEP = 0.8;
/** Per-cell height delta band where terraces can form: below is too flat, above is a cliff. */
const TERRACE_MIN_DELTA = 0.12;
const TERRACE_MAX_DELTA = 2.6;
/** How much of the way to a flat shelf a terraced cell is pulled (keeps a slight slope). */
const TERRACE_FLATTEN = 0.55;

/** Irrigation canal cut depth (world units); the bed never drops below the waterline. */
const CANAL_DEPTH = 1.2;
/**
 * Irrigation canal carve half-width (in **cells**): the ditch spans
 * `2 × (CANAL_WIDTH_CELLS + 0.5)` cells. `Terrain.canalWidth` exposes the matching
 * world width for the water ribbon, so the two never drift.
 */
export const CANAL_WIDTH_CELLS = 1.6;

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
  const moisture = profile.climate.moisture;

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
      moistureMap[i] = moist * (1 - aridity * 0.72) * (0.6 + moisture * 0.4);
    }
  }

  carveRivers(heightMap, n, profile, new RNG(seed * 7919 + 17));
  const terraceMap = carveTerraces(heightMap, n, profile, seed);
  const { canalMap, canalPaths } = carveCanals(heightMap, n, profile, seed);
  return { heightMap, moistureMap, terraceMap, canalMap, canalPaths, waterLevel: profile.water.level };
}

/**
 * Carve agricultural terraces (andenes) into moderate slopes, gated by the
 * profile's `terraceChance` and a coherent noise mask so they form patchy zones
 * (not per-cell noise). Writes a strength map consumed by the farm yield and the
 * terrain tint; the heightfield is pulled toward flat shelves so it reads as
 * stepped. Deterministic: same seed + profile -> same map.
 */
function carveTerraces(heightMap: Float32Array, n: number, profile: HistoricalMapProfile, seed: number): Float32Array {
  const terraceMap = new Float32Array(n * n);
  const chance = profile.terrain.terraceChance;
  if (chance <= 0) return terraceMap;
  const waterLevel = profile.water.level;
  const res = n - 1;
  const offset = new RNG(seed * 65537 + 23).range(0, 100);
  const orig = heightMap.slice();
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = z * n + x;
      const h = orig[i];
      if (h <= waterLevel + 1.2) continue;
      const hR = orig[z * n + Math.min(x + 1, n - 1)];
      const hD = orig[Math.min(z + 1, n - 1) * n + x];
      const delta = Math.max(Math.abs(h - hR), Math.abs(h - hD));
      if (delta < TERRACE_MIN_DELTA || delta > TERRACE_MAX_DELTA) continue;
      const nx = x / (res / 2) - 1;
      const nz = z / (res / 2) - 1;
      if (Math.max(Math.abs(nx), Math.abs(nz)) > 0.93) continue;
      if (fbm2(nx * 1.6 + offset, nz * 1.6, 3) < 1 - chance) continue;
      const shelf = Math.round(h / TERRACE_STEP) * TERRACE_STEP;
      const strength = (1 - Math.abs(h - shelf) / (TERRACE_STEP / 2)) * TERRACE_FLATTEN;
      if (strength <= 0) continue;
      heightMap[i] = h + (shelf - h) * strength;
      terraceMap[i] = strength;
    }
  }
  return terraceMap;
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

/**
 * Carve shallow irrigation canals (region cultural landscape). The bed is kept
 * **above** the waterline so a canal is a visual ditch, not a pathfinding wall or
 * a flooding source; the water ribbon follows the returned centre-lines.
 * Deterministic from `seed + profile`; writes a per-cell strength for the
 * renderer.
 */
function carveCanals(
  heightMap: Float32Array,
  n: number,
  profile: HistoricalMapProfile,
  seed: number,
): { canalMap: Float32Array; canalPaths: { x: number; z: number }[][] } {
  const canalMap = new Float32Array(n * n);
  const canalPaths: { x: number; z: number }[][] = [];
  if (!profile.culturalLandscape) return { canalMap, canalPaths };
  const weight = landscapeWeight(profile.culturalLandscape, 'canal');
  if (weight <= 0) return { canalMap, canalPaths };
  const waterLevel = profile.water.level;
  const rng = new RNG((seed * 2246822519 + 53) >>> 0);
  const width = CANAL_WIDTH_CELLS;
  const count = 1 + Math.round(weight * 2);
  for (let c = 0; c < count; c++) {
    const path: { x: number; z: number }[] = [];
    let cx = rng.int(0, n - 1);
    let cz = 0;
    let wander = rng.range(-1, 1);
    while (cz < n) {
      path.push({ x: cx, z: cz });
      wander += rng.range(-0.5, 0.5);
      wander = Math.max(-2.4, Math.min(2.4, wander));
      for (let dx = -Math.ceil(width); dx <= Math.ceil(width); dx++) {
        for (let dz = 0; dz < 3; dz++) {
          const x = Math.round(cx + dx);
          const z = Math.min(cz + dz, n - 1);
          if (x < 0 || x >= n) continue;
          const d = Math.abs(dx);
          const strength = 1 - d / (width + 0.5);
          if (strength <= 0) continue;
          const i = z * n + x;
          const bed = Math.max(waterLevel + 0.5, heightMap[i] - CANAL_DEPTH * strength);
          if (bed < heightMap[i]) {
            heightMap[i] = bed;
            if (strength > canalMap[i]) canalMap[i] = strength;
          }
        }
      }
      cz += rng.int(2, 4);
      cx += wander;
      cx = Math.max(2, Math.min(n - 3, cx));
    }
    canalPaths.push(path);
  }
  return { canalMap, canalPaths };
}
