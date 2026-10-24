import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function manifest(assetId: string) {
  return JSON.parse(fs.readFileSync(path.resolve(`art-src/blender/exports/caral/${assetId}_manifest.json`), 'utf8'));
}

const CASES = [
  { label: 'Pyramid Mayor', route: '/?scenery=caral', data: manifest('caral_pyramid_mayor') },
  { label: 'Anfiteatro', route: '/?scenery=caral-anfiteatro', data: manifest('caral_anfiteatro') },
];

for (const testCase of CASES) {
  test(`@smoke Caral ${testCase.label} scenery showcase loads both LODs without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(testCase.route);
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

    const size = testCase.data.lods.LOD0.bounds.size;
    expect(info.lod0).toBe(testCase.data.lods.LOD0.triangles);
    expect(info.lod1).toBe(testCase.data.lods.LOD1.triangles);
    expect(info.drawCalls).toBe(testCase.data.lods.LOD0.draw_calls);
    expect(info.bounds.x).toBeCloseTo(size[0], 1);
    expect(info.bounds.y).toBeCloseTo(size[2], 1);
    expect(info.bounds.z).toBeCloseTo(size[1], 1);
    expect(info.materials).toEqual(testCase.data.lods.LOD0.materials);
    expect(info.lodLevel).toBe(0);

    await page.locator('button[data-lod="1"]').click();
    const level = await page.evaluate(() => (window as { __sceneryDemo?: any }).__sceneryDemo.lodLevel);
    expect(level).toBe(1);
    expect(errors).toEqual([]);
  });
}
