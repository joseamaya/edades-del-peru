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
    return {
      model: g.landmark?.getObjectByName('moche_site')?.name ?? null,
      procedural: g.landmark?.getObjectByName('moche_huaca')?.name ?? null,
      heritage: g.landmark?.getObjectByName('moche_huaca_luna')?.userData?.heritageId ?? null,
      anchor: g.siteAnchor,
      names,
    };
  });
  expect(out.model).toBe('moche_site');
  expect(out.procedural).toBeNull();
  expect(out.heritage).toBe('moche_huaca_luna');
  expect(out.anchor).toEqual({ x: 121, z: 85 });
  expect(out.names.some((name) => /Moche_LOD1_(Apron|Terrain)/.test(name))).toBe(false);
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
    g.players[0].resources.silver = 500;
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
  expect(out.silver).toBe(250);
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
