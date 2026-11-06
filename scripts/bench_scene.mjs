import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Scene budget for a mission's opening view (docs/design/art-direction.md §11): one plain scene render
 * (shadow pass included, post-processing excluded) at 1600x900 and zoom 54, plus the Blender
 * vegetation/fauna kit isolated by hiding it. Triangle and draw-call counts are machine-independent,
 * unlike FPS (headless Chromium renders in software).
 *
 * Usage: node scripts/bench_scene.mjs [--mission=m1_caral] [--assert] [--out=review/bench-scene.json]
 */
const mission = cliArg('mission') ?? 'm1_caral';
const assert = process.argv.includes('--assert');
const outFile = cliArg('out') ?? 'review/bench-scene.json';

// Ratchet: §11 targets 600k triangles and 200 draw calls per frame. m1 measured 877k / 441 before the
// tree-instance, water and flier-shadow cuts and ~685k / 413 after them; tighten as it gets cheaper.
const BUDGETS = {
  // Kit counts include the shadow pass; most kit draw calls are the animated fauna parts (a deer is a
  // body plus four legs).
  m1_caral: { sceneTriangles: 720_000, sceneDrawCalls: 440, kitTriangles: 80_000, kitDrawCalls: 60 },
};
const KIT_NAMES = /^(trees_kit_|props_kit_|fauna_(deer|riparian_bird)$)/;

const { base, close } = await withViteServer();
const browser = await launchChromium();
let failed = false;
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?mission=${mission}&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.trees?.hasKit?.('algarrobo'), null, { timeout: 90_000 });
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  const result = await page.evaluate((kitPattern) => {
    const g = window.game;
    const kit = new RegExp(kitPattern);
    // Pin the high preset and its LOD radius (the governor drops quality on a software renderer).
    g.applyQualityPreset('high');
    g.trees.kitLod0Radius = 45;
    const p = g.playerCenter(0);
    g.camera.moveTo(p.x, p.z, true);
    g.camera.setHeight(54);
    g.trees.update(0, g.camera.getTarget());
    const measure = () => {
      const info = g.renderer.info;
      info.autoReset = false;
      info.reset();
      g.renderer.render(g.scene, g.camera.camera);
      const out = { calls: info.render.calls, triangles: info.render.triangles };
      info.autoReset = true;
      return out;
    };
    const scene = measure();
    const kitObjects = [];
    g.scene.traverse((o) => {
      if (kit.test(o.name) && o.visible) kitObjects.push(o);
    });
    kitObjects.forEach((o) => (o.visible = false));
    const withoutKit = measure();
    kitObjects.forEach((o) => (o.visible = true));
    return {
      scene,
      kit: { calls: scene.calls - withoutKit.calls, triangles: scene.triangles - withoutKit.triangles },
      kitObjects: kitObjects.length,
    };
  }, KIT_NAMES.source);
  const budget = BUDGETS[mission];
  const report = { mission, ...result, budget, errors };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
  console.log(
    `${mission}: scene ${result.scene.triangles} tris / ${result.scene.calls} calls; ` +
      `vegetation+fauna kit ${result.kit.triangles} tris / ${result.kit.calls} calls (${result.kitObjects} objects)`,
  );
  if (assert) {
    const problems = [];
    if (!budget) problems.push(`no budget for ${mission}`);
    else {
      if (result.scene.triangles > budget.sceneTriangles)
        problems.push(`scene triangles ${result.scene.triangles} > ${budget.sceneTriangles}`);
      if (result.scene.calls > budget.sceneDrawCalls)
        problems.push(`scene draw calls ${result.scene.calls} > ${budget.sceneDrawCalls}`);
      if (result.kit.triangles > budget.kitTriangles)
        problems.push(`kit triangles ${result.kit.triangles} > ${budget.kitTriangles}`);
      if (result.kit.calls > budget.kitDrawCalls)
        problems.push(`kit draw calls ${result.kit.calls} > ${budget.kitDrawCalls}`);
      if (result.kitObjects === 0) problems.push('vegetation kit not drawn');
    }
    if (errors.length) problems.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    if (problems.length) {
      console.error(`scene budget failed: ${problems.join('; ')}`);
      failed = true;
    }
  }
} finally {
  await browser.close();
  await close();
}
if (failed) process.exit(1);
