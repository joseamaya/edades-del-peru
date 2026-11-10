/** A heightfield authored in metres for a campaign site (not procedural noise). */
import type { Polyline } from '../../util/math';

export interface AuthoredHeightField {
  /** Number of samples per side. */
  size: number;
  /** World size in metres represented by the field. */
  worldSize: number;
  /** Row-major heights in world metres. */
  heights: Float32Array;
  /** Optional painted ground: RGBA (grass, dirt, sand, rock) weights on a `size` x `size` grid. */
  ground?: { size: number; weights: Uint8Array };
  /** Optional carved river channel: centreline in world metres and its half-width. */
  river?: { path: Polyline; halfWidth: number };
  /** Optional coastline as the waterline x sampled every `step` metres along z. */
  coast?: { step: number; x: readonly number[] };
  /**
   * Optional shallow fords over the `river`: z centre and half-width in metres. The bed sits under the
   * waterline, so the pathfinder must treat these cells as walkable water.
   */
  fords?: readonly { z: number; halfWidth: number }[];
}

/** Bilinear lookup of the painted ground weights (grass, dirt, sand, rock; 0..1), or null. */
export function sampleAuthoredGround(
  field: AuthoredHeightField,
  x: number,
  z: number,
): [number, number, number, number] | null {
  const g = field.ground;
  if (!g) return null;
  const n = g.size;
  const fx = Math.max(0, Math.min(n - 1, (x / field.worldSize) * n - 0.5));
  const fz = Math.max(0, Math.min(n - 1, (z / field.worldSize) * n - 0.5));
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(n - 1, x0 + 1);
  const z1 = Math.min(n - 1, z0 + 1);
  const tx = fx - x0;
  const tz = fz - z0;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const a = g.weights[(z0 * n + x0) * 4 + c]! * (1 - tx) + g.weights[(z0 * n + x1) * 4 + c]! * tx;
    const b = g.weights[(z1 * n + x0) * 4 + c]! * (1 - tx) + g.weights[(z1 * n + x1) * 4 + c]! * tx;
    out[c] = (a * (1 - tz) + b * tz) / 255;
  }
  return out;
}

/** Bilinear lookup into an authored heightfield; outside the field is clamped. */
export function sampleAuthoredHeight(field: AuthoredHeightField, x: number, z: number): number {
  const n = field.size;
  const fx = (x / field.worldSize) * (n - 1);
  const fz = (z / field.worldSize) * (n - 1);
  const x0 = Math.max(0, Math.min(n - 1, Math.floor(fx)));
  const z0 = Math.max(0, Math.min(n - 1, Math.floor(fz)));
  const x1 = Math.min(n - 1, x0 + 1);
  const z1 = Math.min(n - 1, z0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0));
  const tz = Math.max(0, Math.min(1, fz - z0));
  const h00 = field.heights[z0 * n + x0];
  const h10 = field.heights[z0 * n + x1];
  const h01 = field.heights[z1 * n + x0];
  const h11 = field.heights[z1 * n + x1];
  const a = h00 + (h10 - h00) * tx;
  const b = h01 + (h11 - h01) * tx;
  return a + (b - a) * tz;
}
