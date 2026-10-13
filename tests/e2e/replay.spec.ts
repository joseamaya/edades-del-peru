import { test, expect, Page } from '@playwright/test';

/** The scripted match both runs execute: gather at step 30, train a worker at 120. */
async function scriptedRun(page: Page, steps = 900): Promise<number> {
  return page.evaluate((n) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const node = [...g.resourceNodes.values()].find((x: any) => !x.dead && x.resource === 'wood');
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker');
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    let t = 0;
    for (let i = 0; i < n; i++) {
      if (i === 30 && node) {
        for (const w of workers) {
          g.executeCommand({
            kind: 'order',
            unitIds: [w.id],
            order: { kind: 'gather', entityId: node.id },
            clear: true,
          });
        }
      }
      if (i === 120 && center) g.executeCommand({ kind: 'train', buildingId: center.id, unit: 'worker' });
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return g.stateHash();
  }, steps);
}

test('the same seed and commands produce the same state', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const first = await scriptedRun(page);

  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const second = await scriptedRun(page);

  expect(first).toBe(second);
});

test('a recorded replay reproduces the match', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const recorded = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const node = [...g.resourceNodes.values()].find((x: any) => !x.dead && x.resource === 'wood');
    const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker');
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    let t = 0;
    for (let i = 0; i < 900; i++) {
      if (i === 30 && node) {
        for (const w of workers) {
          g.executeCommand({
            kind: 'order',
            unitIds: [w.id],
            order: { kind: 'gather', entityId: node.id },
            clear: true,
          });
        }
      }
      if (i === 120 && center) g.executeCommand({ kind: 'train', buildingId: center.id, unit: 'worker' });
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    const replay = g.exportReplay();
    localStorage.setItem('peru-replay', JSON.stringify(replay));
    return { hash: g.stateHash(), commands: replay?.commands.length ?? 0 };
  });
  expect(recorded.commands).toBeGreaterThan(0);

  await page.goto('/?replay=1&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const replayed = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    let t = 0;
    for (let i = 0; i < 900; i++) {
      g.update(1 / 60, t);
      t += 1 / 60;
    }
    return { hash: g.stateHash(), active: g.replayActive };
  });

  expect(replayed.active).toBe(true);
  expect(replayed.hash).toBe(recorded.hash);
});

test('live input is ignored during replay playback', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.update(1 / 60, 0);
    localStorage.setItem('peru-replay', JSON.stringify(g.exportReplay()));
  });
  await page.goto('/?replay=1&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const accepted = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    return g.executeCommand({ kind: 'stop', unitIds: [worker.id] });
  });
  expect(accepted).toBe(false);
});

test('the main menu offers the last replay and plays it', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.update(1 / 60, 0);
    localStorage.setItem('peru-replay', JSON.stringify(g.exportReplay()));
  });

  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const btn = page.locator('button', { hasText: 'Ver última repetición' });
  await expect(btn).toBeVisible();
  await btn.click();
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.replayActive === true, null, {
    timeout: 30_000,
  });
  expect(new URL(page.url()).searchParams.get('replay')).toBe('1');
});
