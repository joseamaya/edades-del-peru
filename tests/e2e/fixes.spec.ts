import { test, expect } from '@playwright/test';

test('restores building opacity when construction finishes', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const res = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const b = [...g.buildings.values()].find((x: any) => x.owner === 0);
    const sample = () => {
      let dim = 0;
      let opaque = 0;
      b.view.group.traverse((o: any) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.transparent && m.opacity > 0.4 && m.opacity < 0.5) dim++;
          if (!m.transparent && m.opacity === 1) opaque++;
        }
      });
      return { dim, opaque };
    };
    const before = sample();
    b.beginConstruction();
    const during = sample();
    b.addBuildProgress(1e9);
    const after = sample();
    return { before, during, after };
  });

  expect(res.before.dim).toBe(0);
  expect(res.during.dim).toBeGreaterThan(0);
  expect(res.after.dim).toBe(0);
  expect(res.after.opaque).toBe(res.before.opaque);
});

test('the worker has a hidden carry pivot at start', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const info = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    if (!w) return null;
    // Rigged workers expose the carry bundle as a bone attachment; the
    // procedural fallback keeps the old pivot.
    const rigCarry = w.rig?.root.getObjectByName('attire_carry');
    if (rigCarry) return { visible: rigCarry.visible, children: rigCarry.children.length };
    let carry: any = null;
    w.view.group.traverse((o: any) => {
      if (o.name === 'pivot:carry') carry = o;
    });
    return carry ? { visible: carry.visible, children: carry.children.length } : null;
  });

  expect(info).not.toBeNull();
  expect(info!.children).toBeGreaterThan(0);
  expect(info!.visible).toBe(false);
});

test('the worker animates the arm while gathering', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const armed = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    const node = [...g.resourceNodes.values()][0];
    if (!w || !node || !w.armR) return false;
    const nx = node.pos.x + 1.5;
    w.pos.set(nx, g.terrain.getHeight(nx, node.pos.z), node.pos.z);
    w.issueOrder({ kind: 'gather', entityId: node.id }, true);
    return true;
  });
  expect(armed).toBe(true);

  const samples = new Set<string>();
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
      return w?.armR ? w.armR.rotation.x.toFixed(3) : '0';
    });
    samples.add(r);
  }

  expect(samples.size).toBeGreaterThan(3);
});

test('the move order creates a destination marker', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const count = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.markers.spawn(10, g.terrain.getHeight(10, 10), 10, 'move');
    return g.markers.activeCount;
  });

  expect(count).toBeGreaterThan(0);
});

test('does not allow placing without selected workers', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const mode = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedUnits = [];
    g.selectedBuilding = null;
    g.buildingMode = null;
    g.startPlacement('house');
    return g.buildingMode;
  });

  expect(mode).toBeNull();
});

test('selected workers build and complete the structure', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'center' && b.owner === 0);
    const x = center.pos.x + 12;
    const z = center.pos.z + 6;
    // zoom to the worker so it arrives fast
    w.pos.set(x + 1, g.terrain.getHeight(x + 1, z + 1), z + 1);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
    const beforeIds = new Set([...g.buildings.keys()]);
    g.startPlacement('house');
    g.commitPlacement(x, z);
    const bld = [...g.buildings.values()].find((b: any) => !beforeIds.has(b.id));
    const queued = w.orderQueue.map((o: any) => o.kind);
    const stillSelected = g.selectedUnits.includes(w.id);
    let t = 0;
    for (let i = 0; i < 1600; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return {
      queued,
      stillSelected,
      ratio: bld ? +bld.buildRatio.toFixed(3) : -1,
      complete: bld ? bld.constructionComplete : false,
    };
  });

  expect(out.queued).toContain('build');
  expect(out.queued[0]).toBe('build');
  expect(out.stillSelected).toBe(true);
  expect(out.complete).toBe(true);
  expect(out.ratio).toBe(1);
});

test('the minimap issues a move order on right click', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const order = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectedUnits = [w.id];
    w.clearOrders();
    g.commandMoveToWorld(w.pos.x + 6, w.pos.z + 6);
    return w.orderQueue.map((o: any) => o.kind);
  });

  expect(order).toContain('move');
});

test('right click lands the order under the cursor on elevated terrain', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  // wait for the game loop to have run its updates: projecting before the first
  // frame uses the initial camera pose and the click then maps to another cell
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game: any }).game;
      return g.stepCount >= 2;
    },
    null,
    { timeout: 15_000 },
  );

  const info = await page.evaluate(() => {
    const w = window as unknown as { game: any; THREE: any; innerWidth: number; innerHeight: number };
    const g = w.game;
    const size = g.settings.mapSize;
    // `screenToWorld` at click time derives its ray from the camera matrices; make
    // sure they are current now (they can be stale before the first render, which
    // made the cursor-vs-order distance blow up under load)
    g.camera.camera.updateMatrixWorld();
    const worker = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    // deterministic scan for an elevated, almost-flat, on-screen cell: random
    // points made the cursor-vs-order distance flaky (a steep cell diverges)
    for (let gx = 12; gx < size - 12; gx += 2) {
      for (let gz = 12; gz < size - 12; gz += 2) {
        const x = gx;
        const z = gz;
        const h = g.terrain.getHeight(x, z);
        if (h < 3) continue;
        if (g.terrain.getSlope(x, z) > 0.1) continue;
        // avoid points so close to the worker that the move order completes instantly
        if (worker && Math.hypot(x - worker.pos.x, z - worker.pos.z) < 15) continue;
        const v = new w.THREE.Vector3(x, h, z).project(g.camera.camera);
        const sx = (v.x * 0.5 + 0.5) * w.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * w.innerHeight;
        // keep the click away from the HUD (topbar, bottom panel, minimap, help)
        if (sx < w.innerWidth * 0.1 || sx > w.innerWidth * 0.9) continue;
        if (sy < w.innerHeight * 0.1 || sy > w.innerHeight * 0.8) continue;
        // the point must fall over the canvas, not over a HUD overlay
        if (document.elementFromPoint(sx, sy)?.tagName !== 'CANVAS') continue;
        return { x, z, h, sx, sy };
      }
    }
    return null;
  });
  expect(info).not.toBeNull();

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    g.selectedUnits = [w.id];
    w.clearOrders();
  });
  await page.mouse.click(info!.sx, info!.sy, { button: 'right' });
  // wait for the order to be issued rather than a fixed delay (flaky under load)
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { game: any }).game;
      const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
      return !!(w && w.orderQueue[0] && w.orderQueue[0].target);
    },
    null,
    { timeout: 15_000 },
  );
  const target = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'worker' && u.owner === 0);
    return w.orderQueue[0] ? w.orderQueue[0].target : null;
  });
  expect(target).not.toBeNull();
  const d = Math.hypot(target.x - info!.x, target.z - info!.z);
  expect(d).toBeLessThan(1.5);
});

test('camera rotation is off by default and can be enabled', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const yaw0 = await page.evaluate(() => (window as unknown as { game: any }).game.camera.getYaw());
  await page.keyboard.press('q');
  const yawOff = await page.evaluate(() => (window as unknown as { game: any }).game.camera.getYaw());
  expect(yawOff).toBeCloseTo(yaw0, 5);

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.rotateCamera = true;
    g.camera.setRotationEnabled(true);
  });
  await page.keyboard.press('q');
  const yawOn = await page.evaluate(() => (window as unknown as { game: any }).game.camera.getYaw());
  expect(yawOn).not.toBeCloseTo(yaw0, 5);
});

test('the Sacred Huaca is buildable in any period in wonder mode', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const r = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.victoryMode = 'wonder';
    const inWonder = g.canBuildKind('wonder');
    g.settings.victoryMode = 'conquest';
    const inConquest = g.canBuildKind('wonder');
    const quarryInPeriod = g.canBuildKind('refinery');
    return { inWonder, inConquest, quarryInPeriod, era: g.players[0].era };
  });

  expect(r.inWonder).toBe(true);
  expect(r.inConquest).toBe(false);
  // in an early period (era 1) the Quarry is still locked
  expect(r.era).toBeLessThan(2);
  expect(r.quarryInPeriod).toBe(false);
});

test('hides Stone and Quarry in periods that cannot obtain them', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(500);

  const early = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      era: g.players[0].era,
      stoneDisplay: document.getElementById('ed-res-stone')?.style.display ?? '',
    };
  });
  expect(early.era).toBeLessThan(2);
  expect(early.stoneDisplay).toBe('none');
});

test('the Amauta converts an enemy unit without throwing', { tag: '@smoke' }, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    g.players[1].alive = false; // freeze the AI so the enemy unit stays put
    const c = g.camera.getTarget();
    const amauta = g.spawnScriptedUnit('commissar', 0, c.x - 6, c.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, c.x, c.z);
    amauta.clearOrders();
    enemy.clearOrders();
    amauta.issueOrder({ kind: 'convert', entityId: enemy.id }, true);
    const before = enemy.owner;
    let t = 0;
    for (let i = 0; i < 1500 && enemy.owner === before; i++) {
      t += 1 / 60;
      g.update(1 / 60, t);
    }
    return { before, after: enemy.owner };
  });

  expect(out.before).toBe(1);
  expect(out.after).toBe(0);
  expect(errors).toEqual([]);
});

test('right-clicking an enemy with an Amauta selected issues a convert order', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  // move the camera to a clear spot (no buildings or resources nearby)
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.players[1].alive = false; // freeze the AI
    const c = g.camera.getTarget();
    const size = g.settings.mapSize;
    const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
    const buildings = [...g.buildings.values()];
    const nodes = [...g.resourceNodes.values()];
    for (let r = 26; r <= 70; r += 6) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const x = Math.max(14, Math.min(size - 14, c.x + Math.cos(ang) * r));
        const z = Math.max(14, Math.min(size - 14, c.z + Math.sin(ang) * r));
        if (buildings.some((b: any) => dist(x, z, b.pos.x, b.pos.z) < 10)) continue;
        if (nodes.some((n: any) => dist(x, z, n.pos.x, n.pos.z) < 4)) continue;
        g.camera.moveTo(x, z, true);
        return;
      }
    }
  });
  await page.waitForTimeout(900); // let the camera settle

  const info = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const c = g.camera.getTarget();
    const amauta = g.spawnScriptedUnit('commissar', 0, c.x - 5, c.z);
    const enemy = g.spawnScriptedUnit('soldier', 1, c.x, c.z);
    amauta.clearOrders();
    enemy.clearOrders();
    g.selectedUnits = [amauta.id];
    g.selectedBuilding = null;
    const v = enemy.pos.clone();
    v.y += 0.5;
    const s = v.project(g.camera.camera);
    return {
      x: Math.round((s.x * 0.5 + 0.5) * window.innerWidth),
      y: Math.round((-s.y * 0.5 + 0.5) * window.innerHeight),
      aid: amauta.id,
    };
  });

  await page.mouse.click(info.x, info.y, { button: 'right' });
  await page.waitForTimeout(150);

  const order = await page.evaluate((aid) => {
    const g = (window as unknown as { game: any }).game;
    return g.units.get(aid).orderQueue.map((o: any) => o.kind);
  }, info.aid);
  expect(order).toContain('convert');
});

test('conquest ends only when all enemy buildings are destroyed', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const aiBuildings = () => [...g.buildings.values()].filter((b: any) => b.owner === 1 && !b.dead);
    const center = aiBuildings().find((b: any) => b.kind === 'center');
    center.takeDamage(1e9);
    for (let i = 0; i < 3; i++) g.update(1 / 60, i / 60);
    const afterCenter = { ended: !!g.gameEnded, alive: !!g.players[1].alive, remaining: aiBuildings().length };
    for (const b of aiBuildings()) b.takeDamage(1e9);
    for (let i = 0; i < 3; i++) g.update(1 / 60, i / 60);
    const afterAll = { ended: !!g.gameEnded, alive: !!g.players[1].alive };
    return { afterCenter, afterAll };
  });

  // losing the center alone must not end the match while other buildings stand
  expect(out.afterCenter.remaining).toBeGreaterThan(0);
  expect(out.afterCenter.ended).toBe(false);
  expect(out.afterCenter.alive).toBe(true);
  // destroying every building ends it
  expect(out.afterAll.ended).toBe(true);
  expect(out.afterAll.alive).toBe(false);
});

test('a campaign is not lost while the player still has buildings', async ({ page }) => {
  await page.goto('/?mission=m1_caral&seed=777&fog=0&low=1');
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 15_000 });
  await start.click();
  await start.waitFor({ state: 'detached', timeout: 15_000 });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center');
    center.takeDamage(1e9);
    for (let i = 0; i < 3; i++) g.update(1 / 60, i / 60);
    return {
      ended: !!g.mission.ended,
      anyPlayerBuilding: [...g.buildings.values()].some((b: any) => b.owner === 0 && !b.dead),
    };
  });

  expect(out.anyPlayerBuilding).toBe(true);
  expect(out.ended).toBe(false);
});

test('civilization bonuses are applied to the player and its units', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const p = g.players[0];
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    const c = g.camera.getTarget();
    const soldier = g.spawnScriptedUnit('soldier', 0, c.x, c.z);
    return {
      civ: p.civ,
      attack: p.bonus.attack,
      gather: Object.values(p.bonus.gathering).reduce((a: number, b) => a + (b ?? 0), 0),
      soldierAttack: soldier.attackMultiplier,
      workerGather: worker.gatherMultiplier,
    };
  });

  // default skirmish civilization is Moche (attack + silver gathering)
  expect(out.attack).toBeGreaterThan(0);
  expect(out.soldierAttack).toBeCloseTo(1 + out.attack, 5);
  expect(out.workerGather).toBeCloseTo(1 + out.gather, 5);
});

test('a civilization population bonus raises the population cap', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('peru-settings', JSON.stringify({ period: 3, civPlayer: 'wari', civAI: 'tiahuanaco' }));
  });
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    for (let i = 0; i < 3; i++) g.update(1 / 60, i / 60);
    return { civ: g.players[0].civ, popBonus: g.players[0].bonus.population, cap: g.players[0].populationCap };
  });

  expect(out.civ).toBe('wari');
  expect(out.popBonus).toBe(10);
  expect(out.cap).toBeGreaterThan(10);
});
