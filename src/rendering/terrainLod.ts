/**
 * Distance LOD for the terrain mesh, as an index buffer over the full-resolution vertex grid (heights,
 * colours and normals stay at full detail; the simulation's height field is untouched).
 *
 * The grid is split into square blocks of `TERRAIN_LOD_BLOCK` cells. A fine block draws every cell; a
 * coarse block draws a fan around its centre vertex. Along each coarse block edge the fan keeps every
 * vertex when the neighbour is fine or the edge is the map border (where the skirt attaches), and only
 * the corners otherwise, so neighbouring blocks always share the same edge vertices: no cracks.
 */
export const TERRAIN_LOD_BLOCK = 4;

/** Blocks whose centre is further than this from the camera (3D) are drawn coarse. */
export const TERRAIN_LOD_DISTANCE = 75;

/** Upper bound of the index count for a `res`×`res` cell grid (everything fine). */
export function terrainIndexCapacity(res: number): number {
  return res * res * 6;
}

/**
 * Write the triangle indices for a `(res + 1)²` vertex grid into `out` and return how many were
 * written. `fine[bz * blocks + bx]` marks fine blocks (`blocks = res / block`). Triangles keep the
 * original winding (+Y normal for a grid laid out with x along columns and z along rows).
 */
export function buildTerrainLodIndex(
  res: number,
  fine: Uint8Array,
  out: Uint32Array,
  block = TERRAIN_LOD_BLOCK,
): number {
  if (res % block !== 0) throw new Error(`terrain resolution ${res} not divisible by ${block}`);
  const n = res + 1;
  const blocks = res / block;
  const half = Math.floor(block / 2);
  let k = 0;
  const tri = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number): void => {
    // +Y normal: (b - a).z * (c - a).x - (b - a).x * (c - a).z > 0
    const y = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    out[k++] = az * n + ax;
    if (y >= 0) {
      out[k++] = bz * n + bx;
      out[k++] = cz * n + cx;
    } else {
      out[k++] = cz * n + cx;
      out[k++] = bz * n + bx;
    }
  };
  const isFine = (bx: number, bz: number): boolean =>
    bx < 0 || bz < 0 || bx >= blocks || bz >= blocks ? true : fine[bz * blocks + bx] === 1;

  for (let bz = 0; bz < blocks; bz++) {
    for (let bx = 0; bx < blocks; bx++) {
      const x0 = bx * block;
      const z0 = bz * block;
      if (fine[bz * blocks + bx] === 1) {
        for (let z = z0; z < z0 + block; z++) {
          for (let x = x0; x < x0 + block; x++) {
            tri(x, z, x, z + 1, x + 1, z);
            tri(x + 1, z, x, z + 1, x + 1, z + 1);
          }
        }
        continue;
      }
      if (block % 2 !== 0) throw new Error(`coarse terrain blocks need an even size, got ${block}`);
      const cx = x0 + half;
      const cz = z0 + half;
      // Perimeter, clockwise from the top-left corner; each side steps by 1 next to fine ground.
      const sides: [number, number, number, number, boolean][] = [
        [x0, z0, 1, 0, isFine(bx, bz - 1)],
        [x0 + block, z0, 0, 1, isFine(bx + 1, bz)],
        [x0 + block, z0 + block, -1, 0, isFine(bx, bz + 1)],
        [x0, z0 + block, 0, -1, isFine(bx - 1, bz)],
      ];
      for (const [sx, sz, dx, dz, dense] of sides) {
        const step = dense ? 1 : block;
        for (let i = 0; i < block; i += step) {
          tri(cx, cz, sx + dx * i, sz + dz * i, sx + dx * (i + step), sz + dz * (i + step));
        }
      }
    }
  }
  return k;
}
