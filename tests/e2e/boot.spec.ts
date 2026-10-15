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
  // Centre the view on the player's base (as the visual harness does): otherwise the
  // units' screen position — and whether a HUD panel or the base building covers them —
  // depends on how far the camera happened to pan before the loop was stopped.
  const centered = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    if (!c) return false;
    g.camera.moveTo(c.pos.x, c.pos.z, true);
    return true;
  });
  expect(centered, 'no player town centre to centre the camera on').toBe(true);
  const viewport = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  await page.mouse.move(viewport.w / 2, viewport.h / 2);
  // Poll until a player unit has a clickable projection: HUD controls have
  // `pointer-events: auto` (the game's edge guard skips points over `#ui-root`), and the
  // click must resolve to the unit itself rather than a building or resource in front.
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
      if (g.pickAt(x, y).unit?.id !== u.id) continue;
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
  await expect
    .poll(() => page.evaluate(() => [...(window as unknown as { game: any }).game.selectedUnits] as number[]))
    .toContain(pos!.id);
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
