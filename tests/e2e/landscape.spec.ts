import { test, expect, Page } from '@playwright/test';
import { RENDERED_FEATURES } from '../../src/model/defs/landscapePlan';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

function landscapeSig(page: Page) {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const l = g.landscape;
    if (!l) return { present: false, meshes: 0, verts: 0, names: [] as string[] };
    let meshes = 0;
    let verts = 0;
    const names: string[] = [];
    l.group.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        meshes++;
        verts += o.geometry.attributes.position.count;
        names.push(o.name as string);
      }
    });
    return { present: true, meshes, verts, names };
  });
}

test('a coastal map carries its cultural landscape', async ({ page }) => {
  await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
  const s = await landscapeSig(page);
  expect(s.present).toBe(true);
  expect(s.meshes).toBeGreaterThan(0);
  expect(s.verts).toBeGreaterThan(0);
  expect(s.names).toContain('canal');
  expect(s.names).toContain('field');
  expect(s.names).toContain('road');
  expect(s.names).toContain('plaza');
});

test('the high Andes carry terraces and the altiplano corrals', async ({ page }) => {
  await boot(page, '/?civ=inca&period=5&seed=777&fog=0&low=1&noloop=1');
  const andes = await landscapeSig(page);
  expect(andes.present).toBe(true);
  expect(andes.names).toContain('terrace');

  await boot(page, '/?civ=tiahuanaco&period=3&seed=777&fog=0&low=1&noloop=1');
  const altiplano = await landscapeSig(page);
  expect(altiplano.names).toContain('corral');
});

test('a jungle map carries its own (lighter) landscape', async ({ page }) => {
  await boot(page, '/?civ=moche&period=2&map=jungle&seed=777&fog=0&low=1&noloop=1');
  const s = await landscapeSig(page);
  expect(s.present).toBe(true);
  expect(s.meshes).toBeGreaterThan(0);
  expect(s.names.some((n) => n === 'field' || n === 'path')).toBe(true);
});

test('landscape placement is deterministic for the same seed', async ({ page }) => {
  const sample = async () => {
    await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
    return landscapeSig(page);
  };
  const a = await sample();
  const b = await sample();
  expect(b.meshes).toBe(a.meshes);
  expect(b.verts).toBe(a.verts);
});

test('the landscape stays merged into at most one mesh per feature', async ({ page }) => {
  await boot(page, '/?civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
  const s = await landscapeSig(page);
  // the layer merges each feature into one mesh, so its draw calls stay low;
  // guards against un-merging (a mesh per road/field segment) creeping back in
  expect(s.meshes).toBeLessThanOrEqual(RENDERED_FEATURES.length);
});
