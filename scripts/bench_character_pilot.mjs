import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Structural cost of the three character-pilot units (main + shadow pass), isolated by hiding
 * their rig while the scene keeps rendering. The ceilings are the art-direction common-unit
 * budget, not the looser worker bench cap.
 *
 * Usage: node scripts/bench_character_pilot.mjs [--assert]
 */
const BUDGET = { drawCalls: 25, triangles: 25_000 };
const CASES = [
  { name: 'Inca warrior', url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1', kind: 'inca_warrior' },
  { name: 'Spanish arquebusier', url: '/?mission=m_lima&intro=0&fog=0&low=1&noloop=1', kind: 'musketeer' },
  { name: 'Republican fusilier', url: '/?mission=m_tarapaca&intro=0&fog=0&low=1&noloop=1', kind: 'republica_defensor' },
];
const assert = process.argv.includes('--assert');

const { base, close } = await withViteServer({ optimizeDeps: { noDiscovery: true } });
const browser = await launchChromium();
const rows = [];
try {
  for (const entry of CASES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    try {
      await page.goto(base + entry.url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.game !== undefined, null, { timeout: 30_000 });
      await page
        .getByRole('button', { name: /COMENZAR MISIÓN/i })
        .first()
        .click({ timeout: 3_000 })
        .catch(() => {});
      await page.waitForTimeout(400);
      const cost = await page.evaluate((kind) => {
        const g = window.game;
        g.loop.stop();
        const unit = [...g.units.values()].find(
          (candidate) => candidate.owner === 0 && !candidate.dead && candidate.kind === kind,
        );
        if (!unit?.rig) throw new Error(`no rigged ${kind}`);
        window.__directRender = true;
        g.camera.setHeight(1e9);
        for (let i = 0; i < 30; i++) g.camera.update(1 / 30, i / 30);
        g.camera.camera.updateMatrixWorld();
        const sample = () => {
          g.runtime.frameShadows();
          g.renderer.render(g.scene, g.camera.camera);
          return { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
        };
        unit.rig.root.visible = true;
        const shown = sample();
        unit.rig.root.visible = false;
        const hidden = sample();
        unit.rig.root.visible = true;
        return { variant: unit.rig.variantId, calls: shown.calls - hidden.calls, tris: shown.tris - hidden.tris };
      }, entry.kind);
      rows.push({ name: entry.name, ...cost });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await close();
}

let failed = false;
console.log('unit | variant | draws | triangles');
for (const row of rows) {
  const over = row.calls > BUDGET.drawCalls || row.tris > BUDGET.triangles;
  if (over) failed = true;
  console.log(`${row.name} | ${row.variant} | ${row.calls} | ${row.tris}${over ? ' OVER' : ''}`);
}
console.log(`budget: <= ${BUDGET.drawCalls} draws / <= ${BUDGET.triangles} triangles per unit (main + shadow)`);
if (assert && failed) process.exit(1);
