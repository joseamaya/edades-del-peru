import { test, expect } from '@playwright/test';

/** Dismiss the initial briefing if present. */
async function startMission(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 15_000 });
  await start.click();
  // wait until the briefing overlay is fully gone before touching the world
  await start.waitFor({ state: 'detached', timeout: 15_000 });
}

test('a single click on the build card starts placement', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
  });
  const card = page.locator('.ed-card', { hasText: 'Vivienda' }).first();
  await card.waitFor({ timeout: 20_000 });
  await card.click();
  const placing = await page.evaluate(() => (window as unknown as { game: any }).game.placingBuilding?.kind ?? null);
  expect(placing).toBe('house');
});

test('clicking the ground places the previewed building', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  // wait for the mission world to be fully initialized
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && !!g.mission && g.buildings.size > 0 && g.players[0]?.resources?.food > 0;
    },
    null,
    { timeout: 15_000 },
  );

  // Freeze the loop so the camera cannot drift, then pick a placeable point near the
  // base and project it. The real click maps back to the same point deterministically.
  const result = await page.evaluate(() => {
    const w = window as unknown as { game: any; THREE: any; innerWidth: number; innerHeight: number };
    const g = w.game;
    g.paused = false;
    g.loop.stop();
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    if (!center || !worker) return null;
    // put the camera on the base and refresh matrices so projections are valid
    g.camera.moveTo(center.pos.x, center.pos.z, true);
    g.camera.update(0, performance.now() / 1000);
    g.camera.camera.updateMatrixWorld(true);
    g.selectedUnits = [worker.id];
    g.selectedBuilding = null;
    g.startPlacement('house');
    let point: { sx: number; sy: number } | null = null;
    for (let r = 4; r <= 14 && !point; r++) {
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        const x = center.pos.x + Math.cos(ang) * r;
        const z = center.pos.z + Math.sin(ang) * r;
        if (!g.canPlace(x, z, 2)) continue;
        const v = new w.THREE.Vector3(x, g.terrain.getHeight(x, z), z).project(g.camera.camera);
        const sx = (v.x * 0.5 + 0.5) * w.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * w.innerHeight;
        if (sx < 8 || sx > w.innerWidth - 8 || sy < 8 || sy > w.innerHeight - 8) continue;
        const wp = g.screenToWorld(sx, sy);
        if (!wp || !g.canPlace(wp.x, wp.z, 2)) continue;
        point = { sx, sy };
        break;
      }
    }
    if (!point) return null;
    return { sx: point.sx, sy: point.sy, before: g.buildings.size as number };
  });

  expect(result).not.toBeNull();
  // the loop was frozen above, so the camera cannot drift between validation and click
  await page.mouse.click(result!.sx, result!.sy);
  const after = await page.evaluate(() => (window as unknown as { game: any }).game.buildings.size);
  expect(after).toBe(result!.before + 1);
});

test('a single click on the train card queues the unit', { tag: '@smoke' }, async ({ page }) => {
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
  await card.waitFor({ timeout: 20_000 });
  await card.click();
  const queued = await page.evaluate(
    (bid) => (window as unknown as { game: any }).game.buildings.get(bid).productionQueue.length,
    id,
  );
  expect(queued).toBe(1);
});
