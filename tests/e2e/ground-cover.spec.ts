import { test, expect, type Page } from '@playwright/test';

interface CoverState {
  present: boolean;
  visible: boolean;
  enabled: boolean;
  instances: number;
  chunks: number;
  species: Record<string, number>;
  fowMaterials: number;
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

function coverState(page: Page): Promise<CoverState> {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.groundCover;
    if (!c)
      return { present: false, visible: false, enabled: false, instances: 0, chunks: 0, species: {}, fowMaterials: 0 };
    let fowMaterials = 0;
    c.group.traverse((o: any) => {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m?.userData?.fow) fowMaterials++;
    });
    return {
      present: true,
      visible: c.group.visible,
      enabled: c.enabled,
      instances: c.instanceCount,
      chunks: c.chunkCount,
      species: c.speciesCounts,
      fowMaterials,
    };
  });
}

test('ground cover is visible on every map family', async ({ page }) => {
  const cases = [
    '/?play=1&seed=777&fog=0&cine=1&noloop=1&civ=moche&period=2&map=coast',
    '/?play=1&seed=777&fog=0&cine=1&noloop=1&civ=inca&period=5&map=andes',
    '/?play=1&seed=777&fog=0&cine=1&noloop=1&civ=tiahuanaco&period=3&map=altiplano',
    '/?play=1&seed=777&fog=0&cine=1&noloop=1&civ=moche&period=2&map=jungle',
  ];
  for (const url of cases) {
    await boot(page, url);
    const s = await coverState(page);
    expect(s.present, url).toBe(true);
    expect(s.visible, url).toBe(true);
    expect(s.instances, url).toBeGreaterThan(500);
    expect(s.chunks, url).toBeGreaterThan(0);
    expect(
      Object.values(s.species).reduce((a, b) => a + b, 0),
      url,
    ).toBe(s.instances);
  }
});

test('ground cover is present in m1_caral and respects the fog grid', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&seed=777&fog=1&cine=1&noloop=1');
  const s = await coverState(page);
  expect(s.present).toBe(true);
  expect(s.visible).toBe(true);
  expect(s.instances).toBeGreaterThan(500);
  expect(s.fowMaterials).toBeGreaterThan(0);
});

test('low quality disables ground cover without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await boot(page, '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=moche&period=2&map=coast');
  const s = await coverState(page);
  expect(s.present).toBe(true);
  expect(s.visible).toBe(false);
  expect(s.enabled).toBe(false);
  expect(errors).toEqual([]);
});
