import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ART_MANIFEST, validateManifestData } from '../src/art/manifest';
import { validateSourceManifest } from '../scripts/art/ingest';
import type { BlenderSourceManifest } from '../src/art/types';

const SOURCE_MANIFEST = path.resolve('art-src/blender/caral/renders.json');
const CSV = path.resolve('art-src/blender/caral/caral_asset_manifest.csv');
const EXPECTED = [
  'm1_caral-intro',
  'caral-architecture-pyramid',
  'caral-religion-plaza',
  'caral-map-city',
  'caral-tour-isometric',
];

describe('Caral Blender pilot', () => {
  it('has a valid source manifest', () => {
    const source = JSON.parse(fs.readFileSync(SOURCE_MANIFEST, 'utf8')) as BlenderSourceManifest;
    expect(validateSourceManifest(source)).toEqual([]);
    expect(source.assets.map((asset) => asset.id).sort()).toEqual([...EXPECTED].sort());
    expect(fs.existsSync(CSV)).toBe(true);
  });

  it('keeps ids, output paths and source hashes unique and complete', () => {
    const source = JSON.parse(fs.readFileSync(SOURCE_MANIFEST, 'utf8')) as BlenderSourceManifest;
    expect(new Set(source.assets.map((asset) => asset.id)).size).toBe(source.assets.length);
    expect(new Set(source.assets.map((asset) => asset.asset)).size).toBe(source.assets.length);
    for (const asset of source.assets) {
      expect(asset.asset.startsWith('media/generated/'), asset.id).toBe(true);
      expect(asset.asset.endsWith('.webp'), asset.id).toBe(true);
      expect(asset.sourceSha256, asset.id).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.civilization, asset.id).toBe('caral');
      expect(asset.period, asset.id).toBe(0);
      expect(asset.region, asset.id).toBe('central_coast');
      expect(asset.sources.length, asset.id).toBeGreaterThan(2);
    }
  });

  it('cites sources that exist in the repository', () => {
    const source = JSON.parse(fs.readFileSync(SOURCE_MANIFEST, 'utf8')) as BlenderSourceManifest;
    for (const asset of source.assets) {
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
