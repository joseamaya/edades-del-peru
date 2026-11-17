import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { cliArg } from './lib.mjs';

/**
 * Build the E5 before/after contact sheets from the committed intro/card/epilogue captures
 * (`public/media/tambotoco/intro-*.webp`). The `after` side is the working tree; the `before` side is the
 * capture set at `--before` (default: the previous main). The raw captures are the evidence; this only
 * composes them for review.
 *
 * Usage: node scripts/compare_tambotoco_beats.mjs [--before=cde2e9d]
 */
const BEFORE = cliArg('before', 'cde2e9d');
const ROOT = process.cwd();
const IDS = ['cueva', 'huanacaure', 'valle', 'traza', 'epilogo'];
const CELL = 640;
const H = 360;
const LABEL = 34;
const WIDE = 1280;
const LABELS = {
  cueva: 'Cueva · hero',
  huanacaure: 'Huanacaure · detail',
  valle: 'Valle · wide',
  traza: 'Traza · wide',
  epilogo: 'Inticancha · reward',
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tambotoco-beats-'));
try {
  for (const id of IDS) {
    const file = path.join(tmp, `${id}.webp`);
    const data = execFileSync('git', ['show', `${BEFORE}:public/media/tambotoco/intro-${id}.webp`], {
      cwd: ROOT,
      maxBuffer: 8 * 1024 * 1024,
    });
    fs.writeFileSync(file, data);
  }
  await sheet((id) => path.join(tmp, `${id}.webp`), 'before');
  await sheet((id) => path.join(ROOT, 'public', 'media', 'tambotoco', `intro-${id}.webp`), 'after');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function sheet(source, tag) {
  const composites = [];
  for (let i = 0; i < 4; i++) {
    const id = IDS[i];
    const x = (i % 2) * CELL;
    const y = Math.floor(i / 2) * (H + LABEL);
    composites.push({ input: await cell(source(id), CELL, H), left: x, top: y });
    composites.push({ input: caption(LABELS[id], CELL), left: x, top: y + H });
  }
  const top = 2 * (H + LABEL);
  composites.push({ input: await cell(source('epilogo'), WIDE, H), left: 0, top });
  composites.push({ input: caption(LABELS.epilogo, WIDE), left: 0, top: top + H });
  const out = path.join(ROOT, 'docs', 'media', `tambotoco-e5-cards-${tag}.webp`);
  await sharp({ create: { width: WIDE, height: 3 * (H + LABEL), channels: 3, background: '#0b0f14' } })
    .composite(composites)
    .webp({ quality: 60 })
    .toFile(out);
  console.log(path.relative(ROOT, out));
}

function cell(file, width, height) {
  return sharp(file).resize(width, height, { fit: 'cover' }).toBuffer();
}

function caption(text, width) {
  return Buffer.from(
    `<svg width="${width}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" fill="#0b0f14"/>
       <text x="12" y="23" fill="#d9c27a" font-family="DejaVu Sans" font-size="17">${text}</text>
     </svg>`,
  );
}
