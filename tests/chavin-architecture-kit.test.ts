import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { archKitUrl } from '../src/rendering/architectureKit';
import { AUTHORED_SITES } from '../src/model/defs/sites';
import {
  CHAVIN_CITY_BLOCKERS,
  CHAVIN_CITY_LAYOUT,
  CHAVIN_HERITAGE_SINCE,
  CHAVIN_PHASE_PLAN,
} from '../src/model/defs/chavinCity';

function glbJson(file: string): Record<string, any> {
  const data = fs.readFileSync(file);
  let offset = 12;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a)
      return JSON.parse(
        data
          .subarray(offset, offset + length)
          .toString('utf8')
          .trim(),
      );
    offset += length;
  }
  throw new Error(`no JSON chunk in ${file}`);
}

const assets = [...new Set(CHAVIN_CITY_LAYOUT.map((p) => p.asset))];

describe('Chavín architecture kit', () => {
  it('resolves every phase asset as LOD0 and LOD1', () => {
    for (const asset of assets) {
      for (const lod of [0, 1] as const) {
        expect(archKitUrl('chavin', asset, lod), `${asset} LOD${lod}`).toBeTruthy();
      }
    }
  });

  it('ships the cleaned materials without the CyArk Lanzón scan', () => {
    for (const asset of assets) {
      for (const lod of [0, 1] as const) {
        const file = path.resolve(`src/assets/architecture/chavin/chavin_${asset}_lod${lod}.glb`);
        const json = glbJson(file);
        const text = JSON.stringify(json);
        expect(text, `${asset} LOD${lod}`).not.toMatch(/CC BY-NC|CyArk|Lanzon_Scan/i);
        for (const material of json.materials ?? []) {
          expect(String(material.name), `${asset} LOD${lod}`).toMatch(/^MAT-Arch_/);
        }
      }
    }
  });

  it('paints the valley ground and reserves the highland flora', () => {
    const site = AUTHORED_SITES.chavin_site;
    expect(site.heightField?.ground?.size).toBeGreaterThan(0);
    expect(site.heightField?.ground?.weights.length).toBeGreaterThan(0);
    expect(site.life?.fireHeight).toBeGreaterThan(0);
    expect(site.environs?.suppressPropIds).toContain('cactus');
  });

  it('moves the Old and New Temple through the documented phases', () => {
    expect(CHAVIN_PHASE_PLAN.phases).toEqual([
      'old_temple_foundation',
      'old_temple',
      'new_temple_foundation',
      'new_temple',
      'apogee',
    ]);
    expect(CHAVIN_HERITAGE_SINCE.chavin_edificio_b).toBe('old_temple_foundation');
    expect(CHAVIN_HERITAGE_SINCE.chavin_edificio_a).toBe('new_temple_foundation');
    expect(CHAVIN_HERITAGE_SINCE.chavin_portada).toBe('new_temple');
    expect(CHAVIN_CITY_BLOCKERS.some((b) => b.since === 'new_temple_foundation')).toBe(true);
  });

  it('records every piece unreviewed until the human art gate', () => {
    for (const asset of assets.filter((id) => id !== 'fair_tent')) {
      for (const lod of [0, 1] as const) {
        const file = path.resolve(
          `art-src/blender/exports/chavin/architecture/chavin_${asset}_manifest_lod${lod}.json`,
        );
        const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
        expect(manifest.reviewed, `${asset} LOD${lod}`).toBe(false);
        expect(manifest.confidence).toBe('inferred');
      }
    }
  });
});
