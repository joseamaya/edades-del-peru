import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page, period = 7): Promise<void> {
  await page.goto(`/?play=1&seed=777&fog=0&low=1&noloop=1&civ=realistas&period=${period}`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('post-1532 infantry, ranged and missionary classes use the shared rig', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const spawn = (kind: string, i: number) => g.spawnScriptedUnit(kind, 0, c.x + 4 + i * 2, c.z + 4);
    const soldier = spawn('soldier', 0);
    const ranged = spawn('musketeer', 1);
    const missionary = spawn('missionary', 2);
    const read = (u: any) => ({
      rig: !!u.rig,
      variant: u.rig?.variantId ?? null,
      coat: !!u.rig?.root.getObjectByName('attire_post_coat'),
      hat: !!u.rig?.root.getObjectByName('attire_post_hat'),
      hatType: u.rig?.root.getObjectByName('attire_post_hat')?.userData.hat ?? null,
      weapon: !!u.rig?.root.getObjectByName('attire_post_weapon'),
      cross: !!u.rig?.root.getObjectByName('attire_post_cross'),
      sword: !!u.rig?.root.getObjectByName('attire_post_sword'),
    });
    return { soldier: read(soldier), ranged: read(ranged), missionary: read(missionary) };
  });
  expect(result.soldier).toMatchObject({ rig: true, coat: true, hat: true, weapon: true, sword: true, cross: false });
  expect(result.soldier.variant).toMatch(/^realistas_bicorn_soldier_[fm]$/);
  expect(result.soldier.hatType).toBe('bicorn');
  expect(result.ranged).toMatchObject({ rig: true, weapon: true });
  expect(result.ranged.variant).toMatch(/^realistas_bicorn_ranged_[fm]$/);
  expect(result.missionary).toMatchObject({ rig: true, cross: true, weapon: false, sword: false });
  expect(result.missionary.variant).toMatch(/^realistas_bicorn_missionary_[fm]$/);
});

test('a Viceroyalty skirmish keeps the morion', async ({ page }) => {
  await boot(page, 6);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const soldier = g.spawnScriptedUnit('soldier', 0, c.x + 6, c.z + 4);
    return {
      variant: soldier.rig?.variantId ?? null,
      hatType: soldier.rig?.root.getObjectByName('attire_post_hat')?.userData.hat ?? null,
    };
  });
  expect(result.variant).toMatch(/^realistas_soldier_[fm]$/);
  expect(result.hatType).toBe('morion');
});

test('m7 Túpac Amaru gives the realista enemy the bicorn', async ({ page }) => {
  await page.goto('/?mission=m7_tupac_amaru&intro=0&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.playerCenter(0);
    const soldier = g.spawnScriptedUnit('soldier', 1, c.x + 6, c.z + 4);
    return {
      variant: soldier.rig?.variantId ?? null,
      hatType: soldier.rig?.root.getObjectByName('attire_post_hat')?.userData.hat ?? null,
    };
  });
  expect(result.variant).toMatch(/^realistas_bicorn_soldier_[fm]$/);
  expect(result.hatType).toBe('bicorn');
});
