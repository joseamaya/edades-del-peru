import { test, expect } from '@playwright/test';

test('arranca sin errores y expone window.game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
  });

  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const info = await page.evaluate(() => {
    const g = (window as unknown as { game: { units: Map<number, unknown>; buildings: Map<number, unknown> } }).game;
    return { units: g.units.size, buildings: g.buildings.size };
  });

  expect(info.units).toBeGreaterThan(0);
  expect(info.buildings).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('muestra el menú principal por defecto', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const menu = page.locator('.ed-overlay', { hasText: 'EDADES DEL PERÚ' });
  await expect(menu).toBeVisible();
  await expect(page.locator('#ui-root')).toHaveClass(/menu-open/);
  await expect(page.getByRole('button', { name: /Campañas/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cómo jugar/ })).toBeVisible();
});

test('selecciona una unidad al hacer clic', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => (window as unknown as { game: { loop: { stop: () => void } } }).game.loop.stop());
  const pos = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const u = [...g.units.values()].find((x: any) => x.owner === 0);
    const v = u.pos.clone();
    v.y += 0.4;
    const s = v.project(g.camera.camera);
    return { x: Math.round((s.x * 0.5 + 0.5) * window.innerWidth), y: Math.round((-s.y * 0.5 + 0.5) * window.innerHeight), id: u.id };
  });
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(200);
  const selected = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return [...g.selectedUnits] as number[];
  });
  expect(selected.length).toBeGreaterThan(0);
});
