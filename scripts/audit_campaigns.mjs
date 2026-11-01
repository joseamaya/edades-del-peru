import fs from 'node:fs';
import path from 'node:path';
import { launchChromium, withViteServer, reviewDir } from './lib.mjs';

const MISSIONS = [
  ['m1_caral', 'La Ciudad Sagrada'],
  ['m2_chavin', 'El Oráculo de Chavín'],
  ['m3_moche_recuay', 'La Frontera de los Valles'],
  ['m4_wari', 'El Horizonte Medio'],
  ['m5_yahuar_pampa', 'Yahuar Pampa'],
  ['m6_chimu_inca', 'La Guerra del Norte'],
  ['m6b_guerra_civil', 'La Guerra Civil'],
  ['m7_tupac_amaru', 'La Gran Rebelión'],
  ['m8_independencia', 'La Independencia'],
  ['m9_guerra_pacifico', 'La Defensa de Arica'],
];

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1600, height: 900 },
];

const outDir = path.join(reviewDir(), 'audit');
fs.mkdirSync(outDir, { recursive: true });
const report = { startedAt: new Date().toISOString(), missions: [], global: {}, issues: [] };

function issue(scope, kind, detail) {
  report.issues.push({ scope, kind, detail });
}

function inside(box, viewport) {
  return (
    box &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width + 0.5 &&
    box.y + box.height <= viewport.height + 0.5
  );
}

async function openMission(page, base, id, artAll = true) {
  const art = artAll ? '&art=all' : '';
  await page.goto(`${base}/?mission=${id}&seed=777&fog=0&low=1&intro=0${art}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 60_000 });
}

async function startMission(page) {
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 30_000 });
  await start.click();
  await page
    .locator('.ed-overlay')
    .filter({ hasText: 'COMENZAR MISIÓN' })
    .waitFor({ state: 'detached', timeout: 15_000 })
    .catch(() => {});
}

async function auditLayout(browser, base, id, title, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
  });

  const entry = { id, title, viewport, layout: {}, errors };
  await openMission(page, base, id);
  const briefing = page.locator('.ed-briefing');
  await briefing.waitFor({ state: 'visible', timeout: 30_000 });
  entry.layout.briefing = await briefing.boundingBox();
  entry.layout.briefingText = (await briefing.innerText()).slice(0, 1200);
  entry.layout.art = await page.locator('.ed-briefing .ed-art img').count();
  if (!inside(entry.layout.briefing, viewport))
    issue(id, 'layout', `briefing outside ${viewport.width}x${viewport.height}`);

  await startMission(page);
  const tutorial = page.locator('#ed-tutorial.show');
  await tutorial.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  const tutorialVisible = await tutorial.isVisible().catch(() => false);
  entry.layout.tutorialVisible = tutorialVisible;
  if (tutorialVisible) entry.layout.tutorial = await tutorial.boundingBox();
  const objectivePanel = page.locator('#ed-objectives');
  await objectivePanel.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const objectives = await objectivePanel.boundingBox();
  entry.layout.objectives = objectives;
  if (!inside(entry.layout.tutorial, viewport) && tutorialVisible)
    issue(id, 'layout', `tutorial outside ${viewport.width}x${viewport.height}`);
  if (!inside(objectives, viewport)) issue(id, 'layout', `objectives outside ${viewport.width}x${viewport.height}`);
  if (!tutorialVisible) issue(id, 'tutorial', `tutorial not visible at ${viewport.width}x${viewport.height}`);

  if (viewport.width === 1600) {
    await page.screenshot({ path: path.join(outDir, `${id}-1600.png`) });
  }
  for (const error of errors) issue(id, 'runtime', error);
  await context.close();
  report.missions.push(entry);
}

async function auditVictory(browser, base, id, title) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await openMission(page, base, id);
  await startMission(page);
  await page.evaluate(() => window.game.showVictory(0));
  const epilogue = page.locator('.ed-epilogue');
  await epilogue.waitFor({ state: 'visible', timeout: 15_000 });
  const text = await epilogue.innerText();
  const buttons = await epilogue.getByRole('button').allTextContents();
  const entry = { id, title, text: text.slice(0, 1800), buttons, errors };
  if (!text.includes('VICTORIA')) issue(id, 'victory', 'victory heading missing');
  if (!text.includes('Epílogo')) issue(id, 'victory', 'epilogue missing');
  if (!text.includes('Códice')) issue(id, 'victory', 'codex hint missing');
  for (const error of errors) issue(id, 'runtime', error);
  await page.screenshot({ path: path.join(outDir, `${id}-victory.png`) });
  report.missions.push({ ...entry, phase: 'victory' });
  await context.close();
}

async function auditChapterCard(browser, base) {
  const viewport = { width: 1600, height: 900 };
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto(`${base}/?mission=m1_caral&seed=777&fog=0&low=1&art=all`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game?.mission !== undefined, null, { timeout: 60_000 });
  const start = page.getByRole('button', { name: /COMENZAR MISIÓN/ });
  await start.waitFor({ state: 'visible', timeout: 30_000 });
  await start.click();
  const card = page.locator('.ed-mission-card');
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  const box = await card.boundingBox();
  const objectives = page.locator('#ed-objectives');
  const objectivesDuringCard = await objectives.isVisible().catch(() => false);
  const held = await page.evaluate(() => (window.game?.mission?.timer ?? 0) === 0);
  if (!inside(box, viewport)) issue('m1_caral', 'layout', 'chapter card outside 1600x900');
  if (objectivesDuringCard) issue('m1_caral', 'layout', 'objectives visible behind the chapter card');
  if (!held) issue('m1_caral', 'objective', 'mission clock runs behind the chapter card');
  await page.screenshot({ path: path.join(outDir, 'm1_caral-card-1600.png') });
  await page.evaluate(() => document.querySelector('.ed-mission-card')?.click());
  await card.waitFor({ state: 'detached', timeout: 5000 });
  await objectives.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const objectivesAfterCard = await objectives.isVisible().catch(() => false);
  if (!objectivesAfterCard) issue('m1_caral', 'layout', 'objectives hidden after the chapter card');
  for (const error of errors) issue('m1_caral', 'runtime', error);
  report.missions.push({
    id: 'm1_caral',
    phase: 'chapter-card',
    layout: { card: box, objectivesDuringCard, objectivesAfterCard, clockHeld: held },
    errors,
  });
  await context.close();
}

async function auditGlobal(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.goto(`${base}/?menu=1&art=all`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page.getByRole('button', { name: /Campañas/ }).click();
  const intro = page.locator('.ed-cinematic');
  if (await intro.isVisible().catch(() => false)) {
    await intro.getByRole('button', { name: /Ver misiones/ }).click();
  }
  const hub = page.locator('.ed-campaign-panel');
  await hub.waitFor({ state: 'visible', timeout: 15_000 });
  const cards = await hub.locator('.ed-campaign-card').count();
  const buttons = await hub.getByRole('button').allTextContents();
  const preparing = await hub.getByText('En preparación').count();
  report.global.hub = { cards, buttons, preparing };
  if (cards !== 4) issue('hub', 'content', `expected 4 campaign cards, got ${cards}`);
  if (preparing !== 0) issue('hub', 'content', `found ${preparing} "En preparación" labels`);
  await page.screenshot({ path: path.join(outDir, 'hub.png') });

  await page.goto(`${base}/?menu=1&art=all`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });
  await page.getByRole('button', { name: /Códice/ }).click();
  const codex = page.locator('#ed-codex');
  await codex.waitFor({ state: 'visible', timeout: 15_000 });
  report.global.codex = (await codex.innerText()).slice(0, 1200);
  await page.screenshot({ path: path.join(outDir, 'codex.png') });
  for (const error of errors) issue('global', 'runtime', error);
  await context.close();
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    await auditGlobal(browser, base);
    await auditChapterCard(browser, base);
    for (const [id, title] of MISSIONS) {
      for (const viewport of VIEWPORTS) await auditLayout(browser, base, id, title, viewport);
      await auditVictory(browser, base, id, title);
      console.log(`audited ${id}`);
    }
  } finally {
    await browser.close();
    await close();
  }
  report.finishedAt = new Date().toISOString();
  report.ok = report.issues.length === 0;
  fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({ ok: report.ok, issues: report.issues.length, report: path.join(outDir, 'report.json') }, null, 2),
  );
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
