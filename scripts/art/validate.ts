import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { validateManifestData } from '../../src/art/manifest';
import type { ArtManifest, ArtManifestRecord, ManifestValidationIssue } from '../../src/art/types';
import { REPO_ROOT } from './paths';

function issue(issues: ManifestValidationIssue[], field: string, message: string, id?: string): void {
  issues.push({ id, field, message });
}

function isWebp(bytes: Buffer): boolean {
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function checkSource(
  rootDir: string,
  source: string,
  record: ArtManifestRecord,
  issues: ManifestValidationIssue[],
): void {
  if (/^https?:\/\//i.test(source)) return;
  if (!source.startsWith('docs/') && !source.startsWith('art-src/')) {
    issue(issues, 'sources', `source must be a docs/ or art-src/ path or URL: ${source}`, record.id);
    return;
  }
  const resolved = path.resolve(rootDir, source);
  if (!resolved.startsWith(path.resolve(rootDir) + path.sep)) {
    issue(issues, 'sources', `source escapes the repository: ${source}`, record.id);
    return;
  }
  if (!fs.existsSync(resolved)) issue(issues, 'sources', `source does not exist: ${source}`, record.id);
}

async function checkAsset(
  issues: ManifestValidationIssue[],
  publicDir: string,
  record: ArtManifestRecord,
  asset: string,
  expectedWidth: number,
  expectedHeight: number,
  expectedBytes: number,
): Promise<void> {
  const resolved = path.resolve(publicDir, asset);
  if (!resolved.startsWith(path.resolve(publicDir) + path.sep)) {
    issue(issues, 'asset', `asset escapes public/: ${asset}`, record.id);
    return;
  }
  if (!fs.existsSync(resolved)) {
    issue(issues, 'asset', `asset does not exist: ${asset}`, record.id);
    return;
  }
  const bytes = fs.readFileSync(resolved);
  if (!isWebp(bytes)) {
    issue(issues, 'asset', `asset is not a WebP file: ${asset}`, record.id);
    return;
  }
  if (bytes.length !== expectedBytes) {
    issue(issues, 'bytes', `expected ${expectedBytes} bytes, found ${bytes.length} in ${asset}`, record.id);
  }
  const metadata = await sharp(bytes, { failOn: 'none' }).metadata();
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    issue(
      issues,
      'dimensions',
      `expected ${expectedWidth}x${expectedHeight}, found ${metadata.width ?? 0}x${metadata.height ?? 0} in ${asset}`,
      record.id,
    );
  }
}

/**
 * Full validation: schema + historical ids + files, WebP headers, dimensions,
 * byte budgets, hashes, sources and the public manifest copy.
 */
export async function validateManifestFiles(
  manifest: ArtManifest,
  rootDir = REPO_ROOT,
  options: { checkPublicCopy?: boolean } = {},
): Promise<ManifestValidationIssue[]> {
  const issues = validateManifestData(manifest);
  const publicDir = path.join(rootDir, 'public');

  for (const record of manifest.assets) {
    await checkAsset(issues, publicDir, record, record.asset, record.width, record.height, record.bytes);
    const mainPath = path.resolve(publicDir, record.asset);
    if (fs.existsSync(mainPath)) {
      const digest = crypto.createHash('sha256').update(fs.readFileSync(mainPath)).digest('hex');
      if (digest !== record.sha256) issue(issues, 'sha256', 'does not match the asset bytes', record.id);
    }
    for (const variant of record.variants) {
      await checkAsset(issues, publicDir, record, variant.asset, variant.width, variant.height, variant.bytes);
    }
    for (const source of record.sources) checkSource(rootDir, source, record, issues);
  }

  const publicManifest = path.join(publicDir, 'media', 'generated', 'manifest.json');
  if (options.checkPublicCopy !== false && fs.existsSync(publicManifest)) {
    try {
      const copy = JSON.parse(fs.readFileSync(publicManifest, 'utf8')) as ArtManifest;
      if (JSON.stringify(copy) !== JSON.stringify(manifest)) {
        issue(issues, 'manifest', 'public/media/generated/manifest.json is out of date; rerun the writer');
      }
    } catch {
      issue(issues, 'manifest', 'public/media/generated/manifest.json is not valid JSON');
    }
  }

  return issues;
}

export function formatIssues(issues: ManifestValidationIssue[]): string {
  return issues.map((i) => `[${i.id ?? 'manifest'}] ${i.field}: ${i.message}`).join('\n');
}
