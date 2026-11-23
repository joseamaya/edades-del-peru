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
/** Missions added on 2026-11-18, the generation the `--only=new` shortcut captures. */
const NEW_GENERATION = '2026-11-18';

const MISSIONS = [
  { id: 'm3_moche_recuay', object: 'moche_site', phase: 'in_use' },
  { id: 'm4_wari', object: 'wari_site', phase: 'in_use' },
  { id: 'm5_yahuar_pampa', object: 'chanca_site', phase: 'in_use', height: 45 },
  { id: 'm6_chimu_inca', object: 'chimu_site', phase: 'in_use', height: 45 },
  { id: 'm6b_guerra_civil', object: 'cusco_inca_site', phase: 'in_use' },
  { id: 'm7_tupac_amaru', object: 'colonial_site', phase: 'in_use', height: 42 },
  { id: 'm8_independencia', object: 'independence_site', phase: 'in_use', height: 45 },
  { id: 'm9_guerra_pacifico', object: 'arica_site', phase: 'in_use', height: 40 },
  { id: 'm_lima', object: 'colonial_site', phase: 'ciudad' },
  { id: 'm_junta_cusco', object: 'colonial_site', phase: null, height: 40 },
  { id: 'm_tambotoco', object: 'ayllu_site', phase: 'fundada', at: { x: 138, z: 162 }, height: 38, heroes: true },
  // The seven missions added on 2026-11-18. `object` is the scene name the site is attached under and `note`
  // is what the capture actually shows — four of these sites are `hideModel: true`, so no reused GLB is drawn
  // and the mission builds its own scenery; the review has to judge that, not a kit that is not on screen.
  {
    id: 'm_lima_1821',
    added: NEW_GENERATION,
    object: 'colonial_site',
    phase: 'ciudad',
    at: { x: 90, z: 150 },
    height: 38,
    note: 'kit colonial reutilizado (plaza y casas)',
  },
  {
    id: 'm_miraflores',
    added: NEW_GENERATION,
    object: 'colonial_site',
    phase: 'ciudad',
    at: { x: 100, z: 150 },
    height: 42,
    note: 'kit colonial de fondo; la línea de reductos es procedural',
  },
  {
    id: 'm_real_felipe',
    added: NEW_GENERATION,
    object: 'arica_site',
    phase: null,
    height: 44,
    note: 'procedural: el GLB de Arica no se dibuja (hideModel), traza abaluartada de la misión',
  },
  {
    id: 'm_tarapaca',
    added: NEW_GENERATION,
    object: 'arica_site',
    phase: null,
    height: 40,
    note: 'procedural: el GLB de Arica no se dibuja (hideModel), aldea de la quebrada',
  },
  {
    id: 'm_vilcabamba',
    added: NEW_GENERATION,
    object: 'chanca_site',
    phase: null,
    height: 36,
    note: 'procedural: el GLB de Chanca no se dibuja (hideModel), fuerte de Vilcabamba',
  },
  {
    id: 'm_cusco_1536',
    added: NEW_GENERATION,
    object: 'cusco_inca_site',
    phase: null,
    height: 48,
    note: 'procedural: el ushnu del GLB está oculto (hideModel), plaza y salones de la misión',
  },
  {
    id: 'm_brena',
    added: NEW_GENERATION,
    object: 'independence_site',
    phase: null,
    at: { x: 180, z: 95 },
    height: 40,
    note: 'kit de Independencia reutilizado; el pueblo de Huamachuco es procedural',
  },
];

const onlyArg = cliArg('only', '');
const only =
  onlyArg === 'all'
    ? []
    : onlyArg === 'new'
      ? MISSIONS.filter((m) => m.added === NEW_GENERATION).map((m) => m.id)
      : onlyArg.split(',').filter(Boolean);
if (only.length) {
  const known = new Set(MISSIONS.map((m) => m.id));
  const unknown = only.filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`unknown mission id(s): ${unknown.join(', ')}`);
}
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
      { object: mission.object, heroes: !!mission.heroes },
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
    captured.push({ id: mission.id, object: mission.object, phase: mission.phase, file: out });
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
  // Every capture in the folder, so a run that only fills in some missions still composes the whole sheet.
  const order = (id) => MISSIONS.findIndex((m) => m.id === id);
  const shots = fs
    .readdirSync(outDir)
    .filter((name) => name.endsWith('.png'))
    .map((name) => ({ id: name.slice(0, -4), file: path.join(outDir, name) }))
    .filter((shot) => order(shot.id) >= 0)
    .sort((a, b) => order(a.id) - order(b.id));
  if (!shots.length) return;
  const columns = Math.min(3, shots.length);
  const rows = Math.ceil(shots.length / columns);
  const composites = [];
  for (let i = 0; i < shots.length; i++) {
    const x = (i % columns) * CELL_W;
    const y = Math.floor(i / columns) * (CELL_H + CAPTION);
    composites.push({
      input: await sharp(shots[i].file).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer(),
      left: x,
      top: y,
    });
    composites.push({ input: caption(shots[i].id), left: x, top: y + CELL_H });
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

/** Existing decision rows, so a second capture run cannot wipe a worksheet the human already filled. */
function readDecisions(file) {
  const kept = new Map();
  if (!fs.existsSync(file)) return kept;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6) continue;
    const id = cells[0]
      .replace(/^`/, '')
      .replace(/`$/, '')
      .replace(/\.png$/, '');
    if (!id) continue;
    const [decision = '', severity = '', reason = ''] = cells.slice(3);
    if (decision && decision !== '_pendiente_') kept.set(id, { decision, severity, reason });
  }
  return kept;
}

/** One row per capture; decisions stay empty until a human fills them. */
function writeWorksheet() {
  const today = new Date().toISOString().slice(0, 10);
  const file = path.join(outDir, 'decisions.md');
  const kept = readDecisions(file);
  // Every capture in the folder, in mission order, so a run that re-shoots one mission cannot drop the rest.
  const order = (id) => MISSIONS.findIndex((m) => m.id === id);
  const ids = fs
    .readdirSync(outDir)
    .filter((name) => name.endsWith('.png'))
    .map((name) => name.slice(0, -4))
    .filter((id) => order(id) >= 0)
    .sort((a, b) => order(a) - order(b));
  const rows = ids
    .map((id) => {
      const mission = MISSIONS[order(id)];
      const previous = kept.get(id);
      const cells = previous ? [previous.decision, previous.severity, previous.reason] : ['_pendiente_', '', ''];
      return `| \`${id}.png\` | \`${mission.object}\` | ${mission.note ?? '—'} | ${cells.join(' | ')} |`;
    })
    .join('\n');
  const body = `# Revisión de arte humana — sitios

Capturas: \`${outDir}\`${sheetFile ? ` · hoja: \`${sheetFile}\`` : ''}

Criterios: [\`docs/design/art-direction.md\`](../../docs/design/art-direction.md) §6 — el checklist completo,
la escala de severidad y la regla de «no captura vieja». Una captura de sitio es **una** vista RTS a zoom 54, así
que el primer punto de §6 (tres vistas y antes/después) sigue aplicando a los renders que se publican, no a
esta hoja; si algo no se lee, se abre la captura individual a 1600×900.

Decisión y destino:

- \`aprobado\` → fila **Art** \`Met\` en la quality bar.
- \`menor\` → \`Met\` con el detalle en B22 (se arregla después).
- \`mayor\` → \`Partial\` y una fila de backlog con su antes/después.
- \`rechazo\` → no se publica: el kit se sustituye o se revierte, y la fila Art queda \`Pending\` con el blocker.

| Captura | Objeto de escena | Qué muestra la captura | Decisión | Severidad | Motivo |
| --- | --- | --- | --- | --- | --- |
${rows}

Revisor: \`…\` · Fecha: ${today} (actualizar al firmar).

**Después de decidir:** la fila **Art** de cada misión en
[\`docs/design/campaign-quality-bar.md\`](../../docs/design/campaign-quality-bar.md) con \`Met\` o \`Partial\`,
revisor y fecha; una sección de evidencia en [\`PROVENANCE.md\`](../../PROVENANCE.md) si la captura pasa a ser
la referencia; y cada \`mayor\` a una fila de [\`docs/plan/backlog.md\`](../../docs/plan/backlog.md).
`;
  fs.writeFileSync(file, body);
  console.log(`worksheet: ${file}`);
}

if (sheetFile) await composeSheet(sheetFile);
writeWorksheet();
