import fs from 'fs';
import path from 'path';
import { readPng, cliArg } from './lib.mjs';
import { captureScenes, SCENES } from './scenes.mjs';
import { signature, compareSignatures } from './visual_lib.mjs';

const BASELINE = path.resolve('tests/visual/baseline.json');
const THRESHOLD = Number(cliArg('threshold', 12));
const update = process.argv.includes('--update');
const outDir = path.resolve('review/visual');

const results = await captureScenes(outDir);
const pageErrors = results.filter((r) => r.errors.length);
for (const r of pageErrors) console.error(`[visual] ${r.name} page errors:`, r.errors.slice(0, 2));

const current = {};
for (const r of results) current[r.name] = signature(readPng(r.file));

if (update) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`[visual] baseline written: ${BASELINE} (${SCENES.length} scenes)`);
  process.exit(pageErrors.length ? 1 : 0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`[visual] no baseline at ${BASELINE}; run: yarn visual:update`);
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
let regressions = 0;
for (const scene of SCENES) {
  const b = baseline[scene.name];
  const c = current[scene.name];
  if (!b) {
    console.warn(`[visual] missing baseline for ${scene.name}`);
    continue;
  }
  const { score } = compareSignatures(b, c);
  const ok = score <= THRESHOLD;
  if (!ok) regressions++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} ${scene.name.padEnd(16)} ${score.toFixed(1)}`);
}
if (regressions || pageErrors.length) {
  console.error(`[visual] ${regressions} scene(s) over threshold ${THRESHOLD}; see ${outDir}`);
  process.exit(1);
}
console.log('[visual] all scenes within threshold');
