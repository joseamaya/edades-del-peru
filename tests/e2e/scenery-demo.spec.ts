import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

interface SceneryManifest {
  lods: {
    LOD0: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
    LOD1: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
  };
}

interface SceneryDemoHandle {
  bounds: { x: number; y: number; z: number };
  lod0Triangles: number;
  lod1Triangles: number;
  drawCalls: number;
  materials: string[];
  lodLevel: 0 | 1;
}

function manifest(assetId: string): SceneryManifest {
  return JSON.parse(
    fs.readFileSync(path.resolve(`art-src/blender/exports/caral/${assetId}_manifest.json`), 'utf8'),
  ) as SceneryManifest;
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
      const demo = (window as { __sceneryDemo?: SceneryDemoHandle }).__sceneryDemo;
      if (!demo) throw new Error('missing __sceneryDemo');
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
    const level = await page.evaluate(() => {
      const demo = (window as { __sceneryDemo?: SceneryDemoHandle }).__sceneryDemo;
      return demo?.lodLevel;
    });
    expect(level).toBe(1);
    expect(errors).toEqual([]);
  });
}
