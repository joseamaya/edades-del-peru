import { test, expect } from '@playwright/test';

test('boots without errors and exposes window.game', { tag: '@smoke' }, async ({ page }) => {
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

test('shows the main menu by default', async ({ page }) => {
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

test('selects a unit on click', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  // Centre the view on the player's base, as the visual harness does: otherwise the
  // units' screen position (and whether a HUD panel covers them) depends on how far
  // the camera happened to pan before the loop was stopped — flaky under CI load.
  const center = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    if (c) g.camera.moveTo(c.pos.x, c.pos.z, true);
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });
  await page.mouse.move(center.x, center.y);
  await page.waitForTimeout(600);
  // Pick a unit whose projection lands on the canvas. HUD controls have
  // `pointer-events: auto`, so a point over them never reaches the canvas; `#ui-root`
  // is `pointer-events: none`, so `elementFromPoint` returns the canvas exactly when
  // nothing is in the way — the same test the game's edge guard uses.
  const pickUnit = () => {
    const g = (window as unknown as { game: any }).game;
    if (!g) return null;
    const canvas = g.renderer.domElement as HTMLCanvasElement;
    for (const u of g.units.values() as Iterable<any>) {
      if (u.owner !== 0 || u.dead) continue;
      const v = u.pos.clone();
      v.y += 0.4;
      const s = v.project(g.camera.camera);
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) continue;
      const x = Math.round((s.x * 0.5 + 0.5) * window.innerWidth);
      const y = Math.round((-s.y * 0.5 + 0.5) * window.innerHeight);
      if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
      if (document.elementFromPoint(x, y) !== canvas) continue;
      return { x, y, id: u.id as number };
    }
    return null;
  };
  await page.waitForFunction(pickUnit, null, { timeout: 15_000 });
  // freeze the simulation so the clicked unit cannot move between projection and click
  await page.evaluate(() => (window as unknown as { game: { loop: { stop: () => void } } }).game.loop.stop());
  const pos = await page.evaluate(pickUnit);
  expect(pos, 'no unoccluded player unit to click').not.toBeNull();
  await page.mouse.move(pos!.x, pos!.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(200);
  const selected = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return [...g.selectedUnits] as number[];
  });
  expect(selected).toContain(pos!.id);
});

test('the render canvas fills the viewport (no body-margin offset)', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const rect = await page.evaluate(() => {
    const c = (window as unknown as { game: any }).game.renderer.domElement as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: window.innerWidth, h: window.innerHeight };
  });
  expect(rect.left).toBe(0);
  expect(rect.top).toBe(0);
  expect(rect.right).toBeCloseTo(rect.w, 0);
  expect(rect.bottom).toBeCloseTo(rect.h, 0);
});
