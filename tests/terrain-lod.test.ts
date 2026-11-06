import { describe, it, expect } from 'vitest';
import { TERRAIN_LOD_BLOCK, buildTerrainLodIndex, terrainIndexCapacity } from '../src/rendering/terrainLod';

const RES = 16;
const N = RES + 1;
const BLOCKS = RES / TERRAIN_LOD_BLOCK;

function build(fine: number[]): Uint32Array {
  const out = new Uint32Array(terrainIndexCapacity(RES));
  const count = buildTerrainLodIndex(RES, Uint8Array.from(fine), out);
  return out.slice(0, count);
}

/** Undirected edge -> number of triangles using it. */
function edges(index: Uint32Array): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < index.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = index[i + e];
      const b = index[i + ((e + 1) % 3)];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

/** True when the edge a-b runs along the map border. */
function borderEdge(a: number, b: number): boolean {
  const [ax, az, bx, bz] = [a % N, Math.floor(a / N), b % N, Math.floor(b / N)];
  return (ax === bx && (ax === 0 || ax === RES)) || (az === bz && (az === 0 || az === RES));
}

function area(index: Uint32Array): number {
  let sum = 0;
  for (let i = 0; i < index.length; i += 3) {
    const [ax, az, bx, bz, cx, cz] = [index[i], index[i + 1], index[i + 2]].flatMap((v) => [v % N, Math.floor(v / N)]);
    const y = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    expect(y).toBeGreaterThan(0); // +Y facing, like the original grid winding
    sum += y / 2;
  }
  return sum;
}

describe('terrain LOD index', () => {
  const patterns: Record<string, number[]> = {
    allFine: new Array(BLOCKS * BLOCKS).fill(1),
    allCoarse: new Array(BLOCKS * BLOCKS).fill(0),
    checker: Array.from({ length: BLOCKS * BLOCKS }, (_, i) => ((i % BLOCKS) + Math.floor(i / BLOCKS)) % 2),
    corner: Array.from({ length: BLOCKS * BLOCKS }, (_, i) => (i === 0 || i === 5 ? 1 : 0)),
  };

  it.each(Object.keys(patterns))('%s covers the grid exactly, facing up, without cracks', (name) => {
    const index = build(patterns[name]);
    expect(area(index)).toBe(RES * RES);
    for (const [key, uses] of edges(index)) {
      const [a, b] = key.split('-').map(Number);
      // Interior edges are shared by two triangles; only the map border is open (the skirt closes it).
      expect(uses, key).toBe(borderEdge(a, b) ? 1 : 2);
    }
  });

  it('draws every cell when fine and far fewer triangles when coarse', () => {
    expect(build(patterns.allFine).length).toBe(terrainIndexCapacity(RES));
    expect(build(patterns.allCoarse).length).toBeLessThan(terrainIndexCapacity(RES) / 2);
  });

  it('falls back to the plain grid for resolutions that are not a multiple of the block', () => {
    const out = new Uint32Array(terrainIndexCapacity(7));
    expect(buildTerrainLodIndex(7, new Uint8Array(49).fill(1), out, 1)).toBe(terrainIndexCapacity(7));
    expect(() => buildTerrainLodIndex(7, new Uint8Array(4).fill(0), out, TERRAIN_LOD_BLOCK)).toThrow();
  });

  it('keeps every border vertex so the skirt still meets the surface', () => {
    const used = new Set(build(patterns.allCoarse));
    for (let i = 0; i <= RES; i++) {
      for (const v of [i, RES * N + i, i * N, i * N + RES]) expect(used.has(v)).toBe(true);
    }
  });
});
