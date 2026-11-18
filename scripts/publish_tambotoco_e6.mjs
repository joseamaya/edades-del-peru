import path from 'path';
import sharp from 'sharp';

/**
 * Publish the 960x540 WebP representatives of the E6 3 x 3 reference set from the `review/` captures
 * (docs/design/tambotoco-art-pilot.md). Run the art-pilot neutral/final captures first; the `before` set
 * comes from a worktree at the pilot baseline.
 *
 * Usage: node scripts/publish_tambotoco_e6.mjs
 */
const ROOT = process.cwd();
const VIEWS = ['hualla', 'acequia', 'inticancha'];
const jobs = [];
for (const view of VIEWS) {
  jobs.push([`review/art-pilot-e6-before-neutral-1600x900-${view}.png`, `docs/media/tambotoco-e6-${view}-before.webp`]);
  jobs.push([`review/art-pilot-e6-neutral-1600x900-${view}.png`, `docs/media/tambotoco-e6-${view}-after.webp`]);
  jobs.push([`review/art-pilot-e6-final-1600x900-${view}.png`, `docs/media/tambotoco-e6-${view}-final.webp`]);
}
for (const [src, out] of jobs) {
  await sharp(path.join(ROOT, src)).resize(960, 540).webp({ quality: 58 }).toFile(path.join(ROOT, out));
  console.log(out);
}
