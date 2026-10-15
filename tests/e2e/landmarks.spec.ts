import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

function landmarkInfo(page: Page) {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const l = g.landmark;
    if (!l) return null;
    let verts = 0;
    let meshes = 0;
    l.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        verts += o.geometry.attributes.position.count;
        meshes++;
      }
    });
    return { x: l.position.x, z: l.position.z, y: l.position.y, verts, meshes };
  });
}

test('each slice map places a distinct landmark', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const caral = await landmarkInfo(page);
  await boot(page, '/?mission=m3_moche_recuay&fog=0&low=1&noloop=1');
  const moche = await landmarkInfo(page);
  await boot(page, '/?mission=m5_yahuar_pampa&fog=0&low=1&noloop=1');
  const inca = await landmarkInfo(page);

  for (const l of [caral, moche, inca]) {
    expect(l).not.toBeNull();
    expect(l!.meshes).toBeGreaterThan(0);
    expect(l!.verts).toBeGreaterThan(500);
  }
  const keys = new Set([`${caral!.verts}`, `${moche!.verts}`, `${inca!.verts}`]);
  expect(keys.size, 'the three landmarks must not share a structure').toBe(3);
});

test('a culture without a landmark places none', async ({ page }) => {
  await boot(page, '/?mission=m2_chavin&fog=0&low=1&noloop=1');
  expect(await landmarkInfo(page)).toBeNull();
});

test('landmark placement is deterministic for the same seed', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const a = await landmarkInfo(page);
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const b = await landmarkInfo(page);
  expect(a).toEqual(b);
});
