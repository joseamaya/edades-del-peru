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
  x: number;
  y: number;
  z: number;
  /** Half size of the square shadow frustum, in world units. */
  extent: number;
}

/** Extra border for the VSM blur and receivers that stand above the ground plane. */
export const SHADOW_FRAME_MARGIN = 10;
export const SHADOW_FRAME_MIN = 40;
/** The old fixed frustum (±220 around the origin) is the upper bound. */
export const SHADOW_FRAME_MAX = 220;

const _ndc: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
const _ray = new THREE.Ray();
const _p = new THREE.Vector3();
const _plane = new THREE.Plane();

/**
 * Where the view frustum's corner rays meet the horizontal plane `groundY` (rays that miss it are
 * clamped to `maxDistance`), framed as a centre and a radius.
 */
export function shadowFrameFor(camera: THREE.PerspectiveCamera, groundY: number, maxDistance = 600): ShadowFrame {
  camera.updateMatrixWorld();
  _plane.set(new THREE.Vector3(0, 1, 0), -groundY);
  const points: THREE.Vector3[] = [];
  for (const [nx, ny] of _ndc) {
    _ray.origin.setFromMatrixPosition(camera.matrixWorld);
    _ray.direction.set(nx, ny, 0.5).unproject(camera).sub(_ray.origin).normalize();
    const hit = _ray.intersectPlane(_plane, _p);
    const d = hit ? Math.min(_ray.origin.distanceTo(hit), maxDistance) : maxDistance;
    points.push(_ray.at(d, new THREE.Vector3()));
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  let radius = 0;
  for (const p of points) radius = Math.max(radius, Math.hypot(p.x - x, p.z - z));
  const extent = THREE.MathUtils.clamp(radius + SHADOW_FRAME_MARGIN, SHADOW_FRAME_MIN, SHADOW_FRAME_MAX);
  return { x, y: groundY, z, extent };
}

const _basis = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _origin = new THREE.Vector3();

/**
 * Snap the frame centre to whole shadow-map texels in light space, so panning the camera does not
 * make shadow edges shimmer. `sunDir` points towards the sun; the extent is quantised too.
 */
export function snapShadowFrame(frame: ShadowFrame, sunDir: THREE.Vector3, mapSize: number): ShadowFrame {
  const extent = Math.ceil(frame.extent / 8) * 8;
  const texel = (extent * 2) / mapSize;
  _basis.lookAt(sunDir, _origin, _up);
  _inv.copy(_basis).invert();
  _p.set(frame.x, frame.y, frame.z).applyMatrix4(_inv);
  _p.x = Math.round(_p.x / texel) * texel;
  _p.y = Math.round(_p.y / texel) * texel;
  _p.applyMatrix4(_basis);
  return { x: _p.x, y: _p.y, z: _p.z, extent };
}
