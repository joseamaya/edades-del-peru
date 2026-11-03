import * as THREE from 'three';
import { GROUND_TILE } from '../util/uv';

export interface WallConformOptions {
  x: number;
  z: number;
  size: number;
  yaw: number;
  height: number;
  depth: number;
  offset: number;
  getHeight: (x: number, z: number) => number;
  /** Target segment length along the wall; smaller hugs steeper terrain. */
  segment?: number;
}

/**
 * Terrain-conforming vertical strip used by Andean terrace faces and dry-stone
 * walls. Both the base and the top are sampled along the length, so a large
 * feature on a slope cannot float at one end or bury the other.
 */
export interface WallBaseSample {
  front: { x: number; z: number; y: number };
  back: { x: number; z: number; y: number };
}

/** Base polyline of a conformed wall; exposed for deterministic terrain tests. */
export function wallBaseSamples(opts: WallConformOptions): WallBaseSample[] {
  const { x, z, size, yaw, depth, offset, getHeight } = opts;
  const segments = Math.max(1, Math.ceil(size / (opts.segment ?? 0.1)));
  const dirX = Math.cos(yaw);
  const dirZ = -Math.sin(yaw);
  const sideX = -dirZ * (depth / 2);
  const sideZ = dirX * (depth / 2);
  const out: WallBaseSample[] = [];
  for (let i = 0; i < segments + 1; i++) {
    const t = i / segments - 0.5;
    const cx = x + dirX * size * t;
    const cz = z + dirZ * size * t;
    const fx = cx + sideX;
    const fz = cz + sideZ;
    const bx = cx - sideX;
    const bz = cz - sideZ;
    out.push({
      front: { x: fx, z: fz, y: getHeight(fx, fz) + offset },
      back: { x: bx, z: bz, y: getHeight(bx, bz) + offset },
    });
  }
  return out;
}

export function conformWallGeometry(opts: WallConformOptions): THREE.BufferGeometry {
  const { size, height } = opts;
  const samples = wallBaseSamples(opts);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const columns = samples.length;
  const segments = columns - 1;

  for (let i = 0; i < columns; i++) {
    const s = samples[i];
    const top = Math.max(s.front.y, s.back.y) + height;
    positions.push(
      s.front.x,
      s.front.y,
      s.front.z,
      s.front.x,
      top,
      s.front.z,
      s.back.x,
      s.back.y,
      s.back.z,
      s.back.x,
      top,
      s.back.z,
    );
    const u = (i / segments) * (size / GROUND_TILE);
    uvs.push(u, 0, u, height / GROUND_TILE, u, 0, u, height / GROUND_TILE);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 4;
    const b = a + 4;
    // front, back, top, bottom
    indices.push(a, b, a + 1, a + 1, b, b + 1);
    indices.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
    indices.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
    indices.push(a, a + 2, b, b, a + 2, b + 2);
  }
  const last = (columns - 1) * 4;
  indices.push(0, 1, 2, 1, 3, 2);
  indices.push(last, last + 2, last + 1, last + 1, last + 2, last + 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const flat = geo.toNonIndexed();
  geo.dispose();
  flat.computeVertexNormals();
  return flat;
}

/** Torus whose tube is projected onto the terrain while keeping its cross-section. */
export function conformCorralGeometry(
  size: number,
  x: number,
  z: number,
  offset: number,
  getHeight: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(size / 2, 0.18, 6, 24).rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const localY = pos.getY(i);
    const wx = pos.getX(i) + x;
    const wz = pos.getZ(i) + z;
    pos.setY(i, getHeight(wx, wz) + offset + localY);
    pos.setX(i, wx);
    pos.setZ(i, wz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
