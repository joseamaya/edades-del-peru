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

test('m2 loads the authored Chavín site and its phased kit without the CyArk Lanzón', async ({ page }) => {
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
      phase: g.sitePhase,
      kit: !!g.chavinCity,
      siteVisible: landmark.getObjectByName('chavin_site')?.visible,
      hidden,
      materials: [...materials],
    };
  });
  expect(out.model).toBe('chavin_site');
  expect(out.anchor).toEqual({ x: 98, z: 87.5 });
  expect(out.center?.x).toBeCloseTo(0.51 * 192, 5);
  expect(out.center?.z).toBeCloseTo(0.456 * 192, 5);
  expect(out.phase).toBe('old_temple_foundation');
  expect(out.kit).toBe(true);
  expect(out.siteVisible).toBe(false);
  expect(Object.values(out.hidden).length).toBeGreaterThan(0);
  expect(Object.values(out.hidden).every((visible) => visible === false)).toBe(true);
  expect(out.materials.some((name) => /Lanzon_Scan/.test(name))).toBe(false);
});

test('m2 plays the four acts from the offering to the documented decline', async ({ page }) => {
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
    let t = 0;
    const tick = (seconds: number) => {
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        document.querySelector('.ed-mission-card')?.remove();
        worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
        for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
        for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
        g.update(dt, t);
        t += dt;
      }
    };
    const phases: string[] = [g.sitePhase];
    const recordPhase = () => {
      if (phases[phases.length - 1] !== g.sitePhase) phases.push(g.sitePhase);
    };
    tick(5);
    // Act I: reach and first offering.
    m.recordDelivery('silver', 50);
    m.recordDelivery('silver', 50);
    tick(2);
    const actI = { offer: m.getObjectiveState('a1_ofrenda') };
    // Act II: Old Temple, fair and pilgrimage.
    m.recordDelivery('stone', 50);
    m.recordDelivery('stone', 50);
    m.recordDelivery('stone', 50);
    tick(2);
    recordPhase();
    g.spawnScriptedBuilding('market', 0, anchor.x, anchor.z + 34);
    tick(2);
    tick(61);
    recordPhase();
    // Act III: New Temple, research and great pilgrimage.
    m.recordDelivery('stone', 50);
    m.recordDelivery('stone', 50);
    m.recordDelivery('stone', 50);
    m.recordDelivery('stone', 50);
    tick(2);
    recordPhase();
    g.players[0].techs.add('chavin_pilgrimage');
    tick(2);
    tick(91);
    recordPhase();
    // Act IV: tour the centre's record.
    for (const id of [
      'chavin_plaza_circular',
      'chavin_edificio_b',
      'chavin_edificio_a',
      'chavin_portada',
      'chavin_galeria',
    ]) {
      g.visitHeritage(id);
    }
    tick(2);
    return {
      actI,
      phases,
      won: m.won,
      ended: m.ended,
      states: Object.fromEntries(m.def.objectives.map((o: any) => [o.id, m.getObjectiveState(o.id)])),
    };
  });
  expect(out.actI.offer).toBe('completed');
  expect(out.phases).toEqual(['old_temple_foundation', 'old_temple', 'new_temple_foundation', 'new_temple', 'apogee']);
  expect(out.states.a2_peregrinaje).toBe('completed');
  expect(out.states.a2_feria).toBe('completed');
  expect(out.states.a3_intercambio).toBe('completed');
  expect(out.states.a4_registro).toBe('completed');
  expect(out.won).toBe(true);
  expect(out.ended).toBe(true);
});

test('m2 briefing hides later acts and the tutorial starts with nine non-blocking steps', async ({ page }) => {
  await page.goto(URL);
  const briefing = page.locator('.ed-overlay', { hasText: 'El Oráculo de Chavín' });
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await expect(briefing).not.toContainText('Recibe a los peregrinos');
  await expect(briefing).not.toContainText('Abre la feria');
  await expect(briefing).toContainText('Entrega 100 de plata');
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const tutorial = page.locator('#ed-tutorial');
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 9');

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.start();
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    g.selectedUnits = [worker.id];
  });
  await expect(tutorial).toContainText('Lleva un obrero', { timeout: 10_000 });

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    g.update(1 / 60, 0);
  });
  await expect(tutorial).toContainText('entrega una ofrenda', { timeout: 10_000 });
});
