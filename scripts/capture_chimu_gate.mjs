import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer } from './lib.mjs';

/**
 * Capture m6's Chan Chan gate as the game shows it: the canal in frame with its heritage field card and
 * the "Cerrar compuerta" action, then the victory screen after clicking that action. The crew and the
 * selection are staged through the debug harness (`window.game`); the close itself is the real HUD button.
 * Evidence for the `canal_closed` objective, not a historical photograph.
 *
 * Usage: node scripts/capture_chimu_gate.mjs
 */
const OUT = path.join(process.cwd(), 'review');
fs.mkdirSync(OUT, { recursive: true });

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await page.goto(`${base}/?mission=m6_chimu_inca&intro=0&fog=0&low=1&noloop=1&seed=777`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.game?.mission !== undefined && !!window.game?.canalSite, null, {
    timeout: 90_000,
  });
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const g = window.game;
    document.querySelector('.ed-mission-card')?.remove();
    if (g.getPaused()) g.togglePause();
    g.loop.stop();
    g.applyQualityPreset('high');
    const tupac = [...g.units.values()].find((u) => u.tag === 'tupac_yupanqui');
    const enemy = [...g.buildings.values()].find((b) => b.owner === 1 && b.kind === 'center' && !b.dead);
    if (tupac && enemy)
      tupac.pos.set(enemy.pos.x - 18, g.terrain.getHeight(enemy.pos.x - 18, enemy.pos.z), enemy.pos.z);
    // Paramonga falls and the canal objective activates before the army reaches the gate.
    for (let i = 1; i <= 180; i++) g.update(1 / 60, i / 60);
    // Reach the canal: the gate unlocks but the objective stays active until it is closed.
    const canal = g.canalSite;
    if (tupac && canal) tupac.pos.set(canal.x, g.terrain.getHeight(canal.x, canal.z), canal.z);
    for (let i = 181; i <= 200; i++) g.update(1 / 60, i / 60);
    g.selectedUnits = [];
    g.selectedBuilding = null;
    g.selectedHeritage = 'chimu_canal';
    g.refreshSelectionVisuals();
    if (canal) g.camera.focusOn(canal.x, canal.z);
    for (let i = 201; i <= 400; i++) g.update(1 / 60, i / 60);
    g.runtime.render();
    g.characterLabels?.setVisible(false);
  });
  await page.waitForTimeout(400);
  const gate = path.join(OUT, 'm6-canal-gate.png');
  await page.screenshot({ path: gate });
  console.log(`captured ${path.relative(process.cwd(), gate)}`);

  await page.getByRole('button', { name: /Cerrar compuerta/ }).click();
  const state = await page.evaluate(() => {
    const g = window.game;
    for (let i = 1; i <= 8; i++) g.update(1 / 60, i / 60);
    g.runtime.render();
    g.characterLabels?.setVisible(false);
    return {
      open: g.isCanalOpen(),
      objective: g.mission.getObjectiveState('obj_canal'),
      won: g.mission.won,
    };
  });
  console.log(`canal ${state.open ? 'open' : 'closed'}, objective ${state.objective}, victory ${state.won === true}`);
  await page.waitForTimeout(400);
  const closed = path.join(OUT, 'm6-canal-victory.png');
  await page.screenshot({ path: closed });
  console.log(`captured ${path.relative(process.cwd(), closed)}`);
} finally {
  await browser.close();
  await close();
}
