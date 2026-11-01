import { test, expect } from '@playwright/test';

test('the idle-worker counter cycles and selects all', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const initial = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.hud.update(0.2, 0);
    return { idle: g.idleWorkerIds(), text: document.querySelector('#ed-idle')?.textContent ?? '' };
  });
  expect(initial.idle.length, 'the human opening workers start idle').toBeGreaterThanOrEqual(2);
  expect(initial.text).toContain(String(initial.idle.length));

  await page.keyboard.press('.');
  const first = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const unit = g.units.get(g.selectedUnits[0]);
    return {
      id: unit?.id,
      kind: unit?.kind,
      target: g.camera.getTarget(),
      pos: unit ? { x: unit.pos.x, z: unit.pos.z } : null,
    };
  });
  expect(first.kind).toBe('worker');
  expect(first.target.x).toBeCloseTo(first.pos!.x, 0);
  expect(first.target.z).toBeCloseTo(first.pos!.z, 0);

  await page.keyboard.press('.');
  const second = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { id: g.selectedUnits[0] };
  });
  expect(second.id).not.toBe(first.id);

  await page.keyboard.press('Control+.');
  const all = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { selected: g.selectedUnits.length, idle: g.idleWorkerIds().length };
  });
  expect(all.selected).toBe(all.idle);
});

test('busy workers are not counted as idle', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const before = g.idleWorkerIds().length;
    const worker = g.units.get(g.idleWorkerIds()[0]);
    const node = [...g.resourceNodes.values()].find((n: any) => !n.dead);
    worker.issueOrder({ kind: 'gather', entityId: node.id });
    return { before, after: g.idleWorkerIds().length, included: g.idleWorkerIds().includes(worker.id) };
  });
  expect(out.before).toBeGreaterThan(0);
  expect(out.after).toBe(out.before - 1);
  expect(out.included).toBe(false);
});
