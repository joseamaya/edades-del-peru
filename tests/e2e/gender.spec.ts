import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('procedural units get deterministic male/female variants', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page, '/?play=1&civ=moche&period=2&seed=777&fog=0&low=1&noloop=1');
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 20, base.z + 20, 18);
    const workers = [];
    for (let i = 0; i < 6; i++) workers.push(g.spawnScriptedUnit('worker', 0, c.x + i, c.z + i));
    const info = workers.map((u: any) => {
      let verts = 0;
      u.view.group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) verts += o.geometry.attributes.position.count;
      });
      return { gender: u.gender, verts };
    });
    return { info };
  });
  expect(result.info.some((row: any) => row.gender === 'female')).toBe(true);
  expect(result.info.some((row: any) => row.gender === 'male')).toBe(true);
  const female = result.info.find((row: any) => row.gender === 'female');
  const male = result.info.find((row: any) => row.gender === 'male');
  expect(female.verts).not.toBe(male.verts);
  expect(errors).toEqual([]);
});

test('the Caral opening cast mixes rigged female and male variants', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page, '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1');
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 20, base.z + 20, 18);
    const units = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead);
    for (let i = 0; i < 6; i++) units.push(g.spawnScriptedUnit('worker', 0, c.x + i, c.z + i));
    return units
      .filter((u: any) => u.kind === 'worker' || u.kind === 'scout')
      .map((u: any) => ({ kind: u.kind, gender: u.gender, variant: u.rig?.variantId ?? null }));
  });
  expect(result.some((row: any) => row.gender === 'female' && row.variant?.endsWith('_f'))).toBe(true);
  expect(result.some((row: any) => row.gender === 'male' && row.variant?.endsWith('_m'))).toBe(true);
  expect(result.every((row: any) => row.variant === null || row.variant.endsWith(`_${row.gender[0]}`))).toBe(true);
  expect(errors).toEqual([]);
});
