import { test, expect } from '@playwright/test';

test('shows the historical prologue before the campaign', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const intro = page.locator('.ed-overlay', { hasText: 'La Senda del Sol' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('una de las primeras civilizaciones del mundo');
  await intro.getByRole('button', { name: /Ver misiones/ }).click();
  await expect(page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' })).toBeVisible();
});

test('the mission briefing includes context and sources', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText('Contexto');
  await expect(overlay).toContainText('¿Sabías que…?');
  await expect(overlay.getByText('Fuentes históricas')).toBeVisible();
});

test('the codex opens with periods, civilizations and dossiers', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Códice/ }).click();
  const codex = page.locator('#ed-codex');
  await expect(codex).toBeVisible();
  await expect(codex).toContainText('Códice del Perú');
  await codex.getByRole('button', { name: /Civilizaciones/ }).click();
  await expect(codex.locator('.ed-codex-nav')).toContainText('Caral-Supe');
  await codex.getByRole('button', { name: /Dossiers/ }).click();
  await expect(codex.locator('.ed-codex-content')).toContainText('Fuentes');
});

test('the tutorial guides in the first mission', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const overlay = page.locator('.ed-overlay', { hasText: 'La Ciudad Sagrada' });
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await overlay.getByRole('button', { name: /COMENZAR MISIÓN/ }).click();
  await overlay.waitFor({ state: 'detached', timeout: 15_000 });
  const tutorial = page.locator('#ed-tutorial');
  // the first step appears after ~1.2s of game time; be generous on slow runners
  await expect(tutorial).toBeVisible({ timeout: 30_000 });
  await expect(tutorial).toContainText('Selecciona a tus obreros');
  await expect(tutorial).toContainText('Paso 1 / 6');
});

test('Caral guarantees coastal fishing grounds for the tutorial', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  const fish = await page.evaluate(
    () =>
      [...(window as unknown as { game: any }).game.resourceNodes.values()].filter(
        (n: any) => n.kind === 'fishing' && !n.dead,
      ).length,
  );
  expect(fish).toBeGreaterThan(0);
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
    g.players[0].resources.food = 500;
    const c = g.playerCenter(0);
    g.spawnScriptedBuilding('farm', 0, c.x + 6, c.z + 6);
    g.spawnScriptedBuilding('farm', 0, c.x + 9, c.z + 6);
    g.spawnScriptedBuilding('mill', 0, c.x + 12, c.z + 6);
    const m = g.mission;
    const dt = 1 / 60;
    for (let i = 0; i < Math.ceil(310 / dt) && !m.ended; i++) {
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

test('the missions with corrected rosters boot with units and no errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ids = ['m3_moche_recuay', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm7_tupac_amaru', 'm9_guerra_pacifico'];
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

test('the expansion objective needs the building at the frontier', async ({ page }) => {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const m = g.mission;
    const o = m.def.objectives.find((x: any) => x.id === 'obj_centro');
    const centerOf = (owner: number): { x: number; z: number } => {
      const c = [...g.buildings.values()].find((b: any) => b.owner === owner && b.kind === 'center' && !b.dead);
      return c ? { x: c.pos.x, z: c.pos.z } : { x: g.settings.mapSize / 2, z: g.settings.mapSize / 2 };
    };
    const base = o.pos.ref === 'enemy' ? centerOf(1) : centerOf(0);
    const tp = { x: base.x + o.pos.dx, z: base.z + o.pos.dz };
    const home = centerOf(0);
    // a market at home does not satisfy the frontier objective
    g.spawnScriptedBuilding('market', 0, home.x + 8, home.z + 8);
    m.update(0.1, 0);
    const atHome = m.getObjectiveState('obj_centro');
    // one at the frontier does
    g.spawnScriptedBuilding('market', 0, tp.x, tp.z);
    m.update(0.1, 0);
    const atFrontier = m.getObjectiveState('obj_centro');
    return { atHome, atFrontier };
  });
  expect(out.atHome).not.toBe('completed');
  expect(out.atFrontier).toBe('completed');
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

test('the campaign menu shows completion progress and can continue', async ({ page }) => {
  // two missions already completed
  await page.addInitScript(() => localStorage.setItem('peru-campaign', '2'));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  await page
    .locator('.ed-overlay', { hasText: 'La Senda del Sol' })
    .getByRole('button', { name: /Ver misiones/ })
    .click();
  const menu = page.locator('.ed-overlay', { hasText: 'CAMPAÑA' });
  await expect(menu).toContainText('2 / 9 misiones completadas');
  await expect(menu).toContainText('✓ 1. La Ciudad Sagrada');
  await expect(menu).toContainText('▶ 3.');
  await expect(menu).toContainText('🔒 4.');
  // "continue" opens the next uncompleted mission (mission 3)
  await menu.getByRole('button', { name: /Continuar campaña/ }).click();
  await page.waitForURL(/mission=m3_moche_recuay/, { timeout: 15_000 });
});

test('the campaign menu shows a completed campaign', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('peru-campaign', '9'));
  await page.goto('/');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /Campañas/ }).click();
  await page
    .locator('.ed-overlay', { hasText: 'La Senda del Sol' })
    .getByRole('button', { name: /Ver misiones/ })
    .click();
  const menu = page.locator('.ed-overlay', { hasText: 'CAMPAÑA' });
  await expect(menu).toContainText('9 / 9 misiones completadas');
  await expect(menu).toContainText('🏆 Campaña completada');
  await expect(menu.getByRole('button', { name: /Continuar campaña/ })).toHaveCount(0);
});

test('a peaceful mission briefing shows no rival side', async ({ page }) => {
  for (const mission of ['m1_caral', 'm2_chavin', 'm4_wari']) {
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1`);
    const overlay = page.locator('.ed-overlay').filter({ hasText: 'OBJETIVOS' });
    await expect(overlay).toBeVisible({ timeout: 30_000 });
    await expect(overlay).toContainText('Bandos:');
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
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < Math.ceil(440 / dt) && !m.ended; i++) {
      for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
      for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;
      // satisfy the required gather (400) but stay below the bonus (700)
      g.players[0].resources.food = 400;
      const have = [...g.buildings.values()].filter(
        (b: any) => b.owner === 0 && b.kind === 'market' && b.constructionComplete && !b.dead,
      ).length;
      if (have < 1) {
        const c = g.playerCenter(0);
        g.spawnScriptedBuilding('market', 0, c.x + 6, c.z + 6);
      }
      g.update(dt, t);
      t += dt;
    }
    return {
      won: m.won as boolean | null,
      required: m.getObjectiveState('obj_ofrendas') as string,
      bonus: m.getObjectiveState('bonus_ofrenda_mayor') as string,
    };
  });
  expect(out.required).toBe('completed');
  expect(out.bonus).not.toBe('completed');
  expect(out.won).toBe(true);
});
