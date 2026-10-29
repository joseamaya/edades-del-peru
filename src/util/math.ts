/** Math and color utilities. */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function damp(a: number, b: number, lambda: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function distance2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Terrain slope magnitude (0 flat .. 1 cliff) from neighbour height samples at
 * distance `d`. Shared by `Terrain.getSlope` and `Pathfinder.bakeTerrain` so the
 * walkable-slope rule cannot drift between them.
 */
export function terrainSlope(heightFn: (x: number, z: number) => number, x: number, z: number, d: number): number {
  const hx = heightFn(x + d, z) - heightFn(x - d, z);
  const hz = heightFn(x, z + d) - heightFn(x, z - d);
  return Math.min(1, (Math.hypot(hx, hz) / (2 * d)) * 0.5);
}

/** Angle (rad) from a to b in XZ. */
export function angleTo(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bz - az, bx - ax);
}

/**
 * Rotation for a +Z-facing model so it looks along a movement yaw (angle from
 * +X). The unit yaw measures the direction of travel, while Three.js rotates a
 * +Z vector by `rotation.y`; a plain assignment leaves the model 90 degrees off.
 */
export function facingRotation(yaw: number): number {
  return Math.atan2(Math.cos(yaw), Math.sin(yaw));
}

/** Shortest signed delta from `from` to `to` in [-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (v: number) =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');
  return '#' + to2(r) + to2(g) + to2(b);
}

/** Mix two hex colors. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(lerp(ca.r, cb.r, t), lerp(ca.g, cb.g, t), lerp(ca.b, cb.b, t));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' M';
  if (n >= 10_000) return Math.round(n / 1000) + ' K';
  return String(Math.round(n));
}

/** Format a stat value without floating-point noise (3.3000000000000003 -> 3.3). */
export function formatStat(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Rotate a local (x, z) offset around the Y axis. */
export function rotateXZ(lx: number, lz: number, yaw: number): { x: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: lx * c - lz * s, z: lx * s + lz * c };
}

/** Shortest distance from a point to a finite 2D segment. */
export function distanceToSegment(
  x: number,
  z: number,
  from: { x: number; z: number },
  to: { x: number; z: number },
): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (z - from.z) * dz) / len2));
  return Math.hypot(x - (from.x + t * dx), z - (from.z + t * dz));
}
