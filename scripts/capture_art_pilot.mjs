import path from 'path';
import fs from 'fs';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Art-direction pilot captures for `m_tambotoco` (docs/design/tambotoco-art-pilot.md).
 * Usage: node scripts/capture_art_pilot.mjs [--tag=before|after] [--quality=neutral|final]
 *        [--sizes=1280x720,1600x900,1920x1080]
 *        [--views=cave,shrine,hualla,acequia,inticancha,built,close,wide,hero]
 *
 * `neutral` isolates materials and silhouettes (post-processing off); `final` is the player-facing
 * look (post-processing and the player's quality preset). Fog of war is off in both so the scene is
 * visible; exploration is covered by the mission evidence captures. Every scene view uses seed 777,
 * the site at `fundada`, the acequia open and the HUD hidden, so two runs differ only in the code.
 * The `hero` view stages Ayar Manco and a worker at the hualla hamlet for a close presentation
 * check; it is captured last because it stops the simulation loop.
 *
 * Writes review/art-pilot-<tag>-<quality>-<width>x<height>-<view>.png and a summary JSON.
 */
const tag = cliArg('tag', 'after');
const quality = cliArg('quality', 'neutral');
if (!['neutral', 'final'].includes(quality)) throw new Error(`invalid quality ${quality}`);

const sizes = cliArg('sizes', '1280x720,1600x900,1920x1080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    if (!w || !h) throw new Error(`invalid size ${s}`);
    return { width: w, height: h, label: `${w}x${h}` };
  });

const VIEWS = {
  cave: { x: 40, z: 55, h: 24 },
  shrine: { x: 120, z: 106, h: 40 },
  hualla: { x: 136, z: 166, h: 24 },
  acequia: { x: 166, z: 178, h: 30 },
  inticancha: { x: 168, z: 190, h: 34 },
  built: { x: 168, z: 190, h: 44, built: true },
  close: { x: 138, z: 163, h: 13 },
  trees: { x: 202, z: 228, h: 18 },
  wide: { x: 168, z: 190, h: 90 },
  hero: { hero: true },
};

const wanted = cliArg('views', Object.keys(VIEWS).join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
for (const name of wanted) if (!VIEWS[name]) throw new Error(`unknown view ${name}`);
// The hero view stops the loop, so it always runs last.
// `built` spawns a base, so it runs after the clean scene views (and before the hero close-up,
// which stops the loop). Otherwise its buildings contaminate every later frame.
const viewRank = (view) => (view.hero ? 2 : view.built ? 1 : 0);
const views = wanted.map((name) => ({ name, ...VIEWS[name] })).sort((a, b) => viewRank(a) - viewRank(b));

// Fog of war is off in both modes: the comparison is about materials and light, not exploration.
// `neutral` isolates the materials (no post-processing); `final` is the player-facing grade.
const URL_PARAMS = quality === 'neutral' ? '&fog=0&low=1&intro=0' : '&fog=0&intro=0';

async function startMission(page) {
  const briefing = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  if (await briefing.count()) {
    await briefing.click();
    return;
  }
  await page
    .locator('.ed-primary')
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
}

async function main() {
  const out = reviewDir();
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const files = [];
  const errors = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${size.label}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`${size.label}: ${m.text()}`);
      });
      await page.goto(base + `/?mission=m_tambotoco&seed=777${URL_PARAMS}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
      await startMission(page);
      // The cave/huaca GLBs load after the site; wait so a capture never photographs the fallback.
      await page
        .waitForFunction(
          () => window.game?.landmark?.getObjectByName('ayllu_site')?.userData.heroesReady === true,
          null,
          { timeout: 20_000 },
        )
        .catch(() => {});
      await page
        .waitForFunction(
          () => {
            const trees = window.game?.trees;
            return !!trees?.hasKit?.('molle') && !!trees?.hasKit?.('pacay') && !!trees?.hasKit?.('sauce');
          },
          null,
          { timeout: 20_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(2600);
      await page.addStyleTag({ content: '#ui-root { display: none !important; }' });

      await page.evaluate(() => {
        const g = window.game;
        g.setSitePhase('fundada');
        // Evidence bypass: the pilot shows the hydraulic system open and irrigated.
        g.canalOpen = true;
        g.updateCanalVisual();
        g.refreshFarmYields?.();
      });
      await page.waitForTimeout(1500);

      let builtSpawned = false;
      for (const view of views) {
        if (view.built && !builtSpawned) {
          await page.evaluate(() => {
            const g = window.game;
            g.spawnScriptedBuilding('mill', 0, 168, 190);
            for (const [x, z] of [
              [156, 190],
              [180, 190],
              [168, 178],
              [168, 202],
            ]) {
              g.spawnScriptedBuilding('house', 0, x, z);
            }
          });
          builtSpawned = true;
          await page.waitForTimeout(900);
        }
        if (view.hero) {
          await page.evaluate(() => {
            const g = window.game;
            g.loop.stop();
            const hero = [...g.units.values()].find((u) => u.tag === 'manco_capac');
            const worker = [...g.units.values()].find((u) => u.owner === 0 && !u.dead && !u.tag && u.kind === 'worker');
            const c = g.findLandNear(138, 157, 12);
            const place = (u, dx, dz, rotY) => {
              if (!u) return;
              const x = c.x + dx;
              const z = c.z + dz;
              u.clearOrders();
              u.pos.set(x, g.terrain.getHeight(x, z), z);
              u.view.setPosition(x, u.pos.y, z);
              u.view.setRotationY(rotY);
              u.rig?.play('idle', 0);
              u.rig?.update(0.4);
              u.view.setPosition(x, u.pos.y, z);
            };
            place(hero, -0.9, 0, 0.2);
            place(worker, 0.9, 0.45, -0.2);
            g.characterLabels?.setVisible(false);
            g.heroMarkers?.sync(g.units.values(), 30, g.camera.maxZoom);
            const y = g.terrain.getHeight(c.x, c.z);
            const cam = g.camera.camera;
            cam.position.set(c.x + 1.2, y + 2.2, c.z + 7.0);
            cam.lookAt(c.x, y + 1.0, c.z);
            // The loop is stopped, so the shadow map must be refreshed for this camera before the shot.
            g.runtime.frameShadows();
            g.renderer.render(g.scene, cam);
          });
        } else {
          await page.evaluate(({ x, z, h }) => {
            const g = window.game;
            g.camera.follow(null);
            g.camera.moveTo(x, z, true);
            g.camera.setHeight(h);
          }, view);
        }
        await page.waitForTimeout(view.hero ? 900 : 1600);
        const file = path.join(out, `art-pilot-${tag}-${quality}-${size.label}-${view.name}.png`);
        await page.screenshot({ path: file });
        files.push(file);
        console.log(file);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await close();
  }
  const summary = path.join(out, `art-pilot-${tag}-${quality}.json`);
  fs.writeFileSync(
    summary,
    JSON.stringify({ tag, quality, sizes, views: views.map((v) => v.name), files, errors }, null, 2),
  );
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  console.log(summary);
}

await main();
