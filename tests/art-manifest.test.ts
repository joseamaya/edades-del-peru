import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { ART_MANIFEST, validateManifestData } from '../src/art/manifest';
import { validateManifestFiles } from '../scripts/art/validate';
import type { ArtManifest, ArtManifestRecord } from '../src/art/types';
import { CivId, Era, HistoricalPeriod } from '../src/core/types';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function record(bytes: Uint8Array, overrides: Partial<ArtManifestRecord> = {}): ArtManifestRecord {
  return {
    id: 'test-render',
    type: 'architecture',
    scope: 'civilization',
    campaignId: null,
    missionId: null,
    civilization: CivId.CARAL,
    period: HistoricalPeriod.ARCHAIC,
    era: Era.FORMATIVE,
    region: 'central_coast',
    topic: 'architecture',
    sceneType: 'architecture',
    asset: 'media/generated/test/asset.webp',
    variants: [],
    sources: ['https://example.com/source'],
    promptVersion: 'v1-blender-deadbeef',
    prompt: 'Blender render: test architecture.',
    negativePrompt: 'n/a (blender render)',
    provider: 'blender',
    model: 'unknown',
    generatedAt: new Date().toISOString(),
    nature: 'reconstruction',
    reviewed: false,
    reviewer: null,
    reviewedAt: null,
    disclaimer: 'No es una fotografía histórica: es un render 3D del proyecto.',
    alt: 'Test alt',
    caption: 'Test caption',
    width: 64,
    height: 48,
    sourceWidth: 64,
    sourceHeight: 48,
    crop: 'cover-attention',
    bytes: bytes.length,
    format: 'webp',
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    blender: {
      sceneFile: 'scenes/caral_city_master.blend',
      sourceRender: 'renders/test.png',
      sourceSha256: 'a'.repeat(64),
      sceneAssetId: 'GEO-Caral_PyramideMayor_LOD0',
      confidence: 'documentado en planta; remates inferidos',
      camera: 'close_mayor',
      renderer: 'unknown',
      license: 'project-owned',
      author: 'Test',
      renderedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

async function makeTempAsset(): Promise<{ root: string; bytes: Uint8Array; record: ArtManifestRecord }> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'edades-art-'));
  tempRoots.push(root);
  const bytes = new Uint8Array(
    await sharp({ create: { width: 64, height: 48, channels: 3, background: '#ffffff' } })
      .webp()
      .toBuffer(),
  );
  const asset = record(bytes);
  const destination = path.join(root, 'public', asset.asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  return { root, bytes, record: asset };
}

describe('Blender art manifest', () => {
  it('accepts an empty manifest', () => {
    expect(validateManifestData({ version: 1, assets: [] })).toEqual([]);
  });

  it('rejects duplicate ids, invalid historical ids and missing Blender provenance', () => {
    const base = record(new Uint8Array([0]));
    const issues = validateManifestData({
      version: 1,
      assets: [
        base,
        { ...base },
        { ...base, id: 'bad-civ', civilization: 'nope' as CivId },
        { ...base, id: 'bad-period', period: 99 as HistoricalPeriod },
        { ...base, id: 'bad-region', region: 'nope' as ArtManifestRecord['region'] },
        { ...base, id: 'bad-scene', sceneType: 'nope' as ArtManifestRecord['sceneType'] },
        { ...base, id: 'bad-provider', provider: 'cloudflare' as ArtManifestRecord['provider'] },
        { ...base, id: 'missing-blender', blender: undefined as unknown as ArtManifestRecord['blender'] },
        { ...base, id: 'reviewed-no-name', reviewed: true },
      ],
    });
    expect(issues.some((i) => i.field === 'id' && /duplicate/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.id === 'bad-civ' && i.field === 'civilization')).toBe(true);
    expect(issues.some((i) => i.id === 'bad-period' && i.field === 'period')).toBe(true);
    expect(issues.some((i) => i.id === 'bad-region' && i.field === 'region')).toBe(true);
    expect(issues.some((i) => i.id === 'bad-scene' && i.field === 'sceneType')).toBe(true);
    expect(issues.some((i) => i.id === 'bad-provider' && i.field === 'provider')).toBe(true);
    expect(issues.some((i) => i.id === 'missing-blender' && i.field === 'blender')).toBe(true);
    expect(issues.some((i) => i.id === 'reviewed-no-name' && i.field === 'reviewer')).toBe(true);
  });

  it('rejects unsafe paths and incomplete source hashes', () => {
    const base = record(new Uint8Array([0]));
    const issues = validateManifestData({
      version: 1,
      assets: [
        { ...base, id: 'bad-path', asset: '../secret.webp' },
        { ...base, id: 'bad-source-hash', blender: { ...base.blender, sourceSha256: 'nope' } },
        { ...base, id: 'no-sources', sources: [] },
      ],
    });
    expect(issues.some((i) => i.id === 'bad-path' && i.field === 'asset')).toBe(true);
    expect(issues.some((i) => i.id === 'bad-source-hash' && i.field === 'blender.sourceSha256')).toBe(true);
    expect(issues.some((i) => i.id === 'no-sources' && i.field === 'sources')).toBe(true);
  });

  it('validates files, dimensions, bytes and hashes', async () => {
    const { root, record: asset } = await makeTempAsset();
    const manifest: ArtManifest = { version: 1, assets: [asset] };
    expect(await validateManifestFiles(manifest, root, { checkPublicCopy: false })).toEqual([]);

    const wrongBytes = { ...asset, bytes: asset.bytes + 1 };
    const wrongHash = { ...asset, id: 'wrong-hash', sha256: 'a'.repeat(64) };
    const issues = await validateManifestFiles({ version: 1, assets: [wrongBytes, wrongHash] }, root, {
      checkPublicCopy: false,
    });
    expect(issues.some((i) => i.id === asset.id && i.field === 'bytes')).toBe(true);
    expect(issues.some((i) => i.id === 'wrong-hash' && i.field === 'sha256')).toBe(true);
  });

  it('reports a missing asset file', async () => {
    const { root, record: asset } = await makeTempAsset();
    fs.rmSync(path.join(root, 'public', asset.asset));
    const issues = await validateManifestFiles({ version: 1, assets: [asset] }, root, { checkPublicCopy: false });
    expect(issues.some((i) => i.id === asset.id && i.field === 'asset')).toBe(true);
  });

  it('ships draft intro records for m5-m9', () => {
    const missions = ['m5_yahuar_pampa', 'm6_chimu_inca', 'm7_tupac_amaru', 'm8_independencia', 'm9_guerra_pacifico'];
    for (const missionId of missions) {
      const intro = ART_MANIFEST.assets.find((a) => a.missionId === missionId && a.type === 'campaign-intro');
      expect(intro, `${missionId} has no intro`).toBeDefined();
      expect(intro!.reviewed).toBe(false);
      expect(intro!.asset).toContain('/intro.webp');
    }
  });

  it('keeps the committed Caral manifest valid and consistent with its assets', async () => {
    expect(validateManifestData(ART_MANIFEST)).toEqual([]);
    const issues = await validateManifestFiles(ART_MANIFEST, process.cwd());
    expect(issues).toEqual([]);
  });
});
