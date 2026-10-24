import { test, expect } from '@playwright/test';

test('@smoke Caral city GLB showcase loads both LODs without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?city=caral');
  await page.waitForFunction(() => (window as { __cityDemo?: unknown }).__cityDemo !== undefined, null, {
    timeout: 30_000,
  });

  const info = await page.evaluate(() => {
    const demo = (window as { __cityDemo?: any }).__cityDemo;
    return {
      bounds: demo.bounds,
      lod0: demo.lod0Triangles,
      lod1: demo.lod1Triangles,
      drawCalls: demo.drawCalls,
      materials: demo.materials,
      lodLevel: demo.lodLevel,
    };
  });

  expect(info.lod0).toBe(18120);
  expect(info.lod1).toBe(6194);
  expect(info.drawCalls).toBe(10);
  expect(info.bounds.x).toBeCloseTo(30.4, 1);
  expect(info.bounds.y).toBeCloseTo(2.814, 1);
  expect(info.bounds.z).toBeCloseTo(49.628, 1);
  expect(info.materials).toContain('MAT-Sand_Desert');
  expect(info.lodLevel).toBe(0);

  await page.locator('button[data-lod="1"]').click();
  const level = await page.evaluate(() => (window as { __cityDemo?: any }).__cityDemo.lodLevel);
  expect(level).toBe(1);
  expect(errors).toEqual([]);
});
