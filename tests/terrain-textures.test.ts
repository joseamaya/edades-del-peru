import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../scripts/terrain-textures.json';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { AUTHORED_SITES } from '../src/model/defs/sites';

const root = path.resolve(__dirname, '..');
const slots = new Set(manifest.slots.map((slot) => slot.slot));

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

describe('terrain texture manifest', () => {
  it('covers every base, regional and authored-site slot', () => {
    for (const slot of ['grass', 'dirt', 'sand', 'rock', 'snow', 'puna_grass', 'coastal_gravel', 'jungle_floor']) {
      expect(slots.has(slot), slot).toBe(true);
    }
    for (const profile of Object.values(MAP_PROFILES)) {
      for (const slot of Object.values(profile.groundPbr ?? {})) {
        expect(slots.has(slot), `${profile.id} -> ${slot}`).toBe(true);
      }
    }
    for (const site of Object.values(AUTHORED_SITES)) {
      for (const slot of Object.values(site.terrain.pbr)) {
        expect(slots.has(slot), `${site.id} -> ${slot}`).toBe(true);
      }
    }
  });

  it('keeps the packed outputs inside the terrain budget', () => {
    let total = 0;
    for (const slot of manifest.slots) {
      total += slot.outputMeta.albedo.bytes + slot.outputMeta.surface.bytes;
    }
    expect(total).toBeLessThanOrEqual(2_200_000);
  });

  it('matches every committed output hash and size', async () => {
    for (const slot of manifest.slots) {
      for (const key of ['albedo', 'surface'] as const) {
        const file = path.join(root, slot.outputs[key]);
        const meta = slot.outputMeta[key];
        expect(fs.existsSync(file), file).toBe(true);
        expect(fs.statSync(file).size, file).toBe(meta.bytes);
        expect(sha256(file), file).toBe(meta.sha256);
        const image = await sharp(file, { failOn: 'none' }).metadata();
        expect([image.width, image.height], file).toEqual([meta.width, meta.width]);
        if (key === 'surface') expect(image.channels, file).toBe(4);
        else expect(image.channels, file).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
