import { test, expect, Page } from '@playwright/test';

/** The scripted match every run executes: gather, train, then place a house. */
async function scriptedRun(page: Page, capture: boolean, steps = 900): Promise<number> {
  return page.evaluate(
    ({ capture, steps }) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      g.paused = false;
      const node = [...g.resourceNodes.values()].find((x: any) => !x.dead && x.resource === 'wood');
      const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker');
      const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
      let t = 0;
      for (let i = 0; i < steps; i++) {
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
        if (i === 200 && center) {
          const spot = g.findFreeSpot(center.pos.x + 10, center.pos.z, 4);
          if (spot) g.executeCommand({ kind: 'place', building: 'house', x: spot.x, z: spot.z });
        }
        g.update(1 / 60, t);
        t += 1 / 60;
      }
      const hash = g.stateHash();
      if (capture) (window as unknown as { __replay: unknown }).__replay = g.exportReplay();
      return hash;
    },
    { capture, steps },
  );
}

async function bootMatch(page: Page): Promise<void> {
  await page.goto('/?seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

async function seedStoredReplay(page: Page): Promise<void> {
  await bootMatch(page);
  await scriptedRun(page, true);
  await page.evaluate(() => {
    const w = window as unknown as { __replay: unknown };
    localStorage.setItem('peru-replay', JSON.stringify(w.__replay));
  });
}

test('the same seed and commands produce the same state', async ({ page }) => {
  await bootMatch(page);
  const first = await scriptedRun(page, false);
  await bootMatch(page);
  const second = await scriptedRun(page, false);
  expect(first).toBe(second);
});

test('a recorded replay reproduces the match', async ({ page }) => {
  await bootMatch(page);
  const recorded = await scriptedRun(page, true);
  const commands = await page.evaluate(() => {
    const w = window as unknown as { __replay: { commands: unknown[] } };
    localStorage.setItem('peru-replay', JSON.stringify(w.__replay));
    return w.__replay.commands.length;
  });
  expect(commands).toBeGreaterThan(0);

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
  expect(replayed.hash).toBe(recorded);
});

test('live input is ignored during replay playback', async ({ page }) => {
  await seedStoredReplay(page);
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
  await seedStoredReplay(page);
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
