import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface LodStats {
  triangles: number;
  draw_calls: number;
  materials: string[];
  bytes: number;
}

interface Manifest {
  asset_id: string;
  budget: { LOD0: number; LOD1: number };
  lods: { LOD0: LodStats; LOD1: LodStats };
}

const ROOT = path.resolve('art-src/blender/exports/colonial/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('colonial_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `colonial_${name}_manifest.json`), 'utf8')) as Manifest,
  ]),
);

describe('colonial architecture kit', () => {
  it('ships every piece within the per-piece and per-kit material budgets', () => {
    expect(names).toEqual(['cabildo', 'casona', 'catedral', 'patio_wall', 'pileta', 'plaza', 'portal']);
    const kit = new Set<string>();
    for (const [name, manifest] of manifests) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const stats = manifest.lods[lod];
        expect(stats.triangles, `${name} ${lod}`).toBeLessThanOrEqual(manifest.budget[lod]);
        expect(stats.draw_calls, `${name} ${lod}`).toBeLessThanOrEqual(4);
        for (const material of stats.materials) kit.add(material);
      }
    }
    // The plaza floor's paving is the seventh material; the §4.2 kit ceiling is eight.
    expect([...kit].sort()).toEqual([
      'MAT-Arch_ColonialAdobe',
      'MAT-Arch_ColonialDark',
      'MAT-Arch_ColonialPaving',
      'MAT-Arch_ColonialPlaster',
      'MAT-Arch_ColonialStone',
      'MAT-Arch_ColonialTile',
      'MAT-Arch_ColonialWood',
    ]);
  });

  it('gives the plaza floor its own paving while the kerb and the other pieces keep the stone', () => {
    expect(manifests.get('plaza')!.lods.LOD0.materials).toEqual(['MAT-Arch_ColonialPaving', 'MAT-Arch_ColonialStone']);
    for (const name of ['catedral', 'cabildo', 'casona', 'portal', 'pileta', 'patio_wall']) {
      expect(manifests.get(name)!.lods.LOD0.materials, name).not.toContain('MAT-Arch_ColonialPaving');
    }
  });
});
