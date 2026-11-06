import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page, civ: string, period = 2): Promise<void> {
  await page.goto(`/?play=1&civ=${civ}&period=${period}&seed=777&fog=0&low=1&noloop=1`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

async function spawnBarracks(page: Page): Promise<number> {
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    g.players[0].populationCap = 200;
    const c = g.playerCenter(0);
    const barracks = g.spawnScriptedBuilding('barracks', 0, c.x + 10, c.z + 2);
    g.selectedUnits = [];
    g.selectedBuilding = barracks.id;
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
    return barracks.id;
  });
}

test('a civ trains its unique unit and the codex cites it', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, 'moche');
  const barracksId = await spawnBarracks(page);
  const result = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    const cards = [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
    return {
      showsMocheWarrior: cards.some((text) => text.includes('Guerrero Moche')),
      trainsOwn: g.trainUnit(id, 'moche_warrior'),
      trainsForeign: g.trainUnit(id, 'inca_warrior'),
    };
  }, barracksId);
  expect(result.showsMocheWarrior).toBe(true);
  expect(result.trainsOwn).toBe(true);
  expect(result.trainsForeign).toBe(false);

  await page.evaluate(() => (window as unknown as { game: any }).game.hud.showCodex());
  const codex = page.locator('#ed-codex');
  await expect(codex).toBeVisible();
  await codex.getByRole('button', { name: /Civilizaciones/ }).click();
  await codex.locator('.ed-codex-nav').getByRole('button', { name: 'Cultura Moche' }).click();
  await expect(codex.locator('.ed-codex-content')).toContainText('Guerrero Moche');
  await expect(codex.locator('.ed-codex-content')).toContainText('Metalurgia Moche');
  await expect(codex.locator('.ed-codex-content')).toContainText('docs/historia/civilizaciones/moche.md');
});

test('another civ cannot train or see the unique unit', async ({ page }) => {
  await boot(page, 'recuay');
  const barracksId = await spawnBarracks(page);
  const result = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    const cards = [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
    return {
      showsMocheWarrior: cards.some((text) => text.includes('Guerrero Moche')),
      trainsForeign: g.trainUnit(id, 'moche_warrior'),
    };
  }, barracksId);
  expect(result.showsMocheWarrior).toBe(false);
  expect(result.trainsForeign).toBe(false);
});

test('Wari trains its unique guardian', async ({ page }) => {
  await page.goto('/?play=1&civ=wari&period=3&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const barracksId = await spawnBarracks(page);
  const result = await page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    const cards = [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
    return { shows: cards.some((text) => text.includes('Guardián Wari')), trains: g.trainUnit(id, 'wari_guardian') };
  }, barracksId);
  expect(result.shows).toBe(true);
  expect(result.trains).toBe(true);
});

test('a tech-only civ sees its unique technology', async ({ page }) => {
  await page.goto('/?play=1&civ=caral&period=0&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const cards = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    const c = g.playerCenter(0);
    const center = g.spawnScriptedBuilding('center', 0, c.x + 10, c.z + 2);
    g.selectedUnits = [];
    g.selectedBuilding = center.id;
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
    return [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
  });
  expect(cards.some((text) => text.includes('Trueque Interregional'))).toBe(true);
});

test('chapter II civs train their unique units', async ({ page }) => {
  for (const [civ, name, kind] of [
    ['chanca', 'Guerrero Chanca', 'chanca_warrior'],
    ['chimu', 'Fixi Chimú', 'chimu_fixi'],
  ] as const) {
    await boot(page, civ, 4);
    const barracksId = await spawnBarracks(page);
    const result = await page.evaluate(
      ({ id, label, unit }) => {
        const g = (window as unknown as { game: any }).game;
        const cards = [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
        return { shows: cards.some((text) => text.includes(label)), trains: g.trainUnit(id, unit) };
      },
      { id: barracksId, label: name, unit: kind },
    );
    expect(result.shows, `${civ} card`).toBe(true);
    expect(result.trains, `${civ} training`).toBe(true);
  }
});
