import { test, expect, type Page } from '@playwright/test';
import { CAMERA_CONFIG, CAMERA_FOV_RAD, CAMERA_PITCH, groundOffsetAtNdc } from '../../src/core/cameraMath';

async function bootMatch(page: Page): Promise<void> {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

/** Stop the render loop so tests drive fixed camera updates. */
async function stopLoop(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
  });
}

/** Reset the camera to the map centre and return how far it panned over `frames` updates. */
async function panFrames(page: Page, frames: number): Promise<number> {
  return page.evaluate((count) => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < count; i++) g.update(1 / 60, i / 60);
    const t1 = g.camera.getTarget();
    return Math.hypot(t1.x - t0.x, t1.z - t0.z);
  }, frames);
}

/** Ground point (y = 0) under a client-space position, using the live camera matrices. */
async function groundUnderCursor(page: Page, x: number, y: number): Promise<{ x: number; z: number }> {
  return page.evaluate(
    ({ x, y }) => {
      const w = window as unknown as { game: any; THREE: any };
      w.game.camera.camera.updateMatrixWorld();
      const ndc = new w.THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      const ray = new w.THREE.Raycaster();
      ray.setFromCamera(ndc, w.game.camera.camera);
      const hit = new w.THREE.Vector3();
      ray.ray.intersectPlane(new w.THREE.Plane(new w.THREE.Vector3(0, 1, 0), 0), hit);
      return { x: hit.x, z: hit.z };
    },
    { x, y },
  );
}

/** Project a ground point back to client pixels with the live camera matrices. */
async function projectGround(page: Page, world: { x: number; z: number }): Promise<{ x: number; y: number }> {
  return page.evaluate((world) => {
    const w = window as unknown as { game: any; THREE: any };
    w.game.camera.camera.updateMatrixWorld();
    const p = new w.THREE.Vector3(world.x, 0, world.z).project(w.game.camera.camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  }, world);
}

/** Dispatch a wheel event on the canvas at a client-space position. */
async function wheelAt(page: Page, x: number, y: number, deltaY: number): Promise<void> {
  await page.evaluate(
    ({ x, y, deltaY }) => {
      const g = (window as unknown as { game: any }).game;
      g.renderer.domElement.dispatchEvent(
        new WheelEvent('wheel', { deltaY, clientX: x, clientY: y, bubbles: true, cancelable: true }),
      );
    },
    { x, y, deltaY },
  );
}

test('edge scrolling pans the camera toward the border', { tag: '@smoke' }, async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // pointer at the left edge, over the game view
    g.renderer.domElement.dispatchEvent(new MouseEvent('mousemove', { clientX: 2, clientY: 300, bubbles: true }));
    // start from the middle so the bounds clamp does not mask the pan
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    const t1 = g.camera.getTarget();
    return Math.hypot(t1.x - t0.x, t1.z - t0.z) > 0.5;
  });
  expect(out).toBe(true);
});

test('the camera does not pan while the game is paused', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (!g.getPaused()) g.togglePause();
    const t0 = g.camera.getTarget();
    g.camera.updateMouse(2, 300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const t1 = g.camera.getTarget();
    return Math.hypot(t1.x - t0.x, t1.z - t0.z);
  });
  expect(out).toBe(0);
});

test('the camera does not pan while a blocking menu is open', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.hud.showCodex();
    const blocked = g.hud.hasBlockingOverlay();
    const t0 = g.camera.getTarget();
    g.camera.updateMouse(2, 300);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const t1 = g.camera.getTarget();
    return { blocked, moved: Math.hypot(t1.x - t0.x, t1.z - t0.z) };
  });
  expect(out.blocked).toBe(true);
  expect(out.moved).toBe(0);
});

test('dispose removes the camera input listeners', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const mag = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

    // control: while attached, a keydown pans
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    const before0 = g.camera.getTarget();
    g.camera.update(0.5, 0);
    const before1 = g.camera.getTarget();
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));

    // after dispose the listener is gone
    g.camera.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    const after0 = g.camera.getTarget();
    g.camera.update(0.5, 0);
    const after1 = g.camera.getTarget();

    return { movedBefore: mag(before0, before1), movedAfter: mag(after0, after1) };
  });
  expect(out.movedBefore).toBeGreaterThan(0.5);
  expect(out.movedAfter).toBe(0);
});

test('W pans the camera toward the top of the screen', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const yaw = g.camera.getYaw();
    const forward = { x: -Math.sin(yaw), y: -Math.cos(yaw) };
    const t0 = g.camera.getTarget();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    const t1 = g.camera.getTarget();
    const dx = t1.x - t0.x;
    const dz = t1.z - t0.z;
    const len = Math.hypot(dx, dz);
    const along = dx * forward.x + dz * forward.y;
    return { len, ratio: len > 0 ? along / len : 0 };
  });
  expect(out.len).toBeGreaterThan(0.5);
  // almost entirely along the camera's forward direction (not sideways)
  expect(out.ratio).toBeGreaterThan(0.95);
});

test('edge scrolling is suppressed while the pointer is over a HUD control', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    // pointer over the bottom-left minimap (a HUD control near the corner)
    g.renderer.domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 100, clientY: window.innerHeight - 100, bubbles: true }),
    );
    const overUi = g.hud.isPointerOverUi(g.mouseScreen.x, g.mouseScreen.y);
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < 30; i++) g.update(1 / 60, i / 60);
    const t1 = g.camera.getTarget();
    return { overUi, moved: Math.hypot(t1.x - t0.x, t1.z - t0.z) };
  });
  expect(out.overUi).toBe(true);
  expect(out.moved).toBe(0);
});

test(
  'edge scrolling pans from the physical top edge and not from the bar content',
  { tag: '@smoke' },
  async ({ page }) => {
    await bootMatch(page);
    const bar = await page.evaluate(() => {
      const r = document.querySelector('.ed-topbar')!.getBoundingClientRect();
      return { top: r.top, height: r.height, width: r.width, left: r.left };
    });
    const x = Math.round(bar.left + bar.width / 2);

    // Physical top edge, even where the bar is drawn: this is how players ask to go north.
    await page.mouse.move(x, 2);
    await stopLoop(page);
    expect(await panFrames(page, 30)).toBeGreaterThan(0.5);

    // The bar content (resources, buttons) sits below the 10 px band, so it does not pan.
    await page.mouse.move(x, Math.round(bar.top + bar.height / 2));
    const onCanvas = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      return document.elementFromPoint(g.mouseScreen.x, g.mouseScreen.y) === g.renderer.domElement;
    });
    expect(onCanvas).toBe(true);
    expect(await panFrames(page, 30)).toBe(0);

    // A real control that overlaps the band (the speed buttons start ~9 px from the top) is guarded.
    const control = await page.evaluate(() => {
      const r = document.querySelector('#ed-speed .speed-btn')!.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    await page.mouse.move(control.x, control.y);
    const overControl = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      return {
        overUi: g.hud.isPointerOverUi(g.mouseScreen.x, g.mouseScreen.y),
        onControl: document.elementFromPoint(g.mouseScreen.x, g.mouseScreen.y) !== g.renderer.domElement,
      };
    });
    expect(overControl.overUi).toBe(true);
    expect(overControl.onControl).toBe(true);
    expect(await panFrames(page, 30)).toBe(0);
  },
);

test('edge scrolling waits for a short delay before moving', async ({ page }) => {
  await bootMatch(page);
  await page.mouse.move(2, 300);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    const t0 = g.camera.getTarget();
    for (let i = 0; i < 6; i++) g.update(1 / 60, i / 60);
    const early = Math.hypot(g.camera.getTarget().x - t0.x, g.camera.getTarget().z - t0.z);
    for (let i = 0; i < 40; i++) g.update(1 / 60, i / 60);
    const late = Math.hypot(g.camera.getTarget().x - t0.x, g.camera.getTarget().z - t0.z);
    return { early, late };
  });
  expect(out.early).toBe(0);
  expect(out.late).toBeGreaterThan(0.5);
});

test('moving from the bottom edge onto the command bar stops the camera', async ({ page }) => {
  await bootMatch(page);
  const bar = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    g.selectedUnits = [worker.id];
    g.hud.renderBottom();
    const r = document.querySelector('#ed-bottom')!.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, innerHeight: window.innerHeight };
  });
  await stopLoop(page);
  const x = Math.round((bar.left + bar.right) / 2);
  await page.mouse.move(x, bar.innerHeight - 4);
  expect(await panFrames(page, 30)).toBeGreaterThan(0.5);

  await page.mouse.move(x, Math.round(bar.top + 10));
  expect(await panFrames(page, 30)).toBe(0);
});

test('wheel zoom keeps the ground point under the cursor', { tag: '@smoke' }, async ({ page }) => {
  await bootMatch(page);
  await stopLoop(page);
  const cursor = { x: 960, y: 500 };

  const anchorError = async (yaw: number): Promise<number> => {
    await page.evaluate((yaw) => {
      const g = (window as unknown as { game: any }).game;
      g.camera.setYaw(yaw);
      g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
      g.camera.setHeight(80);
      for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    }, yaw);
    const before = await groundUnderCursor(page, cursor.x, cursor.y);
    // Three events without a frame between them: the anchor must telescope (trackpad-style).
    await wheelAt(page, cursor.x, cursor.y, -40);
    await wheelAt(page, cursor.x, cursor.y, -40);
    await wheelAt(page, cursor.x, cursor.y, -40);
    await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
    });
    const screen = await projectGround(page, before);
    return Math.hypot(screen.x - cursor.x, screen.y - cursor.y);
  };

  expect(await anchorError(0)).toBeLessThan(2);
  expect(await anchorError(Math.PI / 2)).toBeLessThan(2);
});

test('middle-drag follows the hand without damping', async ({ page }) => {
  await bootMatch(page);
  await stopLoop(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
    g.camera.setHeight(60);
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
  });

  const drag = async (dx: number, dy: number) => {
    const before = await page.evaluate(() => (window as unknown as { game: any }).game.camera.getTarget());
    await page.mouse.move(640, 400);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(640 + dx, 400 + dy, { steps: 8 });
    const during = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      g.update(1 / 60, 0);
      return { target: g.camera.getTarget(), zoom: g.camera.getZoom() };
    });
    const visible = await groundUnderCursor(page, 640, 400);
    await page.mouse.up({ button: 'middle' });
    return { before, during, visible };
  };

  const aspect = 1280 / 800;
  const horizontal = await drag(120, 0);
  const expectedX =
    groundOffsetAtNdc(0, 0, aspect, CAMERA_PITCH, 0, CAMERA_FOV_RAD, horizontal.during.zoom).x -
    groundOffsetAtNdc((2 * 120) / 1280, 0, aspect, CAMERA_PITCH, 0, CAMERA_FOV_RAD, horizontal.during.zoom).x;
  expect(horizontal.during.target.x - horizontal.before.x).toBeCloseTo(expectedX, 1);
  expect(Math.abs(horizontal.visible.x - horizontal.during.target.x)).toBeLessThan(0.01);
  expect(Math.abs(horizontal.visible.z - horizontal.during.target.z)).toBeLessThan(0.01);

  const vertical = await drag(0, 100);
  const expectedZ =
    groundOffsetAtNdc(0, 0, aspect, CAMERA_PITCH, 0, CAMERA_FOV_RAD, vertical.during.zoom).y -
    groundOffsetAtNdc(0, -(2 * 100) / 800, aspect, CAMERA_PITCH, 0, CAMERA_FOV_RAD, vertical.during.zoom).y;
  expect(vertical.during.target.z - vertical.before.z).toBeCloseTo(expectedZ, 1);
  expect(Math.abs(vertical.visible.z - vertical.during.target.z)).toBeLessThan(0.01);
});

test('middle-drag still clamps at the map edge', async ({ page }) => {
  await bootMatch(page);
  await stopLoop(page);
  await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.camera.moveTo(10, g.settings.mapSize / 2, true);
    g.camera.setHeight(60);
    for (let i = 0; i < 60; i++) g.update(1 / 60, i / 60);
  });
  await page.mouse.move(200, 400);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(900, 400, { steps: 8 });
  const target = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.update(1 / 60, 0);
    return g.camera.getTarget();
  });
  await page.mouse.up({ button: 'middle' });
  expect(target.x).toBeCloseTo(CAMERA_CONFIG.edgeMargin, 1);
});

test('the edge-scroll option disables panning and persists across reloads', async ({ page }) => {
  await bootMatch(page);
  await page.evaluate(() => (window as unknown as { game: any }).game.hud.showOptions('main'));
  await page.locator('.ed-field', { hasText: 'Desplazar con los bordes' }).locator('button').click();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('peru-settings');
    return raw ? JSON.parse(raw).edgeScroll : null;
  });
  expect(saved).toBe(false);

  await page.reload();
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.mouse.move(2, 300);
  await stopLoop(page);
  const setting = await page.evaluate(() => (window as unknown as { game: any }).game.settings.edgeScroll);
  expect(setting).toBe(false);
  expect(await panFrames(page, 60)).toBe(0);
});

test('the camera speed scale changes keyboard pan distance', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const pan = (scale: number): number => {
      g.camera.moveTo(g.settings.mapSize / 2, g.settings.mapSize / 2, true);
      g.camera.setSpeedScale(scale);
      const t0 = g.camera.getTarget();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      for (let i = 0; i < 20; i++) g.update(1 / 60, i / 60);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      const t1 = g.camera.getTarget();
      return Math.hypot(t1.x - t0.x, t1.z - t0.z);
    };
    return { slow: pan(0.5), normal: pan(1), fast: pan(1.5) };
  });
  expect(out.normal).toBeGreaterThan(out.slow);
  expect(out.fast).toBeGreaterThan(out.normal);
});

test('the camera can focus on each map corner without losing the point', async ({ page }) => {
  await bootMatch(page);
  const out = await page.evaluate(() => {
    const w = window as unknown as { game: any; THREE: any; innerWidth: number; innerHeight: number };
    const g = w.game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const size = g.settings.mapSize;
    const margin = 8;
    const corners = [
      [0, 0],
      [size, 0],
      [0, size],
      [size, size],
    ] as const;
    const results = corners.map(([x, z]) => {
      g.camera.moveTo(x, z, true);
      g.camera.update(1, 0);
      g.camera.camera.updateMatrixWorld();
      const v = new w.THREE.Vector3(x, 0, z).project(g.camera.camera);
      const sx = (v.x * 0.5 + 0.5) * w.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * w.innerHeight;
      const target = g.camera.getTarget();
      return {
        corner: { x, z },
        sx,
        sy,
        target,
        overCanvas: document.elementFromPoint(sx, sy)?.tagName === 'CANVAS',
      };
    });
    return { width: w.innerWidth, height: w.innerHeight, size, margin, results };
  });

  for (const r of out.results) {
    expect(r.sx).toBeGreaterThan(0);
    expect(r.sx).toBeLessThan(out.width);
    expect(r.sy).toBeGreaterThan(0);
    expect(r.sy).toBeLessThan(out.height);
    expect(r.overCanvas).toBe(true);
    expect(r.target.x).toBeCloseTo(r.corner.x === 0 ? out.margin : out.size - out.margin, 5);
    expect(r.target.z).toBeCloseTo(r.corner.z === 0 ? out.margin : out.size - out.margin, 5);
  }
});
