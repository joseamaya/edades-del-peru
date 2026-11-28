import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cliArg, launchChromium, reviewDir, withViteServer } from './lib.mjs';

/**
 * Capture the project `Rifle_Shoot` clip for PR evidence: a Blender sheet of the clip itself and an in-game
 * pair (aim vs recoil) on the actual rifleman, weapon included.
 *
 * The Blender pass runs with `--render-only`, so it never rewrites the hash-pinned clip GLB.
 *
 * Requires the local Blender authoring tool (not a CI dependency).
 *
 * Usage: node scripts/capture_rifle_clip.mjs [--out=docs/media/rifle-shoot]
 */
const out = path.resolve(cliArg('out', 'docs/media/rifle-shoot'));
const frames = path.join(reviewDir(), 'rifle-shoot');
fs.mkdirSync(frames, { recursive: true });

execFileSync(
  'blender',
  ['--background', '--python', 'scripts/blender/build_rifle_clip.py', '--', `--stills=${frames}`, '--render-only'],
  { stdio: 'inherit' },
);

const tiles = ['frame-00.png', 'frame-02.png', 'frame-04.png', 'frame-08.png'].map((file) => path.join(frames, file));
for (const file of tiles) if (!fs.existsSync(file)) throw new Error(`missing still ${file}`);
const sheet = await Promise.all(tiles.map((file) => sharp(file).toBuffer()));
await sharp({ create: { width: 960, height: 1080, channels: 3, background: '#141414' } })
  .composite(sheet.map((input, index) => ({ input, left: (index % 2) * 480, top: Math.floor(index / 2) * 540 })))
  .webp({ quality: 82 })
  .toFile(`${out}.webp`);
console.log(`wrote ${path.relative(process.cwd(), `${out}.webp`)} (${tiles.length} clip frames)`);

// In-game pair: the same rifleman at the aim and at the recoil key, with the procedural firearm attached.
const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
  await page.goto(`${base}/?mission=m9_guerra_pacifico&intro=0&fog=0&low=1&noloop=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page
    .getByRole('button', { name: /COMENZAR MISIÓN/ })
    .click({ timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(2500);

  const staged = await page.evaluate(() => {
    const g = window.game;
    g.loop.stop();
    // Field commanders dress a sabre and override the attack clip; the ordinary firearm line is the subject.
    const unit = [...g.units.values()].find(
      (u) => u.owner === 0 && !u.dead && !u.tag && (u.kind === 'rifleman' || u.kind === 'musketeer'),
    );
    if (!unit?.rig) throw new Error('missing firearm unit');
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 44, base.z + 44, 56);
    unit.clearOrders();
    unit.pos.set(c.x, g.terrain.getHeight(c.x, c.z), c.z);
    unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
    unit.view.setRotationY(Math.PI / 2);
    const target = g.spawnScriptedBuilding('house', 1, c.x + 2.2, c.z);
    g.executeCommand({
      kind: 'order',
      unitIds: [unit.id],
      order: { kind: 'attack', entityId: target.id },
      clear: true,
    });
    unit.rig.play('attack', 0);
    for (let i = 0; i < 20; i++) g.loop.onUpdate(1 / 60, i / 60);
    const ui = document.getElementById('ui-root');
    if (ui) ui.style.display = 'none';
    const labels = document.getElementById('ed-world-labels');
    if (labels) labels.style.display = 'none';
    const action = unit.rig.actions.get('attack');
    if (action) action.paused = true;
    return { clip: unit.rig.currentClipName, variant: unit.rig.variantId };
  });
  if (staged.clip !== 'Rifle_Shoot') throw new Error(`unit plays ${staged.clip}, not Rifle_Shoot`);

  const shots = [];
  for (const time of [0, 2 / 24]) {
    await page.evaluate(
      ([time]) => {
        const g = window.game;
        const unit = [...g.units.values()].find(
          (u) => u.owner === 0 && !u.dead && !u.tag && (u.kind === 'rifleman' || u.kind === 'musketeer'),
        );
        const action = unit?.rig?.actions.get('attack');
        if (action) action.time = time;
        unit?.rig?.mixer.update(0);
        unit?.rig?.root.updateMatrixWorld(true);
        const cam = g.camera.camera;
        cam.position.set(unit.pos.x + 2.6, unit.pos.y + 1.45, unit.pos.z + 1.1);
        cam.lookAt(unit.pos.x, unit.pos.y + 1.0, unit.pos.z);
        g.renderer.render(g.scene, cam);
      },
      [time],
    );
    await page.waitForTimeout(150);
    shots.push(
      await sharp(await page.screenshot({ type: 'png' }))
        .resize(560, 700)
        .toBuffer(),
    );
  }
  await sharp({ create: { width: 1120, height: 700, channels: 3, background: '#141414' } })
    .composite(shots.map((input, index) => ({ input, left: index * 560, top: 0 })))
    .webp({ quality: 82 })
    .toFile(`${out}-in-game.webp`);
  console.log(`wrote ${path.relative(process.cwd(), `${out}-in-game.webp`)} (${staged.variant})`);
} finally {
  await browser.close();
  await close();
}
