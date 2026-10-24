import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CIVS } from '../../src/model/defs/civs';
import { PERIODS, getPeriod } from '../../src/model/defs/periods';
import { MAP_PROFILES } from '../../src/model/defs/profiles';
import { IMAGE_TYPE_RULES } from '../../src/art/imageTypes';
import type {
  ArtManifest,
  ArtManifestRecord,
  BlenderSourceAsset,
  BlenderSourceManifest,
  ManifestValidationIssue,
  SceneType,
} from '../../src/art/types';
import { optimizeImage, sha256 } from './optimize';
import { DISCLAIMER, writeProvenance } from './provenance';
import { BLENDER_SOURCE_MANIFEST, MANIFEST_PATH, REPO_ROOT, publicPath } from './paths';
import { formatIssues, validateManifestFiles } from './validate';

const SCENE_TYPES: SceneType[] = [
  'urban_ceremonial',
  'architecture',
  'daily_life',
  'agriculture',
  'craft',
  'ritual',
  'landscape',
  'panorama',
  'portrait_reference',
  'campaign_scene',
  'map',
];
const NATURES = ['reconstruction', 'abstraction', 'concept-art', 'reference'];
const SCOPES = ['campaign', 'mission', 'civilization'];

export interface IngestOptions {
  manifestPath?: string;
  sourceRoot?: string;
  force?: boolean;
  dryRun?: boolean;
  only?: Set<string>;
  onProgress?: (message: string) => void;
}

export interface IngestResult {
  manifest: ArtManifest;
  generated: ArtManifestRecord[];
  skipped: string[];
  errors: string[];
  issues: ManifestValidationIssue[];
  ok: boolean;
}

function issue(issues: ManifestValidationIssue[], field: string, message: string, id?: string): void {
  issues.push({ id, field, message });
}

function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

export function validateSourceManifest(source: BlenderSourceManifest): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  if (source.version !== 1) issue(issues, 'version', 'must be 1');
  if (!source.sourceRoot?.trim()) issue(issues, 'sourceRoot', 'must be a non-empty path');
  if (!Array.isArray(source.assets)) {
    issue(issues, 'assets', 'must be an array');
    return issues;
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const asset of source.assets) {
    if (ids.has(asset.id)) issue(issues, 'id', 'duplicate id', asset.id);
    ids.add(asset.id);
    if (paths.has(asset.asset)) issue(issues, 'asset', 'duplicate output asset', asset.id);
    paths.add(asset.asset);

    if (!asset.id?.trim()) issue(issues, 'id', 'must be non-empty', asset.id);
    if (!asset.topic?.trim()) issue(issues, 'topic', 'must be non-empty', asset.id);
    if (!asset.render?.trim()) issue(issues, 'render', 'must be non-empty', asset.id);
    if (!asset.sceneFile?.trim()) issue(issues, 'sceneFile', 'must be non-empty', asset.id);
    if (!asset.confidence?.trim()) issue(issues, 'confidence', 'must be non-empty', asset.id);
    if (!asset.camera?.trim()) issue(issues, 'camera', 'must be non-empty', asset.id);
    if (!asset.license?.trim()) issue(issues, 'license', 'must be non-empty', asset.id);
    if (!asset.author?.trim()) issue(issues, 'author', 'must be non-empty', asset.id);
    if (!asset.renderedAt || Number.isNaN(Date.parse(asset.renderedAt))) {
      issue(issues, 'renderedAt', 'must be an ISO date', asset.id);
    }
    if (!asset.alt?.trim()) issue(issues, 'alt', 'must be non-empty', asset.id);
    if (!asset.caption?.trim()) issue(issues, 'caption', 'must be non-empty', asset.id);
    if (!CIVS.some((c) => c.id === asset.civilization)) {
      issue(issues, 'civilization', `unknown civilization "${String(asset.civilization)}"`, asset.id);
    }
    if (!PERIODS.some((p) => p.id === asset.period)) {
      issue(issues, 'period', `unknown period "${String(asset.period)}"`, asset.id);
    }
    if (!MAP_PROFILES[asset.region]) issue(issues, 'region', `unknown region "${String(asset.region)}"`, asset.id);
    if (!IMAGE_TYPE_RULES[asset.type]) issue(issues, 'type', 'unknown image type', asset.id);
    if (!SCENE_TYPES.includes(asset.sceneType)) issue(issues, 'sceneType', 'unknown scene type', asset.id);
    if (!NATURES.includes(asset.nature)) issue(issues, 'nature', 'unknown nature', asset.id);
    if (!SCOPES.includes(asset.scope)) issue(issues, 'scope', 'unknown scope', asset.id);
    if (asset.scope === 'campaign' && !asset.campaignId)
      issue(issues, 'campaignId', 'campaign scope requires campaignId', asset.id);
    if (asset.scope === 'mission' && !asset.missionId)
      issue(issues, 'missionId', 'mission scope requires missionId', asset.id);
    if (!asset.asset.startsWith('media/generated/') || asset.asset.includes('..') || asset.asset.startsWith('/')) {
      issue(issues, 'asset', 'must be a relative path under media/generated/', asset.id);
    }
    if (!asset.asset.endsWith('.webp')) issue(issues, 'asset', 'must be a .webp asset', asset.id);
    if (!Array.isArray(asset.sources) || asset.sources.length === 0) {
      issue(issues, 'sources', 'at least one historical source is required', asset.id);
    }
    if (asset.sourceSha256 && !isHex64(asset.sourceSha256)) {
      issue(issues, 'sourceSha256', 'must be a 64-character hex digest', asset.id);
    }
  }
  return issues;
}

export function loadManifest(): ArtManifest {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ArtManifest;
    if (parsed.version === 1 && Array.isArray(parsed.assets)) return parsed;
  } catch {
    /* start with an empty manifest */
  }
  return { version: 1, assets: [] };
}

export function saveManifest(manifest: ArtManifest): void {
  manifest.assets.sort((a, b) => a.id.localeCompare(b.id));
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeProvenance(manifest);
}

function upsert(manifest: ArtManifest, record: ArtManifestRecord): void {
  const index = manifest.assets.findIndex((asset) => asset.id === record.id);
  if (index >= 0) manifest.assets[index] = record;
  else manifest.assets.push(record);
}

function variantAssetPath(asset: string, width: number): string {
  return asset.replace(/\.webp$/, `-${width}.webp`);
}

function resolveSourceRoot(manifest: BlenderSourceManifest, override?: string): string {
  if (override) return path.resolve(override);
  return path.isAbsolute(manifest.sourceRoot) ? manifest.sourceRoot : path.resolve(REPO_ROOT, manifest.sourceRoot);
}

function promptVersion(asset: BlenderSourceAsset, sourceSha256: string): string {
  const digest = crypto
    .createHash('sha1')
    .update(`${asset.id}|${sourceSha256}|${asset.sceneFile}|${asset.camera}`)
    .digest('hex')
    .slice(0, 8);
  return `v1-blender-${digest}`;
}

function buildRecord(
  asset: BlenderSourceAsset,
  sourceSha256: string,
  optimized: Awaited<ReturnType<typeof optimizeImage>>,
): ArtManifestRecord {
  const period = asset.period;
  const era = asset.era ?? getPeriod(period).level;
  const variants = optimized.variants.map(({ asset: variantAsset, width, height, bytes }) => ({
    asset: variantAsset,
    width,
    height,
    bytes,
  }));
  return {
    id: asset.id,
    type: asset.type,
    scope: asset.scope,
    campaignId: asset.campaignId ?? null,
    missionId: asset.missionId ?? null,
    civilization: asset.civilization,
    period,
    era,
    region: asset.region,
    topic: asset.topic,
    sceneType: asset.sceneType,
    asset: asset.asset,
    variants,
    sources: [...new Set(asset.sources)],
    promptVersion: promptVersion(asset, sourceSha256),
    prompt: `Blender render: ${asset.caption}`,
    negativePrompt: 'n/a (blender render)',
    provider: 'blender',
    model: asset.renderer,
    generatedAt: new Date().toISOString(),
    nature: asset.nature,
    reviewed: false,
    reviewer: null,
    reviewedAt: null,
    disclaimer: DISCLAIMER,
    alt: asset.alt,
    caption: asset.caption,
    width: optimized.width,
    height: optimized.height,
    sourceWidth: optimized.sourceWidth,
    sourceHeight: optimized.sourceHeight,
    crop: optimized.crop,
    bytes: optimized.bytes.length,
    format: 'webp',
    sha256: sha256(optimized.bytes),
    blender: {
      sceneFile: asset.sceneFile,
      sourceRender: asset.render,
      sourceSha256,
      sceneAssetId: asset.sceneAssetId ?? null,
      confidence: asset.confidence,
      camera: asset.camera,
      renderer: asset.renderer,
      license: asset.license,
      author: asset.author,
      renderedAt: asset.renderedAt,
    },
  };
}

export async function ingestBlenderRenders(options: IngestOptions = {}): Promise<IngestResult> {
  const manifestPath = options.manifestPath ? path.resolve(options.manifestPath) : BLENDER_SOURCE_MANIFEST;
  const source = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BlenderSourceManifest;
  const sourceIssues = validateSourceManifest(source);
  if (sourceIssues.length) {
    return {
      manifest: loadManifest(),
      generated: [],
      skipped: [],
      errors: [`Invalid Blender source manifest:\n${formatIssues(sourceIssues)}`],
      issues: sourceIssues,
      ok: false,
    };
  }

  const root = resolveSourceRoot(source, options.sourceRoot);
  if (!fs.existsSync(root)) {
    return {
      manifest: loadManifest(),
      generated: [],
      skipped: [],
      errors: [`Blender source root does not exist: ${root}`],
      issues: [],
      ok: false,
    };
  }

  const manifest = loadManifest();
  const generated: ArtManifestRecord[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const asset of source.assets) {
    if (options.only && !options.only.has(asset.id)) continue;
    const sourceFile = path.resolve(root, asset.render);
    if (!sourceFile.startsWith(root + path.sep)) {
      errors.push(`${asset.id}: render path escapes the source root`);
      continue;
    }
    if (!fs.existsSync(sourceFile)) {
      errors.push(`${asset.id}: source render missing: ${sourceFile}`);
      continue;
    }
    const sourceBytes = fs.readFileSync(sourceFile);
    const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
    if (asset.sourceSha256 && asset.sourceSha256 !== sourceSha256) {
      errors.push(`${asset.id}: source SHA-256 mismatch (expected ${asset.sourceSha256}, got ${sourceSha256})`);
      continue;
    }
    const output = publicPath(asset.asset);
    if (options.dryRun) {
      options.onProgress?.(`dry-run   ${asset.id} — ${path.relative(root, sourceFile)} -> ${asset.asset}`);
      continue;
    }
    if (fs.existsSync(output) && !options.force) {
      skipped.push(asset.id);
      options.onProgress?.(`skipped   ${asset.id} — ${asset.asset} already exists (use --force)`);
      continue;
    }

    try {
      const rule = IMAGE_TYPE_RULES[asset.type];
      const variantAsset =
        (asset.variantWidth ?? rule.variantWidth)
          ? variantAssetPath(asset.asset, asset.variantWidth ?? rule.variantWidth!)
          : undefined;
      const optimized = await optimizeImage(sourceBytes, rule, variantAsset, {
        width: asset.width,
        height: asset.height,
        maxBytes: asset.maxBytes,
        variantWidth: asset.variantWidth,
      });
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, optimized.bytes);
      for (const variant of optimized.variants) {
        const variantOutput = publicPath(variant.asset);
        fs.mkdirSync(path.dirname(variantOutput), { recursive: true });
        fs.writeFileSync(variantOutput, variant.data);
      }
      const record = buildRecord(asset, sourceSha256, optimized);
      upsert(manifest, record);
      saveManifest(manifest);
      generated.push(record);
      options.onProgress?.(`ingested  ${asset.id} — ${asset.asset}`);
    } catch (error) {
      errors.push(`${asset.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const issues = await validateManifestFiles(manifest, REPO_ROOT);
  return { manifest, generated, skipped, errors, issues, ok: errors.length === 0 && issues.length === 0 };
}
