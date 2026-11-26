import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg } from './lib.mjs';

/**
 * Compose the Andean garment-paint before/after sheet from two `capture_character_pilot.mjs --close` runs.
 *
 * Usage:
 *   node scripts/andean_paint_sheet.mjs --before=review/paint-before --after=review/paint-after \
 *     --out=docs/media/andean-garment-paint-before-after.webp
 *
 * The crop keeps the shoulder and the upper thigh in the same frame, so the sleeve and the hem band are
 * both visible. The camera is relative to the subject, so the crop is identical in both runs.
 */
const before = path.resolve(cliArg('before', 'review/paint-before'));
const after = path.resolve(cliArg('after', 'review/paint-after'));
const out = path.resolve(cliArg('out', 'docs/media/andean-garment-paint-before-after.webp'));
const footer = cliArg(
  'footer',
  'Sleeveless uncu · only the shoulder cap is painted; the thigh stops above the local skirt hem · src/rendering/workerAttire.ts',
);
const CROP = { left: 460, top: 70, width: 400, height: 760 };
const COLUMNS = [
  { file: 'inca-idle-front.png', caption: 'Inca · uncu' },
  { file: 'moche-idle-front.png', caption: 'Moche · uncu' },
];
const PAD = 14;
const LABEL = 110;
const HEADER = 46;
const FOOTER = 34;

const tile = async (dir, file) => {
  const source = path.join(dir, file);
  if (!fs.existsSync(source)) throw new Error(`missing capture ${source}`);
  return sharp(source).extract(CROP).resize(CROP.width, CROP.height).toBuffer();
};
const [b0, b1] = await Promise.all(COLUMNS.map((column) => tile(before, column.file)));
const [a0, a1] = await Promise.all(COLUMNS.map((column) => tile(after, column.file)));
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
const place = (buffer, column, row) => {
  composites.push({
    input: buffer,
    left: LABEL + PAD + column * (CROP.width + PAD),
    top: HEADER + PAD + row * (CROP.height + PAD),
  });
};
[b0, b1].forEach((buffer, index) => place(buffer, index, 0));
[a0, a1].forEach((buffer, index) => place(buffer, index, 1));
composites.push({ input: Buffer.from(text), left: 0, top: 0 });

await sharp({ create: { width, height, channels: 3, background: '#14161b' } })
  .composite(composites)
  .webp({ quality: 76, effort: 6 })
  .toFile(out);
console.log(`${path.relative(process.cwd(), out)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB ${width}x${height}`);
