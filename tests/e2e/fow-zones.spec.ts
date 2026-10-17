import { test, expect, Page } from '@playwright/test';

/**
 * Regression for #70/#74: the cultural layers (landscape, settlement overlays,
 * landmark) must dim with the SAME fog-of-war mask as the terrain, distinguishing
 * the three zones: unexplored (0), explored-but-not-visible (intermediate) and
 * currently visible (1). This complements `tests/fow-material.test.ts` (shader
 * injection + curve) and the wiring check in `landscape.spec.ts`.
 */

const FOG_URL = '/?play=1&civ=moche&period=2&seed=777&low=1&noloop=1';
const LAYERS = ['landscape', 'settlement', 'landmark'] as const;

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the cultural layers share the terrain fog mask', { tag: '@smoke' }, async ({ page }) => {
  await boot(page, FOG_URL);
  const res = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const mask = g.fow.texture;
    const terrainMask = g.terrain.mesh.material.uniforms.fowMap.value;

    const groups: [string, any][] = [];
    if (g.landscape) groups.push(['landscape', g.landscape.group]);
    for (const s of g.settlements ?? []) groups.push(['settlement', s.group]);
    if (g.landmark) groups.push(['landmark', g.landmark]);

    const unique = (root: any): any[] => {
      const seen = new Set<any>();
      root.traverse((o: any) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) seen.add(m);
      });
      return [...seen];
    };

    const perGroup = groups.map(([name, root]) => {
      const mats = unique(root);
      const patched = mats.filter((m) => m.userData?.fow);
      const sameMask = patched.filter((m) => m.userData.fow.fowMap.value === mask).length;
      return { name, mats: mats.length, patched: patched.length, sameMask };
    });

    const enabledValues = () =>
      groups.flatMap(([, root]) => unique(root).map((m) => m.userData?.fow?.fowEnabled?.value));
    const on = enabledValues();
    g.setFogOfWar(false);
    const off = enabledValues();
    g.setFogOfWar(true);

    return {
      terrainMaskIsFow: terrainMask === mask,
      perGroup,
      count: on.length,
      enabledOn: on.length > 0 && on.every((v) => v === 1),
      enabledOff: off.length > 0 && off.every((v) => v === 0),
    };
  });

  expect(res.terrainMaskIsFow, 'terrain must sample the same Fow texture').toBe(true);
  expect(res.perGroup.length).toBeGreaterThanOrEqual(3);
  for (const grp of res.perGroup) {
    expect(grp.mats, `${grp.name} has meshes`).toBeGreaterThan(0);
    expect(grp.patched, `${grp.name} materials are fog-patched`).toBe(grp.mats);
    expect(grp.sameMask, `${grp.name} uses the Fow texture`).toBe(grp.mats);
  }
  expect(res.count, 'fog-patched materials found').toBeGreaterThan(0);
  expect(res.enabledOn, 'fog on -> fowEnabled=1 everywhere').toBe(true);
  expect(res.enabledOff, 'fog off -> fowEnabled=0 everywhere').toBe(true);
});

test('the cultural layers dim per fog zone (unexplored/explored/visible)', { tag: '@smoke' }, async ({ page }) => {
  for (const layer of LAYERS) {
    await boot(page, FOG_URL);
    const r = await page.evaluate((which: string) => {
      const g = (window as unknown as { game: any }).game;
      const THREE = (window as unknown as { THREE: any }).THREE;

      let root: any;
      if (which === 'landscape') root = g.landscape?.group;
      else if (which === 'settlement') root = g.settlements?.[0]?.group;
      else root = g.landmark;
      if (!root) return { ok: false, reason: 'missing group' };

      // pick a mesh guaranteed to carry the feature (prefer the wide ones)
      const prefer = which === 'landscape' ? 'field' : which === 'settlement' ? 'fields' : null;
      let mesh: any = null;
      if (prefer) root.traverse((o: any) => (mesh ||= o.isMesh && o.name === prefer ? o : null));
      if (!mesh) root.traverse((o: any) => (mesh ||= o.isMesh && o.geometry?.attributes?.position ? o : null));
      if (!mesh) return { ok: false, reason: 'no mesh' };

      // aim at the centroid of the first triangle: a point inside the feature.
      // The landmark is a Group with its own transform, so map local -> world.
      const pos = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.getIndex();
      const a = index ? index.getX(0) : 0;
      const b = index ? index.getX(1) : 1;
      const c = index ? index.getX(2) : 2;
      mesh.updateWorldMatrix(true, false);
      const centre = new THREE.Vector3(
        (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
        (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3,
        (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3,
      ).applyMatrix4(mesh.matrixWorld);
      const x = centre.x;
      const z = centre.z;

      // isolate the layer: keep only it and the lights, so the sampled pixel is
      // the feature (or the black background), never the terrain/water
      for (const child of g.scene.children) child.visible = child.isLight || child === root;
      root.visible = true;

      g.loop.stop();
      g.camera.moveTo(x, z, true);
      g.camera.setHeight(g.camera.minZoom);
      for (let i = 0; i < 8; i++) g.camera.update(0.5, 0);

      // sample the pixel the feature projects to (the camera looks at y=0, so an
      // elevated feature is off-centre; the centre pixel would be background)
      const ndc = centre.clone().project(g.camera.camera);
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return { ok: false, reason: 'feature off-screen' };
      const size = 128;
      const px = Math.round((ndc.x * 0.5 + 0.5) * size);
      const py = Math.round((ndc.y * 0.5 + 0.5) * size);
      const rt = new THREE.WebGLRenderTarget(size, size);
      const buf = new Uint8Array(size * size * 4);
      const read = (): number => {
        g.renderer.setRenderTarget(rt);
        g.renderer.render(g.scene, g.camera.camera);
        g.renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
        g.renderer.setRenderTarget(null);
        // brightest of a 3x3 patch around the projected point (robust to AA/edges)
        let best = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ix = Math.min(size - 1, Math.max(0, px + dx));
            const iy = Math.min(size - 1, Math.max(0, py + dy));
            const o = (iy * size + ix) * 4;
            best = Math.max(best, (buf[o] + buf[o + 1] + buf[o + 2]) / 3);
          }
        }
        return best;
      };
      const cellByte = (): number => {
        const cells = g.fow.cells;
        const gx = Math.max(0, Math.min(cells - 1, Math.floor(x / g.fow.cell)));
        const gz = Math.max(0, Math.min(cells - 1, Math.floor(z / g.fow.cell)));
        return g.fow.texture.image.data[(gz * cells + gx) * 4];
      };

      // noloop -> the grid starts all-unexplored
      const p0 = read();
      const grid0 = cellByte();
      g.fow.reveal(x, z, 12);
      g.fow.upload();
      const p1 = read();
      const grid1 = cellByte();
      g.fow.decay();
      g.fow.upload();
      const p2 = read();
      const grid2 = cellByte();
      rt.dispose();

      return { ok: true, p0, p1, p2, grid0, grid1, grid2 };
    }, layer);

    expect(r.ok, `${layer}: ${(r as { reason?: string }).reason ?? ''}`).toBe(true);
    const { p0, p1, p2, grid0, grid1, grid2 } = r as Record<string, number>;
    // the mask really holds the three states
    expect(grid0, `${layer}: unexplored grid`).toBe(0);
    expect(grid1, `${layer}: visible grid`).toBe(255);
    expect(grid2, `${layer}: explored grid`).toBe(150);
    // the rendered feature dims by zone: 0 < intermediate < 1
    expect(p1, `${layer}: visible pixel is lit (framing guard)`).toBeGreaterThan(4);
    expect(p0, `${layer}: unexplored is black`).toBeLessThan(Math.max(3, 0.1 * p1));
    expect(p2, `${layer}: explored is above unexplored`).toBeGreaterThan(p0);
    expect(p2, `${layer}: explored is below visible`).toBeLessThan(p1);
    expect(p2, `${layer}: explored is clearly intermediate`).toBeGreaterThan(0.2 * p1);
    expect(p2, `${layer}: explored is clearly intermediate`).toBeLessThan(0.9 * p1);
  }
});
