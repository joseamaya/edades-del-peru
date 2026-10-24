import { test, expect } from '@playwright/test';

test('@smoke Caral Pyramid Mayor scenery showcase loads both LODs without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?scenery=caral');
  await page.waitForFunction(() => (window as { __sceneryDemo?: unknown }).__sceneryDemo !== undefined, null, {
    timeout: 30_000,
  });

  const info = await page.evaluate(() => {
    const demo = (window as { __sceneryDemo?: any }).__sceneryDemo;
    return {
      bounds: demo.bounds,
      lod0: demo.lod0Triangles,
      lod1: demo.lod1Triangles,
      drawCalls: demo.drawCalls,
      materials: demo.materials,
      lodLevel: demo.lodLevel,
    };
  });

  expect(info.lod0).toBe(6044);
  expect(info.lod1).toBe(2408);
  expect(info.drawCalls).toBe(7);
  expect(info.bounds.x).toBeCloseTo(13.9, 0);
  expect(info.bounds.y).toBeCloseTo(2.77, 1);
  expect(info.bounds.z).toBeCloseTo(15.5, 0);
  expect(info.materials).toContain('MAT-Fire_Ember');
  expect(info.materials).toContain('MAT-Stone_Granodiorite');
  expect(info.lodLevel).toBe(0);

  await page.locator('button[data-lod="1"]').click();
  const level = await page.evaluate(() => (window as { __sceneryDemo?: any }).__sceneryDemo.lodLevel);
  expect(level).toBe(1);
  expect(errors).toEqual([]);
});
