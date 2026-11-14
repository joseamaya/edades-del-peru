import { chromium } from '@playwright/test';
export const BASE = 'http://localhost:5175';
export async function launch(w = 1920, h = 1080) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=vulkan','--enable-features=Vulkan','--ignore-gpu-blocklist','--enable-gpu'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  return { browser, page };
}
export async function bootMission(page, mission, seed = 3000, extra = '') {
  await page.goto(`${BASE}/?mission=${mission}&intro=0&fog=0&seed=${seed}${extra}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.game?.mission, null, { timeout: 120000 });
  await page.locator('.ed-primary', { hasText: 'COMENZAR' }).first().click({ timeout: 15000 }).catch(() => console.log('no COMENZAR'));
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const g = window.game;
    g.applyQualityPreset?.('high');
    if (g.trees) g.trees.kitLod0Radius = 70;
    const cam = g.camera;
    const orig = cam.update.bind(cam);
    window.__shot = null;
    cam.update = (dt, time) => {
      orig(dt, time);
      const s = window.__shot;
      if (s) {
        cam.target.x = s.look[0]; cam.target.z = s.look[2];
        cam.desiredTarget.x = s.look[0]; cam.desiredTarget.z = s.look[2];
        cam.camera.position.set(...s.pos);
        cam.camera.lookAt(...s.look);
        if (s.fov) { cam.camera.fov = s.fov; cam.camera.updateProjectionMatrix(); }
      }
    };
    window.__t = 1000;
    window.__step = (n = 2) => { for (let i = 0; i < n; i++) { const h = g.hud; if (h.missionCard) { h.missionCard.remove(); h.missionCard = null; } g.update(1 / 60, window.__t); window.__t += 1 / 60; } g.loop.onRender(0); };
    window.__H = (x, z) => g.terrain.getHeight(x, z);
    g.loop.stop();
  });
}
