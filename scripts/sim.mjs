import { launchChromium, withViteServer, cliArg } from './lib.mjs';

/**
 * Headless AI-vs-AI match runner.
 *
 * Usage: node scripts/sim.mjs [--seeds=777,778,779] [--max=1200] [--difficulty=hard]
 *
 * Boots a skirmish, attaches an AI to both players and fast-forwards the
 * simulation (no rendering) until a side is defeated or the time cap is hit.
 * `--difficulty` sets player 0's AI profile; player 1 stays on the default
 * (`normal`), so a run measures that profile against `normal`. Prints a per-seed
 * table and a summary. Deterministic per seed: `?noloop=1` keeps the real-time
 * loop from advancing the world before the fixed-step loop takes over (the AI
 * uses a seeded RNG), so it is a reliable baseline/regression signal.
 */

const DIFFICULTIES = ['easy', 'normal', 'hard', 'legendary'];
const seeds = String(cliArg('seeds', '777,778,779,780,781,782,783,784'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n));
const maxSeconds = Number.parseInt(cliArg('max', '1200'), 10);
const difficulty = String(cliArg('difficulty', 'normal'));
if (!DIFFICULTIES.includes(difficulty)) {
  console.error(`unknown difficulty "${difficulty}" (use ${DIFFICULTIES.join('|')})`);
  process.exit(1);
}

async function run(browser, base, seed) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?play=1&seed=${seed}&low=1&fog=0&noloop=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });

  const result = await page.evaluate(
    ({ cap, diff }) => {
      const g = window.game;
      g.loop.stop();
      g.paused = false;
      g.addAI(0, diff);
      const dt = 1 / 60;
      const maxSteps = Math.floor(cap / dt);
      const peak = [0, 0];
      let t = 0;
      const armyOf = (owner) =>
        [...g.units.values()].filter((u) => u.owner === owner && !u.dead && u.kind !== 'worker' && u.kind !== 'scout')
          .length;
      for (let i = 0; i < maxSteps; i++) {
        g.update(dt, t);
        t += dt;
        if (i % 600 === 0) {
          peak[0] = Math.max(peak[0], armyOf(0));
          peak[1] = Math.max(peak[1], armyOf(1));
        }
        if (g.hasEnded()) break;
      }
      const alive = (owner) => [...g.buildings.values()].some((b) => b.owner === owner && !b.dead);
      const winner = alive(0) && !alive(1) ? 0 : alive(1) && !alive(0) ? 1 : null;
      return {
        seconds: Math.round(t),
        ended: g.hasEnded(),
        winner,
        peak0: peak[0],
        peak1: peak[1],
        res0: g.players[0].resources.food + g.players[0].resources.wood + g.players[0].resources.silver,
        res1: g.players[1].resources.food + g.players[1].resources.wood + g.players[1].resources.silver,
      };
    },
    { cap: maxSeconds, diff: difficulty },
  );

  await context.close();
  return { seed, errors, ...result };
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  try {
    const rows = [];
    for (const seed of seeds) rows.push(await run(browser, base, seed));

    console.log('\nseed | winner | seconds | ended | peak army (P0/P1) | resources P0/P1');
    console.log('-----|--------|---------|-------|-------------------|---------------');
    for (const r of rows) {
      console.log(
        `${String(r.seed).padEnd(4)} | ${(r.winner ?? '—').toString().padEnd(6)} | ${String(r.seconds).padEnd(7)} | ${(r.ended ? 'yes' : 'no').padEnd(5)} | ${String(r.peak0).padStart(4)} / ${String(r.peak1).padEnd(4)}        | ${r.res0} / ${r.res1}`,
      );
      if (r.errors.length) console.log(`     ! page errors: ${r.errors.join(' | ')}`);
    }

    const wins = [0, 0, 0]; // [p0, p1, undecided]
    for (const r of rows) wins[r.winner === 0 ? 0 : r.winner === 1 ? 1 : 2]++;
    const avg = Math.round(rows.reduce((s, r) => s + r.seconds, 0) / rows.length);
    console.log(
      `\nsummary (P0=${difficulty} vs P1=normal): P0 wins ${wins[0]}, P1 wins ${wins[1]}, undecided ${wins[2]} · avg ${avg}s`,
    );
  } finally {
    await browser.close();
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
