import path from 'path';
import sharp from 'sharp';

/**
 * Publish the 960x540 E7 representatives (three cameras neutral + final, the hero and the two detail
 * views) from the review captures. Run the E7 art-pilot, e7-hero and e7-detail captures first.
 *
 * Usage: node scripts/publish_tambotoco_e7.mjs
 */
const ROOT = process.cwd();
const VIEWS = ['hualla', 'acequia', 'inticancha'];
for (const view of VIEWS) {
  for (const [quality, suffix] of [
    ['neutral', 'after'],
    ['final', 'final'],
  ]) {
    const src = path.join(ROOT, 'review', `art-pilot-e7-${quality}-1600x900-${view}.png`);
    const out = path.join(ROOT, 'docs', 'media', `tambotoco-e7-${view}-${suffix}.webp`);
    await sharp(src).resize(960, 540).webp({ quality: 58 }).toFile(out);
    console.log(path.relative(ROOT, out));
  }
}
// The hero and the two detail views complete the E7 evidence; they are captured separately.
for (const [src, out] of [
  ['art-pilot-e7-hero-final-1600x900-hero.png', 'tambotoco-e7-hero.webp'],
  ['art-pilot-e7-detail-neutral-1600x900-shrineClose.png', 'tambotoco-e7-shrine.webp'],
  ['art-pilot-e7-detail-neutral-1600x900-inticanchaClose.png', 'tambotoco-e7-yard.webp'],
]) {
  await sharp(path.join(ROOT, 'review', src))
    .resize(960, 540)
    .webp({ quality: 58 })
    .toFile(path.join(ROOT, 'docs', 'media', out));
  console.log(path.join('docs', 'media', out));
}
