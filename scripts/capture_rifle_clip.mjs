import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg, reviewDir } from './lib.mjs';

/**
 * Render the project `Rifle_Shoot` clip as a 2×2 sheet (aim, kick, settle) for PR evidence. The clip is built
 * by `scripts/blender/build_rifle_clip.py`, which also renders the stills; this script composes them.
 *
 * Requires the local Blender authoring tool (not a CI dependency).
 *
 * Usage: node scripts/capture_rifle_clip.mjs [--out=docs/media/rifle-shoot.webp]
 */
const out = path.resolve(cliArg('out', 'docs/media/rifle-shoot.webp'));
const frames = path.join(reviewDir(), 'rifle-shoot');
fs.mkdirSync(frames, { recursive: true });

execFileSync(
  'blender',
  ['--background', '--python', 'scripts/blender/build_rifle_clip.py', '--', `--stills=${frames}`],
  {
    stdio: 'inherit',
  },
);

const tiles = ['frame-00.png', 'frame-03.png', 'frame-05.png', 'frame-08.png'].map((file) => path.join(frames, file));
for (const file of tiles) if (!fs.existsSync(file)) throw new Error(`missing still ${file}`);
const buffers = await Promise.all(tiles.map((file) => sharp(file).toBuffer()));
await sharp({ create: { width: 960, height: 1080, channels: 3, background: '#141414' } })
  .composite(buffers.map((input, index) => ({ input, left: (index % 2) * 480, top: Math.floor(index / 2) * 540 })))
  .webp({ quality: 82 })
  .toFile(out);
console.log(`wrote ${path.relative(process.cwd(), out)} (${tiles.length} frames)`);
