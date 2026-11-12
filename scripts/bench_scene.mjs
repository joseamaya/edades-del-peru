import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Scene budget for a mission's opening view (docs/design/art-direction.md §11): one plain scene render
 * (shadow pass included, post-processing excluded) at 1600x900 and zoom 54, plus the Blender
 * vegetation/fauna kit isolated by hiding it. Triangle and draw-call counts are machine-independent,
 * unlike FPS (headless Chromium renders in software).
 *
 * Usage: node scripts/bench_scene.mjs [--mission=m1_caral] [--stage=late] [--assert] [--out=review/bench-scene.json]
 *
 * `--stage=late` measures m1's end game instead of its opening: the whole city in use (fair tents, sacred
 * fire, cooking smoke), the act IV drought and 30 extra workers, viewed over the Sacred City.
 * `--stage=camp` measures Act III at `foundation`: the Pyramid Mayor under construction, the camp and
 * its six-worker crew, viewed from the south-west.
 */
const mission = cliArg('mission') ?? 'm1_caral';
const stage = cliArg('stage') ?? 'opening';
const assert = process.argv.includes('--assert');
const outFile = cliArg('out') ?? 'review/bench-scene.json';

// Ratchet: §11 targets 600k triangles and 200 draw calls per frame. m1 measured 877k / 441 before the
// tree-instance, water and flier-shadow cuts, ~685k / 413 after them, ~497k / 414 with the terrain
// LOD, ~477k / 271 after batching resource nodes, the site and the fauna, ~477k / 228 with the
// consolidated workers and ~467k / 203 after the heritage proxies and house materials, ~332k / 204
// with the simplified worker bodies (12k -> 2.5k triangles) and body-only unit shadows; tighten as it
// gets cheaper.
const BUDGETS = {
  // Kit counts include the shadow pass; the fauna is instanced per species and part.
  // The Áspero opening draws its village (huaca and fishing houses, ~5 materials in the main and shadow
  // passes) next to the base: +15 calls over the former Caral-terrace opening.
  // The household props kit adds 8 calls (four shared materials per base, two bases, no shadow pass:
  // the pieces are sub-metre); pinning every LOD manager to the measured framing adds the quarry's
  // shadow pass (+2), and the pacae shrubs add 3 materials x 2 LODs with their shadows (up to +12).
  // Measured opening: 342 903-351 487 tris / 168-169 calls, kit 86 776-95 360 / 51: the kit range is
  // how many pacae shrubs fall inside the 30 m LOD0 ring when the frame is measured.
  m1_caral: { sceneTriangles: 400_000, sceneDrawCalls: 230, kitTriangles: 100_000, kitDrawCalls: 56 },
  // End game over the city with 35 workers in view: art-direction §11 (600k triangles). It measured
  // 1.57M / 396 before the worker cuts and ~582k / 261 after. Skinned workers cannot be instanced, so
  // each one in view is ~6 draws (body, hair, garments, tool, team ring, body shadow) on top of the
  // opening's scene: the call budget allows that crowd over the opening's 230.
  m1_caral_late: { sceneTriangles: 600_000, sceneDrawCalls: 275, kitTriangles: 80_000, kitDrawCalls: 36 },
  // Act III at foundation: the phase-1 Mayor, the camp and its six visible rigs. Measured 385 062 tris /
  // 105 calls, kit 76 908-85 492 / 31; the camera sees fewer trees than the opening because it looks at
  // the terrace, and the kit range is how many fall inside the frame.
  m1_caral_camp: { sceneTriangles: 410_000, sceneDrawCalls: 120, kitTriangles: 100_000, kitDrawCalls: 40 },
  // Chavín opening: the phased kit, highland vegetation and the base. Measure first, then ratchet down.
  m2_chavin: { sceneTriangles: 450_000, sceneDrawCalls: 220, kitTriangles: 100_000, kitDrawCalls: 40 },
  m2_chavin_late: { sceneTriangles: 600_000, sceneDrawCalls: 310, kitTriangles: 100_000, kitDrawCalls: 40 },
};
const KIT_NAMES = /^(trees_kit_|props_kit_|fauna_(deer|riparian_bird)_(body|leg|wingL|wingR)$)/;

const { base, close } = await withViteServer();
const browser = await launchChromium();
let failed = false;
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?mission=${mission}&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    (id) => {
      const g = window.game;
      if (!g?.mission) return false;
      if (id === 'm2_chavin') return (g.scene.getObjectByName?.('chavin_city_lod0')?.children.length ?? 0) > 0;
      // Wait for every kit family the scene draws: a half-loaded batch measured a different scene.
      if (!g.trees?.hasKit?.('algarrobo') || !g.trees.hasKit('sauce')) return false;
      if (g.mapProfile?.quarryStyle && !g.quarries?.model) return false;
      if (g.mapProfile?.berryShrub === 'pacae' && !g.pacae?.model) return false;
      return (g.settlementDressing ?? []).every((d) => d.attached !== false);
    },
    mission,
    { timeout: 90_000 },
  );
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  // The Act III camp and its crew load after the site exists; a half-armed crew measured a different
  // scene (the camp stage is the one that has to count it).
  if (mission === 'm1_caral') {
    await page.waitForFunction(() => (window.game?.siteCrew?.count ?? 0) > 0, null, { timeout: 30_000 });
  }
  await page.waitForTimeout(2000);
  const result = await page.evaluate(
    ({ kitPattern, stage, mission }) => {
      const g = window.game;
      const kit = new RegExp(kitPattern);
      // Pin the high preset and its LOD radius (the governor drops quality on a software renderer).
      g.applyQualityPreset('high');
      g.trees.kitLod0Radius = 45;
      let p = g.playerCenter(0);
      if (stage === 'camp') {
        g.setSitePhase('foundation');
        const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
        p = { x: site.x - 10, z: site.z + 30 };
      }
      if (stage === 'late') {
        g.setSitePhase(mission === 'm2_chavin' ? 'apogee' : 'in_use');
        const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
        const crowd = mission === 'm2_chavin' ? 20 : 30;
        for (let i = 0; i < crowd; i++) {
          g.spawnScriptedUnit('worker', 0, site.x - 12 + (i % 6) * 4, site.z + 18 + Math.floor(i / 6) * 3);
        }
        let t = 1;
        for (let i = 0; i < 60; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (mission === 'm1_caral') g.startEnvironmentalEvent('drought', true);
        g.camera.moveTo(site.x, site.z + 20, true);
        for (let i = 0; i < 40; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        p = { x: site.x, z: site.z + 20 };
      }
      g.camera.moveTo(p.x, p.z, true);
      g.camera.setHeight(54);
      // Pin every LOD manager to the measured framing, like the trees: their per-frame update depends
      // on where the camera happened to be when the loop last ran.
      const focus = g.camera.getTarget();
      g.trees.update(0, focus);
      g.quarries?.update(focus);
      g.pacae?.update(focus);
      g.siteCrew?.update(0, focus);
      for (const d of g.settlementDressing ?? []) d.update(focus);
      for (let i = 0; i < 120; i++) g.camera.update(1 / 30, i / 30);
      g.camera.camera.updateMatrixWorld();
      g.terrain.updateLod(g.camera.camera.position, true);
      // Refit the sun's shadow frustum to this view, as the frame loop does.
      g.runtime.frameShadows();
      g.sky.update(0);
      const measure = () => {
        const info = g.renderer.info;
        info.autoReset = false;
        info.reset();
        g.renderer.render(g.scene, g.camera.camera);
        const out = { calls: info.render.calls, triangles: info.render.triangles };
        out.camera = g.camera.camera.position.toArray().map((v) => Math.round(v));
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
    },
    { kitPattern: KIT_NAMES.source, stage, mission },
  );
  const budget =
    stage === 'late' ? BUDGETS[`${mission}_late`] : stage === 'camp' ? BUDGETS[`${mission}_camp`] : BUDGETS[mission];
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
