import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Structural cost of the dressed infantry standard. It isolates one unit (main + shadow pass),
 * then a 12-unit formation, and measures the mixer update for that formation. The ceiling is the
 * art-direction common-unit budget, not the looser worker bench cap.
 *
 * Usage: node scripts/bench_character_pilot.mjs [--assert]
 */
const BUDGET = { drawCalls: 25, triangles: 25_000 };
const CASES = [
  { name: 'Inca warrior', url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1', kind: 'inca_warrior' },
  { name: 'Spanish arquebusier', url: '/?mission=m_lima&intro=0&fog=0&low=1&noloop=1', kind: 'musketeer' },
  { name: 'Republican fusilier', url: '/?mission=m_tarapaca&intro=0&fog=0&low=1&noloop=1', kind: 'republica_defensor' },
  {
    name: 'Moche warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=moche&period=2',
    kind: 'soldier',
  },
  {
    name: 'Wari warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=wari&period=3',
    kind: 'soldier',
  },
  {
    name: 'Chimú warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=chimu&period=4',
    kind: 'soldier',
  },
  {
    name: 'Late realista',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=realistas&period=7',
    kind: 'soldier',
  },
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
        let unit = [...g.units.values()].find(
          (candidate) => candidate.owner === 0 && !candidate.dead && candidate.kind === kind,
        );
        if (!unit?.rig) {
          // A skirmish opens with workers; the bench still needs one rigged combat unit on screen.
          const centre = g.playerCenter(0);
          unit = g.spawnScriptedUnit(kind, 0, centre.x + 10, centre.z + 10);
        }
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
        const single = { calls: shown.calls - hidden.calls, tris: shown.tris - hidden.tris };

        // A 12-unit formation, the size of the pilot groups in m_cusco_1536 and m_tarapaca.
        const base = g.playerCenter(0);
        const group = [];
        for (let i = 0; i < 12; i++) {
          const x = base.x + 12 + (i % 4) * 1.6;
          const z = base.z + 12 + Math.floor(i / 4) * 1.6;
          const spawned = g.spawnScriptedUnit(kind, 0, x, z);
          if (spawned?.rig) group.push(spawned);
        }
        g.camera.setYaw(0);
        g.camera.moveTo(base.x + 14, base.z + 15, true);
        g.camera.setHeight(54);
        for (let i = 0; i < 60; i++) g.camera.update(1 / 60, i / 60);
        g.camera.camera.updateMatrixWorld();
        const roots = group.map((candidate) => candidate.rig.root);
        for (const root of roots) root.visible = true;
        const formationShown = sample();
        for (const root of roots) root.visible = false;
        const formationHidden = sample();
        for (const root of roots) root.visible = true;
        const started = performance.now();
        for (let frame = 0; frame < 300; frame++) {
          for (const candidate of group) candidate.rig.update(1 / 60);
        }
        const mixerMs = (performance.now() - started) / 300;
        return {
          variant: unit.rig.variantId,
          single,
          formation: {
            count: group.length,
            calls: formationShown.calls - formationHidden.calls,
            tris: formationShown.tris - formationHidden.tris,
            mixerMs,
          },
        };
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
console.log('unit | variant | 1-unit draws | 1-unit tris | 12-unit draws | 12-unit tris | mixer ms/frame (12)');
for (const row of rows) {
  const over = row.single.calls > BUDGET.drawCalls || row.single.tris > BUDGET.triangles;
  if (over) failed = true;
  console.log(
    `${row.name} | ${row.variant} | ${row.single.calls} | ${row.single.tris} | ${row.formation.calls} | ${row.formation.tris} | ${row.formation.mixerMs.toFixed(2)}${over ? ' OVER' : ''}`,
  );
}
console.log(
  `budget: <= ${BUDGET.drawCalls} draws / <= ${BUDGET.triangles} triangles per unit (main + shadow); the 12-unit formation is informational`,
);
if (assert && failed) process.exit(1);
