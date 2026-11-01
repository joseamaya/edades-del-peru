import { test, expect, Page } from '@playwright/test';

const CHECKPOINTS = [300, 600, 900];

interface RunResult {
  hash: number;
  checkpoints: Record<number, number>;
}

/**
 * The scripted match every run executes: gather, train, then place a house.
 * `batch` groups steps into frames, as the real loop does; each step still gets
 * deterministic simulation time from the step counter.
 */
async function scriptedRun(page: Page, capture: boolean, steps = 900, batch = 1): Promise<RunResult> {
  return page.evaluate(
    ({ capture, steps, batch, checkpoints }) => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      g.paused = false;
      const node = [...g.resourceNodes.values()].find((x: any) => !x.dead && x.resource === 'wood');
      const workers = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker');
      const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
      const marks = new Set<number>(checkpoints);
      const snapshots: Record<number, number> = {};
      let step = 0;
      while (step < steps) {
        for (let j = 0; j < batch && step < steps; j++, step++) {
          if (step === 30 && node) {
            for (const w of workers) {
              g.executeCommand({
                kind: 'order',
                unitIds: [w.id],
                order: { kind: 'gather', entityId: node.id },
                clear: true,
              });
            }
          }
          if (step === 120 && center) g.executeCommand({ kind: 'train', buildingId: center.id, unit: 'worker' });
          if (step === 200 && center) {
            const spot = g.findFreeSpot(center.pos.x + 10, center.pos.z, 4);
            if (spot) g.executeCommand({ kind: 'place', building: 'house', x: spot.x, z: spot.z });
          }
          const next = step + 1;
          g.update(1 / 60, step / 60);
          if (marks.has(next)) snapshots[next] = g.stateHash();
        }
      }
      if (capture) (window as unknown as { __replay: unknown }).__replay = g.exportReplay();
      return { hash: g.stateHash(), checkpoints: snapshots };
    },
    { capture, steps, batch, checkpoints: CHECKPOINTS },
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
  expect(second.checkpoints).toEqual(first.checkpoints);
  expect(second.hash).toBe(first.hash);
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
  const replayed = await page.evaluate((checkpoints) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const marks = new Set<number>(checkpoints);
    const snapshots: Record<number, number> = {};
    for (let i = 0; i < 900; i++) {
      g.update(1 / 60, i / 60);
      if (marks.has(i + 1)) snapshots[i + 1] = g.stateHash();
    }
    return { hash: g.stateHash(), checkpoints: snapshots, active: g.replayActive };
  }, CHECKPOINTS);

  expect(replayed.active).toBe(true);
  expect(replayed.checkpoints).toEqual(recorded.checkpoints);
  expect(replayed.hash).toBe(recorded.hash);
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

test('the same steps hash equally when frames are batched 1 vs 8', async ({ page }) => {
  await bootMatch(page);
  const one = await scriptedRun(page, false, 900, 1);
  await bootMatch(page);
  const eight = await scriptedRun(page, false, 900, 8);
  expect(eight.checkpoints).toEqual(one.checkpoints);
  expect(eight.hash).toBe(one.hash);
});
