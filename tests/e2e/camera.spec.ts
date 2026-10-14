import { test, expect } from '@playwright/test';

async function bootMatch(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('edge scrolling pans the camera toward the border', { tag: '@smoke' }, async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // pointer at the left edge, over the game view
    g.renderer.domElement.dispatchEvent(new MouseEvent('mousemove', { clientX: 2, clientY: 300, bubbles: true }));
    // start from the middle so the bounds clamp does not mask the pan
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    const t1 = g.camera.getTarget();
    return Math.hypot(t1.x - t0.x, t1.z - t0.z) > 0.5;
  });
  expect(out).toBe(true);
});

test('the camera does not pan while the game is paused', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (!g.getPaused()) g.togglePause();
    const t0 = g.camera.getTarget();
    g.camera.updateMouse(2, 300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const t1 = g.camera.getTarget();
    return Math.hypot(t1.x - t0.x, t1.z - t0.z);
  });
  expect(out).toBe(0);
});

test('the camera does not pan while a blocking menu is open', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.hud.showCodex();
    const blocked = g.hud.hasBlockingOverlay();
    const t0 = g.camera.getTarget();
    g.camera.updateMouse(2, 300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const t1 = g.camera.getTarget();
    return { blocked, moved: Math.hypot(t1.x - t0.x, t1.z - t0.z) };
  });
  expect(out.blocked).toBe(true);
  expect(out.moved).toBe(0);
});

test('dispose removes the camera input listeners', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const mag = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

    // control: while attached, a keydown pans
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    const before0 = g.camera.getTarget();
    g.camera.update(0.5, 0);
    const before1 = g.camera.getTarget();
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));

    // after dispose the listener is gone
    g.camera.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    const after0 = g.camera.getTarget();
    g.camera.update(0.5, 0);
    const after1 = g.camera.getTarget();

    return { movedBefore: mag(before0, before1), movedAfter: mag(after0, after1) };
  });
  expect(out.movedBefore).toBeGreaterThan(0.5);
  expect(out.movedAfter).toBe(0);
});

test('W pans the camera toward the top of the screen', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const yaw = g.camera.getYaw();
    const forward = { x: -Math.sin(yaw), y: -Math.cos(yaw) };
    const t0 = g.camera.getTarget();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    const t1 = g.camera.getTarget();
    const dx = t1.x - t0.x;
    const dz = t1.z - t0.z;
    const len = Math.hypot(dx, dz);
    const along = dx * forward.x + dz * forward.y;
    return { len, ratio: len > 0 ? along / len : 0 };
  });
  expect(out.len).toBeGreaterThan(0.5);
  // almost entirely along the camera's forward direction (not sideways)
  expect(out.ratio).toBeGreaterThan(0.95);
});

test('edge scrolling is suppressed while the pointer is over a HUD control', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // pointer over the bottom-left minimap (a HUD control near the corner)
    g.renderer.domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 100, clientY: window.innerHeight - 100, bubbles: true }),
    );
    const overUi = g.hud.isPointerOverUi(g.mouseScreen.x, g.mouseScreen.y);
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    const t1 = g.camera.getTarget();
    return { overUi, moved: Math.hypot(t1.x - t0.x, t1.z - t0.z) };
  });
  expect(out.overUi).toBe(true);
  expect(out.moved).toBe(0);
});
