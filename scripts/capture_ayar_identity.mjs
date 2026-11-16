import path from 'path';
import sharp from 'sharp';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

/**
 * Evidence captures for the Ayar identity pass: the eight briefing medallions, the party at the
 * strategic zoom (rings only) and a close group of four siblings (bodies, garments and crests).
 * Usage: node scripts/capture_ayar_identity.mjs
 * Writes review/ayar-identity-*.png and the 960x540 WebP copies under docs/media/.
 */
const HEROES = ['manco_capac', 'mama_huaco', 'mama_ocllo', 'ayar_cachi'];
const WEBP_DIR = path.resolve('docs/media');

async function publish(png, name) {
  const webp = path.join(WEBP_DIR, name);
  await sharp(png).resize(960, 540).webp({ quality: 58 }).toFile(webp);
  console.log(webp);
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const out = reviewDir();
  await page.goto(base + '/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
  await page.locator('.ed-briefing').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(1200);

  const briefing = path.join(out, 'ayar-identity-briefing.png');
  await page.screenshot({ path: briefing });
  console.log(briefing);
  await publish(briefing, 'tambotoco-cast.webp');

  await page.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await page.waitForTimeout(2600);
  await page.addStyleTag({ content: '#ui-root { display: none !important; }' });

  // Strategic zoom: only the gold rings carry identity; plates and banners drop out by design.
  await page.evaluate(() => {
    const g = window.game;
    const tagged = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead && u.tag);
    const cx = tagged.reduce((sum, u) => sum + u.pos.x, 0) / tagged.length;
    const cz = tagged.reduce((sum, u) => sum + u.pos.z, 0) / tagged.length;
    g.camera.follow(null);
    g.camera.moveTo(cx, cz, true);
    g.camera.setHeight(g.camera.maxZoom);
  });
  await page.waitForTimeout(1800);
  const far = path.join(out, 'ayar-identity-far.png');
  await page.screenshot({ path: far });
  console.log(far);
  await publish(far, 'tambotoco-heroes-far.webp');

  // Close group: four siblings in a row, the camera below the RTS clamp, labels off for a clean read.
  await page.evaluate((ids) => {
    const g = window.game;
    g.loop.stop();
    const heroes = ids.map((id) => [...g.units.values()].find((u) => u.tag === id)).filter(Boolean);
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x - 14, base.z + 18, 22);
    heroes.forEach((u, i) => {
      const x = c.x + (i - (ids.length - 1) / 2) * 2.1;
      const z = c.z + (i % 2 === 0 ? -0.2 : 0.4);
      u.clearOrders();
      u.pos.set(x, g.terrain.getHeight(x, z), z);
      u.view.setPosition(x, u.pos.y, z);
      u.view.setRotationY(0.2);
      u.rig?.play('idle', 0);
      u.rig?.update(0.4);
      u.view.setPosition(x, u.pos.y, z);
    });
    g.characterLabels?.setVisible(false);
    g.heroMarkers?.sync(g.units.values(), 30, g.camera.maxZoom);
    const y = g.terrain.getHeight(c.x, c.z);
    const cam = g.camera.camera;
    cam.position.set(c.x + 1.4, y + 2.3, c.z + 7.2);
    cam.lookAt(c.x, y + 1.0, c.z);
    g.renderer.render(g.scene, cam);
  }, HEROES);
  const group = path.join(out, 'ayar-identity-group.png');
  await page.screenshot({ path: group });
  console.log(group);
  await publish(group, 'tambotoco-heroes-close.webp');

  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  await browser.close();
  await close();
}

await main();
