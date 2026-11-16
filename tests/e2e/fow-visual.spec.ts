import { expect, test } from '@playwright/test';
import sharp from 'sharp';

/**
 * SwiftShader used to whiten fogged landscape meshes and the ayllu site was exempted from the fog
 * shader, so the whole valley floated over black. This captures the Huanacaure view with fog on and
 * checks that the review backend stays dark: no near-white slabs and the site material is fogged.
 */
test('Tambotoco fog keeps the landscape dark and the ayllu site fogged @smoke', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?mission=m_tambotoco&seed=1200&fog=1&intro=0&low=1&noloop=1');
  await page.getByRole('button', { name: /COMENZAR MISIÓN/ }).click({ timeout: 30_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.aylluSite != null, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);

  const siteFogged = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    document.getElementById('ui-root')!.style.display = 'none';
    document.getElementById('ed-world-labels')!.style.display = 'none';
    g.setSitePhase('huanacaure');
    // Reveal the hill as explored (dim) rather than unexplored (black): the bug showed as white
    // slabs there, and the site still has to carry its fog material.
    g.fow.explore(120, 106, 45);
    g.fowTexture.upload();
    g.camera.focusOn(120, 106);
    g.camera.desiredZoom = 40;
    for (let i = 0; i < 90; i++) g.update(1 / 60, i / 60);
    g.runtime.render();
    const fogged: boolean[] = [];
    g.aylluSite?.group.traverse((o: any) => {
      if (o.isMesh) fogged.push(!!o.material?.userData?.fow);
    });
    return fogged;
  });
  expect(siteFogged.length).toBeGreaterThan(0);
  expect(siteFogged.every(Boolean)).toBe(true);

  const shot = await page.screenshot();
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i]! > 245 && data[i + 1]! > 245 && data[i + 2]! > 245) white++;
  }
  // The unfogged landscape/site used to paint ~16k pure-white pixels at this view.
  expect(white).toBeLessThan(200);
});
