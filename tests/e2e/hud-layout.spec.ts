import { test, expect, type Page } from '@playwright/test';
import { MISSIONS } from '../../src/campaign/defs/campaign';

/**
 * Geometric check of the in-match HUD: the persistent panels must never cover each other at the
 * reference resolutions, including late in a mission (many finished objectives, archive expanded,
 * shortcuts open). It compares bounding boxes (not pixels) so it stays deterministic under
 * software WebGL.
 */
const PANELS = [
  'ed-dialogue',
  'ed-bottom',
  'ed-minimap-wrap',
  'ed-objectives',
  'ed-tutorial',
  'ed-help',
  'ed-help-open',
] as const;

const MISSION_IDS = MISSIONS.map((m) => m.id);

/**
 * Every mission runs at the smallest reference size; the larger review sizes boot only Caral, the
 * model mission and the one the issue measured (m1_caral). Software WebGL makes a 1920×1080 boot
 * expensive, and ten of them starved the CI shard.
 */
const RESOLUTIONS = [
  { width: 1280, height: 720, missions: MISSION_IDS },
  { width: 1600, height: 900, missions: ['m1_caral'] },
  { width: 1920, height: 1080, missions: ['m1_caral'] },
] as const;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type State = Record<string, Box | null>;

interface Snapshots {
  initial: State;
  dialogue: State;
  build: State;
  building: State;
  postTutorial: State;
  advanced: State;
  archive: State;
  helpOpen: State;
}

/** Boot a campaign mission, start it from the briefing and dismiss its chapter card. */
async function bootMission(page: Page, missionId: string): Promise<void> {
  await page.goto(`/?mission=${missionId}&seed=777&fog=0&low=1&intro=0`);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /COMENZAR MISIÓN/ }).click({ timeout: 30_000 });
  const ready = await page.waitForFunction(
    () => {
      const card = document.querySelector<HTMLElement>('.ed-mission-card');
      if (card) {
        card.click();
        return false;
      }
      const objectives = document.getElementById('ed-objectives');
      return !!objectives && getComputedStyle(objectives).display !== 'none' && !!objectives.textContent?.trim();
    },
    null,
    { timeout: 30_000, polling: 100 },
  );
  expect(await ready.jsonValue()).toBe(true);
  // measure the mission's own first tutorial step, not a fixture (CI software WebGL is slow)
  await page.waitForSelector('#ed-tutorial.show', { timeout: 60_000 });
}

/**
 * Stop the simulation and snapshot the HUD: the real start state, with dialogue, with a worker's
 * build panel, with a building panel, after the tutorial closes, with a late-mission objective list
 * (archive folded and expanded) and with the shortcuts panel open.
 */
async function snapshots(page: Page): Promise<Snapshots> {
  return page.evaluate(async (panels) => {
    const g = (window as unknown as { game: any }).game;
    const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 60));
    g.loop.stop();

    const shownByClass = new Set(['ed-dialogue', 'ed-tutorial']);
    const read = () => {
      const out: Record<string, { x: number; y: number; w: number; h: number } | null> = {};
      for (const id of panels) {
        const el = document.getElementById(id);
        if (!el) {
          out[id] = null;
          continue;
        }
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const hidden =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          rect.width <= 0 ||
          rect.height <= 0 ||
          (shownByClass.has(id) && !el.classList.contains('show'));
        out[id] = hidden ? null : { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }
      return out;
    };
    const render = async () => {
      g.hud.update(0.2, 0);
      await settle();
      g.hud.update(0.2, 0);
      await settle();
    };

    await render();
    const initial = read();

    g.mission.triggerDialogue(
      'Voz del valle: —La obra no puede parar; defiende la chacra mientras llega la comida del depósito comunal.',
      600,
    );
    await render();
    const dialogue = read();

    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as
      { id: number } | undefined;
    if (!worker) throw new Error('the mission has no player worker to open the build panel');
    g.selectUnits([worker.id]);
    await render();
    const build = read();

    const building = [...g.buildings.values()].find((b: any) => b.owner === 0 && !b.dead) as { id: number } | undefined;
    if (!building) throw new Error('the mission has no player building to open its panel');
    g.selectBuilding(building.id);
    await render();
    const buildingSnap = read();

    // The shortcuts start folded in a campaign; closing the tutorial must not reveal them.
    g.hud.hideTutorial();
    await render();
    const postTutorial = read();

    // Late mission: every objective finished except the first, which stays active.
    const defs = g.mission.def.objectives as { id: string }[];
    for (const o of defs) g.mission.objState.set(o.id, 'completed');
    g.mission.objState.set(defs[0].id, 'activo');
    await render();
    const advanced = read();

    // The finished goals are folded into one archive line that expands on click.
    document.querySelector('#ed-objectives details')?.setAttribute('open', '');
    await render();
    const archive = read();

    // Opening the shortcuts must still leave every panel in its own place.
    g.hud.toggleHelp();
    await render();
    const helpOpen = read();

    return { initial, dialogue, build, building: buildingSnap, postTutorial, advanced, archive, helpOpen };
  }, PANELS);
}

function overlaps(a: Box, b: Box): boolean {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return width > 0.5 && height > 0.5;
}

function violations(state: State): string[] {
  const found: string[] = [];
  const visible = Object.entries(state).filter((entry): entry is [string, Box] => entry[1] !== null);
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [idA, a] = visible[i];
      const [idB, b] = visible[j];
      if (overlaps(a, b)) {
        found.push(`#${idA} ${JSON.stringify(a)} overlaps #${idB} ${JSON.stringify(b)}`);
      }
    }
  }
  return found;
}

/** The objectives panel must end above the command bar. */
function objectivesFit(state: State): string[] {
  const found: string[] = [];
  const panel = state['ed-objectives'];
  const bar = state['ed-bottom'];
  if (panel && bar && panel.y + panel.h > bar.y + 0.5) {
    found.push(`objectives end at ${panel.y + panel.h} over the command bar at ${bar.y}`);
  }
  return found;
}

for (const { width, height, missions } of RESOLUTIONS) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    for (const missionId of missions) {
      test(`the HUD panels do not overlap in ${missionId}`, { tag: '@smoke' }, async ({ page }) => {
        test.setTimeout(120_000);
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await bootMission(page, missionId);
        const snap = await snapshots(page);

        // The check is only meaningful if the panels under test are actually laid out.
        expect(snap.initial['ed-objectives'], 'objectives panel is not visible').not.toBeNull();
        expect(snap.initial['ed-tutorial'], 'tutorial panel is not visible').not.toBeNull();
        expect(snap.initial['ed-minimap-wrap'], 'minimap is not visible').not.toBeNull();
        expect(snap.dialogue['ed-dialogue'], 'dialogue box is not visible').not.toBeNull();
        expect(snap.build['ed-bottom'], 'command panel is not visible with a worker selected').not.toBeNull();
        expect(snap.building['ed-bottom'], 'command panel is not visible with a building selected').not.toBeNull();
        expect(snap.postTutorial['ed-help'], 'the shortcuts start folded in a campaign (issue 402)').toBeNull();
        expect(snap.postTutorial['ed-help-open'], 'the "?" button gives access to the shortcuts').not.toBeNull();
        expect(snap.helpOpen['ed-help'], 'the shortcuts open on demand').not.toBeNull();
        expect(snap.archive['ed-objectives'], 'the late-mission objectives are visible').not.toBeNull();

        expect(violations(snap.initial), 'start state').toEqual([]);
        expect(violations(snap.dialogue), 'dialogue over the command panel').toEqual([]);
        expect(violations(snap.build), 'worker build panel').toEqual([]);
        expect(violations(snap.building), 'building panel').toEqual([]);
        expect(violations(snap.postTutorial), 'shortcuts folded').toEqual([]);
        expect(violations(snap.advanced), 'late mission, archive folded').toEqual([]);
        expect(violations(snap.archive), 'late mission, archive expanded').toEqual([]);
        expect(violations(snap.helpOpen), 'shortcuts open over a long objective list').toEqual([]);
        expect(objectivesFit(snap.archive), 'expanded objectives reach the command bar').toEqual([]);
        expect(objectivesFit(snap.helpOpen), 'objectives reach the command bar with the shortcuts open').toEqual([]);

        // The active goal is the first current row and stays wholly visible, even with the archive open.
        const fit = await page.evaluate(() => {
          const g = (window as unknown as { game: any }).game;
          const panel = document.getElementById('ed-objectives')!;
          const current = panel.querySelector('.obj-current')!;
          const active = current.querySelector('.obj');
          const pr = panel.getBoundingClientRect();
          const cr = current.getBoundingClientRect();
          const ar = active?.getBoundingClientRect() ?? null;
          return {
            expected: g.mission.def.objectives[0].title as string,
            text: active?.textContent ?? '',
            inside: !!ar && ar.top >= cr.top - 0.5 && ar.bottom <= cr.bottom + 0.5 && ar.bottom <= pr.bottom + 0.5,
          };
        });
        expect(fit.text, 'the late mission keeps its first objective visible').toContain(fit.expected);
        expect(fit.inside, 'the active objective is fully visible').toBe(true);
        expect(errors).toEqual([]);
      });
    }
  });
}
