import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function glbJson(file: string): Record<string, any> {
  const data = fs.readFileSync(file);
  let offset = 12;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) {
      return JSON.parse(
        data
          .subarray(offset, offset + length)
          .toString('utf8')
          .trim(),
      );
    }
    offset += length;
  }
  throw new Error(`no JSON chunk in ${file}`);
}

describe('Chavín authored site provenance', () => {
  for (const lod of [0, 1]) {
    it(`LOD${lod} ships no CyArk-derived Lanzón geometry or metadata`, () => {
      const file = path.resolve(`src/assets/sites/chavin/chavin_site_lod${lod}.glb`);
      const json = glbJson(file);
      const text = JSON.stringify(json);
      expect(text).not.toMatch(/CC BY-NC|CyArk|Lanzon_Scan|derivada/i);
      const materials = (json.materials ?? []).map((material: any) => material.name);
      expect(materials).not.toContain('MAT-Chavin_Lanzon_Scan');
      expect(json.meshes?.length).toBeGreaterThan(0);
    });
  }

  it('documents the cleaned source and runtime hashes', () => {
    const readme = fs.readFileSync(path.resolve('art-src/blender/chavin/README.md'), 'utf8');
    for (const lod of [0, 1]) {
      const glb = fs.readFileSync(path.resolve(`src/assets/sites/chavin/chavin_site_lod${lod}.glb`));
      expect(readme).toContain(createHash('sha256').update(glb).digest('hex'));
    }
  });
});
