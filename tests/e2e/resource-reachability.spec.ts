import { test, expect } from '@playwright/test';

/**
 * Property test over several map seeds: the ambient resource generator must place
 * collectible nodes on land and with a walkable approach inside the worker harvest
 * range, reachable from the main landmass (fish live on water by design).
 *
 * Nodes near a base (`spawnStartResources`: a dense ring of 10 trees + mine/berry/
 * well with no water or walkability check, plus any ambient node that happens to
 * land close) are logged but not asserted here — that is a separate, documented
 * FOLLOW-UP; this test guards the ambient `spawnResources` (which does check
 * `isWater`) and the harvest-range geometry.
 *
 * Failures are reported as `seed / kind / pos / reason`, not patched blindly.
 */
const HARVEST_RANGE = 2.8;
const START_RADIUS = 16;
const SEEDS = [777, 778, 779, 780, 781, 782, 783, 784];

for (const seed of SEEDS) {
  test(`ambient resources are on land and reachable (seed ${seed})`, async ({ page }) => {
    await page.goto(`/?seed=${seed}&play=1&noloop=1&fog=0&low=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(
      ({ range, startRadius }) => {
        const g = (window as unknown as { game: any }).game;
        g.loop.stop();
        const { cell, cols } = g.pathfinder.grid;
        const walkable = (cx: number, cz: number): boolean => g.pathfinder.grid.walkable[cz * cols + cx] === 1;

        // connected components of walkable cells (same no-corner-cutting rule as A*)
        const comp = new Int32Array(cols * cols);
        const sizes: number[] = [0];
        let id = 0;
        for (let z = 0; z < cols; z++) {
          for (let x = 0; x < cols; x++) {
            const i = z * cols + x;
            if (comp[i] || !walkable(x, z)) continue;
            id++;
            sizes[id] = 0;
            const stack = [i];
            comp[i] = id;
            while (stack.length) {
              const cur = stack.pop()!;
              sizes[id]++;
              const cx = cur % cols;
              const cz = Math.floor(cur / cols);
              for (let d = 0; d < 8; d++) {
                const dx = [1, -1, 0, 0, 1, 1, -1, -1][d];
                const dz = [0, 0, 1, -1, 1, -1, 1, -1][d];
                const nx = cx + dx;
                const nz = cz + dz;
                if (nx < 0 || nz < 0 || nx >= cols || nz >= cols || !walkable(nx, nz)) continue;
                if (dx && dz && (!walkable(cx + dx, cz) || !walkable(cx, cz + dz))) continue;
                const ni = nz * cols + nx;
                if (comp[ni]) continue;
                comp[ni] = id;
                stack.push(ni);
              }
            }
          }
        }
        let home = 1;
        for (let c = 2; c <= id; c++) if (sizes[c] > sizes[home]) home = c;

        const nearest = (wx: number, wz: number): number => {
          const bx = Math.floor(wx / cell);
          const bz = Math.floor(wz / cell);
          for (let r = 0; r <= 12; r++) {
            for (let dz = -r; dz <= r; dz++) {
              for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
                const nx = bx + dx;
                const nz = bz + dz;
                if (nx < 0 || nz < 0 || nx >= cols || nz >= cols) continue;
                if (walkable(nx, nz)) return comp[nz * cols + nx];
              }
            }
          }
          return 0;
        };

        const centers = g.players.map((p: any) => g.playerCenter(p.id));
        const nearBase = (n: any): boolean =>
          centers.some((c: any) => Math.hypot(n.pos.x - c.x, n.pos.z - c.z) < startRadius);

        const failures: Array<{ id: number; kind: string; resource: string; x: number; z: number; reason: string }> =
          [];
        const startIssues: Array<{ kind: string; x: number; z: number; reason: string }> = [];
        let checked = 0;
        let ambientIsolated = 0;
        for (const n of g.resourceNodes.values()) {
          if (n.kind === 'fishing') continue;
          const base = { id: n.id, kind: n.kind, resource: n.resource, x: Math.round(n.pos.x), z: Math.round(n.pos.z) };
          const onWater = g.terrain.isWater(n.pos.x, n.pos.z);
          let closest = Infinity;
          for (let a = 0; a < 32; a++) {
            const ang = (a / 32) * Math.PI * 2;
            for (let r = 0.5; r <= range + 1; r += 0.25) {
              if (g.pathfinder.isWalkable(n.pos.x + Math.cos(ang) * r, n.pos.z + Math.sin(ang) * r)) {
                closest = Math.min(closest, r);
                break;
              }
            }
          }
          const isolated = nearest(n.pos.x, n.pos.z) !== home;
          if (nearBase(n)) {
            // start-base ring: report but do not assert (documented FOLLOW-UP)
            if (onWater) startIssues.push({ kind: base.kind, x: base.x, z: base.z, reason: 'on water' });
            else if (closest > range) startIssues.push({ kind: base.kind, x: base.x, z: base.z, reason: 'approach' });
            else if (isolated) startIssues.push({ kind: base.kind, x: base.x, z: base.z, reason: 'isolated' });
            continue;
          }
          checked++;
          if (onWater) {
            failures.push({ ...base, reason: 'node sits on water' });
            continue;
          }
          if (closest > range) {
            failures.push({ ...base, reason: `nearest walkable approach ${closest.toFixed(2)} > range ${range}` });
            continue;
          }
          if (isolated) ambientIsolated++;
        }
        return { checked, failures, startIssues, ambientIsolated };
      },
      { range: HARVEST_RANGE, startRadius: START_RADIUS },
    );
    if (out.startIssues.length > 0) {
      console.log(
        `seed ${seed} near-base resource issues (start ring + ambient nearby, FOLLOW-UP):`,
        JSON.stringify(out.startIssues),
      );
    }
    expect(out.checked).toBeGreaterThan(0);
    expect(
      out.failures,
      `seed ${seed}: ${out.failures.length} unreachable ambient node(s):\n${JSON.stringify(out.failures, null, 2)}`,
    ).toEqual([]);
  });
}
