import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  return errors;
}

test('the minimap is north-up and shows the camera footprint and compass', { tag: '@smoke' }, async ({ page }) => {
  const errors = await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const compass = document.getElementById('ed-compass')?.textContent ?? '';
    const yaw = g.camera.getYaw();
    const northUp = g.camera.getGroundQuad();
    g.camera.setYaw(Math.PI / 4);
    const diagonal = g.camera.getGroundQuad();
    g.camera.setHeight(9999);
    const diagonalMax = g.camera.getGroundQuad();
    g.camera.setYaw(0);
    g.camera.setHeight(9999);
    const northMax = g.camera.getGroundQuad();
    return {
      compass,
      yaw,
      diagonal,
      northUp,
      northMax,
      diagonalMax,
      maxZoom: g.camera.maxZoom,
      size: g.settings.mapSize,
      center: g.camera.getTarget(),
    };
  });

  expect(state.compass).toContain('N');
  expect(state.compass).toContain('E');
  expect(state.compass).toContain('S');
  expect(state.compass).toContain('W');
  expect(state.yaw).toBeCloseTo(0, 5);

  // North-up at yaw 0: the north edge has a smaller world z.
  const northEdgeMid = {
    x: (state.northUp[2].x + state.northUp[3].x) / 2,
    y: (state.northUp[2].y + state.northUp[3].y) / 2,
  };
  expect(northEdgeMid.x).toBeCloseTo(state.center.x, 5);
  expect(northEdgeMid.y).toBeLessThan(state.center.z);

  // Optional Q/E rotation still rotates the footprint.
  const diagonalTopMid = {
    x: (state.diagonal[2].x + state.diagonal[3].x) / 2,
    y: (state.diagonal[2].y + state.diagonal[3].y) / 2,
  };
  expect(diagonalTopMid.x).toBeLessThan(state.center.x);
  expect(diagonalTopMid.y).toBeLessThan(state.center.z);
  expect(state.diagonal[0].x).not.toBeCloseTo(state.diagonal[3].x);

  // At max zoom the footprint stays inside the square map in both orientations.
  const inside = (quad: { x: number; y: number }[]): boolean =>
    quad.every((p) => p.x >= -1e-6 && p.x <= state.size + 1e-6 && p.y >= -1e-6 && p.y <= state.size + 1e-6);
  expect(state.maxZoom).toBeLessThan(210);
  expect(inside(state.northMax)).toBe(true);
  expect(inside(state.diagonalMax)).toBe(true);
  expect(errors).toEqual([]);
});
