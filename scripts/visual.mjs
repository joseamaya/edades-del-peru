import fs from 'fs';
import path from 'path';
import { readPng, cliArg } from './lib.mjs';
import { captureScenes, SCENES } from './scenes.mjs';
import { signature, compareSignatures } from './visual_lib.mjs';

const BASELINE = path.resolve('tests/visual/baseline.json');
const THRESHOLD = Number(cliArg('threshold', 12));
const CELL_THRESHOLD = Number(cliArg('cell-threshold', 35));
const only = cliArg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const update = process.argv.includes('--update');
const outDir = path.resolve('review/visual');

const results = await captureScenes(outDir, only);
// A scene that failed to boot or has no center is not a valid capture: never
// let it become (or stand in for) a baseline.
const invalid = results.filter((r) => !r.ok || r.errors.length);
for (const r of invalid) console.error(`[visual] ${r.name} capture failed`, r.errors.slice(0, 2));

if (update) {
  if (invalid.length) {
    console.error(`[visual] refusing to write baseline (${invalid.length} invalid scene(s)); see ${outDir}`);
    process.exit(1);
  }
  // a partial update (--only) must not drop the other scenes from the baseline
  const current = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  for (const r of results) current[r.name] = signature(readPng(r.file));
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`[visual] baseline written: ${BASELINE} (${results.length} scene(s) updated)`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`[visual] no baseline at ${BASELINE}; run: yarn visual:update`);
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const want = new Set(only);
const scenes = want.size ? SCENES.filter((s) => want.has(s.name)) : SCENES;
let regressions = 0;
for (const scene of scenes) {
  const b = baseline[scene.name];
  const r = results.find((x) => x.name === scene.name);
  if (!b || !r?.ok) {
    console.log(`DIFF ${scene.name.padEnd(16)} capture/baseline missing`);
    regressions++;
    continue;
  }
  const { score, worst } = compareSignatures(b, signature(readPng(r.file)));
  const ok = score <= THRESHOLD && worst <= CELL_THRESHOLD;
  if (!ok) regressions++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} ${scene.name.padEnd(16)} mean ${score.toFixed(1)}  cell ${worst.toFixed(1)}`);
}
if (regressions) {
  console.error(
    `[visual] ${regressions} scene(s) over threshold (mean ${THRESHOLD}, cell ${CELL_THRESHOLD}); see ${outDir}`,
  );
  process.exit(1);
}
console.log('[visual] all scenes within threshold');
