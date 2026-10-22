import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, period: number, civ = 'inca'): Promise<void> {
  await page.goto(`/?play=1&seed=777&fog=0&low=1&period=${period}&civ=${civ}`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

/** Spawn a building and try to queue a tech through the central guard. */
async function queueTech(page: Page, building: string, tech: string): Promise<boolean> {
  return page.evaluate(
    ({ building, tech }) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      const c = g.playerCenter(0);
      const b = g.spawnScriptedBuilding(building, 0, c.x + 12, c.z);
      g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
      g.update(1 / 60, 0); // assign the runtime context (period)
      return b.queueTech(tech);
    },
    { building, tech },
  );
}

test('techs are not offered outside their historical window (chasquis in the Republic)', async ({ page }) => {
  await boot(page, 8); // REPUBLIC
  expect(await queueTech(page, 'center', 'swift_chasquis')).toBe(false);
});

test('Inca techs are available to the Inca, not to the Spanish', async ({ page }) => {
  await boot(page, 5); // LATE_HORIZON (Inca)
  expect(await queueTech(page, 'center', 'swift_chasquis')).toBe(true);
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(true);

  await boot(page, 6); // VICEROYALTY (Spain)
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(false);
});

test('the colonial Misionero replaces the Inca Amauta after 1532', async ({ page }) => {
  await boot(page, 6); // VICEROYALTY
  expect(await queueTech(page, 'barracks', 'evangelization')).toBe(true);
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(false);

  await boot(page, 5); // LATE_HORIZON (Inca)
  expect(await queueTech(page, 'barracks', 'amauta_words')).toBe(true);
  expect(await queueTech(page, 'barracks', 'evangelization')).toBe(false);
});

test('the Misionero converts an enemy unit', async ({ page }) => {
  await boot(page, 6); // VICEROYALTY
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[1].alive = false; // freeze the AI so the enemy unit stays put
    const c = g.camera.getTarget();
    const missionary = g.spawnScriptedUnit('missionary', 0, c.x - 6, c.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, c.x, c.z);
    missionary.clearOrders();
    enemy.clearOrders();
    missionary.issueOrder({ kind: 'convert', entityId: enemy.id }, true);
    // the model must be the humanoid builder, not the structure fallback
    let humanoid = false;
    missionary.view.group.traverse((o: any) => {
      if (o.name === 'pivot:legL') humanoid = true;
    });
    const before = enemy.owner;
    let t = 0;
    for (let i = 0; i < 1500 && enemy.owner === before; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return { humanoid, before, after: enemy.owner };
  });
  expect(out.humanoid).toBe(true);
  expect(out.before).toBe(1);
  expect(out.after).toBe(0);
});

test('the research panel hides techs outside their window', async ({ page }) => {
  await boot(page, 8); // REPUBLIC
  const cards = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const c = g.playerCenter(0);
    const center = g.spawnScriptedBuilding('center', 0, c.x + 12, c.z);
    g.players[0].resources = { food: 9999, wood: 9999, silver: 9999, stone: 9999 };
    g.selectedUnits = [];
    g.selectedBuilding = center.id;
    // the HUD rebuilds the bottom panel every ~0.15 s
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
    return [...document.querySelectorAll('.ed-grid .ed-card')].map((el) => el.textContent ?? '');
  });
  // Inca chasquis is not offered in the Republic...
  expect(cards.some((t) => t.includes('Chasquis'))).toBe(false);
  // ...but a generic CENTER tech is.
  expect(cards.some((t) => t.includes('Canal de Regadío'))).toBe(true);
});
