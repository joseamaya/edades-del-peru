/**
 * Pure camera math shared by `RTSCamera`. No THREE and no DOM, so the panning
 * rules (edge scrolling, keyboard, middle-drag, bounds) are unit-testable.
 */

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Centralized camera tuning: no scattered magic numbers. */
export const CAMERA_CONFIG = {
  /** Distance from a viewport edge (px) at which edge scrolling begins. */
  edgeZone: 36,
  /** Edge-scroll speed, as a multiple of zoom (world units per second). */
  edgeSpeed: 1.6,
  /** Keyboard pan speed, as a multiple of zoom. */
  keySpeed: 1.35,
  /** Wheel delta -> zoom change. */
  zoomWheelStep: 0.22,
  minZoom: 28,
  maxZoom: 210,
  /** Smoothing rate (per second) of the pan target. */
  panLambda: 5,
  /** Smoothing rate (per second) of the zoom. */
  zoomLambda: 6,
  /** How far (world units) the visible edge may pass the terrain border. */
  boundsMargin: 6,
} as const;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clampNum(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Normalize a 2D vector; a (near-)zero vector stays zero. */
export function normalize2D(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** Progressive factor in [-1, 1] for one axis: 0 outside the zone, ±1 at the border. */
export function edgeFactor(pos: number, min: number, max: number, zone: number): number {
  if (zone <= 0) return 0;
  if (pos < min + zone) return -clamp01((min + zone - pos) / zone);
  if (pos > max - zone) return clamp01((pos - (max - zone)) / zone);
  return 0;
}

/**
 * Edge-scroll vector for a pointer at (px, py) inside `rect`: grows smoothly
 * toward the border and is normalized so a corner is not faster than an edge.
 */
export function edgeVector(px: number, py: number, rect: Rect, zone: number): Vec2 {
  const fx = edgeFactor(px, rect.left, rect.right, zone);
  const fy = edgeFactor(py, rect.top, rect.bottom, zone);
  const len = Math.hypot(fx, fy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const mag = Math.min(1, len);
  return { x: (fx / len) * mag, y: (fy / len) * mag };
}

/** Keyboard pan direction (screen space: +y = down), normalized for diagonals. */
export function keyPanVector(keys: Iterable<string>): Vec2 {
  const k = new Set(keys);
  let x = 0;
  let y = 0;
  if (k.has('w') || k.has('arrowup')) y -= 1;
  if (k.has('s') || k.has('arrowdown')) y += 1;
  if (k.has('a') || k.has('arrowleft')) x -= 1;
  if (k.has('d') || k.has('arrowright')) x += 1;
  return normalize2D(x, y);
}

/** Rotate a screen-space delta (dx, dz) into world XZ by the camera yaw. */
export function rotateToWorld(dx: number, dz: number, yaw: number): Vec2 {
  const c = Math.cos(-yaw);
  const s = Math.sin(-yaw);
  return { x: c * dx - s * dz, y: -s * dx - c * dz };
}

/** World units per pixel at the target plane (geometric, not a magic factor). */
export function worldPerPixel(zoom: number, fovRad: number, viewportH: number): number {
  if (viewportH <= 0) return 0;
  return (2 * Math.tan(fovRad / 2) * zoom) / viewportH;
}

/**
 * Map a middle-mouse screen delta to a world target delta. "Grab the map": the
 * content follows the cursor, so the target moves opposite to the drag.
 */
export function dragToWorld(screenDx: number, screenDy: number, yaw: number, wpp: number): Vec2 {
  return rotateToWorld(-screenDx * wpp, -screenDy * wpp, yaw);
}

/**
 * Clamp a target so the visible rectangle stays near the terrain (with margin).
 * When the viewport is wider than the map, the axis is centered.
 */
export function clampToBounds(x: number, z: number, size: number, halfW: number, halfD: number, margin: number): Vec2 {
  const mid = size / 2;
  const loX = Math.min(halfW - margin, mid);
  const hiX = Math.max(size - halfW + margin, mid);
  const loZ = Math.min(halfD - margin, mid);
  const hiZ = Math.max(size - halfD + margin, mid);
  return { x: clampNum(x, loX, hiX), y: clampNum(z, loZ, hiZ) };
}
