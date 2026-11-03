import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { REPO_ROOT } from './paths';

type MapKey = 'albedo' | 'normal' | 'roughness' | 'ao' | 'height';

interface SourceMap {
  map?: string;
  file: string;
  sha256: string;
  bytes: number;
}

interface OutputMeta {
  sha256: string;
  bytes: number;
  width: number;
}

export interface TerrainTextureSlot {
  slot: string;
  kind: 'polyhaven' | 'local';
  assetId?: string;
  author: string;
  license: string;
  url: string;
  source?: string;
  date: string;
  heightSource?: string;
  width: number;
  maps: Partial<Record<MapKey, SourceMap>>;
  outputs: { albedo: string; surface: string };
  outputMeta?: { albedo: OutputMeta; surface: OutputMeta };
}

export interface TerrainTextureManifest {
  version: number;
  quality?: number;
  slots: TerrainTextureSlot[];
}

export interface TerrainTextureOptions {
  manifestPath?: string;
  only?: Set<string>;
  dryRun?: boolean;
  check?: boolean;
  maxBytes?: number;
  onProgress?: (message: string) => void;
}

export interface TerrainTextureResult {
  slots: { slot: string; albedo: number; surface: number; total: number }[];
  totalBytes: number;
  errors: string[];
  manifestUpdated: boolean;
}

export const TERRAIN_TEXTURE_BUDGET_BYTES = 2_200_000;
const DEFAULT_MANIFEST = path.join(REPO_ROOT, 'scripts', 'terrain-textures.json');
const POLYHAVEN_FILES = 'https://api.polyhaven.com/files';

function sha256(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readManifest(file: string): TerrainTextureManifest {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as TerrainTextureManifest;
  if (manifest.version !== 1) throw new Error(`unsupported terrain texture manifest version: ${manifest.version}`);
  for (const slot of manifest.slots) {
    for (const field of ['author', 'license', 'url', 'date'] as const) {
      if (!slot[field]) throw new Error(`${slot.slot}: missing ${field}`);
    }
    for (const key of ['albedo', 'normal', 'roughness'] as const) {
      if (!slot.maps[key]?.sha256) throw new Error(`${slot.slot}: missing ${key} source hash`);
    }
  }
  return manifest;
}

async function downloadSource(slot: TerrainTextureSlot, key: MapKey, dest: string): Promise<void> {
  const source = slot.maps[key];
  if (!source) throw new Error(`${slot.slot}: missing ${key} source`);
  if (!slot.assetId || !source.map) throw new Error(`${slot.slot}: ${key} has no remote map`);
  const files = (await (await fetch(`${POLYHAVEN_FILES}/${slot.assetId}`)).json()) as Record<
    string,
    Record<string, Record<string, { url: string }>>
  >;
  const entry = files[source.map]?.['1k']?.jpg ?? files[source.map]?.['1k']?.png;
  if (!entry) throw new Error(`${slot.slot}: Poly Haven has no ${source.map} 1k`);
  const bytes = Buffer.from(await (await fetch(entry.url)).arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== source.sha256) {
    throw new Error(`${slot.slot}: ${key} hash mismatch (${actual} != ${source.sha256})`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
}

async function ensureSource(slot: TerrainTextureSlot, key: MapKey): Promise<string> {
  const source = slot.maps[key];
  if (!source) throw new Error(`${slot.slot}: missing ${key} source`);
  const file = path.resolve(REPO_ROOT, source.file);
  if (!fs.existsSync(file)) {
    if (slot.kind === 'polyhaven') await downloadSource(slot, key, file);
    else throw new Error(`${slot.slot}: source not found: ${source.file}`);
  }
  const bytes = fs.readFileSync(file);
  if (bytes.length !== source.bytes) {
    throw new Error(`${slot.slot}: ${key} size mismatch (${bytes.length} != ${source.bytes})`);
  }
  const actual = sha256(bytes);
  if (actual !== source.sha256) {
    throw new Error(`${slot.slot}: ${key} hash mismatch (${actual} != ${source.sha256})`);
  }
  return file;
}

async function readResizedChannels(file: string, width: number, channels: 1 | 3): Promise<Buffer> {
  const pipeline = sharp(file, { failOn: 'none' }).resize(width, width, { fit: 'fill' });
  if (channels === 1) pipeline.greyscale();
  else pipeline.removeAlpha();
  const { data } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return data;
}

function readChannel(data: Buffer, channels: number, index: number): number {
  if (channels === 1) return data[0] ?? 0;
  return data[index] ?? 0;
}

function packRgba(
  width: number,
  rgb: Buffer,
  rgbChannels: number,
  fourth: Buffer | null,
  fourthChannels: number,
): Buffer {
  const out = Buffer.alloc(width * width * 4);
  for (let i = 0; i < width * width; i++) {
    out[i * 4] = readChannel(rgb.subarray(i * rgbChannels), rgbChannels, 0);
    out[i * 4 + 1] = readChannel(rgb.subarray(i * rgbChannels), rgbChannels, 1);
    out[i * 4 + 2] = readChannel(rgb.subarray(i * rgbChannels), rgbChannels, 2);
    out[i * 4 + 3] = fourth ? readChannel(fourth.subarray(i * fourthChannels), fourthChannels, 0) : 255;
  }
  return out;
}

function packSurfaceRgba(
  width: number,
  normal: Buffer,
  roughness: Buffer,
  height: Buffer | null,
  albedo: Buffer,
): Buffer {
  const out = Buffer.alloc(width * width * 4);
  for (let i = 0; i < width * width; i++) {
    out[i * 4] = readChannel(normal.subarray(i * 3), 3, 0);
    out[i * 4 + 1] = readChannel(normal.subarray(i * 3), 3, 1);
    out[i * 4 + 2] = roughness[i] ?? 204;
    // Caral has no displacement source; use a luminance-derived height so the
    // packed alpha stays non-constant (WebP drops a fully opaque alpha channel).
    out[i * 4 + 3] = height
      ? (height[i] ?? 128)
      : Math.round(
          (albedo[i * 3] ?? 128) * 0.299 + (albedo[i * 3 + 1] ?? 128) * 0.587 + (albedo[i * 3 + 2] ?? 128) * 0.114,
        );
  }
  return out;
}

async function encode(rgba: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(rgba, { raw: { width, height: width, channels: 4 } })
    .webp({ quality, effort: 6 })
    .toBuffer();
}

async function packSlot(
  slot: TerrainTextureSlot,
  options: TerrainTextureOptions,
  quality: number,
): Promise<{ albedo: Buffer; surface: Buffer }> {
  const width = slot.width;
  const albedoFile = await ensureSource(slot, 'albedo');
  const normalFile = await ensureSource(slot, 'normal');
  const roughnessFile = await ensureSource(slot, 'roughness');
  const heightFile = slot.maps.height ? await ensureSource(slot, 'height') : null;
  const aoFile = slot.maps.ao ? await ensureSource(slot, 'ao') : null;

  const albedo = await readResizedChannels(albedoFile, width, 3);
  const normal = await readResizedChannels(normalFile, width, 3);
  const roughness = await readResizedChannels(roughnessFile, width, 1);
  const height = heightFile ? await readResizedChannels(heightFile, width, 1) : null;
  const ao = aoFile ? await readResizedChannels(aoFile, width, 1) : null;

  const albedoRgba = packRgba(width, albedo, 3, ao, 1);
  const surface = packSurfaceRgba(width, normal, roughness, height, albedo);

  options.onProgress?.(`packing ${slot.slot} at ${width}px`);
  return { albedo: await encode(albedoRgba, width, quality), surface: await encode(surface, width, quality) };
}

function outputPath(relative: string): string {
  return path.resolve(REPO_ROOT, relative);
}

async function verifyOutput(file: string, meta: OutputMeta, width: number): Promise<number> {
  if (!fs.existsSync(file)) throw new Error(`missing output: ${file}`);
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== meta.sha256) throw new Error(`output hash mismatch: ${file}`);
  if (bytes.length !== meta.bytes) throw new Error(`output bytes mismatch: ${file}`);
  const metadata = await sharp(bytes, { failOn: 'none' }).metadata();
  if (metadata.width !== width || metadata.height !== width) {
    throw new Error(`output dimensions mismatch: ${file}`);
  }
  return bytes.length;
}

export async function packTerrainTextures(options: TerrainTextureOptions = {}): Promise<TerrainTextureResult> {
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST;
  const manifest = readManifest(manifestPath);
  const result: TerrainTextureResult = { slots: [], totalBytes: 0, errors: [], manifestUpdated: false };
  let changed = false;

  for (const slot of manifest.slots) {
    if (options.only && !options.only.has(slot.slot)) continue;
    const albedoOut = outputPath(slot.outputs.albedo);
    const surfaceOut = outputPath(slot.outputs.surface);
    try {
      if (options.check) {
        if (!slot.outputMeta) throw new Error(`${slot.slot}: missing output metadata`);
        const albedoBytes = await verifyOutput(albedoOut, slot.outputMeta.albedo, slot.width);
        const surfaceBytes = await verifyOutput(surfaceOut, slot.outputMeta.surface, slot.width);
        const total = albedoBytes + surfaceBytes;
        result.slots.push({ slot: slot.slot, albedo: albedoBytes, surface: surfaceBytes, total });
        result.totalBytes += total;
        continue;
      }

      const packed = await packSlot(slot, options, manifest.quality ?? 80);
      const albedoMeta = { sha256: sha256(packed.albedo), bytes: packed.albedo.length, width: slot.width };
      const surfaceMeta = { sha256: sha256(packed.surface), bytes: packed.surface.length, width: slot.width };
      result.slots.push({
        slot: slot.slot,
        albedo: packed.albedo.length,
        surface: packed.surface.length,
        total: packed.albedo.length + packed.surface.length,
      });
      result.totalBytes += packed.albedo.length + packed.surface.length;

      if (!options.dryRun) {
        fs.mkdirSync(path.dirname(albedoOut), { recursive: true });
        fs.writeFileSync(albedoOut, packed.albedo);
        fs.writeFileSync(surfaceOut, packed.surface);
        if (
          !slot.outputMeta ||
          slot.outputMeta.albedo.sha256 !== albedoMeta.sha256 ||
          slot.outputMeta.surface.sha256 !== surfaceMeta.sha256
        ) {
          slot.outputMeta = { albedo: albedoMeta, surface: surfaceMeta };
          changed = true;
        }
      }
    } catch (error) {
      result.errors.push(`${slot.slot}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (changed && !options.dryRun) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    result.manifestUpdated = true;
  }

  const max = options.maxBytes ?? TERRAIN_TEXTURE_BUDGET_BYTES;
  if (result.totalBytes > max) {
    result.errors.push(
      `terrain textures ${(result.totalBytes / 1e6).toFixed(2)} MB exceed budget ${(max / 1e6).toFixed(2)} MB`,
    );
  }
  return result;
}
