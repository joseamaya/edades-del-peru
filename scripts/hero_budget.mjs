import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Measure the visible triangle/draw budget of Tambotoco's hero and a common unit on the real render
 * path. Vanilla `bench_scene` counts the whole scene; this isolates the two character budgets from
 * docs/design/tambotoco-art-pilot.md §4.
 *
 * Usage: node scripts/hero_budget.mjs
 */
const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(`${base}/?mission=m_tambotoco&seed=777&fog=0&low=1&intro=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 30_000 });
  await page.waitForTimeout(5000);
  const result = await page.evaluate(() => {
    const stat = (unit) => {
      const root = unit?.unitView?.view?.group;
      if (!root) return null;
      let triangles = 0;
      let meshes = 0;
      root.traverse((object) => {
        const mesh = object;
        if (!mesh.isMesh || !mesh.visible) return;
        const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0;
        triangles += count / 3;
        meshes++;
      });
      return {
        asset: unit.unitView.rig?.asset?.id ?? null,
        variant: unit.unitView.rig?.variantId ?? null,
        triangles: Math.round(triangles),
        meshes,
      };
    };
    const g = window.game;
    const hero = [...g.units.values()].find((unit) => unit.tag === 'manco_capac');
    const worker = [...g.units.values()].find((unit) => unit.kind === 'worker');
    return { hero: stat(hero), worker: stat(worker) };
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  await close();
}
