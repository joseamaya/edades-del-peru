import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './paths';
import { collectFiles } from './files';

export interface ModelOptimizeOptions {
  only?: Set<string>;
  dryRun?: boolean;
  force?: boolean;
  compress?: 'draco' | 'meshopt';
  textureSize?: number;
  onProgress?: (message: string) => void;
}

export interface ModelOptimizeResult {
  optimized: { file: string; before: number; after: number }[];
  skipped: string[];
  errors: string[];
}

const MODEL_ROOT = path.join(REPO_ROOT, 'src', 'assets');

function cliPath(): string {
  const local = path.join(REPO_ROOT, 'node_modules', '.bin', 'gltf-transform');
  if (!fs.existsSync(local)) throw new Error('gltf-transform is not installed; run yarn install');
  return local;
}

/**
 * Compress the committed GLBs with meshopt geometry compression, keeping the
 * original texture format. Keeps the original file when the optimized result
 * would be larger, which happens on tiny already-dense models.
 */
export function optimizeModels(options: ModelOptimizeOptions = {}): ModelOptimizeResult {
  const result: ModelOptimizeResult = { optimized: [], skipped: [], errors: [] };
  const compress = options.compress ?? 'meshopt';
  if (!['draco', 'meshopt'].includes(compress)) throw new Error(`unsupported compression: ${compress}`);
  const textureSize = options.textureSize ?? 1024;
  const cli = cliPath();
  const tmp = path.join(REPO_ROOT, 'review', 'art-models');
  fs.mkdirSync(tmp, { recursive: true });

  for (const file of collectFiles(MODEL_ROOT, '.glb')) {
    const id = path.relative(MODEL_ROOT, file);
    if (options.only && !options.only.has(id) && !options.only.has(path.basename(file, '.glb'))) continue;
    const before = fs.statSync(file).size;
    const target = path.join(tmp, `${path.basename(file, '.glb')}.glb`);
    options.onProgress?.(`${id} (${(before / 1e6).toFixed(2)} MB)`);
    try {
      execFileSync(
        cli,
        [
          'optimize',
          file,
          target,
          '--compress',
          compress,
          '--texture-compress',
          'auto',
          '--palette',
          'false',
          '--texture-size',
          String(textureSize),
        ],
        { stdio: 'pipe' },
      );
      const after = fs.statSync(target).size;
      if (!options.force && after >= before) {
        result.skipped.push(`${id} (${(after / 1e6).toFixed(2)} MB >= ${(before / 1e6).toFixed(2)} MB)`);
        continue;
      }
      if (!options.dryRun) fs.copyFileSync(target, file);
      result.optimized.push({ file: id, before, after });
    } catch (error) {
      result.errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      fs.rmSync(target, { force: true });
    }
  }
  return result;
}
