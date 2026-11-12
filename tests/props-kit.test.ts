import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUARRY_OBSTACLE_RADIUS } from '../src/model/defs/profiles';

interface Manifest {
  asset_id: string;
  reviewed: boolean;
  confidence: string;
  budget: { LOD0: number; LOD1: number };
  lods: Record<'LOD0' | 'LOD1', { file: string; triangles: number; materials: string[]; bounds: { size: number[] } }>;
}

interface Piece {
  id: string;
  budget: [number, number];
  confidence: 'documented' | 'inferred' | 'assumed';
  materials: string[];
  /** Widest dimension in game metres: an outcrop is scenery, a household prop stays under ~1.4. */
  maxSize: number;
}

const KIT_ROOT = 'art-src/blender/exports/caral/props';

const PIECES: Piece[] = [
  {
    id: 'granodiorite',
    budget: [1500, 400],
    confidence: 'inferred',
    materials: ['MAT-Arch_Stone'],
    maxSize: 9,
  },
  {
    id: 'hearth',
    budget: [600, 180],
    confidence: 'documented',
    materials: ['MAT-Arch_Stone', 'MAT-Arch_Wood'],
    maxSize: 1.4,
  },
  {
    id: 'drying_rack',
    budget: [650, 200],
    confidence: 'assumed',
    materials: ['MAT-Arch_CaneMat', 'MAT-Arch_Wood'],
    maxSize: 1.4,
  },
  {
    id: 'basket',
    budget: [420, 130],
    confidence: 'inferred',
    materials: ['MAT-Arch_CaneMat', 'MAT-Arch_Stone'],
    maxSize: 0.8,
  },
  {
    id: 'gourd',
    budget: [380, 150],
    confidence: 'inferred',
    materials: ['MAT-Arch_PlasterWhite', 'MAT-Arch_Wood'],
    maxSize: 0.8,
  },
  {
    id: 'bench',
    budget: [420, 130],
    confidence: 'assumed',
    materials: ['MAT-Arch_Stone'],
    maxSize: 1.4,
  },
  {
    id: 'windbreak',
    budget: [560, 180],
    confidence: 'assumed',
    materials: ['MAT-Arch_CaneMat', 'MAT-Arch_Wood'],
    maxSize: 1.4,
  },
  {
    id: 'cotton',
    budget: [400, 120],
    confidence: 'documented',
    materials: ['MAT-Arch_CaneMat', 'MAT-Arch_PlasterWhite', 'MAT-Arch_Wood'],
    maxSize: 1.1,
  },
];

function manifestOf(id: string): Manifest {
  return JSON.parse(fs.readFileSync(path.resolve(KIT_ROOT, `caral_${id}_manifest.json`), 'utf8')) as Manifest;
}

const glbFile = (id: string, lod: 0 | 1): string =>
  fileURLToPath(new URL(`../src/assets/props/caral/caral_${id}_lod${lod}.glb`, import.meta.url));

function glbJson(file: string): {
  materials?: { name: string }[];
  meshes: { primitives: { attributes: Record<string, number>; material?: number }[] }[];
} {
  const buf = fs.readFileSync(file);
  return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
}

const ALL_MATERIALS = ['MAT-Arch_Stone', 'MAT-Arch_Wood', 'MAT-Arch_CaneMat', 'MAT-Arch_PlasterWhite'];

describe.each(PIECES)('Caral prop kit: $id', (piece: Piece) => {
  const manifest = manifestOf(piece.id);

  it('records the budget, the unreviewed gate and its certainty', () => {
    expect(manifest.asset_id).toBe(`caral_${piece.id}`);
    expect(manifest.reviewed).toBe(false);
    expect(manifest.confidence).toBe(piece.confidence);
    expect(manifest.budget).toEqual({ LOD0: piece.budget[0], LOD1: piece.budget[1] });
    expect(manifest.lods.LOD0.triangles).toBeLessThanOrEqual(piece.budget[0]);
    expect(manifest.lods.LOD1.triangles).toBeLessThanOrEqual(piece.budget[1]);
    expect(manifest.lods.LOD1.triangles).toBeLessThan(manifest.lods.LOD0.triangles);
  });

  it('keeps the household scale and the shared three-material palette', () => {
    for (const lod of ['LOD0', 'LOD1'] as const) {
      const size = manifest.lods[lod].bounds.size;
      expect(Math.max(...size)).toBeLessThanOrEqual(piece.maxSize);
      for (const material of manifest.lods[lod].materials) expect(ALL_MATERIALS).toContain(material);
    }
    expect(manifest.lods.LOD0.materials).toEqual(piece.materials);
  });

  it('ships UVs, a vertex tint and no per-piece texture', () => {
    for (const lod of [0, 1] as const) {
      const json = glbJson(glbFile(piece.id, lod));
      const materials = (json.materials ?? []).map((m) => m.name).sort();
      expect(materials).toEqual([...manifest.lods[`LOD${lod}` as const].materials].sort());
      for (const mesh of json.meshes) {
        for (const primitive of mesh.primitives) {
          expect(primitive.attributes.TEXCOORD_0, `${piece.id} LOD${lod}`).toBeDefined();
          expect(primitive.attributes.COLOR_0, `${piece.id} LOD${lod}`).toBeDefined();
        }
      }
    }
  });
});

describe('granodiorite outcrop', () => {
  it('is low, not a building or a mountain', () => {
    const size = manifestOf('granodiorite').lods.LOD0.bounds.size;
    expect(size[0]).toBeGreaterThanOrEqual(3);
    expect(size[1]).toBeGreaterThanOrEqual(2.5);
    expect(size[2]).toBeGreaterThanOrEqual(1.2);
    expect(size[2]).toBeLessThanOrEqual(3);
    // The largest kit instance (scale 0.8) must fit inside the circular pathfinding footprint.
    const halfDiagonal = (Math.hypot(size[0]!, size[1]!) / 2) * 0.8;
    expect(halfDiagonal).toBeLessThanOrEqual(QUARRY_OBSTACLE_RADIUS.granodiorite);
  });
});
