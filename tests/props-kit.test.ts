import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Manifest {
  asset_id: string;
  reviewed: boolean;
  confidence: string;
  budget: { LOD0: number; LOD1: number };
  lods: Record<'LOD0' | 'LOD1', { file: string; triangles: number; materials: string[]; bounds: { size: number[] } }>;
}

const manifest = JSON.parse(
  fs.readFileSync(path.resolve('art-src/blender/exports/caral/props/caral_granodiorite_manifest.json'), 'utf8'),
) as Manifest;

const glbFile = (lod: 0 | 1): string =>
  fileURLToPath(new URL(`../src/assets/props/caral/caral_granodiorite_lod${lod}.glb`, import.meta.url));

function glbJson(file: string): {
  materials?: { name: string; pbrMetallicRoughness?: Record<string, unknown> }[];
  meshes: { primitives: { attributes: Record<string, number>; material?: number }[] }[];
} {
  const buf = fs.readFileSync(file);
  return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
}

describe('Caral prop kit: granodiorite outcrop', () => {
  it('records the budget, the unreviewed provenance gate and the inferred certainty', () => {
    expect(manifest.asset_id).toBe('caral_granodiorite');
    expect(manifest.reviewed).toBe(false);
    expect(manifest.confidence).toBe('inferred');
    expect(manifest.budget).toEqual({ LOD0: 1500, LOD1: 400 });
    expect(manifest.lods.LOD0.triangles).toBeLessThanOrEqual(1500);
    expect(manifest.lods.LOD1.triangles).toBeLessThanOrEqual(400);
    expect(manifest.lods.LOD1.triangles).toBeLessThan(manifest.lods.LOD0.triangles);
  });

  it('is a low outcrop, not a building or a mountain', () => {
    const size = manifest.lods.LOD0.bounds.size;
    expect(size[0]).toBeGreaterThanOrEqual(3);
    expect(size[0]).toBeLessThanOrEqual(9);
    expect(size[1]).toBeGreaterThanOrEqual(2.5);
    expect(size[1]).toBeLessThanOrEqual(8);
    expect(size[2]).toBeGreaterThanOrEqual(1.2);
    expect(size[2]).toBeLessThanOrEqual(3);
  });

  it('ships one architecture material with UVs and a vertex tint in both LODs', () => {
    for (const lod of [0, 1] as const) {
      const json = glbJson(glbFile(lod));
      expect(json.materials?.map((m) => m.name)).toEqual(['MAT-Arch_Stone']);
      for (const mesh of json.meshes) {
        for (const primitive of mesh.primitives) {
          expect(primitive.attributes.TEXCOORD_0, `granodiorite LOD${lod}`).toBeDefined();
          expect(primitive.attributes.COLOR_0, `granodiorite LOD${lod}`).toBeDefined();
        }
      }
    }
  });
});
