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
  threePanels: State;
  postTutorial: State;
  advanced: State;
  archive: State;
  helpOpen: State;
  activeTitle: string;
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

    // Issue 402: with the tutorial open, opening the shortcuts must keep three panels in the column.
    (document.getElementById('ed-help-open') as HTMLElement | null)?.click();
    await render();
    const threePanels = read();
    document.querySelector<HTMLElement>('#ed-help .ed-help-close')?.click();
    await render();

    // The shortcuts start folded in a campaign; closing the tutorial must not reveal them.
    g.hud.hideTutorial();
    await render();
    const postTutorial = read();

    // Late mission as the issue describes it: acts I-III finished and the Act IV goals still active.
    const defs = g.mission.def.objectives as { id: string; title: string }[];
    const lastAct = defs.filter((o) => /^Acto IV ·/.test(o.title));
    const remaining = lastAct.length ? lastAct : defs.slice(-2);
    for (const o of defs) g.mission.objState.set(o.id, remaining.includes(o) ? 'activo' : 'completed');
    const active = remaining[0];
    await render();
    const advanced = read();

    // The finished goals are folded into one archive line that expands on click.
    document.querySelector<HTMLElement>('#ed-objectives details > summary')?.click();
    await render();
    const archive = read();

    // Opening the shortcuts with the real button must still leave every panel in its own place.
    (document.getElementById('ed-help-open') as HTMLElement | null)?.click();
    await render();
    const helpOpen = read();

    return {
      initial,
      dialogue,
      build,
      building: buildingSnap,
      threePanels,
      postTutorial,
      advanced,
      archive,
      helpOpen,
      activeTitle: active.title,
    };
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
        // Issue 402: objectives, tutorial and shortcuts coexist without overlapping.
        expect(snap.threePanels['ed-objectives']).not.toBeNull();
        expect(snap.threePanels['ed-tutorial']).not.toBeNull();
        expect(snap.threePanels['ed-help']).not.toBeNull();

        expect(violations(snap.initial), 'start state').toEqual([]);
        expect(violations(snap.dialogue), 'dialogue over the command panel').toEqual([]);
        expect(violations(snap.build), 'worker build panel').toEqual([]);
        expect(violations(snap.building), 'building panel').toEqual([]);
        expect(violations(snap.threePanels), 'objectives, tutorial and shortcuts together').toEqual([]);
        expect(violations(snap.postTutorial), 'shortcuts folded').toEqual([]);
        expect(violations(snap.advanced), 'late mission, archive folded').toEqual([]);
        expect(violations(snap.archive), 'late mission, archive expanded').toEqual([]);
        expect(violations(snap.helpOpen), 'shortcuts open over a long objective list').toEqual([]);
        expect(objectivesFit(snap.archive), 'expanded objectives reach the command bar').toEqual([]);
        expect(objectivesFit(snap.helpOpen), 'objectives reach the command bar with the shortcuts open').toEqual([]);

        // The real Act IV goal stays wholly visible, even with the archive open.
        const fit = await page.evaluate(() => {
          const panel = document.getElementById('ed-objectives')!;
          const current = panel.querySelector('.obj-current')!;
          const active = current.querySelector('.obj');
          const pr = panel.getBoundingClientRect();
          const cr = current.getBoundingClientRect();
          const ar = active?.getBoundingClientRect() ?? null;
          return {
            text: active?.textContent ?? '',
            inside: !!ar && ar.top >= cr.top - 0.5 && ar.bottom <= cr.bottom + 0.5 && ar.bottom <= pr.bottom + 0.5,
          };
        });
        expect(fit.text, 'the late mission keeps its Act IV goal visible').toContain(snap.activeTitle);
        expect(fit.inside, 'the active objective is fully visible').toBe(true);

        // The archive opened with a real click on its summary, keeps a per-act summary and, when it
        // does not fit, actually scrolls so its last row is reachable inside the panel.
        const archive = await page.evaluate(() => {
          const panel = document.getElementById('ed-objectives')!;
          const details = panel.querySelector('details') as HTMLDetailsElement | null;
          if (!details) return null;
          const fits = details.scrollHeight <= details.clientHeight + 1;
          details.scrollTop = details.scrollHeight;
          const scrolled = details.scrollTop;
          // A re-render must keep the archive open and its scroll: flip a finished, non-filtered goal.
          const g = (window as unknown as { game: any }).game;
          const witness = (g.mission.def.objectives as { id: string; kind: string }[]).find(
            (o) => o.kind !== 'wait' && g.mission.objState.get(o.id) === 'completed',
          );
          if (!witness) return { missingWitness: true as const };
          g.mission.objState.set(witness.id, 'failed');
          g.hud.update(1, 0);
          const rebuilt = panel.querySelector('details') as HTMLDetailsElement | null;
          if (!rebuilt) return { missingRebuild: true as const };
          const rows = [...rebuilt.querySelectorAll<HTMLElement>('.obj')];
          const last = rows[rows.length - 1];
          const dr = rebuilt.getBoundingClientRect();
          const pr = panel.getBoundingClientRect();
          const rr = last?.getBoundingClientRect();
          return {
            fits,
            scrolled,
            rebuilt: rebuilt !== details,
            scrollKept: scrolled === rebuilt.scrollTop,
            open: rebuilt.open,
            summary: (rebuilt.querySelector('summary') as HTMLElement | null)?.textContent ?? '',
            rows: rows.length,
            text: last?.textContent ?? '',
            lastVisible: !!rr && rr.bottom <= Math.min(dr.bottom, pr.bottom) + 1 && rr.top >= dr.top - 1,
          };
        });
        expect(archive, 'the finished objectives fold into an archive').not.toBeNull();
        expect(archive && 'missingWitness' in archive, 'a finished goal to force a re-render').toBe(false);
        expect(archive && 'missingRebuild' in archive, 'the archive is rebuilt').toBe(false);
        const built = archive as Exclude<typeof archive, null>;
        expect(built.rebuilt, 'the objective refresh replaced the details node').toBe(true);
        expect(built.open, 'a re-render keeps the archive open').toBe(true);
        expect(built.summary).toContain('Finalizados');
        expect(built.rows).toBeGreaterThan(0);
        expect(built.text.length).toBeGreaterThan(0);
        expect(built.lastVisible, 'the last finished objective is reachable').toBe(true);
        if (!built.fits) {
          expect(built.scrolled, 'the archive scrolls when it does not fit').toBeGreaterThan(0);
          expect(built.scrollKept, 'a re-render keeps the archive scroll position').toBe(true);
        }

        const helpText = await page.evaluate(() => document.getElementById('ed-help')?.textContent ?? '');
        expect(helpText, 'the "?" opens the real shortcut body').toContain('Atajos');
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('objectives at 1280x720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  /**
   * Issue 421: with three active goals and a long tutorial (Act III, step 9 of 10), `.obj-current`
   * used to be capped at 60 % of a shrunken panel and cut a row through the middle. The active list
   * must now size to its content, or show a real scroll affordance instead of a silent cut.
   */
  test('the Act III goals stay whole above the archive', { tag: '@smoke' }, async ({ page }) => {
    test.setTimeout(120_000);
    await bootMission(page, 'm1_caral');
    const state = await page.evaluate(async () => {
      const g = (window as unknown as { game: any }).game;
      g.loop.stop();
      // The recorded Act III state: the two optional goals and the wood delivery at 100/150.
      const active = new Set(['a1_huaca', 'a3_shicras', 'obj_asamblea']);
      for (const o of g.mission.def.objectives as { id: string }[]) {
        g.mission.objState.set(o.id, active.has(o.id) ? 'activo' : 'completed');
      }
      g.mission.delivered.set('a3_shicras', 100);
      // The recorded frame has the command bar open: select a worker so its height is part of the layout.
      const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead) as
        { id: number } | undefined;
      if (!worker) throw new Error('the mission has no player worker');
      g.selectUnits([worker.id]);
      g.hud.showTutorialStep(
        'Lleva un obrero a la Pirámide Mayor, haz clic sobre ella y pulsa «Entregar materiales». ' +
          'Cada entrega y cada turno de obra hacen crecer la pirámide: primero el relleno de shicras, ' +
          'después los muros de contención y al final la plataforma terminada.',
        8,
        10,
      );
      const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 80));
      for (let i = 0; i < 3; i++) {
        g.hud.update(0.2, 0);
        await settle();
      }
      const panel = document.getElementById('ed-objectives')!;
      const current = panel.querySelector<HTMLElement>('.obj-current')!;
      const tutorial = document.getElementById('ed-tutorial')!;
      const bar = document.getElementById('ed-bottom')!;
      const cr = current.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const tr = tutorial.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      const rows = [...current.querySelectorAll<HTMLElement>('.obj')].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent ?? '',
          top: r.top,
          bottom: r.bottom,
          inside: r.top >= cr.top - 0.5 && r.bottom <= cr.bottom + 0.5,
        };
      });
      return {
        rows,
        texts: rows.map((row) => row.text),
        current: { top: cr.top, bottom: cr.bottom, height: cr.height, scrollHeight: current.scrollHeight },
        panel: { top: pr.top, bottom: pr.bottom },
        tutorial: { top: tr.top, bottom: tr.bottom },
        bar: { top: br.top },
        scrollable: current.dataset.scrollable === 'true',
        scrollbar: getComputedStyle(current).scrollbarWidth,
        overlap: pr.bottom > tr.top + 0.5 && pr.top < tr.bottom - 0.5,
      };
    });
    expect(state.texts.join(' | ')).toContain('Visita la Huaca de los Ídolos');
    expect(state.texts.join(' | ')).toContain('Entrega 150 de madera');
    expect(state.texts.join(' | ')).toContain('Convoca una asamblea comunal');
    expect(state.rows).toHaveLength(3);
    // The panel uses the column's free space and never reaches the command bar or the tutorial.
    expect(state.overlap, 'objectives overlap the tutorial').toBe(false);
    expect(state.panel.bottom).toBeLessThanOrEqual(state.tutorial.top + 1);
    expect(state.panel.bottom).toBeLessThanOrEqual(state.bar.top + 1);
    const allInside = state.rows.every((row) => row.inside);
    // Either every active goal is whole, or the cut edge advertises its scroll (thin thumb + fade).
    if (!allInside) {
      expect(state.scrollable, 'a clipped active list must advertise its scroll').toBe(true);
      expect(state.scrollbar).not.toBe('none');
      expect(state.current.scrollHeight).toBeGreaterThan(state.current.height);
    }
    expect(allInside || state.scrollable).toBe(true);
  });
});

test.describe('final screen layering', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  /**
   * Issue 415: the archive summary is `position: sticky; z-index: 1`, so it out-painted the final
   * screen veil while `.ed-overlay` had no z-index. Probe the archived line (and the column under
   * it) with elementFromPoint while the pause menu, victory and defeat own the screen.
   */
  test(
    'the objectives column never paints over the pause menu, victory or defeat',
    { tag: '@smoke' },
    async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await bootMission(page, 'm1_caral');
      await expect(page.locator('.ed-overlay')).toHaveCount(0);

      const state = await page.evaluate(async () => {
        const g = (window as unknown as { game: any }).game;
        const settle = () =>
          new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        g.loop.stop();

        // The recording's state: Acts I-III finished, the Act IV goals still active.
        const defs = g.mission.def.objectives as { id: string; title: string }[];
        const remaining = defs.filter((o) => /^Acto IV ·/.test(o.title));
        for (const o of defs) g.mission.objState.set(o.id, remaining.includes(o) ? 'activo' : 'completed');
        g.hud.update(0.2, 0);
        await settle();
        g.hud.update(0.2, 0);

        const summary = document.querySelector<HTMLElement>('#ed-objectives details > summary');
        if (!summary) throw new Error('the late mission has no archive summary');
        summary.click();
        await settle();
        const box = summary.getBoundingClientRect();
        const point = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        const column = document.getElementById('ed-right-column')!;
        const probe = () => {
          const hit = document.elementFromPoint(point.x, point.y);
          const overlay = document.querySelector<HTMLElement>('.ed-overlay:not(.hidden)');
          return {
            overlay: !!overlay,
            title: overlay?.querySelector('.epilogue-title')?.textContent ?? null,
            insideColumn: !!hit && column.contains(hit),
            insideOverlay: !!overlay && !!hit && (hit === overlay || overlay.contains(hit)),
            hit: hit ? `${hit.tagName.toLowerCase()}#${hit.id}.${String(hit.className)}` : null,
          };
        };

        const open = probe();
        if (!g.getPaused()) g.togglePause();
        await settle();
        const paused = probe();
        if (g.getPaused()) g.togglePause();
        await settle();
        const resumed = probe();
        g.showVictory(0);
        await settle();
        const victory = probe();
        g.showVictory(1);
        await settle();
        const defeat = probe();

        return { summary: summary.textContent ?? '', open, paused, resumed, victory, defeat };
      });

      expect(state.summary, 'the archive summary is the line the issue names').toMatch(
        /Finalizados \(\d+\) · Acto I ✔ \d+\/\d+/,
      );
      expect(state.open.insideColumn, 'the probe starts over the objectives column').toBe(true);
      expect(state.open.overlay, 'no overlay is open before the pause').toBe(false);
      expect(state.victory.title, 'the winner gets the victory screen').toBe('VICTORIA');
      expect(state.defeat.title, 'the loser gets the defeat screen').toBe('DERROTA');
      for (const [name, probe] of [
        ['the pause menu', state.paused],
        ['victory', state.victory],
        ['defeat', state.defeat],
      ] as const) {
        expect(probe.overlay, `${name} owns the screen`).toBe(true);
        expect(probe.insideColumn, `${name}: no objectives element paints over the veil (${probe.hit})`).toBe(false);
        expect(probe.insideOverlay, `${name}: the veil owns that point (${probe.hit})`).toBe(true);
      }
      expect(state.resumed.overlay, 'closing the pause menu removes its veil').toBe(false);
      expect(state.resumed.insideColumn, 'the objectives column returns when the pause closes').toBe(true);
      expect(errors).toEqual([]);
    },
  );
});
