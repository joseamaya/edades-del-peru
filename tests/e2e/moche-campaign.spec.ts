import { test, expect, Page } from '@playwright/test';

async function start(page: Page): Promise<void> {
  await page.goto('/?mission=m3_moche_recuay&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /COMENZAR MISIÓN/i }).click();
  await page.waitForTimeout(800);
}

test('m3 loads the authored Huacas de Moche site', { tag: '@smoke' }, async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const names: string[] = [];
    g.landmark?.traverse((o: any) => {
      if (o.isMesh && o.visible) names.push(o.name);
    });
    const proxy = (name: string) => {
      const p = g.landmark?.getObjectByName(name);
      return p ? { x: p.position.x, z: p.position.z } : null;
    };
    return {
      model: g.landmark?.getObjectByName('moche_site')?.name ?? null,
      procedural: g.landmark?.getObjectByName('moche_huaca')?.name ?? null,
      heritage: g.landmark?.getObjectByName('moche_huaca_luna')?.userData?.heritageId ?? null,
      anchor: g.siteAnchor,
      proxies: {
        sol: proxy('moche_huaca_sol'),
        luna: proxy('moche_huaca_luna'),
        plaza: proxy('moche_plaza'),
      },
      lunaWalkable: g.pathfinder.isWalkable(132.5, 71),
      anchorWalkable: g.pathfinder.isWalkable(g.siteAnchor.x, g.siteAnchor.z),
      names,
    };
  });
  expect(out.model).toBe('moche_site');
  expect(out.procedural).toBeNull();
  expect(out.heritage).toBe('moche_huaca_luna');
  expect(out.anchor).toEqual({ x: 123, z: 81 });
  expect(out.proxies.sol).toEqual({ x: 109.5, z: 73 });
  expect(out.proxies.luna).toEqual({ x: 132.5, z: 71 });
  expect(out.proxies.plaza).toEqual({ x: 121, z: 76 });
  expect(out.lunaWalkable).toBe(false);
  expect(out.anchorWalkable).toBe(true);
  expect(out.names.some((name) => /Moche_LOD1_(Apron|Terrain)/.test(name))).toBe(false);
});

test('m3 canal and exchange field-card buttons work', { tag: '@smoke' }, async ({ page }) => {
  await start(page);
  const bottom = page.locator('#ed-bottom');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.selectedHeritage = 'moche_canal';
    g.hud.update(0.2, 0);
  });
  await expect(bottom).toContainText('Abrir compuerta');
  await page.getByRole('button', { name: /Abrir compuerta/ }).click();
  await page.evaluate(() => (window as unknown as { game: any }).game.update(1 / 60, 0));
  expect(await page.evaluate(() => (window as unknown as { game: any }).game.isCanalOpen())).toBe(true);
  await page.evaluate(() => (window as unknown as { game: any }).game.update(1 / 60, 0));
  expect(
    await page.evaluate(() => (window as unknown as { game: any }).game.mission.getObjectiveState('obj_canal')),
  ).toBe('completed');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const anchor = g.siteAnchor as { x: number; z: number };
    for (const u of g.units.values())
      if (u.owner === 0 && !u.dead) u.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(95 / dt); i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, t);
      t += dt;
    }
    g.selectedHeritage = 'moche_huaca_luna';
    g.hud.update(0.2, 0);
  });
  await expect(bottom).toContainText('Intercambiar');
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /Intercambiar/ }).click();
    await page.evaluate(() => (window as unknown as { game: any }).game.hud.update(0.2, 0));
  }
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { game: any }).game.mission.getObjectiveState('obj_intercambio')),
    )
    .toBe('completed');
  expect(await page.evaluate(() => (window as unknown as { game: any }).game.players[0].resources.silver)).toBe(50);
});

test('m3 canal, huaca hold and elite exchange complete the mission', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const m = g.mission;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const dt = 1 / 60;
    let t = 0;
    const step = (seconds: number): void => {
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
        for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
        g.update(dt, t);
        t += dt;
      }
    };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead && u.kind === 'worker') as any;
    g.toggleCanal();
    step(0.3);
    const canal = m.getObjectiveState('obj_canal');
    worker.pos.set(g.siteAnchor.x, g.terrain.getHeight(g.siteAnchor.x, g.siteAnchor.z), g.siteAnchor.z);
    step(92);
    const hold = m.getObjectiveState('obj_huacas');
    for (let i = 0; i < 5; i++) g.makeTrade('moche_huaca_luna');
    step(0.2);
    return {
      canal,
      hold,
      trade: m.getObjectiveState('obj_intercambio'),
      silver: g.players[0].resources.silver,
      won: m.won as boolean | null,
    };
  });
  expect(out.canal).toBe('completed');
  expect(out.hold).toBe('completed');
  expect(out.trade).toBe('completed');
  expect(out.silver).toBe(50);
  expect(out.won).toBe(true);
});

test('m3 tutorial waits for the canal and huaca gates', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead && u.kind === 'worker') as any;
    const dt = 1 / 60;
    let t = 0;
    const step = (seconds: number): void => {
      for (let i = 0; i < Math.ceil(seconds / dt); i++) {
        g.update(dt, t);
        t += dt;
      }
    };
    step(2);
    const first = g.tutorial?.toSave().stepId ?? null;
    g.selectedUnits = [worker.id];
    step(0.2);
    const selected = g.tutorial?.toSave().stepId ?? null;
    g.toggleCanal();
    step(0.3);
    const canal = g.tutorial?.toSave().stepId ?? null;
    return { first, selected, canal };
  });
  expect(out.first).toBe('select');
  expect(out.selected).toBe('canal');
  expect(out.canal).toBe('plaza');
});
