import { test, expect, type BrowserContext } from '@playwright/test';
import { tutorialForMission } from '../../src/campaign/defs/tutorials';

const tutorialSteps = (id: string): number => tutorialForMission(id)?.steps.length ?? 0;

/** Missions with a narrated intro open with the cinematic before the briefing; skip it. */
async function skipMissionIntro(page: import('@playwright/test').Page): Promise<void> {
  const skip = page.locator('.ed-cinematic-skip');
  await skip.waitFor({ state: 'visible', timeout: 30_000 });
  await skip.click();
}

test('starting a campaign from the menu launches the selected mission', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  await page.getByRole('button', { name: /Jugar La Ciudad Sagrada/ }).click();
  await expect(page.locator('.ed-cinematic', { hasText: 'Gente del mar' })).toBeVisible({ timeout: 30_000 });
  await skipMissionIntro(page);
  await expect(page.locator('.ed-briefing', { hasText: 'La Ciudad Sagrada' })).toBeVisible({ timeout: 30_000 });
  const url = new URL(page.url());
  expect(url.searchParams.get('menu')).toBeNull();
  expect(url.searchParams.get('mission')).toBe('m1_caral');
  expect(url.searchParams.get('play')).toBe('1');
});

test('shows the campaign hub and its replayable prologue', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const hub = page.locator('.ed-campaign-panel');
  await expect(hub).toBeVisible();
  await expect(hub).toContainText('Culturas Preincas');
  await expect(hub.getByRole('button', { name: /Jugar La Ciudad Sagrada/ })).toBeVisible();
  await expect(hub).toContainText('La Independencia');
  await expect(hub).toContainText('La República');
  // A fresh profile opens Caral and the released opening of La Independencia; the rest stay locked.
  await expect(hub.locator('.ed-campaign-card[data-campaign="independencia"]')).toBeEnabled();
  await expect(hub.locator('.ed-campaign-card[data-campaign="republica"]')).toBeDisabled();
  await expect(hub.getByRole('button', { name: /Jugar El Oráculo de Chavín/ })).toHaveCount(0);
  await expect(hub).toContainText('Completa «La Ciudad Sagrada» para desbloquear esta misión.');

  await hub.getByRole('button', { name: /Prólogo: Culturas Preincas/ }).click();
  const intro = page.locator('.ed-cinematic', { hasText: 'CULTURAS PREINCAS' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('una de las primeras civilizaciones del mundo');
  await intro.getByRole('button', { name: /Volver a campañas/ }).click();
  await expect(hub).toBeVisible();
});

test('the mission briefing includes context and sources', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&cardhold=1');
  await skipMissionIntro(page);
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('Contexto');
  await expect(overlay).toContainText('¿Sabías que…?');
  await expect(overlay.getByText('Fuentes históricas')).toBeVisible();
  await expect(overlay).toContainText('Acto I · Reúne 300 de comida');
  // later acts are discoveries, not spoiled here
  await expect(overlay).not.toContainText('Acto II');
  await expect(overlay).not.toContainText('Acto III ·');
  await expect(overlay).not.toContainText('Recorre los seis');
  await expect(overlay).not.toContainText('Convoca una asamblea');
});

test('the codex opens with periods, civilizations and dossiers', async ({ page }) => {
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Códice/ }).click();
  const codex = page.locator('#ed-codex');
  await expect(codex).toBeVisible();
  await expect(codex).toContainText('Códice del Perú');
  await codex.getByRole('button', { name: /Civilizaciones/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('Caral-Supe');
  await codex.getByRole('button', { name: /Campañas/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('La Ciudad Sagrada');
  await expect(codex.locator('.ed-codex-nav')).toContainText('El Oráculo de Chavín');
  await expect(codex.locator('.ed-codex-nav')).toContainText('La Frontera de los Valles');
  await expect(codex.locator('.ed-codex-nav')).toContainText('El Horizonte Medio');
  await codex.getByRole('button', { name: /Dossiers/ }).click();
  await expect(codex.locator('.ed-codex-content')).toContainText('Fuentes');
});

test('every campaign mission shows its educational epilogue on victory', async ({ context }) => {
  for (const mission of [
    'm2_chavin',
    'm3_moche_recuay',
    'm4_wari',
    'm_tambotoco',
    'm5_yahuar_pampa',
    'm6_chimu_inca',
    'm6b_guerra_civil',
    'm_lima',
    'm7_tupac_amaru',
    'm_junta_cusco',
    'm8_independencia',
    'm9_guerra_pacifico',
  ]) {
    const page = await context.newPage();
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
    const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
    await expect(victory).toBeVisible({ timeout: 15_000 });
    await expect(victory).toContainText('Epílogo');
    await expect(victory).toContainText('Códice');
    await page.close();
  }
});

test('the tutorial guides in the first mission', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&intro=0');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  const tutorial = page.locator('#ed-tutorial');
  // the first step appears after the card and the ~2.6s opening flight
  await expect(tutorial).toBeVisible({ timeout: 60_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText(`Paso 1 / ${tutorialSteps('m1_caral')}`);
});

test('the chapter card freezes the mission clock and shows the full subtitle', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&cardhold=1');
  await skipMissionIntro(page);
  const briefing = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const card = page.locator('.ed-mission-card');
  await expect(card).toBeVisible({ timeout: 60_000 });
  const subtitle = card.locator('.place');
  await expect(subtitle).toContainText('pescadores de anchoveta tejen sus redes con algodón');
  expect((await subtitle.textContent()) ?? '').not.toContain('…');
  await expect(page.locator('#ed-objectives'), 'objectives stay hidden behind the card').toBeHidden();

  await page.waitForTimeout(2500);
  const held = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return { timer: g.mission?.timer ?? 0, paused: g.getPaused() };
  });
  expect(held.timer, 'the mission clock must not run behind the card').toBe(0);

  await page.evaluate(() => document.querySelector<HTMLElement>('.ed-mission-card')?.click());
  const justClosed = await page.evaluate(() => (window as unknown as { game: any }).game.mission?.timer ?? 0);
  expect(justClosed, 'the timer starts at 0:00 when the card closes').toBeLessThan(0.5);
  await expect(page.locator('#ed-objectives'), 'objectives appear after the card').toBeVisible();
  await page.waitForTimeout(4000);
  const running = await page.evaluate(() => (window as unknown as { game: any }).game.mission?.timer ?? 0);
  expect(running, 'the timer resumes after the card and the opening flight').toBeGreaterThan(0);
});

test('Caral guarantees coastal fishing grounds for the tutorial', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const fish = [...g.resourceNodes.values()].filter((n: any) => n.kind === 'fishing' && !n.dead) as any[];
    const sea = fish.filter((n: any) => n.pos.x < 30);
    return { count: fish.length, sea: sea.length };
  });
  expect(state.count, 'the guaranteed supply is eight checked banks').toBeGreaterThanOrEqual(8);
  expect(state.sea, 'the coast of Áspero has its own banks, not only the river').toBeGreaterThanOrEqual(3);
});

test('the Caral mission closes with a narrative epilogue, not a quiz', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // Complete every act; the victory screen is what this test checks.
    for (const o of g.mission.def.objectives) if (!o.optional) g.mission.objState.set(o.id, 'completed');
    const m = g.mission;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(5 / dt) && !m.ended; i++) {
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    return m.won;
  });
  const victory = page.locator('.ed-overlay', { hasText: 'VICTORIA' });
  await expect(victory).toBeVisible({ timeout: 15_000 });
  await expect(victory).toContainText('Epílogo');
  await expect(victory).toContainText('Códice');
  await expect(victory).not.toContainText('Pregunta');
  await expect(victory).not.toContainText('Puntaje');
});

test('chapter II tutorials open with their first step', async ({ page }) => {
  test.setTimeout(240_000);
  for (const [id, title] of [
    ['m5_yahuar_pampa', 'Yahuar Pampa'],
    ['m6_chimu_inca', 'La Guerra del Norte'],
    ['m6b_guerra_civil', 'La Guerra Civil'],
  ]) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&intro=0`);
    const overlay = page.locator('.ed-overlay', { hasText: title });
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await overlay.waitFor({ state: 'detached', timeout: 15_000 });
    await expect(page.locator('#ed-tutorial.show')).toContainText(`Paso 1 / ${tutorialSteps(id)}`, {
      timeout: 60_000,
    });
  }
});

test('the chapter III tutorial opens with its first step', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Gran Rebelión' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  await expect(page.locator('#ed-tutorial.show')).toContainText(`Paso 1 / ${tutorialSteps('m7_tupac_amaru')}`, {
    timeout: 60_000,
  });
});

test('an informational tutorial step advances on its own', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&intro=0');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Gran Rebelión' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  const tutorial = page.locator('#ed-tutorial');
  await expect(tutorial).toContainText('Paso 1 /', { timeout: 60_000 });

  // Select a rifleman to reach the informational choice step, then run the tutorial clock: the
  // step advances by itself after 14 s of play without waiting for any order.
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const rifle = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'rifleman' && !u.dead);
    g.selectUnits([rifle.id]);
  });
  await expect(tutorial).toContainText('Paso 2 /', { timeout: 20_000 });
  await expect(tutorial).toContainText('Dos rutas de victoria');
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.tutorial.update(15);
  });
  await expect(tutorial).toContainText('Paso 3 /', { timeout: 5_000 });
  await expect(tutorial).toContainText('caballería patriota');
});

test('chapter IV tutorials open with their first step', async ({ page }) => {
  test.setTimeout(240_000);
  for (const [id, title] of [
    ['m8_independencia', 'La Independencia'],
    ['m9_guerra_pacifico', 'La Defensa de Arica'],
  ]) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&intro=0`);
    const overlay = page.locator('.ed-overlay', { hasText: title });
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await overlay.waitFor({ state: 'detached', timeout: 15_000 });
    await expect(page.locator('#ed-tutorial.show')).toContainText(`Paso 1 / ${tutorialSteps(id)}`, {
      timeout: 60_000,
    });
  }
});

async function expectCampaignLayout(context: BrowserContext, ids: string[]): Promise<void> {
  for (const id of ids) {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&intro=0`);
    const briefing = page.locator('.ed-briefing');
    await expect(briefing).toBeVisible({ timeout: 30_000 });
    const briefingBox = await briefing.boundingBox();
    expect(briefingBox, `${id} briefing has no box`).not.toBeNull();
    expect(briefingBox!.x).toBeGreaterThanOrEqual(0);
    expect(briefingBox!.y).toBeGreaterThanOrEqual(0);
    expect(briefingBox!.x + briefingBox!.width).toBeLessThanOrEqual(1600);
    expect(briefingBox!.y + briefingBox!.height).toBeLessThanOrEqual(900);
    await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
    await briefing.waitFor({ state: 'detached', timeout: 15_000 });
    const tutorial = page.locator('#ed-tutorial.show');
    await expect(tutorial).toBeVisible({ timeout: 60_000 });
    const tutorialBox = await tutorial.boundingBox();
    const objectivesBox = await page.locator('#ed-objectives').boundingBox();
    expect(tutorialBox, `${id} tutorial has no box`).not.toBeNull();
    expect(objectivesBox, `${id} objectives have no box`).not.toBeNull();
    expect(tutorialBox!.x).toBeGreaterThanOrEqual(0);
    expect(tutorialBox!.x + tutorialBox!.width).toBeLessThanOrEqual(1600);
    expect(tutorialBox!.y + tutorialBox!.height).toBeLessThanOrEqual(900);
    expect(objectivesBox!.x + objectivesBox!.width).toBeLessThanOrEqual(1600);
    expect(objectivesBox!.y + objectivesBox!.height).toBeLessThanOrEqual(900);
    await page.close();
  }
}

test('later campaign briefing and tutorial fit 1600x900 (m5-m6b)', async ({ context }) => {
  test.setTimeout(360_000);
  await expectCampaignLayout(context, ['m_tambotoco', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil']);
});

test('later campaign briefing and tutorial fit 1600x900 (m7-m9)', async ({ context }) => {
  test.setTimeout(360_000);
  await expectCampaignLayout(context, [
    'm_lima',
    'm7_tupac_amaru',
    'm_junta_cusco',
    'm8_independencia',
    'm9_guerra_pacifico',
  ]);
});

test('later campaign briefings show their draft intro art with art=all', async ({ page }) => {
  test.setTimeout(120_000);
  for (const id of [
    'm_tambotoco',
    'm5_yahuar_pampa',
    'm6_chimu_inca',
    'm6b_guerra_civil',
    'm_lima',
    'm7_tupac_amaru',
    'm_junta_cusco',
    'm8_independencia',
    'm9_guerra_pacifico',
  ]) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&art=all&intro=0`);
    const img = page.locator('.ed-briefing .ed-art img');
    await expect(img).toBeVisible({ timeout: 30_000 });
    await expect(img).toHaveJSProperty('complete', true);
    expect(await img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});

test('the missions with corrected rosters boot with units and no errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ids = [
    'm3_moche_recuay',
    'm_tambotoco',
    'm5_yahuar_pampa',
    'm6_chimu_inca',
    'm6b_guerra_civil',
    'm_lima',
    'm7_tupac_amaru',
    'm_junta_cusco',
    'm9_guerra_pacifico',
  ];
  for (const id of ids) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const info = await page.evaluate(() => {
      const g = (window as unknown as { game: { units: Map<number, unknown>; buildings: Map<number, unknown> } }).game;
      return { units: g.units.size, buildings: g.buildings.size };
    });
    expect(info.units, `${id} has no units`).toBeGreaterThan(0);
    expect(info.buildings, `${id} has no buildings`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('a mission roster restriction blocks disallowed units', async ({ page }) => {
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const c = g.playerCenter(0);
    const b = g.spawnScriptedBuilding('barracks', 0, c.x + 6, c.z + 6);
    // the naval mission has no siege train, but infantry is allowed
    return { artillery: g.trainUnit(b.id, 'artillery'), soldier: g.trainUnit(b.id, 'soldier') };
  });
  expect(out.artillery).toBe(false);
  expect(out.soldier).toBe(true);
});

test('the network objective needs both provincial nodes', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const m = g.mission;
    const o = m.def.objectives.find((x: any) => x.id === 'obj_red');
    const base = g.siteCenter as { x: number; z: number };
    const nodes = o.nodes.map((n: any) => ({ x: base.x + n.dx, z: base.z + n.dz }));
    const home = g.playerCenter(0);
    g.spawnScriptedBuilding('market', 0, home.x + 8, home.z + 8);
    m.update(0.1, 0);
    const atHome = m.getObjectiveState('obj_red');
    g.spawnScriptedBuilding('market', 0, nodes[0].x, nodes[0].z);
    m.update(0.1, 0);
    const oneNode = m.getObjectiveState('obj_red');
    g.spawnScriptedBuilding('market', 0, nodes[1].x, nodes[1].z);
    m.update(0.1, 0);
    const bothNodes = m.getObjectiveState('obj_red');
    return { atHome, oneNode, bothNodes };
  });
  expect(out.atHome).not.toBe('completed');
  expect(out.oneNode).not.toBe('completed');
  expect(out.bothNodes).toBe('completed');
});

test('m6 cuts the canal to force Chan Chan to surrender', async ({ page }) => {
  await page.goto('/?mission=m6_chimu_inca&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const tupac = [...g.units.values()].find((u: any) => u.tag === 'tupac_yupanqui') as any;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const canal = g.canalSite as { x: number; z: number } | null;
    const setPos = (x: number, z: number) => tupac.pos.set(x, g.terrain.getHeight(x, z), z);
    setPos(enemy.pos.x - 18, enemy.pos.z);
    g.update(1 / 60, 0);
    const afterParamonga = m.getObjectiveState('obj_canal') as string;
    if (!canal) return { afterParamonga, canal: false, won: m.won as boolean | null };
    setPos(canal.x, canal.z);
    g.update(1 / 60, 0);
    return {
      afterParamonga,
      canal: true,
      canalVisual: !!g.scene.getObjectByName('canal'),
      waterVisual: !!g.scene.getObjectByName('canal_water'),
      gateVisual: !!g.scene.getObjectByName('canal_gate'),
      chimuSite: g.siteDef?.id === 'chimu_site',
      canalObjective: m.getObjectiveState('obj_canal') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.canal).toBe(true);
  expect(out.afterParamonga).toBe('activo');
  expect(out.canalVisual).toBe(true);
  expect(out.waterVisual).toBe(true);
  expect(out.gateVisual).toBe(true);
  expect(out.chimuSite).toBe(true);
  expect(out.canalObjective).toBe('completed');
  expect(out.won).toBe(true);
});

test('authored campaign geography spawns its local base and features', async ({ context }) => {
  const cases = [
    { id: 'm2_chavin', river: true, decor: null, canal: false },
    { id: 'm3_moche_recuay', flats: true, decor: 'mission_decor_recuay_pashash', canal: true },
    { id: 'm4_wari', flats: true, decor: null, canal: false },
    { id: 'm_tambotoco', flats: true, decor: null, site: 'tambotoco_site', canal: true },
    { id: 'm5_yahuar_pampa', flats: true, decor: null, site: 'chanca_site', canal: false },
    { id: 'm6_chimu_inca', flats: true, decor: null, site: 'chimu_site', canal: true },
    { id: 'm6b_guerra_civil', flats: true, decor: null, site: 'cusco_inca_site', canal: false },
    { id: 'm_lima', flats: true, decor: null, site: 'lima_site', canal: false },
    { id: 'm7_tupac_amaru', flats: true, decor: null, site: 'colonial_site', canal: false },
    { id: 'm_junta_cusco', flats: true, decor: 'mission_decor_patriotas_camp', site: 'cusco_junta_site', canal: false },
    { id: 'm8_independencia', flats: true, decor: null, site: 'independence_site', canal: false },
    { id: 'm9_guerra_pacifico', flats: true, decor: null, site: 'arica_site', canal: false },
  ];
  for (const item of cases) {
    const page = await context.newPage();
    await page.goto(`/?mission=${item.id}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const center = g.playerCenter(0);
      return {
        water: center ? g.terrain.isWater(center.x, center.z) : true,
        buildable: center ? g.terrain.isBuildable(center.x, center.z) : false,
        river: !!g.missionLayout?.terrain?.river,
        flats: g.missionLayout?.terrain?.flats?.length ?? 0,
        decor: g.scenarioDecor?.name ?? null,
        site: g.siteDef?.id ?? null,
        canal: !!g.canalSite,
      };
    });
    expect(out.water, `${item.id} starts in water`).toBe(false);
    expect(out.buildable, `${item.id} start is not buildable`).toBe(true);
    if (item.river) expect(out.river).toBe(true);
    if (item.flats) expect(out.flats).toBeGreaterThan(0);
    if (item.decor) expect(out.decor).toBe(item.decor);
    if (item.site) expect(out.site).toBe(item.site);
    if (item.canal !== undefined) expect(out.canal).toBe(item.canal);
    await page.close();
  }
});

test('m2 offerings open the Old Temple act', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const anchor = g.siteAnchor as { x: number; z: number } | null;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
    if (!anchor || !unit) return { anchor: false, unit: false };
    unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
    let t = 0;
    const tick = (seconds: number) => {
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        document.querySelector('.ed-mission-card')?.remove();
        unit.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
        g.update(dt, t);
        t += dt;
      }
    };
    tick(5);
    m.recordDelivery('silver', 50);
    m.recordDelivery('silver', 50);
    tick(2);
    return {
      anchor: true,
      unit: true,
      offerings: m.getObjectiveState('a1_ofrenda') as string,
      oldTemple: m.getObjectiveState('a2_templo') as string,
      feria: m.getObjectiveState('a2_feria') as string,
      phase: g.sitePhase as string,
    };
  });
  expect(out.anchor).toBe(true);
  expect(out.unit).toBe(true);
  expect(out.offerings).toBe('completed');
  expect(out.oldTemple).toBe('activo');
  expect(out.feria).toBe('activo');
  expect(out.phase).toBe('old_temple_foundation');
});

test('m4 network opens the contested frontier', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const base = g.siteCenter as { x: number; z: number };
    const o = m.def.objectives.find((x: any) => x.id === 'obj_red');
    const nodes = o.nodes.map((n: any) => ({ x: base.x + n.dx, z: base.z + n.dz }));
    for (const node of nodes) g.spawnScriptedBuilding('market', 0, node.x, node.z);
    g.update(1 / 60, 0);
    const active = m.getObjectiveState('obj_frontera') as string;
    const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(65 / dt) && !m.ended; i++) {
      unit.pos.set(nodes[0].x, g.terrain.getHeight(nodes[0].x, nodes[0].z), nodes[0].z);
      g.update(dt, i * dt);
    }
    return {
      network: m.getObjectiveState('obj_red') as string,
      active,
      frontier: m.getObjectiveState('obj_frontera') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.network).toBe('completed');
  expect(out.active).toBe('activo');
  expect(out.frontier).toBe('completed');
  expect(out.won).not.toBe(true);
});

test('m9 land defense fails when Bolognesi falls', async ({ page }) => {
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const bolognesi = [...g.units.values()].find((u: any) => u.tag === 'bolognesi') as any;
    const before = {
      active: m.getObjectiveState('obj_bolognesi') as string,
      alive: !!bolognesi && !bolognesi.dead,
    };
    bolognesi.die();
    g.update(1 / 60, 0);
    return {
      before,
      after: m.getObjectiveState('obj_bolognesi') as string,
      ended: m.ended as boolean,
      won: m.won as boolean | null,
    };
  });
  expect(out.before.alive).toBe(true);
  expect(out.before.active).toBe('activo');
  expect(out.after).toBe('failed');
  expect(out.ended).toBe(true);
  expect(out.won).toBe(false);
});

test('m8 holds Junín and then Ayacucho with Sucre alive', async ({ page }) => {
  await page.goto('/?mission=m8_independencia&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const cavalry = [...g.units.values()].find((u: any) => u.kind === 'cavalry' && u.owner === 0) as any;
    const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center' && !b.dead) as any;
    const move = (x: number, z: number) => cavalry.pos.set(x, g.terrain.getHeight(x, z), z);
    const dt = 1 / 60;
    // Junín: hold the forward position for 90s.
    for (let i = 0; i < Math.ceil(95 / dt) && !m.ended; i++) {
      move(enemy.pos.x - 30, enemy.pos.z);
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    const afterJunin = {
      junin: m.getObjectiveState('obj_junin'),
      ayacucho: m.getObjectiveState('obj_ayacucho'),
      won: m.won as boolean | null,
    };
    // Ayacucho: hold the decisive position for 120s.
    for (let i = 0; i < Math.ceil(125 / dt) && !m.ended; i++) {
      move(enemy.pos.x, enemy.pos.z);
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      g.update(dt, i * dt);
    }
    return {
      afterJunin,
      ayacucho: m.getObjectiveState('obj_ayacucho'),
      sucre: m.getObjectiveState('obj_sucre'),
      won: m.won as boolean | null,
    };
  });
  expect(out.afterJunin.junin).toBe('completed');
  expect(out.afterJunin.ayacucho).toBe('activo');
  expect(out.afterJunin.won).not.toBe(true);
  expect(out.ayacucho).toBe('completed');
  expect(out.sucre).not.toBe('failed');
  expect(out.won).toBe(true);
});

test('a strategic choice wins through either branch', async ({ page }) => {
  const boot = async () => {
    await page.goto('/?mission=m7_tupac_amaru&seed=777&fog=0&low=1&noloop=1');
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
  };

  // branch A — assault: destroy the realista command post
  await boot();
  const assault = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const before = g.mission.won as boolean | null;
    for (const b of g.buildings.values()) if (b.owner !== 0 && b.tag === 'centro_realista') b.die();
    g.update(1 / 60, 0);
    return { before, after: g.mission.won as boolean | null };
  });
  expect(assault.before).not.toBe(true);
  expect(assault.after).toBe(true);

  // branch B — siege: hold out until the clock expires
  await boot();
  const siege = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(620 / dt) && !m.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      m.update(dt, i * dt);
    }
    return m.won as boolean | null;
  });
  expect(siege).toBe(true);
});

test('the campaign hub shows preinca progress and its four missions', async ({ page }) => {
  // legacy numeric progress migrates to the first two released missions
  await page.addInitScript(() => {
    localStorage.setItem('peru-campaign', '2');
  });
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const menu = page.locator('.ed-campaign-panel');
  await expect(menu).toContainText('Culturas Preincas');
  await expect(menu).toContainText('2 / 4 misiones completadas');
  await expect(menu.getByRole('button', { name: 'Volver a jugar La Ciudad Sagrada' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Volver a jugar El Oráculo de Chavín' })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Jugar La Ciudad Sagrada/ })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: /Jugar La Frontera de los Valles/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Jugar El Horizonte Medio/ })).toHaveCount(0);
  const inca = menu.locator('.ed-campaign-card[data-campaign="inca"]');
  await expect(inca).toBeEnabled();
  await expect(inca).toContainText('0 / 4 misiones completadas');
});

test('the campaign path opens the next campaign once the previous one is complete', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('peru-campaign', '9');
  });
  await page.goto('/?menu=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const menu = page.locator('.ed-campaign-panel');
  const inca = menu.locator('.ed-campaign-card[data-campaign="inca"]');
  // The whole pre-Inca campaign is done, so the path selects the Inca campaign and its first mission.
  await expect(inca).toBeEnabled();
  await expect(inca).toHaveAttribute('aria-selected', 'true');
  await expect(inca).toContainText('0 / 4 misiones completadas');
  await expect(menu.getByRole('button', { name: /Jugar Los hijos de Tambotoco/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Jugar La Guerra del Norte/ })).toHaveCount(0);
  await expect(menu.locator('.ed-campaign-card[data-campaign="virreinato"]')).toBeEnabled();
  await expect(menu.locator('.ed-campaign-card[data-campaign="independencia"]')).toBeEnabled();
  await expect(menu.locator('.ed-campaign-card[data-campaign="republica"]')).toBeDisabled();
  await expect(inca).toContainText('6 en desarrollo');
  // The redesigned chapter shows its planned missions in play order, without a play button.
  const rows = menu.locator('.ed-senda-mission');
  await expect(rows).toHaveCount(10);
  await expect(rows.nth(0)).not.toHaveClass(/planned/);
  await expect(rows.nth(0)).toContainText('Los hijos de Tambotoco');
  await expect(rows.nth(0)).toContainText('Leyenda');
  await expect(rows.nth(0).getByRole('button', { name: /Jugar Los hijos de Tambotoco/ })).toBeVisible();
  await expect(rows.nth(1)).toContainText('Yahuar Pampa');
  await expect(rows.nth(9)).toContainText('La Guerra Civil');
  await expect(menu.locator('.ed-senda-mission.planned')).toHaveCount(6);

  await menu.locator('.ed-campaign-card[data-campaign="preinca"]').click();
  await expect(menu).toContainText('4 / 4 misiones completadas');
  for (const title of [
    'La Ciudad Sagrada',
    'El Oráculo de Chavín',
    'La Frontera de los Valles',
    'El Horizonte Medio',
  ]) {
    await expect(menu.getByRole('button', { name: `Volver a jugar ${title}` })).toBeVisible();
  }
});

test('Caral opens with a chapter card and chains into Chavín', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&cardhold=1');
  await skipMissionIntro(page);
  const briefing = page.locator('.ed-briefing');
  await expect(briefing).toBeVisible({ timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  const card = page.locator('.ed-mission-card');
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card).toContainText('La Ciudad Sagrada');
  await page.evaluate(() => document.querySelector('.ed-mission-card')?.remove());
  await expect(card).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
  const victory = page.locator('.ed-epilogue');
  await expect(victory).toContainText('Continuar: El Oráculo de Chavín');
  await victory.getByRole('button', { name: /Continuar: El Oráculo de Chavín/ }).click();
  await page.waitForURL(/mission=m2_chavin/);
  // Chavín now has its own narrated intro: skip it and assert the briefing, not the cinematic.
  await skipMissionIntro(page);
  await expect(page.locator('.ed-briefing', { hasText: 'El Oráculo de Chavín' })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('peru-campaign'))).toContain('m1_caral');
});

test('Wari closes the preinca chapter', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
  const victory = page.locator('.ed-epilogue');
  await expect(victory).toContainText('Fin de la primera campaña');
  await expect(victory.getByRole('button', { name: /Volver a campañas/ })).toBeVisible();
});

test('peaceful missions hide combat statistics and combat missions keep them', async ({ page }) => {
  for (const id of ['m1_caral', 'm2_chavin', 'm4_wari']) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
      timeout: 30_000,
    });
    await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
    const victory = page.locator('.ed-epilogue');
    await expect(victory).not.toContainText('Bajas infligidas');
    await expect(victory.getByRole('tab', { name: 'Militar' })).toHaveCount(0);
  }

  await page.goto('/?mission=m3_moche_recuay&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
  const victory = page.locator('.ed-epilogue');
  await expect(victory).toContainText('Bajas infligidas');
  await expect(victory.getByRole('tab', { name: 'Militar' })).toBeVisible();
});

test('chapter endings name the right campaign ordinal', async ({ page }) => {
  for (const [id, label] of [
    ['m6b_guerra_civil', 'Fin de la segunda campaña.'],
    ['m7_tupac_amaru', 'Fin de la tercera campaña.'],
    ['m8_independencia', 'Fin de la cuarta campaña.'],
    ['m9_guerra_pacifico', 'Fin de la quinta campaña.'],
  ]) {
    await page.goto(`/?mission=${id}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
      timeout: 30_000,
    });
    await page.evaluate(() => (window as unknown as { game: any }).game.showVictory(0));
    const victory = page.locator('.ed-epilogue');
    await expect(victory).toContainText(label, { timeout: 15_000 });
  }
});

test('a peaceful mission briefing shows no rival side', async ({ page }) => {
  for (const mission of ['m1_caral', 'm2_chavin', 'm4_wari']) {
    // This test covers the briefing, not the cinematic: skip every mission's narrated intro
    // instead of assuming only Caral has one.
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1&intro=0`);
    const overlay = page.locator('.ed-overlay').filter({ hasText: 'OBJETIVOS' });
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await expect(overlay).toContainText('Bandos');
    await expect(overlay).toContainText('sin enfrentamiento documentado');
  }
});

test('a bonus objective does not gate victory', async ({ page }) => {
  await page.goto('/?mission=m2_chavin&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const m = g.mission;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const anchor = g.siteAnchor as { x: number; z: number };
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as any;
    let t = 0;
    const tick = (seconds: number) => {
      const dt = 1 / 60;
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        document.querySelector('.ed-mission-card')?.remove();
        worker.pos.set(anchor.x, g.terrain.getHeight(anchor.x, anchor.z), anchor.z);
        g.update(dt, t);
        t += dt;
      }
    };
    tick(5);
    g.makeOffering('chavin_edificio_b');
    g.makeOffering('chavin_edificio_b');
    tick(2);
    for (let i = 0; i < 3; i++) m.recordDelivery('stone', 50);
    tick(2);
    g.spawnScriptedBuilding('market', 0, anchor.x, anchor.z + 34);
    tick(62);
    for (let i = 0; i < 4; i++) m.recordDelivery('stone', 50);
    tick(2);
    g.players[0].techs.add('chavin_pilgrimage');
    tick(92);
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
      won: m.won as boolean | null,
      required: m.getObjectiveState('a4_registro') as string,
      bonus: m.getObjectiveState('bonus_ofrenda_mayor') as string,
    };
  });
  expect(out.required).toBe('completed');
  expect(out.bonus).not.toBe('completed');
  expect(out.won).toBe(true);
});

test('the Ayar cast is on the board and named after the briefing', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0&noloop=1');
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  // Eight siblings: the briefing is the legend's cast list, not two generic commanders.
  await expect(briefing.locator('.ed-cmd-card')).toHaveCount(8);
  await expect(briefing.locator('.ed-cmd-card', { hasText: 'Ayar Manco' })).toBeVisible();
  // At 1280×720 the whole briefing fits without a hidden cast row.
  const box = await briefing.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }));
  expect(box.scroll, 'the briefing scrolls at 1280×720').toBeLessThanOrEqual(box.client + 1);
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => (window as unknown as { game?: { mission?: { started: boolean } } }).game?.mission?.started === true,
    null,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => !(window as unknown as { game: { isCinematicActive(): boolean } }).game.isCinematicActive(),
    null,
    { timeout: 60_000 },
  );
  const info = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const tagged = [...g.units.values()].filter((u: any) => u.owner === 0 && u.tag) as any[];
    const manco = tagged.find((u: any) => u.tag === 'manco_capac')!;
    g.selectUnits([manco.id]);
    for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
    const heroMarkers = g.heroMarkers ? (g.heroMarkers.rings.count as number) : 0;
    const heroScale = manco.unitView?.view.group.scale.x ?? 0;
    const single = document.querySelector('#ed-desc')?.textContent ?? '';
    g.selectUnits(tagged.map((u: any) => u.id));
    for (let i = 0; i < 20; i++) g.update(1 / 60, 20 / 60 + i / 60);
    const labels = g.characterLabels ? [...g.characterLabels.labels.values()] : [];
    return {
      tags: tagged.map((u: any) => u.tag as string),
      labels: labels.length,
      visibleLabels: labels.filter((l: { visible: boolean }) => l.visible).length,
      single,
      heroMarkers,
      heroScale,
      party: document.querySelector('#ed-desc')?.textContent ?? '',
    };
  });
  expect(info.tags).toEqual(
    expect.arrayContaining([
      'manco_capac',
      'mama_huaco',
      'ayar_cachi',
      'ayar_uchu',
      'ayar_auca',
      'mama_ocllo',
      'mama_ipacura',
      'mama_raua',
    ]),
  );
  expect(info.labels).toBe(8);
  expect(info.visibleLabels, 'nameplates must show at the default zoom').toBe(8);
  expect(info.single).toContain('Ayar Manco');
  expect(info.heroMarkers).toBe(8);
  expect(info.heroScale).toBeGreaterThan(1.15);
  expect(info.single).toContain('★');
  // A box selection of the party still names its characters (not just "Soldado ×7").
  expect(info.party).toContain('Grupo ×8');
  expect(info.party).toContain('Ayar Manco');
  expect(info.party).toContain('Mama Ocllo');
  expect(errors).toEqual([]);
});

test('the Tambotoco tutorial advances with the player actions', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0&noloop=1');
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => (window as unknown as { game?: { mission?: { started: boolean } } }).game?.mission?.started === true,
    null,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () => !(window as unknown as { game: { isCinematicActive(): boolean } }).game.isCinematicActive(),
    null,
    { timeout: 60_000 },
  );
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    for (let i = 0; i < 60 * 2; i++) g.update(1 / 60, i / 60);
    const before = g.tutorial?.toSave()?.stepId ?? null;
    // Step 1 teaches moving the party; it advances when the party leaves the cave.
    const ids = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead).map((u: any) => u.id);
    g.executeCommand(
      { kind: 'order', unitIds: ids, order: { kind: 'move', target: { x: 60, z: 92 } }, clear: true },
      false,
    );
    for (let i = 0; i < 60 * 90 && g.mission.getObjectiveState('a1_salida') !== 'completed'; i++)
      g.update(1 / 60, i / 60);
    for (let i = 0; i < 60 * 3; i++) g.update(1 / 60, 90 + i / 60);
    const save = g.tutorial?.toSave();
    return {
      before,
      step: save?.stepId ?? null,
      finished: save?.finished ?? null,
      panel: document.querySelector('#ed-tutorial')?.textContent ?? '',
    };
  });
  expect(out.before).toBe('mover');
  // Leaving the cave opens the camp: the tutorial now teaches placing the communal store.
  expect(out.step).toBe('campamento');
  expect(out.finished).toBe(false);
  expect(out.panel).toContain('Depósito comunal');
  expect(errors).toEqual([]);
});

test('the ayllu site grows through its phases', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0&noloop=1');
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => (window as unknown as { game?: { mission?: { started: boolean } } }).game?.mission?.started === true,
    null,
    { timeout: 30_000 },
  );
  const states = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const visible = (): { name: string; visible: boolean }[] =>
      (g.aylluSite.group.children as { visible: boolean; children: { name: string }[] }[]).map((group) => ({
        name: group.children[0]?.name ?? '?',
        visible: group.visible,
      }));
    const at = (phase: string) => {
      g.setSitePhase(phase);
      return visible();
    };
    const before = at('cave');
    const shrine = at('huanacaure');
    const inticancha = at('inticancha');
    const fundada = at('fundada');
    g.setSitePhase('inticancha');
    g.setSitePhase('bogus');
    let lifeCalls = 0;
    const life = g.aylluSite.updateLife.bind(g.aylluSite);
    g.aylluSite.updateLife = (...args: unknown[]) => {
      lifeCalls++;
      life(...args);
    };
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    return { before, shrine, inticancha, fundada, afterBogus: g.sitePhase, lifeCalls };
  });
  expect(states.before).toEqual([
    { name: 'ayllu:cave', visible: true },
    { name: 'ayllu:huanacaure', visible: false },
    { name: 'ayllu:inticancha', visible: false },
    { name: 'ayllu:fundada', visible: false },
  ]);
  expect(states.shrine.map((s) => s.visible)).toEqual([true, true, false, false]);
  // Act IV only traces Inticancha; the lived-in settlement waits for the four canchas.
  expect(states.inticancha.map((s) => s.visible)).toEqual([true, true, true, false]);
  expect(states.fundada.map((s) => s.visible)).toEqual([true, true, true, true]);
  expect(states.afterBogus).toBe('inticancha');
  // The presentation tick must reach the ayllu kit, not only Caral/Chavín.
  expect(states.lifeCalls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Lima grows from a traced plaza into the colonial city', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?mission=m_lima&seed=777&fog=0&low=1&intro=0&noloop=1');
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => (window as unknown as { game?: { siteModel?: unknown } }).game?.siteModel != null,
    null,
    { timeout: 60_000 },
  );
  await page.waitForFunction(
    () => !(window as unknown as { game: { isCinematicActive(): boolean } }).game.isCinematicActive(),
    null,
    { timeout: 60_000 },
  );
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const groups = (): { name: string; visible: boolean }[] =>
      (g.colonialSite.group.children as { visible: boolean; children: { name: string }[] }[]).map((group) => ({
        name: group.children[0]?.name ?? '?',
        visible: group.visible,
      }));
    const before = { phase: g.sitePhase, groups: groups(), model: g.siteModel?.visible ?? null };
    let lifeCalls = 0;
    const life = g.colonialSite.updateLife.bind(g.colonialSite);
    g.colonialSite.updateLife = (...args: unknown[]) => {
      lifeCalls++;
      life(...args);
    };
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    g.setSitePhase('ciudad');
    const after = { phase: g.sitePhase, groups: groups(), model: g.siteModel?.visible ?? null };
    return { before, after, lifeCalls };
  });
  expect(out.before.phase).toBe('traza');
  expect(out.before.groups).toEqual([
    { name: 'colonial:traza', visible: true },
    { name: 'colonial:ciudad', visible: false },
  ]);
  expect(out.before.model).toBe(false);
  expect(out.after.groups).toEqual([
    { name: 'colonial:traza', visible: false },
    { name: 'colonial:ciudad', visible: true },
  ]);
  expect(out.after.model).toBe(true);
  expect(out.lifeCalls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the cave is explored with fog on and the intro is what frames it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?mission=m_tambotoco&seed=777&low=1&intro=0&noloop=1');
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  await briefing.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await briefing.waitFor({ state: 'detached' });
  await page.waitForFunction(
    () => (window as unknown as { game?: { mission?: { started: boolean } } }).game?.mission?.started === true,
    null,
    { timeout: 30_000 },
  );
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const opening = g.missionLayout?.opening;
    return {
      fogOn: g.settings.fogOfWar,
      explored: opening
        ? (g.fow.isExplored(opening.x * g.settings.mapSize, opening.z * g.settings.mapSize) as boolean)
        : null,
      caveExplored: g.fow.isExplored(40, 55) as boolean,
      openingHeight: g.siteDef?.openingHeight ?? null,
      baseZ: (g.missionLayout?.base.z ?? 0) * g.settings.mapSize,
      camera: g.camera.getTarget(),
    };
  });
  expect(out.fogOn).toBe(true);
  expect(out.caveExplored, 'the cave must not sit under unexplored fog').toBe(true);
  expect(out.openingHeight).toBe(30);
  // ?intro=0 skips the cave hold: the skipped intro must not leave the player parked at the cave.
  expect(out.camera.z).toBeGreaterThan(out.baseZ - 25);
});
