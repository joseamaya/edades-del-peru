import path from 'path';
import sharp from 'sharp';

/**
 * Compose the E7 after/final 3 x 3 sheets from the art-pilot captures (rows: hualla, acequia,
 * inticancha; columns: 1280x720, 1600x900, 1920x1080), plus the E6 -> E7 before/after grid.
 *
 * Usage: node scripts/compare_tambotoco_e7.mjs
 */
const ROOT = process.cwd();
const VIEWS = ['hualla', 'acequia', 'inticancha'];
const SIZES = ['1280x720', '1600x900', '1920x1080'];
const LABEL = 34;
const CELL_W = 640;
const CELL_H = 360;

const caption = (text, width) =>
  Buffer.from(
    `<svg width="${width}" height="${LABEL}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" fill="#0b0f14"/>
       <text x="12" y="23" fill="#d9c27a" font-family="DejaVu Sans" font-size="17">${text}</text>
     </svg>`,
  );

async function grid(tag, quality, name) {
  const composites = [];
  for (let row = 0; row < VIEWS.length; row++) {
    for (let col = 0; col < SIZES.length; col++) {
      const source = path.join(ROOT, 'review', `art-pilot-${tag}-${quality}-${SIZES[col]}-${VIEWS[row]}.png`);
      const x = col * CELL_W;
      const y = row * (CELL_H + LABEL);
      composites.push({
        input: await sharp(source).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer(),
        left: x,
        top: y,
      });
      composites.push({ input: caption(`${VIEWS[row]} · ${SIZES[col]}`), left: x, top: y + CELL_H });
    }
  }
  const out = path.join(ROOT, 'docs', 'media', `tambotoco-e7-3x3-${name}.webp`);
  await sharp({ create: { width: 3 * CELL_W, height: 3 * (CELL_H + LABEL), channels: 3, background: '#0b0f14' } })
    .composite(composites)
    .webp({ quality: 62 })
    .toFile(out);
  console.log(path.relative(ROOT, out));
}

async function beforeAfter() {
  const cw = 800;
  const ch = 450;
  const cols = ['e6', 'e7'];
  const composites = [];
  for (let row = 0; row < VIEWS.length; row++) {
    for (const [col, tag] of cols.entries()) {
      const source = path.join(ROOT, 'review', `art-pilot-${tag}-neutral-1600x900-${VIEWS[row]}.png`);
      const x = col * cw;
      const y = row * (ch + LABEL);
      composites.push({ input: await sharp(source).resize(cw, ch, { fit: 'cover' }).toBuffer(), left: x, top: y });
      composites.push({ input: caption(`${VIEWS[row]} · ${tag === 'e6' ? 'E6' : 'E7'}`), left: x, top: y + ch });
    }
  }
  const out = path.join(ROOT, 'docs', 'media', 'tambotoco-e7-before-after.webp');
  await sharp({ create: { width: 2 * cw, height: 3 * (ch + LABEL), channels: 3, background: '#0b0f14' } })
    .composite(composites)
    .webp({ quality: 64 })
    .toFile(out);
  console.log(path.relative(ROOT, out));
}

await grid('e7', 'neutral', 'after');
await grid('e7', 'final', 'final');
await beforeAfter();
