import { test, expect, type Page } from '@playwright/test';
import { CARAL_SITE_CAMERA } from '../../src/model/defs/sites';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

async function dismissBriefing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /COMENZAR MISIÓN/.test(b.textContent ?? ''));
    if (btn) btn.click();
  });
}

function target(page: Page): Promise<{ x: number; z: number }> {
  return page.evaluate(() => (window as unknown as { game: any }).game.camera.getTarget());
}

function base(page: Page): Promise<{ x: number; z: number }> {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    return { x: c.pos.x, z: c.pos.z };
  });
}

type OpeningFrame = { zoom: number; rect: { x: number; z: number; w: number; d: number } };

async function waitForOpeningFrame(page: Page): Promise<OpeningFrame> {
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game: any }).game;
      const c = [...g.buildings.values()].find((x: any) => x.owner === 0 && x.kind === 'center');
      const t = g.camera.getTarget();
      return Math.hypot(t.x - c.pos.x, t.z - c.pos.z) < 1.5;
    },
    null,
    { timeout: 10_000 },
  );
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { zoom: g.camera.getZoom(), rect: g.camera.getGroundRect() };
  });
}

test('the campaign intro flies the camera from an overview to the authored opening frame', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await boot(page, '/?play=1&mission=m1_caral&seed=777&fog=0&low=1');
  await dismissBriefing(page);
  await page.waitForTimeout(120);
  const start = await target(page);
  const b = await base(page);
  expect(Math.hypot(start.x - b.x, start.z - b.z)).toBeGreaterThan(25); // starts away from the base

  // real-time flight (~2.6 s); poll until it settles on the base
  const view = await waitForOpeningFrame(page);
  const end = await target(page);
  expect(Math.hypot(end.x - b.x, end.z - b.z)).toBeLessThan(1.5);
  expect(view.zoom).toBeCloseTo(CARAL_SITE_CAMERA.height, 0);
  expect(view.rect.x).toBeLessThan(8); // the Supe channel runs at x≈8; keep it in frame
});

test('the authored opening frame keeps the Supe channel at 1600x900', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await boot(page, '/?play=1&mission=m1_caral&seed=777&fog=0&low=1');
  await dismissBriefing(page);
  const view = await waitForOpeningFrame(page);
  expect(view.zoom).toBeCloseTo(CARAL_SITE_CAMERA.height, 0);
  expect(view.rect.x).toBeLessThan(8);
});

test('?intro=0 disables the flyover and leaves the camera at the base', async ({ page }) => {
  await boot(page, '/?play=1&mission=m1_caral&seed=777&fog=0&low=1&intro=0');
  expect(await page.evaluate(() => (window as unknown as { game: any }).game.introEnabled)).toBe(false);
  await dismissBriefing(page);
  await page.waitForTimeout(300);
  const t = await target(page);
  const b = await base(page);
  expect(Math.hypot(t.x - b.x, t.z - b.z)).toBeLessThan(3); // never flew away
});

test('skirmish has no intro', async ({ page }) => {
  await boot(page, '/?play=1&seed=777&fog=0&low=1');
  const mission = await page.evaluate(() => (window as unknown as { game: any }).game.mission);
  expect(mission).toBeNull();
});
