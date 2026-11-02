import { test, expect } from '@playwright/test';

interface Checkpoint {
  step: number;
  hash: number;
}

async function configure(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.ais.length = 0;
    g.addAI(0, 'normal');
    g.addAI(1, 'normal');
  });
}

async function run(page: import('@playwright/test').Page, steps: number): Promise<Checkpoint[]> {
  return page.evaluate((count) => {
    const g = (window as unknown as { game: any }).game;
    const marks = new Set([300, 600, count]);
    const out: Checkpoint[] = [{ step: 0, hash: g.stateHash() }];
    for (let i = 0; i < count; i++) {
      g.update(1 / 60, i / 60);
      if (marks.has(i + 1)) out.push({ step: i + 1, hash: g.stateHash() });
    }
    return out;
  }, steps);
}

test('the headless simulation matches the browser state hash', { tag: '@smoke' }, async ({ browser }) => {
  const browserPage = await browser.newPage();
  const headlessPage = await browser.newPage();
  await browserPage.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await browserPage.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const settings = await browserPage.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return JSON.parse(JSON.stringify(g.settings));
  });

  await headlessPage.goto('/?probe=1');
  await headlessPage.waitForFunction(
    () => (window as unknown as { __createHeadlessGame?: unknown }).__createHeadlessGame !== undefined,
  );
  await headlessPage.evaluate((raw) => {
    const create = (window as unknown as { __createHeadlessGame: (settings: unknown) => unknown }).__createHeadlessGame;
    create(raw);
  }, settings);

  await configure(browserPage);
  await configure(headlessPage);
  const steps = 600;
  const [browserHashes, headlessHashes] = await Promise.all([run(browserPage, steps), run(headlessPage, steps)]);
  expect(headlessHashes).toEqual(browserHashes);
  expect(new Set(headlessHashes.map((checkpoint) => checkpoint.hash)).size).toBeGreaterThan(1);
  await browserPage.close();
  await headlessPage.close();
});
