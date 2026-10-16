import { test, expect, Page } from '@playwright/test';

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

test('a region without landscape features draws none', async ({ page }) => {
  // the jungle has no cultural-landscape features yet (moche forced onto a jungle map)
  await boot(page, '/?civ=moche&period=2&map=jungle&seed=777&fog=0&low=1&noloop=1');
  const s = await landscapeSig(page);
  expect(s.present).toBe(true);
  expect(s.meshes).toBe(0);
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
