#!/usr/bin/env node
/**
 * Run the roadmap's real-GPU site-view pass at the two recorded resolutions.
 *
 * `bench_scene.mjs` measures one mission/stage at a time; this runner drives the matrix
 * (m3–m9, m6b and La Junta; opening plus late where the mission has a late view) at 1280x800
 * and 1600x900, writes one JSON per row and a markdown summary for the performance audit.
 *
 * Usage:
 *   node scripts/bench_site_views.mjs [--viewports=1280x800,1600x900] [--stages=opening,late]
 *     [--only=m3_moche_recuay,m4_wari] [--out=review/site-views] [--dry-run]
 *
 * Every row runs `bench_scene.mjs --gpu --frames --quality=high`; the 1600x900 rows also keep
 * `--assert` because the ratchet budgets are calibrated there. The 1280x800 rows are
 * informational: the wider vertical FOV sees more of the scene. A software renderer fails the
 * row instead of recording a misleading number.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { cliArg } from './lib.mjs';

const MISSIONS = [
  { id: 'm3_moche_recuay', late: true },
  { id: 'm4_wari', late: true },
  { id: 'm5_yahuar_pampa', late: true },
  { id: 'm6_chimu_inca', late: true },
  { id: 'm6b_guerra_civil', late: true },
  { id: 'm7_tupac_amaru', late: true },
  { id: 'm8_independencia', late: true },
  { id: 'm9_guerra_pacifico', late: true },
  { id: 'm_junta_cusco', late: false },
];

const viewports = cliArg('viewports', '1280x800,1600x900').split(',');
const stageFilter = cliArg('stages', 'opening,late').split(',');
const only = cliArg('only', '').split(',').filter(Boolean);
const outDir = cliArg('out', 'review/site-views');
const dryRun = process.argv.includes('--dry-run');
const rows = [];

for (const mission of MISSIONS) {
  if (only.length && !only.includes(mission.id)) continue;
  const stages = stageFilter.includes('late') && mission.late ? ['opening', 'late'] : ['opening'];
  for (const stage of stages) {
    for (const viewport of viewports) {
      const name = `${mission.id}${stage === 'late' ? '-late' : ''}-${viewport}.json`;
      const out = path.join(outDir, name);
      // The ratchet budgets are calibrated at 1600x900 (the historical bench viewport); the
      // 1280x800 pass is informational because the wider vertical FOV sees more of the scene.
      const reference = viewport === '1600x900';
      const args = [
        'scripts/bench_scene.mjs',
        `--mission=${mission.id}`,
        `--stage=${stage}`,
        '--gpu',
        '--frames',
        '--quality=high',
        ...(reference ? ['--assert'] : []),
        `--viewport=${viewport}`,
        `--out=${out}`,
      ];
      rows.push({ mission: mission.id, stage, viewport, out, args });
      if (dryRun) {
        console.log(`node ${args.join(' ')}`);
        continue;
      }
      const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
      if (result.status !== 0) {
        console.error(`[site-views] FAILED ${mission.id} ${stage} ${viewport}`);
        process.exitCode = 1;
      }
    }
  }
}

if (dryRun) {
  console.log(`[site-views] ${rows.length} rows (dry run)`);
  process.exit(0);
}

const ms = (row) => Number(row.frame?.frameMsP50 ?? NaN);
const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');
const lines = [
  '| Mission | Stage | Viewport | Frame p50/p95 (ms) | FPS p50 | Scene tris / calls | Meshes / materials |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: |',
];
for (const row of rows) {
  const file = path.resolve(row.out);
  if (!fs.existsSync(file)) {
    lines.push(`| ${row.mission} | ${row.stage} | ${row.viewport} | missing | — | — | — |`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  lines.push(
    `| ${row.mission} | ${row.stage} | ${row.viewport} | ${fmt(ms(data))} / ${fmt(data.frame?.frameMsP95)} | ` +
      `${fmt(data.frame?.fpsP50)} | ${data.scene.triangles.toLocaleString()} / ${data.scene.calls} | ` +
      `${data.sceneStats.meshes} / ${data.sceneStats.uniqueMaterials} |`,
  );
}
const report = lines.join('\n') + '\n';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.md'), report);
fs.writeFileSync(
  path.join(outDir, 'summary.json'),
  JSON.stringify(
    rows.map((row) => {
      const file = path.resolve(row.out);
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { ...row, missing: true };
    }),
    null,
    2,
  ) + '\n',
);
console.log(report);
console.log(`[site-views] wrote ${path.join(outDir, 'summary.md')}`);
