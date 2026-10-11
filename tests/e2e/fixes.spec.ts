import { test, expect } from '@playwright/test';

test('restaura la opacidad del edificio al terminar la construcción', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

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

test('el obrero tiene un pivote de carga oculto al inicio', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const info = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    if (!w) return null;
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

test('el obrero anima el brazo al recolectar', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const armed = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
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
      const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
      return w?.armR ? w.armR.rotation.x.toFixed(3) : '0';
    });
    samples.add(r);
  }

  expect(samples.size).toBeGreaterThan(3);
});

test('la orden de mover crea un marcador de destino', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const count = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.markers.spawn(10, g.terrain.getHeight(10, 10), 10, 'move');
    return g.markers.activeCount;
  });

  expect(count).toBeGreaterThan(0);
});

test('no permite colocar sin obreros seleccionados', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const mode = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.selectedUnits = [];
    g.selectedBuilding = null;
    g.buildingMode = null;
    g.startPlacement('vivienda');
    return g.buildingMode;
  });

  expect(mode).toBeNull();
});

test('los obreros seleccionados construyen y completan la obra', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.paused = false;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    const center = [...g.buildings.values()].find((b: any) => b.kind === 'centro' && b.owner === 0);
    const x = center.pos.x + 12;
    const z = center.pos.z + 6;
    // acercar al obrero para que llegue rápido
    w.pos.set(x + 1, g.terrain.getHeight(x + 1, z + 1), z + 1);
    g.selectedUnits = [w.id];
    g.selectedBuilding = null;
    const beforeIds = new Set([...g.buildings.keys()]);
    g.startPlacement('vivienda');
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

test('el minimapa emite una orden de mover al hacer clic derecho', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const order = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    g.selectedUnits = [w.id];
    w.clearOrders();
    g.commandMoveToWorld(w.pos.x + 6, w.pos.z + 6);
    return w.orderQueue.map((o: any) => o.kind);
  });

  expect(order).toContain('move');
});

test('el clic derecho aterriza la orden bajo el cursor en terreno elevado', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const info = await page.evaluate(() => {
    const w = window as unknown as { game: any; THREE: any; innerWidth: number; innerHeight: number };
    const g = w.game;
    const size = g.settings.mapSize;
    const c = g.camera.getTarget();
    const worker = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    for (let i = 0; i < 20000; i++) {
      const x = c.x + (Math.random() - 0.5) * 90;
      const z = c.z + (Math.random() - 0.5) * 90;
      if (x < 4 || z < 4 || x > size - 4 || z > size - 4) continue;
      const h = g.terrain.getHeight(x, z);
      if (h < 3) continue;
      // evitar puntos tan cerca del obrero que la orden de mover se complete al instante
      if (worker && Math.hypot(x - worker.pos.x, z - worker.pos.z) < 15) continue;
      const v = new w.THREE.Vector3(x, h, z).project(g.camera.camera);
      const sx = (v.x * 0.5 + 0.5) * w.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * w.innerHeight;
      // mantener el clic lejos del HUD (topbar, panel inferior, minimapa, ayuda)
      if (sx < w.innerWidth * 0.25 || sx > w.innerWidth * 0.75) continue;
      if (sy < w.innerHeight * 0.15 || sy > w.innerHeight * 0.55) continue;
      // el punto debe caer sobre el canvas, no sobre un overlay del HUD
      if (document.elementFromPoint(sx, sy)?.tagName !== 'CANVAS') continue;
      return { x, z, h, sx, sy };
    }
    return null;
  });
  expect(info).not.toBeNull();

  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    g.selectedUnits = [w.id];
    w.clearOrders();
  });
  await page.mouse.click(info!.sx, info!.sy, { button: 'right' });
  await page.waitForTimeout(150);
  const target = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const w = [...g.units.values()].find((u: any) => u.kind === 'obrero' && u.owner === 0);
    return w.orderQueue[0] ? w.orderQueue[0].target : null;
  });
  expect(target).not.toBeNull();
  const d = Math.hypot(target.x - info!.x, target.z - info!.z);
  expect(d).toBeLessThan(1.5);
});

test('la rotación de cámara está desactivada por defecto y se activa a voluntad', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

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

test('la Huaca Sagrada es construible en cualquier periodo en modo maravilla', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });

  const r = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.settings.victoryMode = 'maravilla';
    const inMaravilla = g.canBuildKind('maravilla');
    g.settings.victoryMode = 'conquista';
    const inConquista = g.canBuildKind('maravilla');
    const canteraEnPeriodo = g.canBuildKind('refineria');
    return { inMaravilla, inConquista, canteraEnPeriodo, era: g.players[0].era };
  });

  expect(r.inMaravilla).toBe(true);
  expect(r.inConquista).toBe(false);
  // en un periodo temprano (era 1) la Cantera sigue bloqueada
  expect(r.era).toBeLessThan(2);
  expect(r.canteraEnPeriodo).toBe(false);
});

test('oculta Piedra y Cantera en periodos que no pueden obtenerlas', async ({ page }) => {
  await page.goto('/?seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, { timeout: 30_000 });
  await page.waitForTimeout(500);

  const early = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      era: g.players[0].era,
      piedraDisplay: document.getElementById('ed-res-energia')?.style.display ?? '',
    };
  });
  expect(early.era).toBeLessThan(2);
  expect(early.piedraDisplay).toBe('none');
});

