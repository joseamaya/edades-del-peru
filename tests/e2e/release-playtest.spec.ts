import { test, expect, type Page } from '@playwright/test';
import { installHeritageClick, type HeritageClickWindow } from './heritage';

/**
 * Release playtest for the seven missions added on 2026-11-18.
 *
 * The generic `campaign-completable` spec keeps the player alive and satisfies objectives directly, so it
 * proves the evaluator, not that a player can win. This spec drives each mission to victory with ordinary
 * `place`, `build`, `move` and `attack_move` orders, runs the authored economy and AI, and never injects
 * resources, health or objective states. The only interface shortcut is the Plaza Mayor card in
 * `m_lima_1821`, which goes through the same map-click + HUD command a player uses.
 *
 * The missions' protected commanders are handled explicitly: San Martín is parked away from the enemy
 * centre (a stray wave otherwise kills him), while Cáceres stays with the army in the Breña.
 */
const MISSIONS = [
  'm_cusco_1536',
  'm_vilcabamba',
  'm_lima_1821',
  'm_real_felipe',
  'm_tarapaca',
  'm_miraflores',
  'm_brena',
] as const;

interface PlaytestResult {
  ended: boolean;
  won: boolean | null;
  seconds: number;
  units: number;
  states: Record<string, string>;
  failed: string[];
}

async function playMission(page: Page, missionId: string): Promise<PlaytestResult> {
  return page.evaluate((id) => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const m = g.mission;
    const def = m.def;
    const dt = 1 / 60;
    let t = 0;
    // The campaign missions are 256 m; park a protected commander in the corner opposite the enemy.
    const MAP_MIDPOINT = 128;
    const SAFE_INSET = 30;
    const SAFE_FAR = MAP_MIDPOINT * 2 - SAFE_INSET;
    // Protected commanders stay where the mission places them instead of being moved to the far
    // corner: Cáceres at the village rear in Tarapacá, and at the Breña camp (he is excluded from the
    // assault by `front()`, and the final retreat brings him back into the march).
    const PROTECT_FOLLOWS_ARMY = new Set(['m_tarapaca', 'm_brena']);

    const point = (p: any) => g.resolveMissionPoint(p);
    const workers = () =>
      [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'worker') as any[];
    const all = () => [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead) as any[];
    const protectedTags = new Set(
      def.objectives.filter((o: any) => o.kind === 'protect' && !o.optional).map((o: any) => o.entityTag as string),
    );
    const front = () => all().filter((u: any) => !protectedTags.has(u.tag));
    const dismissCard = () => {
      if (g.hud.isMissionCardOpen()) document.querySelector<HTMLElement>('.ed-mission-card')?.click();
    };
    const run = (seconds: number) => {
      const end = t + seconds;
      while (t < end && !m.ended) {
        dismissCard();
        g.update(dt, t);
        t += dt;
      }
    };
    const order = (units: any[], p: any, kind: 'move' | 'attack_move') => {
      const target = point(p);
      for (const u of units) {
        if (u.dead) continue;
        g.executeCommand({ kind: 'order', unitIds: [u.id], order: { kind, target }, clear: true }, false);
      }
    };
    const buildAt = (p: any, kind: string) => {
      const target = point(p);
      const spot = g.findFreeSpot(target.x, target.z, 2);
      if (!spot) return;
      if (!g.executeCommand({ kind: 'place', building: kind, x: spot.x, z: spot.z })) return;
      const built = [...g.buildings.values()].find(
        (b: any) =>
          b.owner === 0 &&
          b.kind === kind &&
          !b.dead &&
          Math.abs(b.pos.x - spot.x) < 0.01 &&
          Math.abs(b.pos.z - spot.z) < 0.01,
      ) as any;
      if (!built) return;
      g.executeCommand(
        {
          kind: 'order',
          unitIds: workers().map((w) => w.id),
          order: { kind: 'build', entityId: built.id },
          clear: true,
        },
        false,
      );
      run(80);
    };

    // San Martín is a required protect objective and dies to the Callao waves if he stays at the base.
    // Park him in the corner opposite the enemy centre; the Breña keeps Cáceres with the army instead.
    if (!PROTECT_FOLLOWS_ARMY.has(id)) {
      const enemy = [...g.buildings.values()].find((b: any) => b.owner === 1 && b.kind === 'center') as any;
      const ex = enemy?.pos.x ?? 200;
      const ez = enemy?.pos.z ?? 200;
      const safe = {
        x: ex > MAP_MIDPOINT ? SAFE_INSET : SAFE_FAR,
        z: ez > MAP_MIDPOINT ? SAFE_INSET : SAFE_FAR,
      };
      // `safe` is a world point; MissionPoint reads `dx`/`dz`, so passing `{x,z}` to the order helper
      // resolved to NaN and the commander was parked at an invalid position.
      for (const u of all()) if (protectedTags.has(u.tag)) order([u], { dx: safe.x, dz: safe.z }, 'move');
    }

    let guard = 0;
    while (!m.ended && t < 900 && guard++ < 500) {
      dismissCard();
      const active = def.objectives.filter((o: any) => m.getObjectiveState(o.id) === 'activo' && !o.optional);
      if (!active.length) {
        run(5);
        continue;
      }
      for (const o of active) {
        if (o.kind === 'network' && o.nodes) {
          for (const node of o.nodes) buildAt(node, o.buildingKind);
        } else if (o.kind === 'build' && o.pos) {
          buildAt(o.pos, o.buildingKind);
        } else if (o.kind === 'inspect') {
          order(front(), o.pos, 'move');
          run(6);
          for (const heritage of o.heritageIds ?? []) {
            (window as unknown as HeritageClickWindow).__heritageClick(heritage, 'Visitar');
          }
          run(3);
        } else if (o.kind === 'hold') {
          // Hold objectives need boots inside the radius; attack-move clears the wave on the way in.
          order(front(), o.pos, 'attack_move');
          run(25);
        } else if (o.kind === 'reach') {
          // The protected commander does not lead the assault in Tarapacá, and Curi Paucar stays out of
          // the evacuation march: they are the objective, not free casualties.
          order(id === 'm_tarapaca' || id === 'm_vilcabamba' ? front() : all(), o.pos, 'attack_move');
          run(25);
        } else {
          run(5);
        }
      }
    }

    return {
      ended: m.ended as boolean,
      won: m.won as boolean | null,
      seconds: Math.round(t),
      units: g.units.size,
      states: Object.fromEntries(def.objectives.map((o: any) => [o.id, m.getObjectiveState(o.id)])),
      failed: def.objectives
        .filter((o: any) => !o.optional && m.getObjectiveState(o.id) === 'failed')
        .map((o: any) => o.id),
    };
  }, missionId);
}

for (const mission of MISSIONS) {
  test(`${mission} wins with ordinary orders and no objective cheats`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await installHeritageClick(page);
    await page.goto(`/?mission=${mission}&seed=777&fog=0&low=1&noloop=1&intro=0`);
    await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
      timeout: 30_000,
    });

    const out = await playMission(page, mission);

    expect(out.ended, `${mission} did not end: ${JSON.stringify(out)}`).toBe(true);
    expect(out.won, `${mission} did not win: ${JSON.stringify(out)}`).toBe(true);
    expect(out.failed, `${mission} failed a required objective`).toEqual([]);
    expect(errors).toEqual([]);
  });
}
