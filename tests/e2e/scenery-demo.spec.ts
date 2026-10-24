import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST = JSON.parse(
  fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_mayor_manifest.json'), 'utf8'),
);

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

  expect(info.lod0).toBe(MANIFEST.lods.LOD0.triangles);
  expect(info.lod1).toBe(MANIFEST.lods.LOD1.triangles);
  expect(info.drawCalls).toBe(MANIFEST.lods.LOD0.draw_calls);
  const sourceSize = MANIFEST.lods.LOD0.bounds.size;
  expect(info.bounds.x).toBeCloseTo(sourceSize[0], 0);
  expect(info.bounds.y).toBeCloseTo(sourceSize[2], 1);
  expect(info.bounds.z).toBeCloseTo(sourceSize[1], 0);
  expect(info.materials).toContain('MAT-Fire_Ember');
  expect(info.materials).toContain('MAT-Stone_Granodiorite');
  expect(info.lodLevel).toBe(0);

  await page.locator('button[data-lod="1"]').click();
  const level = await page.evaluate(() => (window as { __sceneryDemo?: any }).__sceneryDemo.lodLevel);
  expect(level).toBe(1);
  expect(errors).toEqual([]);
});
