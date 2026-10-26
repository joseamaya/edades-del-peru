import { test, expect } from '@playwright/test';
import { MISSIONS } from '../../src/campaign/defs/campaign';

/**
 * Every mission must be winnable, not merely bootable. `campaign-objectives`
 * checks that the objective tags resolve; this test drives each mission to its
 * victory state so that an objective or trigger which can never be completed
 * (an unwinnable mission) fails the suite.
 *
 * The player is kept alive and its objectives are satisfied directly (kill the
 * tagged targets, gather, reach, build, advance era), while `survive`/`defend`/
 * `protect` objectives are satisfied by running the fixed-step clock. This
 * exercises the objective evaluator and the victory path deterministically.
 */
for (const mis of MISSIONS) {
  test(`campaign ${mis.id} is completable`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?mission=${mis.id}&seed=777&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const m = g.mission;
      if (!m) return { noMission: true, won: null as boolean | null };
      g.loop.stop();
      if (g.getPaused()) g.togglePause();

      const def = m.def;
      const centerOf = (owner: number): { x: number; z: number } => {
        const c = [...g.buildings.values()].find(
          (b: any) => b.owner === owner && b.kind === 'center' && !b.dead,
        ) as any;
        return c ? { x: c.pos.x, z: c.pos.z } : { x: g.settings.mapSize / 2, z: g.settings.mapSize / 2 };
      };

      const dt = 1 / 60;
      // the longest `survive`/`defend` timer is 600 s
      const maxSteps = Math.ceil(660 / dt);
      let t = 0;
      for (let i = 0; i < maxSteps && !m.ended; i++) {
        // keep the player alive: waves would otherwise defeat it during the clock
        for (const u of g.units.values()) if (u.owner === 0 && !u.dead) u.hp = u.maxHp;
        for (const b of g.buildings.values()) if (b.owner === 0 && !b.dead) b.hp = b.maxHp;

        for (const o of def.objectives) {
          if (m.getObjectiveState(o.id) !== 'activo') continue;
          switch (o.kind) {
            case 'gather':
              g.players[0].resources[o.resource ?? 'food'] = o.count ?? 0;
              break;
            case 'reach_era':
              g.players[0].era = Math.max(g.players[0].era, o.era ?? 0);
              break;
            case 'destroy':
            case 'eliminate_all':
              for (const u of g.units.values()) {
                if (u.owner !== 0 && !u.dead && (!o.entityTag || u.tag === o.entityTag)) u.die();
              }
              for (const b of g.buildings.values()) {
                if (b.owner !== 0 && !b.dead && (!o.entityTag || b.tag === o.entityTag)) b.die();
              }
              break;
            case 'reach': {
              if (!o.pos) break;
              const base =
                o.pos.ref === 'enemy'
                  ? centerOf(1)
                  : o.pos.ref === 'player'
                    ? centerOf(0)
                    : o.pos.ref === 'canal'
                      ? (g.canalSite ?? centerOf(0))
                      : o.pos.ref === 'landmark'
                        ? (g.landmark?.position ?? centerOf(0))
                        : { x: 0, z: 0 };
              const tp = { x: base.x + o.pos.dx, z: base.z + o.pos.dz };
              for (const u of g.units.values()) {
                // an untagged reach objective accepts any player unit
                if (u.owner === 0 && !u.dead && (!o.entityTag || u.tag === o.entityTag)) {
                  u.pos.set(tp.x, g.terrain.getHeight(tp.x, tp.z), tp.z);
                }
              }
              break;
            }
            case 'hold': {
              if (!o.pos) break;
              const base =
                o.pos.ref === 'enemy'
                  ? centerOf(1)
                  : o.pos.ref === 'player'
                    ? centerOf(0)
                    : o.pos.ref === 'canal'
                      ? (g.canalSite ?? centerOf(0))
                      : o.pos.ref === 'landmark'
                        ? (g.landmark?.position ?? centerOf(0))
                        : { x: 0, z: 0 };
              const tp = { x: base.x + o.pos.dx, z: base.z + o.pos.dz };
              const u = [...g.units.values()].find(
                (unit: any) => unit.owner === 0 && !unit.dead && (!o.unitKind || unit.kind === o.unitKind),
              ) as any;
              if (u) u.pos.set(tp.x, g.terrain.getHeight(tp.x, tp.z), tp.z);
              break;
            }
            case 'build': {
              const need = o.count ?? 1;
              // a location-scoped build must stand at the target point
              let bx: number;
              let bz: number;
              if (o.pos) {
                const base =
                  o.pos.ref === 'enemy'
                    ? centerOf(1)
                    : o.pos.ref === 'player'
                      ? centerOf(0)
                      : o.pos.ref === 'canal'
                        ? (g.canalSite ?? centerOf(0))
                        : o.pos.ref === 'landmark'
                          ? (g.landmark?.position ?? centerOf(0))
                          : { x: 0, z: 0 };
                bx = base.x + o.pos.dx;
                bz = base.z + o.pos.dz;
              } else {
                const c = centerOf(0);
                bx = c.x + 6;
                bz = c.z + 6;
              }
              const have = [...g.buildings.values()].filter(
                (b: any) =>
                  b.owner === 0 &&
                  b.kind === o.buildingKind &&
                  b.constructionComplete &&
                  !b.dead &&
                  (!o.pos || Math.hypot(b.pos.x - bx, b.pos.z - bz) <= (o.radius ?? 12)),
              ).length;
              for (let k = have; k < need; k++) g.spawnScriptedBuilding(o.buildingKind, 0, bx + k * 2, bz);
              break;
            }
            default:
              break; // survive / defend / protect: satisfied by the clock / staying alive
          }
        }

        g.update(dt, t);
        t += dt;
      }
      return { noMission: false, won: m.won as boolean | null };
    });
    expect(out.noMission, `${mis.id} has no mission`).toBe(false);
    expect(out.won, `${mis.id} did not reach victory`).toBe(true);
    expect(errors).toEqual([]);
  });
}
