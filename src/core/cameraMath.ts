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
  /** Keep the camera focus near the map edge (0 A.D.-style, in world units). */
  edgeMargin: 8,
} as const;

/** Camera elevation and vertical field of view used by the ground-footprint math. */
export const CAMERA_PITCH = 0.9;
export const CAMERA_FOV_RAD = (48 * Math.PI) / 180;

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

/**
 * Rotate a screen-space delta (dx, dz; +dz = down) into world XZ by the camera
 * yaw. This is a rotation by `-yaw`: pressing "up" moves the target along the
 * camera's forward ground direction, "right" along its right vector.
 */
export function rotateToWorld(dx: number, dz: number, yaw: number): Vec2 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: c * dx + s * dz, y: -s * dx + c * dz };
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
 * Clamp the camera focus (screen-center ground point) near the map edge.
 * Unlike a viewport clamp this still lets the camera follow units into corners;
 * the view may show the map edge/backdrop, as in 0 A.D.
 */
export function clampFocusToMap(x: number, z: number, size: number, margin: number): Vec2 {
  const m = Math.min(margin, size / 2);
  return { x: clampNum(x, m, size - m), y: clampNum(z, m, size - m) };
}

/**
 * Ground footprint of the perspective camera at the target plane, including
 * the farther top edge. `Vec2.y` is world z.
 */
export function viewGroundQuad(
  x: number,
  z: number,
  zoom: number,
  aspect: number,
  yaw: number,
  pitch: number = CAMERA_PITCH,
  fovRad: number = CAMERA_FOV_RAD,
): Vec2[] {
  const halfV = fovRad / 2;
  const horiz = Math.cos(pitch) * zoom;
  const height = Math.sin(pitch) * zoom;
  const topDist = height / Math.tan(pitch - halfV);
  const bottomDist = height / Math.tan(pitch + halfV);
  const tanH = Math.tan(halfV) * aspect;
  const topX = topDist * tanH;
  const bottomX = bottomDist * tanH;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const forward = { x: -s, y: -c };
  const right = { x: c, y: -s };
  const camera = { x: x + s * horiz, y: z + c * horiz };
  const topMid = { x: camera.x + forward.x * topDist, y: camera.y + forward.y * topDist };
  const bottomMid = { x: camera.x + forward.x * bottomDist, y: camera.y + forward.y * bottomDist };
  const topLeft = { x: topMid.x - right.x * topX, y: topMid.y - right.y * topX };
  const topRight = { x: topMid.x + right.x * topX, y: topMid.y + right.y * topX };
  const bottomLeft = { x: bottomMid.x - right.x * bottomX, y: bottomMid.y - right.y * bottomX };
  const bottomRight = { x: bottomMid.x + right.x * bottomX, y: bottomMid.y + right.y * bottomX };
  return [bottomLeft, bottomRight, topRight, topLeft];
}

/** Conservative half-extents of the view footprint (the far/top edge wins). */
export function viewHalfExtents(
  zoom: number,
  aspect: number,
  yaw: number,
  pitch: number = CAMERA_PITCH,
  fovRad: number = CAMERA_FOV_RAD,
): Vec2 {
  const halfV = fovRad / 2;
  const horiz = Math.cos(pitch) * zoom;
  const height = Math.sin(pitch) * zoom;
  const topDist = height / Math.tan(pitch - halfV);
  const bottomDist = height / Math.tan(pitch + halfV);
  const tanH = Math.tan(halfV) * aspect;
  const topX = topDist * tanH;
  const bottomX = bottomDist * tanH;
  const topZ = topDist - horiz;
  const bottomZ = horiz - bottomDist;
  const halfX = Math.max(topX, bottomX);
  const halfZ = Math.max(topZ, bottomZ);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return { x: halfX * c + halfZ * s, y: halfX * s + halfZ * c };
}

/** Largest zoom that still keeps the rotated view footprint inside the map. */
export function maxZoomForMap(
  mapSize: number,
  aspect: number,
  yaw: number,
  configuredMax: number = CAMERA_CONFIG.maxZoom,
  pitch: number = CAMERA_PITCH,
  fovRad: number = CAMERA_FOV_RAD,
): number {
  const extents = viewHalfExtents(1, aspect, yaw, pitch, fovRad);
  return Math.min(configuredMax, mapSize / (2 * extents.x), mapSize / (2 * extents.y));
}
