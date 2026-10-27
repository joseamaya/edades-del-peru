/** A heightfield authored in metres for a campaign site (not procedural noise). */
export interface AuthoredHeightField {
  /** Number of samples per side. */
  size: number;
  /** World size in metres represented by the field. */
  worldSize: number;
  /** Row-major heights in world metres. */
  heights: Float32Array;
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
