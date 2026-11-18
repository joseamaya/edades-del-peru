import fs from 'node:fs';
import path from 'node:path';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Capture one current site view per model mission for the pending D2 art review.
 *
 * Loads the mission, starts it, advances the site to its final phase, frames the site with the HUD
 * hidden and writes a 1600x900 PNG to `review/site-review/`. These are review evidence, not new
 * shipped art: the committed intro/renders stay untouched.
 *
 * Usage: node scripts/capture_site_review.mjs [--only=m3_moche_recuay,m4_wari] [--out=review/site-review]
 */
const MISSIONS = [
  { id: 'm3_moche_recuay', site: 'moche_site', phase: 'in_use' },
  { id: 'm4_wari', site: 'wari_site', phase: 'in_use' },
  { id: 'm5_yahuar_pampa', site: 'chanca_site', phase: 'in_use' },
  { id: 'm6_chimu_inca', site: 'chimu_site', phase: 'in_use' },
  { id: 'm6b_guerra_civil', site: 'cusco_inca_site', phase: 'in_use' },
  { id: 'm7_tupac_amaru', site: 'colonial_site', phase: 'in_use' },
  { id: 'm8_independencia', site: 'independence_site', phase: 'in_use' },
  { id: 'm9_guerra_pacifico', site: 'arica_site', phase: 'in_use' },
  { id: 'm_lima', site: 'colonial_site', phase: 'ciudad' },
  { id: 'm_junta_cusco', site: 'colonial_site', phase: null },
  { id: 'm_tambotoco', site: 'ayllu_site', phase: 'fundada', at: { x: 138, z: 162 }, heroes: true },
];

const only = cliArg('only', '').split(',').filter(Boolean);
const outDir = cliArg('out', path.join(reviewDir(), 'site-review'));
fs.mkdirSync(outDir, { recursive: true });

const { base, close } = await withViteServer();
const browser = await launchChromium();
try {
  for (const mission of MISSIONS) {
    if (only.length && !only.includes(mission.id)) continue;
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    await page.goto(`${base}/?mission=${mission.id}&intro=0&fog=0&low=1&noloop=1&seed=777`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 90_000 });
    await page
      .locator('.ed-overlay')
      .getByRole('button', { name: /COMENZAR MISIÓN/ })
      .click({ timeout: 15_000 })
      .catch(() => {});
    await page.waitForFunction(
      ({ site, heroes }) => {
        const g = window.game;
        const object = g?.landmark?.getObjectByName(site);
        if (!object) return false;
        if (heroes && !object.userData.heroesReady) return false;
        return (g.settlementDressing ?? []).every((d) => d.attached !== false);
      },
      { site: mission.site, heroes: !!mission.heroes },
      { timeout: 90_000 },
    );
    await page.evaluate(
      ({ phase, at }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        document.getElementById('ui-root')?.style.setProperty('display', 'none');
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 70;
        if (phase && g.sitePhasePlan) g.setSitePhase(phase);
        const site = at ?? (g.siteCenter ? { ...g.siteCenter } : g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 }));
        g.camera.moveTo(site.x, site.z, true);
        g.camera.setHeight(at ? 45 : 70);
        let t = 1;
        for (let i = 0; i < 50; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
      },
      { phase: mission.phase, at: mission.at ?? null },
    );
    await page.waitForTimeout(800);
    const out = path.join(outDir, `${mission.id}.png`);
    await page.screenshot({ path: out });
    console.log(out);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}
