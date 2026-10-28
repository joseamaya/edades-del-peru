import { test, expect } from '@playwright/test';

async function waitReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game?: any }).game;
      return !!g && g.units.size > 0 && g.buildings.size > 0;
    },
    null,
    { timeout: 15_000 },
  );
}

test('saves from the pause menu and resumes from the main menu', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await waitReady(page);

  // pause (P) and save from the pause panel
  const before = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return { units: g.units.size, buildings: g.buildings.size };
  });
  await page.keyboard.press('p');
  const save = page.getByRole('button', { name: /Guardar partida/ });
  await save.waitFor({ timeout: 10_000 });
  await save.click();
  expect(await page.evaluate(() => localStorage.getItem('peru-save') !== null)).toBe(true);

  // the main menu offers "Continuar", which reloads into the saved match
  await page.goto('/?menu=1');
  const cont = page.getByRole('button', { name: /Continuar partida/ });
  await cont.waitFor({ timeout: 10_000 });
  await cont.click();
  await waitReady(page);
  expect(new URL(page.url()).searchParams.get('load')).toBe('1');
  const after = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    return { units: g.units.size, buildings: g.buildings.size };
  });
  expect(after).toEqual(before);
});
