import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Capture one current site view per model mission for the pending D2 art review, compose the contact sheet
 * and write the decision worksheet the human fills in.
 *
 * Loads the mission, starts it, advances the site to its final phase, frames the site with the HUD hidden and
 * writes a 1600x900 PNG to `review/site-review/`. These are review evidence, not new shipped art: the committed
 * intro/renders stay untouched.
 *
 * Usage: node scripts/capture_site_review.mjs [--only=m3_moche_recuay,m4_wari] [--out=review/site-review]
 *        [--sheet=review/site-review/sheet.webp]
 *
 * `--only` also accepts a generation name: `--only=new` captures the seven missions added on 2026-11-18,
 * `--only=all` the full set. Every run rewrites `<out>/decisions.md` (the worksheet) from the captures it made.
 */
const GENERATIONS = {
  new: ['m_lima_1821', 'm_miraflores', 'm_real_felipe', 'm_tarapaca', 'm_vilcabamba', 'm_cusco_1536', 'm_brena'],
};

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
  // The seven missions added on 2026-11-18 reuse an existing site GLB (`object` is the scene name it is
  // attached under), which is exactly what the review has to judge: does the kit read for this mission?
  { id: 'm_lima_1821', site: 'lima_site', object: 'colonial_site', phase: 'ciudad', height: 38 },
  // The redoubt line is drawn procedurally around the played area, not under a named site object: keep the
  // authored opening framing instead of inventing a centre.
  { id: 'm_miraflores', site: 'miraflores_site', object: 'colonial_site', phase: 'ciudad', authored: true },
  { id: 'm_real_felipe', site: 'real_felipe_site', object: 'arica_site', phase: null, height: 44 },
  { id: 'm_tarapaca', site: 'tarapaca_site', object: 'arica_site', phase: null, height: 40 },
  { id: 'm_vilcabamba', site: 'vilcabamba_site', object: 'chanca_site', phase: null, height: 36 },
  { id: 'm_cusco_1536', site: 'cusco_inca_site', object: 'cusco_inca_site', phase: null, height: 48 },
  { id: 'm_brena', site: 'brena_site', object: 'independence_site', phase: null, authored: true },
];

const onlyArg = cliArg('only', '');
const only = onlyArg === 'all' ? [] : onlyArg === 'new' ? GENERATIONS.new : onlyArg.split(',').filter(Boolean);
const outDir = cliArg('out', path.join(reviewDir(), 'site-review'));
const sheetFile = cliArg('sheet', '');
fs.mkdirSync(outDir, { recursive: true });

const captured = [];
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
      ({ object, heroes }) => {
        const g = window.game;
        const found = g?.landmark?.getObjectByName(object);
        if (!found) return false;
        if (heroes && !found.userData.heroesReady) return false;
        return (g.settlementDressing ?? []).every((d) => d.attached !== false);
      },
      { object: mission.object ?? mission.site, heroes: !!mission.heroes },
      { timeout: 90_000 },
    );
    await page.evaluate(
      ({ phase, at, height, authored }) => {
        const g = window.game;
        document.querySelector('.ed-mission-card')?.remove();
        document.getElementById('ui-root')?.style.setProperty('display', 'none');
        const rings = g.scene.getObjectByName('mission-rings');
        if (rings) rings.visible = false;
        g.applyQualityPreset('high');
        g.trees.kitLod0Radius = 70;
        if (phase && g.sitePhasePlan) g.setSitePhase(phase);
        if (!authored) {
          const site =
            at ?? (g.siteCenter ? { ...g.siteCenter } : g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 }));
          g.camera.moveTo(site.x, site.z, true);
          g.camera.setHeight(height ?? (at ? 45 : 70));
        }
        let t = 1;
        for (let i = 0; i < 50; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
      },
      { phase: mission.phase, at: mission.at ?? null, height: mission.height ?? null, authored: !!mission.authored },
    );
    await page.waitForTimeout(800);
    const out = path.join(outDir, `${mission.id}.png`);
    await page.screenshot({ path: out });
    captured.push({ id: mission.id, object: mission.object ?? mission.site, phase: mission.phase, file: out });
    console.log(out);
    await page.close();
  }
} finally {
  await browser.close();
  await close();
}

const CAPTION = 26;
const CELL_W = 640;
const CELL_H = 360;

const caption = (text) =>
  Buffer.from(
    `<svg width="${CELL_W}" height="${CAPTION}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" fill="#0b0f14"/>
       <text x="10" y="18" fill="#d9c27a" font-family="DejaVu Sans" font-size="14">${text}</text>
     </svg>`,
  );

async function composeSheet(file) {
  if (!captured.length) return;
  const columns = Math.min(3, captured.length);
  const rows = Math.ceil(captured.length / columns);
  const composites = [];
  for (let i = 0; i < captured.length; i++) {
    const x = (i % columns) * CELL_W;
    const y = Math.floor(i / columns) * (CELL_H + CAPTION);
    composites.push({
      input: await sharp(captured[i].file).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer(),
      left: x,
      top: y,
    });
    composites.push({ input: caption(captured[i].id), left: x, top: y + CELL_H });
  }
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  await sharp({
    create: { width: columns * CELL_W, height: rows * (CELL_H + CAPTION), channels: 3, background: '#0b0f14' },
  })
    .composite(composites)
    .webp({ quality: 78 })
    .toFile(path.resolve(file));
  console.log(`sheet: ${file}`);
}

/** The worksheet a human fills: one row per capture, decisions left empty on purpose. */
function writeWorksheet() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = captured
    .map((c) => `| \`${c.id}.png\` | \`${c.object}\` | ${c.phase ?? '—'} | _pendiente_ | | |`)
    .join('\n');
  const body = `# Revisión de arte humana — sitios

Capturas: \`${outDir}\`${sheetFile ? ` · hoja: \`${sheetFile}\`` : ''}

Criterios: [\`docs/design/art-direction.md\`](../../docs/design/art-direction.md) §6.

- [ ] La escena se reconoce a zoom RTS (54) y el hito se lee.
- [ ] Mismo lenguaje material que sus vecinas (sin choque foto/plano).
- [ ] Paleta dentro de §5; saturación sólo donde la interacción o el ritual lo pidan.
- [ ] Transiciones de terreno suaves y geográficas; sin tiling visible a 54.
- [ ] El suelo recibe sombras direccionales; nada flota.
- [ ] Sin anacronismo ni especie, estructura o persona sin fuente.
- [ ] Dentro de los presupuestos (§7) y \`yarn bench:check\`.
- [ ] Procedencia registrada y captura RTS adjunta a la PR.

**Severidad:** *Blocker* (historia incorrecta, asset sin licencia, silueta ilegible a 54, geometría flotante,
fuente ausente) · *Major* (choque de materiales, tiling, paleta fuera de banda, draws sobre presupuesto,
iluminación plana) · *Minor* (micro-detalle, ruido de textura, prop que sólo se ve de cerca).

| Captura | Objeto de escena | Fase | Decisión | Severidad | Motivo |
| --- | --- | --- | --- | --- | --- |
${rows}

Revisor: \`…\` · Fecha: ${today} (actualizar al firmar).

**Después de decidir:** la fila **Art** de cada misión en
[\`docs/design/campaign-quality-bar.md\`](../../docs/design/campaign-quality-bar.md) con \`Met\` o \`Partial\`,
revisor y fecha; una sección de evidencia en [\`PROVENANCE.md\`](../../PROVENANCE.md) si la captura pasa a
ser la referencia; y cada \`Major\` a una fila del backlog con su antes/después.
`;
  const file = path.join(outDir, 'decisions.md');
  fs.writeFileSync(file, body);
  console.log(`worksheet: ${file}`);
}

if (sheetFile) await composeSheet(sheetFile);
writeWorksheet();
