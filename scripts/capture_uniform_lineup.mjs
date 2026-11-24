#!/usr/bin/env node
/**
 * Close-range lineup of the post-1532 uniforms: for each side, four units (two consecutive ids per kind, so
 * both presentation bodies appear) standing in a row, facing a three-quarter camera at 4–5 m. It is the
 * evidence for uniform changes; the RTS view hides what this view shows.
 *
 * Usage: node scripts/capture_uniform_lineup.mjs [--out=review/uniforms] [--only=lima,tarapaca] [--gpu]
 * Writes <out>/<case>.png and <out>/lineup.png (all cases stacked).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

const OUT = path.resolve(cliArg('out', 'review/uniforms'));
const only = cliArg('only', '');
/** Debug: hide the skin meshes to see the garments alone. */
const noBody = cliArg('nobody', '') === '1';

/** Side, mission and the kinds to line up (owner 0 is the player, 1 the first enemy seat). */
const CASES = [
  { name: 'lima', label: 'Hueste 1536', mission: 'm_lima', owner: 0, kinds: ['soldier', 'musketeer'] },
  { name: 'rebeldes', label: 'Rebeldes 1780', mission: 'm7_tupac_amaru', owner: 0, kinds: ['soldier', 'rifleman'] },
  { name: 'realistas', label: 'Realistas 1780', mission: 'm7_tupac_amaru', owner: 1, kinds: ['soldier', 'musketeer'] },
  { name: 'patriotas', label: 'Patriotas 1814', mission: 'm_junta_cusco', owner: 0, kinds: ['soldier', 'musketeer'] },
  { name: 'peru', label: 'Perú 1879', mission: 'm_tarapaca', owner: 0, kinds: ['soldier', 'rifleman'] },
  { name: 'chile', label: 'Chile 1879', mission: 'm_tarapaca', owner: 1, kinds: ['soldier', 'chile_infante'] },
];

fs.mkdirSync(OUT, { recursive: true });
const { base, close } = await withViteServer();
const browser = await launchChromium();
const shots = [];
try {
  for (const c of CASES) {
    if (only && !only.split(',').includes(c.name)) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    page.on('pageerror', (e) => console.error(`[uniforms] ${c.name} PAGEERROR`, e.message));
    await page.goto(`${base}/?mission=${c.mission}&intro=0&fog=0&seed=777&noloop=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    await page
      .locator('.ed-primary', { hasText: 'COMENZAR' })
      .first()
      .click({ timeout: 8000 })
      .catch(() => {});
    await page
      .getByRole('button', { name: /omitir tutorial/i })
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(
      ({ c, noBody }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        const ui = document.getElementById('ui-root');
        if (ui) ui.style.display = 'none';
        if (g.worldLabels) g.worldLabels.root.style.display = 'none';
        g.mission.ended = true;
        if (g.getPaused()) g.togglePause();
        g.applyQualityPreset('high');
        // An open, flat patch away from every unit and building, so nobody fights or stands in the frame.
        const others = [...g.units.values()].filter((u) => !u.dead);
        const blds = [...g.buildings.values()].filter((b) => !b.dead);
        const clear = (x, z) =>
          !g.terrain.isWater(x, z) &&
          g.terrain.getSlope(x, z) < 0.1 &&
          others.every((u) => Math.hypot(u.pos.x - x, u.pos.z - z) > 30) &&
          blds.every((b) => Math.hypot(b.pos.x - x, b.pos.z - z) > 16);
        const size = g.terrain.size ?? 256;
        let x0 = size / 2;
        let z0 = size / 2;
        search: for (let r = 20; r < size / 2; r += 6) {
          for (let a = 0; a < Math.PI * 2; a += 0.35) {
            const x = size / 2 + Math.cos(a) * r;
            const z = size / 2 + Math.sin(a) * r;
            if (x > 12 && z > 12 && x < size - 12 && z < size - 22 && clear(x, z) && clear(x, z + 10)) {
              x0 = x;
              z0 = z;
              break search;
            }
          }
        }
        const ids = [];
        let i = 0;
        for (const kind of c.kinds) {
          for (let k = 0; k < 2; k++) {
            const u = g.spawnScriptedUnit(kind, c.owner, x0 + (i - 1.5) * 1.6, z0);
            if (u) ids.push(u.id);
            i++;
          }
        }
        const lineup = ids.map((id) => g.units.get(id)).filter(Boolean);
        let t = 1;
        // Presentation ticks only settle the idle clip; the units keep facing the camera (+z).
        for (let s = 0; s < 20; s++) {
          for (const u of lineup) {
            u.clearOrders?.();
            u.yaw = 0;
          }
          g.update(0.05, t);
          t += 0.05;
        }
        if (!g.getPaused()) g.togglePause();
        g.sky.setTimeOfDay(0.42);
        const units = ids.map((id) => g.units.get(id)).filter(Boolean);
        const cx = units.reduce((s, u) => s + u.pos.x, 0) / units.length;
        const cz = units.reduce((s, u) => s + u.pos.z, 0) / units.length;
        const cam = g.camera.camera;
        const gy = g.terrain.getHeight(cx, cz);
        cam.fov = 30;
        cam.position.set(cx + 2.2, gy + 1.7, cz + 9.5);
        cam.lookAt(cx, gy + 0.95, cz);
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld();
        g.terrain.updateLod(cam.position, true);
        g.runtime.frameShadows();
        g.scene.traverse((o) => {
          if (/ring|selection|marker/i.test(o.name ?? '')) o.visible = false;
        });
        if (noBody)
          for (const u of lineup)
            u.rig?.root.traverse((o) => {
              if (/^Body_/.test(o.name)) o.visible = false;
            });
        g.runtime.render();
      },
      { c, noBody },
    );
    await page.waitForTimeout(400);
    const file = path.join(OUT, `${c.name}.png`);
    await page.screenshot({ path: file, clip: { x: 300, y: 120, width: 1000, height: 700 } });
    shots.push([file, c.label]);
    console.log(`[uniforms] ${c.name} -> ${path.relative(process.cwd(), file)}`);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
if (shots.length > 1) {
  const args = shots.flatMap(([f]) => ['-i', f]);
  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const labelled = shots
    .map(
      ([, label], i) =>
        `[${i}]scale=500:350,drawtext=fontfile=${font}:text='${label}':fontcolor=white:fontsize=20:x=10:y=10:box=1:boxcolor=black@0.5[v${i}]`,
    )
    .join(';');
  const cols = 3;
  const layout = shots.map((_, i) => `${(i % cols) * 500}_${Math.floor(i / cols) * 350}`).join('|');
  execFileSync('ffmpeg', [
    '-y',
    '-v',
    'error',
    ...args,
    '-filter_complex',
    `${labelled};${shots.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${shots.length}:layout=${layout}:fill=black`,
    '-frames:v',
    '1',
    path.join(OUT, 'lineup.png'),
  ]);
  console.log(`[uniforms] ${path.relative(process.cwd(), path.join(OUT, 'lineup.png'))}`);
}
