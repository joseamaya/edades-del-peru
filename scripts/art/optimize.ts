import crypto from 'node:crypto';
import sharp from 'sharp';
import type { ImageTypeRule } from '../../src/art/imageTypes';
import type { ArtVariant } from '../../src/art/types';

export interface OptimizedVariant extends ArtVariant {
  data: Uint8Array;
}

export interface OptimizedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  crop: 'cover-attention' | 'none';
  variants: OptimizedVariant[];
}

export interface OptimizeOverrides {
  width?: number;
  height?: number;
  maxBytes?: number;
  variantWidth?: number;
}

const QUALITIES = [84, 80, 76, 72, 68];

async function encode(
  source: Buffer,
  width: number,
  height: number,
  maxBytes: number,
): Promise<{ bytes: Buffer; width: number; height: number }> {
  let last: Buffer | null = null;
  for (const quality of QUALITIES) {
    const bytes = await sharp(source, { failOn: 'none' })
      .rotate()
      .resize({ width, height, fit: 'cover', position: 'attention' })
      .webp({ quality, effort: 6 })
      .toBuffer();
    last = bytes;
    if (bytes.length <= maxBytes) return { bytes, width, height };
  }
  throw new Error(
    `Optimized image is still ${last?.length ?? 0} bytes after quality reduction (budget ${maxBytes}); reduce dimensions or compress the source`,
  );
}

export function sha256(bytes: Uint8Array): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** Convert a Blender PNG into a budgeted WebP and optional smaller variant. */
export async function optimizeImage(
  input: Uint8Array,
  rule: ImageTypeRule,
  variantAsset?: string,
  overrides: OptimizeOverrides = {},
): Promise<OptimizedImage> {
  const source = Buffer.from(input);
  const metadata = await sharp(source, { failOn: 'none' }).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (!sourceWidth || !sourceHeight) throw new Error('Blender render has no readable dimensions');

  const width = overrides.width ?? rule.width;
  const height = overrides.height ?? rule.height;
  const maxBytes = overrides.maxBytes ?? rule.maxBytes;
  const main = await encode(source, width, height, maxBytes);
  const variants: OptimizedVariant[] = [];
  const variantWidth = overrides.variantWidth ?? rule.variantWidth;
  if (variantWidth && variantAsset) {
    const variantHeight = Math.max(1, Math.round((variantWidth * height) / width));
    const variant = await encode(source, variantWidth, variantHeight, Math.floor(maxBytes / 2));
    variants.push({
      asset: variantAsset,
      width: variant.width,
      height: variant.height,
      bytes: variant.bytes.length,
      data: new Uint8Array(variant.bytes),
    });
  }

  return {
    bytes: new Uint8Array(main.bytes),
    width: main.width,
    height: main.height,
    sourceWidth,
    sourceHeight,
    crop: 'cover-attention',
    variants,
  };
}
