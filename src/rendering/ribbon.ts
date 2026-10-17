import * as THREE from 'three';
import { GROUND_TILE } from '../util/uv';

/**
 * Build a continuous ribbon (triangle strip) along a polyline at a constant
 * `width`, sampling the terrain height at every vertex so the road/path/canal
 * follows the relief. Consecutive samples share vertices, so there are no gaps
 * between segments (the old per-tile approach left them). UVs are already scaled
 * to the shared ground tile (`u` = distance along, `v` = across), so the caller
 * needs no `scaleUv`. Returns `null` for fewer than two points.
 */
export function buildRibbon(
  points: { x: number; z: number }[],
  width: number,
  getHeight: (x: number, z: number) => number,
): THREE.BufferGeometry | null {
  if (points.length < 2) return null;
  const n = points.length;
  const half = width / 2;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  let along = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[i - 1] ?? p;
    const next = points[i + 1] ?? p;
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    // offset magnitude is always `half`, so the strip cannot fold on itself
    const px = -dz * half;
    const pz = dx * half;
    if (i > 0) along += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    const lx = p.x + px;
    const lz = p.z + pz;
    const rx = p.x - px;
    const rz = p.z - pz;
    positions.set([lx, getHeight(lx, lz), lz], 2 * i * 3);
    positions.set([rx, getHeight(rx, rz), rz], (2 * i + 1) * 3);
    uvs.set([along / GROUND_TILE, 0], 2 * i * 2);
    uvs.set([along / GROUND_TILE, width / GROUND_TILE], (2 * i + 1) * 2);
  }
  const indices: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = 2 * i;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
