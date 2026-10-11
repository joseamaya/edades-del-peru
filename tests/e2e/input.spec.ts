import { test, expect } from '@playwright/test';

/** Descarta el briefing inicial si está presente. */
async function startMission(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  if (await start.count()) await start.click();
}

test('un solo clic en la tarjeta de construir inicia la colocación', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
  });
  const card = page.locator('.ed-card', { hasText: 'Vivienda' }).first();
  await card.waitFor({ timeout: 5000 });
  await card.click();
  const placing = await page.evaluate(() => (window as unknown as { game: any }).game.placingBuilding?.kind ?? null);
  expect(placing).toBe('vivienda');
});

test('el clic en el suelo coloca el edificio previsualizado', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  await page.waitForTimeout(300); // deja asentar la cámara antes de proyectar
  const pick = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
    g.startPlacement('vivienda');
    const W = window.innerWidth;
    const H = window.innerHeight;
    // buscar un punto de pantalla sobre el canvas (no HUD) que sea colocable
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

test('un solo clic en la tarjeta de entrenar encola la unidad', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  await startMission(page);
  const id = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'centro' && b.owner === 0);
    const cuartel = g.spawnScriptedBuilding('cuartel', 0, center.pos.x + 10, center.pos.z + 10);
    g.selectedUnits = [];
    g.selectedBuilding = cuartel.id;
    return cuartel.id as number;
  });
  const card = page.locator('.ed-card', { hasText: 'Guerrero' }).first();
  await card.waitFor({ timeout: 5000 });
  await card.click();
  const queued = await page.evaluate((bid) => (window as unknown as { game: any }).game.buildings.get(bid).productionQueue.length, id);
  expect(queued).toBe(1);
});
