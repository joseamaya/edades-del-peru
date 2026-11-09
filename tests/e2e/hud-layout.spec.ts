import { test, expect, type Page } from '@playwright/test';
import { MISSIONS } from '../../src/campaign/defs/campaign';

/**
 * Geometric check of the in-match HUD: the persistent panels must never cover each other at the
 * two reference resolutions. It compares bounding boxes (not pixels) so it stays deterministic
 * under software WebGL.
 */
const PANELS = ['ed-dialogue', 'ed-bottom', 'ed-minimap-wrap', 'ed-objectives', 'ed-tutorial', 'ed-help'] as const;

const RESOLUTIONS = [
  { width: 1280, height: 800 },
  { width: 1600, height: 900 },
] as const;

const MISSION_IDS = MISSIONS.map((m) => m.id);

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
}

/** Stop the simulation and snapshot the HUD in the start state, with dialogue and with a build panel. */
async function snapshots(page: Page): Promise<Snapshots> {
  return page.evaluate(async (panels) => {
    const g = (window as unknown as { game: any }).game;
    const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 60));
    g.loop.stop();

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
        const hidden = style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0;
        out[id] = hidden ? null : { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
      }
      return out;
    };
    const render = async () => {
      // Two passes: the objectives panel grows after its first refresh, and the tutorial is placed
      // from the previous frame's height (the real loop runs at 60 Hz, so this is its steady state).
      g.hud.update(0.2, 0);
      await settle();
      g.hud.update(0.2, 0);
      await settle();
    };

    g.hud.showTutorialStep('Selecciona un obrero y construye una casa.', 0, 3);
    await render();
    const initial = read();

    g.mission.triggerDialogue(
      'Comandante: —La obra no puede parar; defended el Andén mientras llega la comida de la Troje.',
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

    return { initial, dialogue, build };
  }, PANELS);
}

function overlaps(a: Box, b: Box): boolean {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return width > 1 && height > 1;
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

for (const { width, height } of RESOLUTIONS) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height } });

    for (const missionId of MISSION_IDS) {
      test(`the HUD panels do not overlap in ${missionId}`, async ({ page }) => {
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

        expect(violations(snap.initial), 'start state').toEqual([]);
        expect(violations(snap.dialogue), 'dialogue over the command panel').toEqual([]);
        expect(violations(snap.build), 'worker build panel').toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  });
}
