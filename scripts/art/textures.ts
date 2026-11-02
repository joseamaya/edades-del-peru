import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { REPO_ROOT } from './paths';

export interface TextureOptimizeOptions {
  only?: Set<string>;
  dryRun?: boolean;
  force?: boolean;
  onProgress?: (message: string) => void;
}

export interface TextureOptimizeResult {
  optimized: { file: string; before: number; after: number }[];
  skipped: string[];
  errors: string[];
}

const TEXTURE_ROOT = path.join(REPO_ROOT, 'src', 'assets', 'textures');

function collectTextures(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) out.push(full);
    }
  };
  walk(TEXTURE_ROOT);
  return out.sort();
}

/** Per-map budget: normal/roughness carry less visible detail than diffuse. */
export function textureBudget(file: string): { width: number; quality: number } {
  const name = path.basename(file).toLowerCase();
  const terrain = file.split(path.sep).includes('terrain');
  if (name.endsWith('_normal.webp')) return { width: 256, quality: 78 };
  if (name.endsWith('_roughness.webp')) return { width: 256, quality: 78 };
  if (terrain) return { width: 768, quality: 78 };
  return { width: 512, quality: 78 };
}

/**
 * Re-encode the committed PBR textures to the game's shipping budget. Normal
 * and roughness maps go to 256 px, material diffuse maps to 512 px and terrain
 * maps keep 1024 px, which is the resolution visible at the RTS camera distance.
 */
export async function optimizeTextures(options: TextureOptimizeOptions = {}): Promise<TextureOptimizeResult> {
  const result: TextureOptimizeResult = { optimized: [], skipped: [], errors: [] };
  for (const file of collectTextures()) {
    const id = path.relative(TEXTURE_ROOT, file);
    if (options.only && !options.only.has(id) && !options.only.has(path.basename(file, '.webp'))) continue;
    const budget = textureBudget(file);
    const before = fs.statSync(file).size;
    try {
      const metadata = await sharp(file, { failOn: 'none' }).metadata();
      const width = Math.min(budget.width, metadata.width ?? budget.width);
      const output = await sharp(file, { failOn: 'none' })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: budget.quality, effort: 6 })
        .toBuffer();
      const after = output.length;
      options.onProgress?.(`${id}: ${metadata.width}px -> ${width}px, ${(before / 1e6).toFixed(2)} MB`);
      if (!options.force && after >= before) {
        result.skipped.push(`${id} (${(after / 1e6).toFixed(2)} MB >= ${(before / 1e6).toFixed(2)} MB)`);
        continue;
      }
      if (!options.dryRun) fs.writeFileSync(file, output);
      result.optimized.push({ file: id, before, after });
    } catch (error) {
      result.errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return result;
}
