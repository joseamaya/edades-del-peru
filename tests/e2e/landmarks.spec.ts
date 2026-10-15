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
    if (!l) return { id: g.mapProfile.landmark as string | null, present: false };
    let verts = 0;
    let meshes = 0;
    l.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        verts += o.geometry.attributes.position.count;
        meshes++;
      }
    });
    const size = g.settings.mapSize as number;
    return {
      id: g.mapProfile.landmark as string | null,
      present: true,
      x: l.position.x as number,
      z: l.position.z as number,
      verts,
      meshes,
      size,
      dist: Math.hypot(l.position.x - size / 2, l.position.z - size / 2),
      onWater: g.terrain.isWater(l.position.x, l.position.z) as boolean,
    };
  });
}

test('each slice map places its own landmark on land', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const caral = await landmarkInfo(page);
  await boot(page, '/?mission=m3_moche_recuay&fog=0&low=1&noloop=1');
  const moche = await landmarkInfo(page);
  await boot(page, '/?mission=m5_yahuar_pampa&fog=0&low=1&noloop=1');
  const inca = await landmarkInfo(page);

  expect(caral.id).toBe('caral_ceremonial');
  expect(moche.id).toBe('moche_huaca');
  expect(inca.id).toBe('inca_ushnu');
  for (const l of [caral, moche, inca]) {
    expect(l.present).toBe(true);
    expect(l.meshes).toBeGreaterThan(0);
    expect(l.verts).toBeGreaterThan(500);
    expect(l.onWater, 'landmark must not sit on water').toBe(false);
    expect(l.dist!).toBeLessThanOrEqual(0.45 * l.size!);
  }
  const keys = new Set([`${caral.verts}`, `${moche.verts}`, `${inca.verts}`]);
  expect(keys.size, 'the three landmarks must not share a structure').toBe(3);
});

test('a culture without a landmark places none', async ({ page }) => {
  await boot(page, '/?mission=m2_chavin&fog=0&low=1&noloop=1');
  const info = await landmarkInfo(page);
  expect(info.present).toBe(false);
  expect(info.id).toBeNull();
});

test('an incompatible map region drops the landmark', async ({ page }) => {
  // the Inca conquering the north coast (m6): a high-Andes ushnu does not fit a coast
  await boot(page, '/?mission=m6_chimu_inca&fog=0&low=1&noloop=1');
  const info = await landmarkInfo(page);
  expect(info.present).toBe(false);
  expect(info.id).toBeNull();
});

test('landmark placement is deterministic for the same seed', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const a = await landmarkInfo(page);
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const b = await landmarkInfo(page);
  expect(a).toEqual(b);
});
