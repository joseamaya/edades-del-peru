import { test, expect } from '@playwright/test';

interface Cam {
  x: number;
  z: number;
}

async function dismissBriefing(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /COMENZAR MISIÓN/.test(b.textContent ?? ''));
    if (btn) btn.click();
  });
}

test('the campaign intro flies the camera toward the player base', async ({ page }) => {
  await page.goto('/?play=1&mission=m1_caral&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await dismissBriefing(page);
  await page.waitForTimeout(150);
  const start = (await page.evaluate(() => (window as unknown as { game: any }).game.camera.getTarget())) as Cam;
  const base = (await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    return { x: c.pos.x, z: c.pos.z };
  })) as Cam;
  // it starts well away from the base (the overview) ...
  expect(Math.hypot(start.x - base.x, start.z - base.z)).toBeGreaterThan(25);
  // ... and settles on the base (poll: the flyover is slower under a software renderer)
  await page
    .waitForFunction(
      () => {
        const g = (window as unknown as { game: any }).game;
        const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
        const t = g.camera.getTarget();
        return Math.hypot(t.x - c.pos.x, t.z - c.pos.z) < 2;
      },
      null,
      { timeout: 20_000 },
    )
    .catch(() => {});
  const nearBase = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    const t = g.camera.getTarget();
    return Math.hypot(t.x - c.pos.x, t.z - c.pos.z);
  });
  expect(nearBase).toBeLessThan(3);
});

test('?intro=0 disables the flyover', async ({ page }) => {
  await page.goto('/?play=1&mission=m1_caral&seed=777&fog=0&low=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const enabled = await page.evaluate(() => (window as unknown as { game: any }).game.introEnabled);
  expect(enabled).toBe(false);
});
