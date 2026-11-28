import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the Miraflores redoubts (asset audit P1-2): the three FORTRESS nodes of `m_miraflores` drawn as
 * earth-and-fascine fieldworks with sandbags, gabions and two field guns instead of the stone fortress.
 * The redoubts are spawned through `spawnScriptedBuilding`, so they are complete and use the mission's own
 * `buildingModels` override, the same path the player's build order takes.
 *
 * A second load removes the override before spawning, with the same nodes and camera, so the before/after
 * sheet compares the stone fortress with the redoubt instead of asserting the difference.
 *
 * Usage: node scripts/capture_miraflores_redoubts.mjs [--out=docs/media/miraflores-redoubts]
 */
const NODES = [
  { x: 72, z: 190 },
  { x: 112, z: 190 },
  { x: 152, z: 190 },
];
const out = path.resolve(cliArg('out', path.join(reviewDir(), 'miraflores-redoubts')));
fs.mkdirSync(path.dirname(out), { recursive: true });

/** A caption bar over a 960x540 tile. */
async function labelled(image, text) {
  const svg = Buffer.from(
    `<svg width="960" height="52"><rect width="960" height="52" fill="#0d0d0dcc"/>` +
      `<text x="20" y="34" font-family="sans-serif" font-size="24" fill="#f4efe6">${text}</text></svg>`,
  );
  return sharp(image)
    .composite([{ input: svg, top: 0, left: 0 }])
    .toBuffer();
}

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const capture = async (disableOverride) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
    try {
      await page.goto(`${base}/?mission=m_miraflores&intro=0&fog=0&low=0&seed=1881`, {
        waitUntil: 'networkidle',
      });
      await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });

      const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
      await start.waitFor({ state: 'visible', timeout: 90_000 });
      await start.click();
      await page.waitForTimeout(2500);

      const placed = await page.evaluate(
        ({ nodes, disableOverride }) => {
          const g = window.game;
          g.loop.stop();
          document.querySelector('.ed-mission-card')?.remove();
          for (const id of ['ui-root', 'ed-world-labels']) {
            document.getElementById(id)?.style.setProperty('display', 'none');
          }
          const rings = g.scene.getObjectByName('mission-rings');
          if (rings) rings.visible = false;
          if (g.heroMarkers) g.heroMarkers.group.visible = false;
          // The control sheet: the same spawn path with the mission override removed.
          if (disableOverride) delete g.mission.def.buildingModels;
          const buildings = nodes.map((node) => {
            const b = g.spawnScriptedBuilding('fortress', 0, node.x, node.z);
            return { kind: b.kind, x: b.pos.x, y: b.pos.y, z: b.pos.z };
          });
          g.applyQualityPreset('high');
          g.sky.setTimeOfDay(0.55);
          return buildings;
        },
        { nodes: NODES, disableOverride },
      );
      if (placed.length !== 3) throw new Error('the three redoubts were not spawned');

      const render = async (camera) => {
        await page.evaluate((camera) => {
          const g = window.game;
          const c = g.camera.camera;
          c.fov = camera.fov;
          c.position.set(camera.pos[0], camera.pos[1], camera.pos[2]);
          c.lookAt(camera.look[0], camera.look[1], camera.look[2]);
          c.updateProjectionMatrix();
          c.updateMatrixWorld();
          g.terrain.updateLod(c.position, true);
          g.runtime.frameShadows();
          g.trees.update(0, { x: camera.look[0], z: camera.look[2] });
          g.runtime.render();
        }, camera);
        await page.waitForTimeout(400);
        return sharp(await page.screenshot({ type: 'png' }))
          .resize(960, 540)
          .toBuffer();
      };

      const line = placed.reduce(
        (sum, b) => ({
          x: sum.x + b.x / placed.length,
          y: sum.y + b.y / placed.length,
          z: sum.z + b.z / placed.length,
        }),
        { x: 0, y: 0, z: 0 },
      );
      const lineCamera = {
        fov: 55,
        pos: [line.x + 8, line.y + 20, line.z + 55],
        look: [line.x, line.y + 1.2, line.z],
      };
      const centre = placed[1];
      const closeCamera = {
        fov: 40,
        pos: [centre.x + 4.0, centre.y + 3.6, centre.z + 7.4],
        look: [centre.x, centre.y + 0.9, centre.z],
      };
      const result = {
        placed,
        line: await render(lineCamera),
        close: await render(closeCamera),
      };
      if (errors.length) console.log(errors.join('\n'));
      return result;
    } finally {
      await context.close();
    }
  };

  const after = await capture(false);
  const before = await capture(true);

  const lineShot = await labelled(after.line, 'Línea de reductos · tres obras de tierra sobre los nodos');
  const closeShot = await labelled(after.close, 'Reducto 2 · terraplén, sacos, fajina y dos piezas de campaña');
  const legend = Buffer.from(
    `<svg width="1920" height="180"><rect width="1920" height="180" fill="#141414"/>` +
      `<text x="40" y="66" font-family="sans-serif" font-size="34" fill="#f4efe6">Miraflores 1881 · reductos de tierra y fajina</text>` +
      `<text x="40" y="108" font-family="sans-serif" font-size="22" fill="#c9c1b4">Tres FORTRESS de m_miraflores resueltos por buildingModels · ` +
      `sin castillo de piedra</text>` +
      `<text x="40" y="146" font-family="sans-serif" font-size="18" fill="#8f877b">yarn capture:miraflores · seed 1881 · UI oculta</text></svg>`,
  );
  await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#141414' } })
    .composite([
      { input: lineShot, left: 0, top: 0 },
      { input: closeShot, left: 960, top: 0 },
      { input: legend, left: 0, top: 540 },
    ])
    .webp({ quality: 82 })
    .toFile(`${out}.webp`);

  const beforeShot = await labelled(before.line, 'Antes · fortaleza de piedra genérica');
  const afterShot = await labelled(after.line, 'Después · reducto de tierra y fajina');
  const compareLegend = Buffer.from(
    `<svg width="1920" height="180"><rect width="1920" height="180" fill="#141414"/>` +
      `<text x="40" y="66" font-family="sans-serif" font-size="34" fill="#f4efe6">P1-2 · misma línea, mismo encuadre, mismo spawn</text>` +
      `<text x="40" y="108" font-family="sans-serif" font-size="22" fill="#c9c1b4">La única diferencia es ` +
      `MissionDef.buildingModels de m_miraflores</text>` +
      `<text x="40" y="146" font-family="sans-serif" font-size="18" fill="#8f877b">yarn capture:miraflores · seed 1881 · UI oculta</text></svg>`,
  );
  await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#141414' } })
    .composite([
      { input: beforeShot, left: 0, top: 0 },
      { input: afterShot, left: 960, top: 0 },
      { input: compareLegend, left: 0, top: 540 },
    ])
    .webp({ quality: 82 })
    .toFile(`${out}-before-after.webp`);

  console.log(`wrote ${path.relative(process.cwd(), `${out}.webp`)} (${after.placed.length} redoubts)`);
  console.log(`wrote ${path.relative(process.cwd(), `${out}-before-after.webp`)} (stone control)`);
  for (const b of after.placed) console.log(`${b.kind} at ${b.x.toFixed(1)}, ${b.z.toFixed(1)}`);
} finally {
  await browser.close();
  await close();
}
