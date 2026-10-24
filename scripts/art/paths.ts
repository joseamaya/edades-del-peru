import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, resolved from this file (scripts/art/paths.ts). */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

export const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
export const GENERATED_DIR = path.join(PUBLIC_DIR, 'media', 'generated');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'src', 'art', 'manifest.json');
export const BLENDER_SOURCE_MANIFEST = path.join(REPO_ROOT, 'art-src', 'blender', 'caral', 'renders.json');

export function publicPath(asset: string): string {
  return path.join(PUBLIC_DIR, asset.replace(/^\/+/, ''));
}
