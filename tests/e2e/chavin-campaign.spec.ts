import { expect, test, type Page } from '@playwright/test';

const URL = '/?mission=m2_chavin&seed=900&fog=0&low=1&noloop=1&intro=0';

async function startMission(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const overlay = page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
}

test('m2 loads the authored Chavín site without the CyArk Lanzón', async ({ page }) => {
  await page.goto(URL);
  await startMission(page);
  await page.waitForFunction(
    () => (window as unknown as { game?: any }).game?.landmark?.getObjectByName?.('chavin_site') !== undefined,
    null,
    { timeout: 30_000 },
  );
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const landmark = g.landmark;
    const hidden: Record<string, boolean> = {};
    const materials = new Set<string>();
    landmark.traverse((object: any) => {
      if (object.isMesh) {
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) if (material?.name) materials.add(material.name);
        if (/Terrain|Reference/.test(object.name)) hidden[object.name] = object.visible;
      }
    });
    return {
      model: landmark.getObjectByName('chavin_site')?.name ?? null,
      anchor: g.siteAnchor,
      center: g.siteCenter,
      hidden,
      materials: [...materials],
    };
  });
  expect(out.model).toBe('chavin_site');
  expect(out.anchor).toEqual({ x: 98, z: 87.5 });
  expect(out.center?.x).toBeCloseTo(0.51 * 192, 5);
  expect(out.center?.z).toBeCloseTo(0.456 * 192, 5);
  expect(Object.values(out.hidden).length).toBeGreaterThan(0);
  expect(Object.values(out.hidden).every((visible) => visible === false)).toBe(true);
  expect(out.materials.some((name) => /Lanzon_Scan/.test(name))).toBe(false);
});

test('m2 offering flow opens the pilgrimage and completes the mission', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(URL);
  await startMission(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const m = g.mission;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    g.visitHeritage('chavin_edificio_b');
    const offers = [];
    for (let i = 0; i < 5; i++) offers.push(g.makeOffering('chavin_edificio_b'));
    g.update(1 / 60, 0);
    const afterOffers = {
      offers,
      progress: m.getObjectiveProgress('obj_ofrendas'),
      state: m.getObjectiveState('obj_ofrendas'),
      pilgrimage: m.getObjectiveState('obj_peregrinaje'),
      feria: m.getObjectiveState('obj_feria'),
      silver: g.players[0].resources.silver,
    };
    g.spawnScriptedBuilding('market', 0, anchor.x, anchor.z + 34);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(500 / dt) && !m.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
      g.update(dt, t);
      t += dt;
    }
    return {
      afterOffers,
      won: m.won,
      ended: m.ended,
      states: Object.fromEntries(m.def.objectives.map((o: any) => [o.id, m.getObjectiveState(o.id)])),
    };
  });
  expect(out.afterOffers.offers).toEqual([true, true, true, true, true]);
  expect(out.afterOffers.progress).toEqual({ current: 250, target: 250, format: 'count' });
  expect(out.afterOffers.state).toBe('completed');
  expect(out.afterOffers.pilgrimage).toBe('activo');
  expect(out.afterOffers.feria).toBe('activo');
  expect(out.afterOffers.silver).toBe(50);
  expect(out.states.obj_peregrinaje).toBe('completed');
  expect(out.states.obj_feria).toBe('completed');
  expect(out.states.obj_sostener).toBe('completed');
  expect(out.won).toBe(true);
  expect(out.ended).toBe(true);
});

test('m2 shows its own tutorial and hides the two staged goals from the briefing', async ({ page }) => {
  await page.goto(URL);
  const briefing = page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' });
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await expect(briefing).not.toContainText('Recibe a los peregrinos');
  await expect(briefing).not.toContainText('Abre la feria');
  await expect(briefing).toContainText('Entrega 250 de plata');
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const tutorial = page.locator('#ed-tutorial');
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 5');
});
