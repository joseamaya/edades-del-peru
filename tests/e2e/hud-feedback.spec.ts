import { test, expect, type Page } from '@playwright/test';

/**
 * HUD feedback must stay readable under pressure: repeated messages collapse into one counter,
 * the stack is capped, and holding an order key does not fire it dozens of times.
 */
async function boot(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
  });
}

test('repeated toasts collapse into one counter and the stack is capped', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const message = 'Necesitas 50 de madera para esta entrega.';
    for (let i = 0; i < 50; i++) g.hud.showToast(message, 'warning');
    const repeated = [...document.querySelectorAll('.ed-toast')].map((el) => el.textContent);
    for (let i = 0; i < 8; i++) g.hud.showToast(`Aviso distinto ${i}`, 'info');
    return {
      repeated,
      after: document.querySelectorAll('.ed-toast').length,
      texts: [...document.querySelectorAll('.ed-toast')].map((el) => el.textContent),
    };
  });
  expect(state.repeated).toEqual(['Necesitas 50 de madera para esta entrega. ×50']);
  expect(state.after).toBe(4);
  expect(state.texts).toContain('Aviso distinto 7');
});

test('holding an order key does not repeat the order', { tag: '@smoke' }, async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    g.selectedUnits = [worker.id];
    g.selectedBuilding = null;
    g.hud.renderBottom();
    const press = (repeat: boolean) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true, cancelable: true, repeat }));
    press(true);
    const during = g.placingBuilding?.kind ?? null;
    press(false);
    const after = g.placingBuilding?.kind ?? null;
    g.cancelPlacement();
    return { during, after };
  });
  expect(state.during, 'a repeat keydown must not start a placement').toBeNull();
  expect(state.after).toBe('house');
});
