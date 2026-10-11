import { test, expect } from '@playwright/test';

/** Dismiss the initial briefing if present. */
async function startMission(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  if (await start.count()) await start.click();
}

test('a single click on the build card starts placement', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
  });
  const card = page.locator('.ed-card', { hasText: 'Vivienda' }).first();
  await card.waitFor({ timeout: 5000 });
  await card.click();
  const placing = await page.evaluate(() => (window as unknown as { game: any }).game.placingBuilding?.kind ?? null);
  expect(placing).toBe('house');
});

test('clicking the ground places the previewed building', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.waitForTimeout(300); // let the camera settle before projecting
  const pick = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
    g.startPlacement('house');
    const W = window.innerWidth;
    const H = window.innerHeight;
    // find a screen point over the canvas (not HUD) that is placeable
    for (let sy = H * 0.1; sy < H * 0.85; sy += 24) {
      for (let sx = W * 0.05; sx < W * 0.95; sx += 24) {
        if (document.elementFromPoint(sx, sy)?.tagName !== 'CANVAS') continue;
        const wp = g.screenToWorld(sx, sy);
        if (!wp || !g.canPlace(wp.x, wp.z, 2)) continue;
        return { sx, sy, count: g.buildings.size as number };
      }
    }
    return null;
  });
  expect(pick).not.toBeNull();
  await page.mouse.click(pick!.sx, pick!.sy);
  const after = await page.evaluate(() => (window as unknown as { game: any }).game.buildings.size);
  expect(after).toBe(pick!.count + 1);
});

test('a single click on the train card queues the unit', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  const id = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    const barracks = g.spawnScriptedBuilding('barracks', 0, center.pos.x + 10, center.pos.z + 10);
    g.selectedUnits = [];
    g.selectedBuilding = barracks.id;
    return barracks.id as number;
  });
  const card = page.locator('.ed-card', { hasText: 'Guerrero' }).first();
  await card.waitFor({ timeout: 5000 });
  await card.click();
  const queued = await page.evaluate((bid) => (window as unknown as { game: any }).game.buildings.get(bid).productionQueue.length, id);
  expect(queued).toBe(1);
});
