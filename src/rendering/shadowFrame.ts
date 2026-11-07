import * as THREE from 'three';

/**
 * Fit the sun's shadow camera to what the view camera sees instead of the whole map.
 *
 * A directional light projects a caster and the shadow it throws onto the same point of the shadow
 * map, so a light-space box that contains the visible ground also contains every caster that can
 * shade it; everything outside is culled from the shadow pass (fewer draw calls) and the same
 * shadow map covers a smaller area (sharper shadows).
 */
export interface ShadowFrame {
  /** World-space centre of the shadow frustum. */
  x: number;
  y: number;
  z: number;
  /** Half width / half height of the frustum in light space (its local x / y), in world units. */
  halfWidth: number;
  halfHeight: number;
}

/**
 * Shadow-map resolution per quality preset. The frustum fits the view (about 110 units across at the
 * default zoom at 1600×900), so 1024 matches the old 4096 over a fixed 440-unit box (≈9 texels per
 * unit) and 2048 doubles it; a VSM is redrawn and blurred twice every frame, so on an integrated GPU 4096² cost more than
 * the rest of the frame (m1, Intel UHD, medium: 14 FPS at 4096, 33 at 2048, 45 at 1024).
 */
export const SHADOW_MAP_SIZE: Record<'high' | 'medium' | 'low', number> = { high: 2048, medium: 1024, low: 1024 };

/** Extra border for the VSM blur. */
export const SHADOW_FRAME_MARGIN = 6;
/** Receivers stand up to this far above the ground plane (walls, pyramids, crowns). */
export const SHADOW_FRAME_LIFT = 14;
export const SHADOW_FRAME_MIN = 24;
/** The old fixed frustum (±220 around the origin) is the upper bound. */
export const SHADOW_FRAME_MAX = 220;

const _ndc: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
const _ray = new THREE.Ray();
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane();
const _normal = new THREE.Vector3(0, 1, 0);

/**
 * Where the view frustum's corner rays meet the horizontal plane `groundY` (rays that miss it are
 * clamped to `maxDistance`): the visible ground as a quadrilateral.
 */
export function viewFootprint(camera: THREE.PerspectiveCamera, groundY: number, maxDistance = 600): THREE.Vector3[] {
  camera.updateMatrixWorld();
  _plane.set(_normal, -groundY);
  return _ndc.map(([nx, ny]) => {
    _ray.origin.setFromMatrixPosition(camera.matrixWorld);
    _ray.direction.set(nx, ny, 0.5).unproject(camera).sub(_ray.origin).normalize();
    const hit = _ray.intersectPlane(_plane, _hit);
    const d = hit ? Math.min(_ray.origin.distanceTo(hit), maxDistance) : maxDistance;
    return _ray.at(d, new THREE.Vector3());
  });
}

const _basis = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _origin = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * The light-space box around `points` (each also lifted by SHADOW_FRAME_LIFT), with a margin,
 * clamped and snapped: the centre to whole shadow-map texels and the half sizes to steps of 4, so
 * panning the camera does not make shadow edges shimmer. `sunDir` points towards the sun; the light
 * looks along -sunDir with +Y up, as three's DirectionalLight shadow camera does.
 */
export function fitShadowFrame(points: THREE.Vector3[], sunDir: THREE.Vector3, mapSize: number): ShadowFrame {
  _basis.lookAt(sunDir, _origin, _up);
  _inv.copy(_basis).invert();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let depth = 0;
  for (const point of points) {
    for (const lift of [0, SHADOW_FRAME_LIFT]) {
      _p.set(point.x, point.y + lift, point.z).applyMatrix4(_inv);
      minX = Math.min(minX, _p.x);
      maxX = Math.max(maxX, _p.x);
      minY = Math.min(minY, _p.y);
      maxY = Math.max(maxY, _p.y);
      depth += _p.z;
    }
  }
  depth /= points.length * 2;
  const half = (size: number): number =>
    Math.ceil(THREE.MathUtils.clamp(size / 2 + SHADOW_FRAME_MARGIN, SHADOW_FRAME_MIN, SHADOW_FRAME_MAX) / 4) * 4;
  const halfWidth = half(maxX - minX);
  const halfHeight = half(maxY - minY);
  const texelX = (halfWidth * 2) / mapSize;
  const texelY = (halfHeight * 2) / mapSize;
  _p.set(
    Math.round((minX + maxX) / 2 / texelX) * texelX,
    Math.round((minY + maxY) / 2 / texelY) * texelY,
    depth,
  ).applyMatrix4(_basis);
  return { x: _p.x, y: _p.y, z: _p.z, halfWidth, halfHeight };
}
