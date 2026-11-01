import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ART_MANIFEST, validateManifestData } from '../src/art/manifest';
import { validateSourceManifest } from '../scripts/art/ingest';
import type { BlenderSourceManifest } from '../src/art/types';

const SOURCE_MANIFESTS = [
  path.resolve('art-src/blender/caral/renders.json'),
  path.resolve('art-src/blender/moche/renders.json'),
  path.resolve('art-src/blender/wari/renders.json'),
  path.resolve('art-src/blender/mission-decor/renders.json'),
];
const CSV = path.resolve('art-src/blender/caral/caral_asset_manifest.csv');
const CHAVIN_CSV = path.resolve('art-src/blender/chavin/chavin_asset_manifest.csv');
const EXPECTED = [
  'm1_caral-intro',
  'm2_chavin-intro',
  'm3_moche-intro',
  'm4_wari-intro',
  'caral-architecture-pyramid',
  'caral-religion-plaza',
  'caral-map-city',
  'caral-tour-isometric',
  'm5_chanca-intro',
  'm6_chimu-intro',
  'm6b_guerra_civil-intro',
  'm7_colonial-intro',
  'm8_independencia-intro',
  'm9_arica-intro',
];
const EXPECTED_META: Record<string, { civilization: string; period: number; region: string }> = {
  'm1_caral-intro': { civilization: 'caral', period: 0, region: 'central_coast' },
  'm2_chavin-intro': { civilization: 'chavin', period: 1, region: 'andean_valley' },
  'm3_moche-intro': { civilization: 'moche', period: 2, region: 'north_coast' },
  'm4_wari-intro': { civilization: 'wari', period: 3, region: 'high_andes' },
  'm5_chanca-intro': { civilization: 'inca', period: 5, region: 'high_andes' },
  'm6_chimu-intro': { civilization: 'inca', period: 5, region: 'north_coast' },
  'm6b_guerra_civil-intro': { civilization: 'inca', period: 5, region: 'high_andes' },
  'm7_colonial-intro': { civilization: 'inca', period: 6, region: 'high_andes' },
  'm8_independencia-intro': { civilization: 'patriotas', period: 7, region: 'andean_valley' },
  'm9_arica-intro': { civilization: 'republica', period: 8, region: 'south_coast' },
};

describe('Blender campaign art', () => {
  it('has a valid source manifest', () => {
    const sources = SOURCE_MANIFESTS.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')) as BlenderSourceManifest);
    for (const source of sources) expect(validateSourceManifest(source)).toEqual([]);
    expect(sources.flatMap((source) => source.assets.map((asset) => asset.id)).sort()).toEqual([...EXPECTED].sort());
    expect(fs.existsSync(CSV)).toBe(true);
    expect(fs.existsSync(CHAVIN_CSV)).toBe(true);
  });

  it('keeps ids, output paths and source hashes unique and complete', () => {
    const sources = SOURCE_MANIFESTS.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')) as BlenderSourceManifest);
    const assets = sources.flatMap((source) => source.assets);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
    expect(new Set(assets.map((asset) => asset.asset)).size).toBe(assets.length);
    for (const asset of assets) {
      expect(asset.asset.startsWith('media/generated/'), asset.id).toBe(true);
      expect(asset.asset.endsWith('.webp'), asset.id).toBe(true);
      expect(asset.sourceSha256, asset.id).toMatch(/^[0-9a-f]{64}$/);
      const meta = EXPECTED_META[asset.id];
      if (meta) {
        expect(asset.civilization, asset.id).toBe(meta.civilization);
        expect(asset.period, asset.id).toBe(meta.period);
        expect(asset.region, asset.id).toBe(meta.region);
      }
      expect(asset.sources.length, asset.id).toBeGreaterThan(2);
    }
  });

  it('cites sources that exist in the repository', () => {
    const sources = SOURCE_MANIFESTS.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')) as BlenderSourceManifest);
    for (const asset of sources.flatMap((source) => source.assets)) {
      for (const sourcePath of asset.sources) {
        if (/^https?:\/\//i.test(sourcePath)) continue;
        expect(fs.existsSync(path.resolve(sourcePath)), `${asset.id}: ${sourcePath}`).toBe(true);
      }
    }
  });

  it('has a valid committed manifest with the same pilot ids', () => {
    expect(validateManifestData(ART_MANIFEST)).toEqual([]);
    expect(ART_MANIFEST.assets.map((asset) => asset.id).sort()).toEqual([...EXPECTED].sort());
    for (const asset of ART_MANIFEST.assets) {
      expect(asset.provider).toBe('blender');
      if (asset.reviewed) expect(asset.reviewer).toBeTruthy();
      expect(asset.blender.sceneFile).toMatch(/\.blend$/);
      expect(asset.blender.sourceRender).toMatch(/\.png$/);
    }
  });
});
