#!/usr/bin/env node
/**
 * Run the roadmap's real-GPU site-view pass at the two recorded resolutions.
 *
 * Each mission/stage gets one structural row at 1600x900 (the viewport where the ratchet budgets are
 * calibrated, so it keeps `--assert`) and shipped-frame rows at 1280x800 and 1600x900. The structural
 * row owns the draw-call/triangle/mesh/material counts; the frame rows own the frame time. A row that
 * silently falls back to SwiftShader is discarded and retried once, because a software number would
 * misrepresent both the counts and the frame time.
 *
 * Usage:
 *   node scripts/bench_site_views.mjs [--viewports=1280x800,1600x900] [--stages=opening,late]
 *     [--only=m3_moche_recuay,m4_wari] [--out=review/site-views] [--dry-run] [--resume]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
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
const resume = process.argv.includes('--resume');
const rows = [];

for (const mission of MISSIONS) {
  if (only.length && !only.includes(mission.id)) continue;
  const stages = stageFilter.includes('late') && mission.late ? ['opening', 'late'] : ['opening'];
  for (const stage of stages) {
    const suffix = stage === 'late' ? '-late' : '';
    rows.push({
      mode: 'structural',
      mission: mission.id,
      stage,
      viewport: '1600x900',
      out: path.join(outDir, `${mission.id}${suffix}-structural.json`),
      args: ['--assert'],
    });
    for (const viewport of viewports) {
      rows.push({
        mode: 'frames',
        mission: mission.id,
        stage,
        viewport,
        out: path.join(outDir, `${mission.id}${suffix}-frames-${viewport}.json`),
        args: ['--frames', '--quality=high', `--viewport=${viewport}`],
      });
    }
  }
}

function argsFor(row) {
  return [
    'scripts/bench_scene.mjs',
    `--mission=${row.mission}`,
    `--stage=${row.stage}`,
    '--gpu',
    ...row.args,
    `--out=${row.out}`,
  ];
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

for (const row of rows) {
  if (resume && fs.existsSync(row.out)) continue;
  if (dryRun) {
    console.log(`node ${argsFor(row).join(' ')}`);
    continue;
  }
  let data = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    const result = spawnSync(process.execPath, argsFor(row), { stdio: 'inherit' });
    data = readJson(row.out);
    if (!data) break;
    if (data.gpu?.software) {
      console.error(`[site-views] software fallback on ${path.basename(row.out)}; retrying`);
      fs.rmSync(row.out);
      data = null;
      await sleep(2500);
      continue;
    }
    row.passed = result.status === 0;
  }
  if (!data) {
    console.error(`[site-views] FAILED ${row.mission} ${row.stage} ${row.mode} ${row.viewport}`);
    process.exitCode = 1;
  }
}

if (dryRun) {
  console.log(`[site-views] ${rows.length} rows (dry run)`);
  process.exit(0);
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');
const lines = [
  '| Mode | Mission | Stage | Viewport | Frame p50/p95 (ms) | FPS p50 | Scene tris / calls | Meshes / materials | Budget |',
  '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
];
for (const row of rows) {
  const data = readJson(row.out);
  if (!data) {
    lines.push(`| ${row.mode} | ${row.mission} | ${row.stage} | ${row.viewport} | missing | — | — | — | — |`);
    continue;
  }
  const budget = data.budget;
  const budgetState =
    row.mode === 'structural'
      ? data.scene.triangles <= budget.sceneTriangles && data.scene.calls <= budget.sceneDrawCalls
        ? 'pass'
        : `FAIL (${budget.sceneTriangles.toLocaleString()} / ${budget.sceneDrawCalls})`
      : '—';
  lines.push(
    `| ${row.mode} | ${row.mission} | ${row.stage} | ${row.viewport} | ` +
      (row.mode === 'frames' ? `${fmt(data.frame?.frameMsP50)} / ${fmt(data.frame?.frameMsP95)}` : '—') +
      ` | ${row.mode === 'frames' ? fmt(data.frame?.fpsP50) : '—'} | ${data.scene.triangles.toLocaleString()} / ${data.scene.calls} | ` +
      `${data.sceneStats.meshes} / ${data.sceneStats.uniqueMaterials} | ${budgetState} |`,
  );
}
const report = lines.join('\n') + '\n';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.md'), report);
fs.writeFileSync(
  path.join(outDir, 'summary.json'),
  JSON.stringify(
    rows.map((row) => {
      const data = readJson(row.out);
      return data ? { ...row, args: undefined, data } : { ...row, args: undefined, missing: true };
    }),
    null,
    2,
  ) + '\n',
);
console.log(report);
console.log(`[site-views] wrote ${path.join(outDir, 'summary.md')}`);
