#!/usr/bin/env node
/**
 * Run the roadmap's real-GPU site-view pass at the two recorded resolutions.
 *
 * Each mission/stage gets one structural row at 1600x900 (hardware-high counts; the SwiftShader
 * ratchet in `bench_scene.mjs` is shown for context but is not enforced here) and shipped-frame rows
 * at 1280x800 and 1600x900. `--low` also samples the three tightest late views at the low preset.
 * A row that falls back to SwiftShader is discarded and retried.
 *
 * Usage:
 *   node scripts/bench_site_views.mjs [--viewports=1280x800,1600x900] [--stages=opening,late]
 *     [--only=m3_moche_recuay,m4_wari] [--out=review/site-views] [--dry-run] [--resume] [--low]
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
  // The seven missions added on 2026-11-18 (roadmap D3): openings only, no late row yet.
  { id: 'm_lima_1821', late: false },
  { id: 'm_miraflores', late: false },
  { id: 'm_real_felipe', late: false },
  { id: 'm_tarapaca', late: false },
  { id: 'm_vilcabamba', late: false },
  { id: 'm_cusco_1536', late: false },
  { id: 'm_brena', late: false },
];
const LOW_VIEWS = ['m6b_guerra_civil', 'm8_independencia', 'm7_tupac_amaru'];

const viewports = cliArg('viewports', '1280x800,1600x900').split(',');
const stageFilter = cliArg('stages', 'opening,late').split(',');
const only = cliArg('only', '').split(',').filter(Boolean);
const outDir = cliArg('out', 'review/site-views');
const dryRun = process.argv.includes('--dry-run');
const resume = process.argv.includes('--resume');
const low = process.argv.includes('--low');
const rows = [];

for (const mission of MISSIONS) {
  if (only.length && !only.includes(mission.id)) continue;
  const stages = [];
  if (stageFilter.includes('opening')) stages.push('opening');
  if (stageFilter.includes('late') && mission.late) stages.push('late');
  for (const stage of stages) {
    const suffix = stage === 'late' ? '-late' : '';
    rows.push({
      mode: 'structural',
      mission: mission.id,
      stage,
      viewport: '1600x900',
      out: path.join(outDir, `${mission.id}${suffix}-structural.json`),
      args: [],
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
    if (low && stage === 'late' && LOW_VIEWS.includes(mission.id)) {
      rows.push({
        mode: 'low',
        mission: mission.id,
        stage,
        viewport: '1600x900',
        out: path.join(outDir, `${mission.id}-late-low-1600x900.json`),
        args: ['--frames', '--quality=low', '--viewport=1600x900'],
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
  if (resume && fs.existsSync(row.out)) {
    const prev = readJson(row.out);
    if (prev && prev.gpu && !prev.gpu.software) continue;
  }
  if (dryRun) {
    console.log(`node ${argsFor(row).join(' ')}`);
    continue;
  }
  fs.rmSync(row.out, { force: true });
  let data = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    const result = spawnSync(process.execPath, argsFor(row), { stdio: 'inherit' });
    data = readJson(row.out);
    if (data?.gpu?.software) {
      console.error(`[site-views] software fallback on ${path.basename(row.out)}; retrying`);
      fs.rmSync(row.out);
      data = null;
      await sleep(2500);
      continue;
    }
    if (result.status !== 0 && !data) {
      console.error(`[site-views] attempt failed on ${path.basename(row.out)}; retrying`);
    }
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
  '| Mode | Mission | Stage | Viewport | Frame p50/p95 (ms) | FPS p50 | Scene tris / calls | Meshes / materials | Software cap |',
  '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
];
for (const row of rows) {
  const data = readJson(row.out);
  if (!data) {
    lines.push(`| ${row.mode} | ${row.mission} | ${row.stage} | ${row.viewport} | missing | — | — | — | — |`);
    continue;
  }
  const cap =
    row.mode === 'structural'
      ? `${data.budget.sceneTriangles.toLocaleString()} / ${data.budget.sceneDrawCalls} ` +
        (data.scene.triangles <= data.budget.sceneTriangles && data.scene.calls <= data.budget.sceneDrawCalls
          ? '(within)'
          : '(over, informational)')
      : '—';
  lines.push(
    `| ${row.mode} | ${row.mission} | ${row.stage} | ${row.viewport} | ` +
      (row.mode === 'structural' ? '—' : `${fmt(data.frame?.frameMsP50)} / ${fmt(data.frame?.frameMsP95)}`) +
      ` | ${row.mode === 'structural' ? '—' : fmt(data.frame?.fpsP50)} | ${data.scene.triangles.toLocaleString()} / ${data.scene.calls} | ` +
      `${data.sceneStats.meshes} / ${data.sceneStats.uniqueMaterials} | ${cap} |`,
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
