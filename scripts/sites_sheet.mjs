import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg } from './lib.mjs';

/**
 * Compose a site kit's before/after sheet from two capture folders.
 *
 * Usage:
 *   node scripts/sites_sheet.mjs --before=review/moche-before --after=review/moche-after \
 *     --rows=moche,chimu --captions="Huacas de Moche · ~500 d. C.,Chan Chan · ~1450" \
 *     --out=docs/media/moche-kit-before-after.webp [--footer="…"] [--tile=760x428]
 *
 * Both folders hold the same capture names (`<row>_0.png`), produced by the same `yarn shot` command, seed,
 * camera and light. A row without a caption falls back to its file name.
 */

const before = path.resolve(cliArg('before', 'review/before'));
const after = path.resolve(cliArg('after', 'review/after'));
const out = path.resolve(cliArg('out', 'docs/media/sites-before-after.webp'));
const footer = cliArg('footer', '');
const rows = cliArg('rows', '')
  .split(',')
  .map((row) => row.trim())
  .filter(Boolean);
if (!rows.length) throw new Error('--rows is required, e.g. --rows=moche,chimu');
const captions = cliArg('captions', '')
  .split(',')
  .map((caption) => caption.trim());
const [tileWidth, tileHeight] = cliArg('tile', '760x428').split('x').map(Number);
const TILE = { width: tileWidth, height: tileHeight };
const PAD = 14;
const LABEL = 210;
const HEADER = 46;
const FOOTER = 34;

const tile = async (dir, file) => {
  const source = path.join(dir, `${file}_0.png`);
  if (!fs.existsSync(source)) throw new Error(`missing capture ${source}`);
  return sharp(source).resize(TILE.width, TILE.height).toBuffer();
};

const width = LABEL + 2 * TILE.width + 3 * PAD;
const height = HEADER + rows.length * TILE.height + (rows.length + 1) * PAD + FOOTER;
const text = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .cap { fill: #f1e6c8; font: 600 17px system-ui, sans-serif; }
    .row { fill: #e8c36a; font: 800 15px system-ui, sans-serif; letter-spacing: .16em; }
    .foot { fill: #8f8877; font: 400 13px system-ui, sans-serif; }
  </style>
  <text class="cap" x="${LABEL + PAD + TILE.width / 2}" y="30" text-anchor="middle">BEFORE</text>
  <text class="cap" x="${LABEL + 2 * PAD + TILE.width + TILE.width / 2}" y="30" text-anchor="middle">AFTER</text>
  ${rows
    .map(
      (row, index) =>
        `<text class="row" x="${LABEL / 2}" y="${HEADER + PAD + index * (TILE.height + PAD) + TILE.height / 2}" text-anchor="middle">${captions[index] ?? row}</text>`,
    )
    .join('')}
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
for (let row = 0; row < rows.length; row++) {
  place(await tile(before, rows[row]), row, 0);
  place(await tile(after, rows[row]), row, 1);
}
composites.push({ input: Buffer.from(text), left: 0, top: 0 });

await sharp({ create: { width, height, channels: 3, background: '#14161b' } })
  .composite(composites)
  .webp({ quality: 74, effort: 6 })
  .toFile(out);
console.log(`${path.relative(process.cwd(), out)} ${(fs.statSync(out).size / 1024).toFixed(0)} KB ${width}x${height}`);
