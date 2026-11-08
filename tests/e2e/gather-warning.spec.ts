import { expect, test, type Page } from '@playwright/test';

const URL = '/?mission=m1_caral&seed=3000&fog=0&low=1&noloop=1&intro=0';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
  });
}

/** Put the camera over a fishing bank and return a screen point that picks it. */
async function fishingScreenPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any; THREE: any }).game;
    const node = [...g.resourceNodes.values()].find((n: any) => n.kind === 'fishing' && !n.dead && !n.depleted);
    if (!node) throw new Error('m1 has no fishing node');
    g.camera.moveTo(node.pos.x, node.pos.z, true);
    g.camera.setHeight(34);
    for (let i = 0; i < 120; i++) g.update(1 / 60, i / 60);
    g.camera.camera.updateMatrixWorld();
    const v = new window.THREE.Vector3(node.pos.x, node.pos.y + 0.6, node.pos.z).project(g.camera.camera);
    const projected = {
      x: Math.round((v.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-v.y * 0.5 + 0.5) * window.innerHeight),
    };
    for (let radius = 0; radius <= 80; radius += 4) {
      const candidates =
        radius === 0
          ? [projected]
          : [-radius, 0, radius].flatMap((dx) =>
              [-radius, 0, radius].map((dy) => ({ x: projected.x + dx, y: projected.y + dy })),
            );
      const found = candidates.find((p) => g.input.pickResource(p.x, p.y)?.id === node.id);
      if (found) return found;
    }
    throw new Error('could not project the fishing bank');
  });
}

async function spawnAtBase(page: Page, kind: string, slot = 0): Promise<number> {
  return page.evaluate(
    ({ unitKind, slot }) => {
      const g = (window as unknown as { game: any }).game;
      const base = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
      const u = g.spawnScriptedUnit(unitKind, 0, base.pos.x + 5 + slot * 2, base.pos.z + 4);
      u.clearOrders();
      return u.id;
    },
    { unitKind: kind, slot },
  );
}

async function orderState(page: Page, ids: number[]) {
  return page.evaluate((ids) => {
    const g = (window as unknown as { game: any }).game;
    const orders: Record<number, string[]> = {};
    for (const id of ids) orders[id] = g.units.get(id)?.orderQueue.map((o: any) => o.kind) ?? [];
    return {
      orders,
      marker: g.markers.lastKind,
      toast: document.querySelector('.ed-toast')?.textContent ?? null,
    };
  }, ids);
}

async function select(page: Page, ids: number[]): Promise<void> {
  await page.evaluate((ids) => {
    const g = (window as unknown as { game: any }).game;
    g.selectedUnits = ids;
    g.selectedBuilding = null;
  }, ids);
}

test('a non-worker right-clicking a fishing bank warns and moves instead of gathering', async ({ page }) => {
  await boot(page);
  const point = await fishingScreenPoint(page);
  const scoutId = await spawnAtBase(page, 'scout');
  await select(page, [scoutId]);

  await page.mouse.move(point.x, point.y);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('#ed-cursor');
        return el && el.style.display !== 'none' ? el.textContent : null;
      }),
    )
    .toBe('🚫');

  await page.mouse.click(point.x, point.y, { button: 'right' });
  const state = await orderState(page, [scoutId]);

  expect(state.orders[scoutId][0]).toBe('move');
  expect(state.orders[scoutId]).not.toContain('gather');
  expect(state.marker).toBe('move');
  expect(state.toast).toBe('Solo los obreros pueden recolectar');
});

test('a non-worker right-clicking a farm warns and moves instead of gathering', async ({ page }) => {
  await boot(page);
  const farmId = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const base = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
    const farm = g.spawnScriptedBuilding('farm', 0, base.pos.x + 12, base.pos.z);
    g.camera.moveTo(farm.pos.x, farm.pos.z, true);
    g.camera.setHeight(34);
    for (let i = 0; i < 120; i++) g.update(1 / 60, i / 60);
    return farm.id;
  });
  const point = await page.evaluate((farmId) => {
    const g = (window as unknown as { game: any; THREE: any }).game;
    const farm = g.buildings.get(farmId);
    g.camera.camera.updateMatrixWorld();
    const v = new window.THREE.Vector3(farm.pos.x, farm.pos.y + 1.5, farm.pos.z).project(g.camera.camera);
    const projected = {
      x: Math.round((v.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-v.y * 0.5 + 0.5) * window.innerHeight),
    };
    for (let radius = 0; radius <= 60; radius += 4) {
      const candidates =
        radius === 0
          ? [projected]
          : [-radius, 0, radius].flatMap((dx) =>
              [-radius, 0, radius].map((dy) => ({ x: projected.x + dx, y: projected.y + dy })),
            );
      const found = candidates.find((p) => g.pickAt(p.x, p.y)?.building?.id === farmId);
      if (found) return found;
    }
    throw new Error('could not project the farm');
  }, farmId);

  const scoutId = await spawnAtBase(page, 'scout');
  await select(page, [scoutId]);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  const state = await orderState(page, [scoutId]);

  expect(state.orders[scoutId][0]).toBe('move');
  expect(state.orders[scoutId]).not.toContain('gather');
  expect(state.marker).toBe('move');
  expect(state.toast).toBe('Solo los obreros pueden recolectar');
});

test('a worker still gathers from the fishing bank without a warning', async ({ page }) => {
  await boot(page);
  const point = await fishingScreenPoint(page);
  const workerId = await spawnAtBase(page, 'worker');
  await select(page, [workerId]);

  await page.mouse.click(point.x, point.y, { button: 'right' });
  const state = await orderState(page, [workerId]);

  expect(state.orders[workerId][0]).toBe('gather');
  expect(state.marker).toBe('gather');
  expect(state.toast).toBeNull();
});

test('a mixed selection gathers with its workers and moves the rest', async ({ page }) => {
  await boot(page);
  const point = await fishingScreenPoint(page);
  const workerId = await spawnAtBase(page, 'worker', 0);
  const scoutId = await spawnAtBase(page, 'scout', 1);
  await select(page, [workerId, scoutId]);

  await page.mouse.click(point.x, point.y, { button: 'right' });
  const state = await orderState(page, [workerId, scoutId]);

  expect(state.orders[workerId][0]).toBe('gather');
  expect(state.orders[scoutId][0]).toBe('move');
  expect(state.marker).toBe('gather');
  expect(state.toast).toBeNull();
});
