import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg } from './lib.mjs';

/**
 * Compose the Independence-site before/after sheet from two capture folders.
 *
 * Usage:
 *   node scripts/independence_sites_sheet.mjs --before=review/independence-before \
 *     --after=review/independence-after --out=docs/media/independence-kit-before-after.webp
 */

const before = path.resolve(cliArg('before', 'review/independence-before'));
const after = path.resolve(cliArg('after', 'review/independence-after'));
const out = path.resolve(cliArg('out', 'docs/media/independence-kit-before-after.webp'));
const footer = cliArg(
  'footer',
  'Independence kit · Ayacucho and Breña · scripts/blender/build_independence_architecture_kit.py',
);
const ROWS = [
  { file: 'm8', caption: 'Ayacucho · 1824' },
  { file: 'brena', caption: 'Breña · 1882–1883' },
];
const TILE = { width: 760, height: 428 };
const PAD = 14;
const LABEL = 190;
const HEADER = 46;
const FOOTER = 34;

const tile = async (dir, file) => {
  const source = path.join(dir, `${file}_0.png`);
  if (!fs.existsSync(source)) throw new Error(`missing capture ${source}`);
  return sharp(source).resize(TILE.width, TILE.height).toBuffer();
};

const width = LABEL + 2 * TILE.width + 3 * PAD;
const height = HEADER + ROWS.length * TILE.height + (ROWS.length + 1) * PAD + FOOTER;
const text = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .cap { fill: #f1e6c8; font: 600 17px system-ui, sans-serif; }
    .row { fill: #e8c36a; font: 800 15px system-ui, sans-serif; letter-spacing: .16em; }
    .foot { fill: #8f8877; font: 400 13px system-ui, sans-serif; }
  </style>
  <text class="cap" x="${LABEL + PAD + TILE.width / 2}" y="30" text-anchor="middle">BEFORE</text>
  <text class="cap" x="${LABEL + 2 * PAD + TILE.width + TILE.width / 2}" y="30" text-anchor="middle">AFTER</text>
  ${ROWS.map(
    (row, index) =>
      `<text class="row" x="${LABEL / 2}" y="${HEADER + PAD + index * (TILE.height + PAD) + TILE.height / 2}" text-anchor="middle">${row.caption}</text>`,
  ).join('')}
  <text class="foot" x="${LABEL + PAD}" y="${height - 10}">${footer}</text>
</svg>`;

const composites = [];
const place = (buffer, row, column) => {
  composites.push({
    input: buffer,
    left: LABEL + PAD + column * (TILE.width + PAD),
    top: HEADER + PAD + row * (TILE.height + PAD),
  });
};
for (let row = 0; row < ROWS.length; row++) {
  place(await tile(before, ROWS[row].file), row, 0);
  place(await tile(after, ROWS[row].file), row, 1);
}
composites.push({ input: Buffer.from(text), left: 0, top: 0 });

await sharp({ create: { width, height, channels: 3, background: '#14161b' } })
  .composite(composites)
  .webp({ quality: 74, effort: 6 })
  .toFile(out);
console.log(`${path.relative(process.cwd(), out)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB ${width}x${height}`);
