import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg } from './lib.mjs';

/**
 * Compose the character-pilot before/after sheet from two capture folders.
 *
 * The close-up camera is placed relative to the subject, so the subject lands on the same pixels in both
 * runs: one crop box serves the before and the after shot.
 *
 * Usage:
 *   node scripts/character_pilot_sheet.mjs --before=review/tmp/pilot --after=review/pilot-after \
 *     --out=docs/media/character-equipment-before-after.webp
 */

const before = path.resolve(cliArg('before', 'review/tmp/pilot'));
const after = path.resolve(cliArg('after', 'review/pilot-after'));
const out = path.resolve(cliArg('out', 'docs/media/character-equipment-before-after.webp'));
const footer = cliArg(
  'footer',
  'Headpieces fitted to the measured head, the club held by its grip, the shield at the hand · docs/art/character-visual-pilot.md §18',
);
const CROP = { left: 455, top: 195, width: 340, height: 520 };
const COLUMNS = [
  { file: 'inca-idle-front.png', caption: 'Inca · rest' },
  { file: 'inca-run-front.png', caption: 'Inca · run' },
  { file: 'moche-idle-front.png', caption: 'Moche · rest' },
];
const PAD = 14;
const LABEL = 104;
const HEADER = 46;
const FOOTER = 34;

const tile = async (dir, file) => {
  const source = path.join(dir, file);
  if (!fs.existsSync(source)) throw new Error(`missing capture ${source}`);
  return sharp(source).extract(CROP).resize(CROP.width, CROP.height).toBuffer();
};

const [b0, b1, b2] = await Promise.all(COLUMNS.map((column) => tile(before, column.file)));
const [a0, a1, a2] = await Promise.all(COLUMNS.map((column) => tile(after, column.file)));
const width = LABEL + COLUMNS.length * CROP.width + (COLUMNS.length + 1) * PAD;
const height = HEADER + 2 * CROP.height + 3 * PAD + FOOTER;

const text = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .cap { fill: #f1e6c8; font: 600 17px system-ui, sans-serif; }
    .row { fill: #e8c36a; font: 800 16px system-ui, sans-serif; letter-spacing: .18em; }
    .foot { fill: #8f8877; font: 400 13px system-ui, sans-serif; }
  </style>
  ${COLUMNS.map(
    (column, index) =>
      `<text class="cap" x="${LABEL + PAD + index * (CROP.width + PAD) + CROP.width / 2}" y="30" text-anchor="middle">${column.caption}</text>`,
  ).join('')}
  <text class="row" x="${LABEL / 2}" y="${HEADER + PAD + CROP.height / 2}" text-anchor="middle">BEFORE</text>
  <text class="row" x="${LABEL / 2}" y="${HEADER + 2 * PAD + CROP.height + CROP.height / 2}" text-anchor="middle">AFTER</text>
  <text class="foot" x="${LABEL + PAD}" y="${height - 10}">${footer}</text>
</svg>`;

const composites = [];
const place = (buffer, sample, row) => {
  const left = LABEL + PAD + sample * (CROP.width + PAD);
  const top = HEADER + PAD + row * (CROP.height + PAD);
  composites.push({ input: buffer, left, top });
};
[b0, b1, b2].forEach((buffer, index) => place(buffer, index, 0));
[a0, a1, a2].forEach((buffer, index) => place(buffer, index, 1));
composites.push({ input: Buffer.from(text), left: 0, top: 0 });

await sharp({ create: { width, height, channels: 3, background: '#14161b' } })
  .composite(composites)
  .webp({ quality: 74, effort: 6 })
  .toFile(out);
console.log(`${path.relative(process.cwd(), out)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB ${width}x${height}`);
