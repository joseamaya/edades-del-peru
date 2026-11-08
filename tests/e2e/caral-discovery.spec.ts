import { expect, test, type Page } from '@playwright/test';
import { ASPERO_HERITAGE_PROXY } from '../../src/model/defs/sites';
import { getHeritageBuilding } from '../../src/model/defs/heritage';
import { t } from '../../src/i18n';

const HUACA = { x: ASPERO_HERITAGE_PROXY.x, z: ASPERO_HERITAGE_PROXY.z, h: ASPERO_HERITAGE_PROXY.h };
const HUACA_TOAST = t('hud.discovery', { name: getHeritageBuilding('aspero_huaca_idolos')!.name });

const URL = '/?mission=m1_caral&seed=3000&fog=1&low=1&noloop=1&intro=0';

async function start(page: Page): Promise<void> {
  await page.goto(URL);
  const briefing = page.locator('.ed-overlay').filter({ hasText: 'OBJETIVOS' });
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached', timeout: 15_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
  });
}

test('the opening frames the Huaca de los Ídolos and clears its fog', async ({ page }) => {
  await start(page);

  const opened = await page.evaluate((huaca) => {
    const g = (window as unknown as { game: any }).game;
    for (let i = 0; i < 2; i++) g.update(1 / 60, i / 60);
    const opening = g.missionLayout?.opening;
    const expected = opening
      ? { x: opening.x * g.settings.mapSize, z: opening.z * g.settings.mapSize }
      : { x: 0, z: 0 };
    return {
      target: g.camera.getTarget(),
      expected,
      state: g.discoveries.sites[0].state,
      explored: g.fow.isExplored(huaca.x, huaca.z),
    };
  }, HUACA);

  expect(opened.target.x).toBeCloseTo(opened.expected.x, 1);
  expect(opened.target.z).toBeCloseTo(opened.expected.z, 1);
  expect(opened.state).toBe('revealing');
  expect(opened.explored).toBe(true);
});

test('the Huaca discovery grows a fog clearing and announces its name', async ({ page }) => {
  await start(page);

  const early = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    for (let i = 0; i < 4; i++) g.update(1 / 60, i / 60);
    return {
      state: g.discoveries.sites[0].state,
      toast: document.querySelector('.ed-toast')?.textContent ?? null,
    };
  });
  expect(early.state).toBe('revealing');
  expect(early.toast).toBe(HUACA_TOAST);

  const late = await page.evaluate((huaca) => {
    const g = (window as unknown as { game: any }).game;
    for (let i = 4; i < 100; i++) g.update(1 / 60, i / 60);
    const top = g.terrain.getHeight(huaca.x, huaca.z) + huaca.h;
    const v = new window.THREE.Vector3(huaca.x, top, huaca.z).project(g.camera.camera);
    const topbarBottom = document.querySelector('.ed-topbar')?.getBoundingClientRect().bottom ?? 0;
    return {
      state: g.discoveries.sites[0].state,
      explored: g.fow.isExplored(huaca.x, huaca.z),
      top: { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight },
      topbarBottom,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  }, HUACA);

  expect(late.state).toBe('done');
  expect(late.explored).toBe(true);
  // The summit sits inside the playfield, below the top bar.
  expect(late.top.y).toBeGreaterThan(late.topbarBottom);
  expect(late.top.y).toBeLessThan(late.viewport.h);
  expect(late.top.x).toBeGreaterThan(0);
  expect(late.top.x).toBeLessThan(late.viewport.w);
});
