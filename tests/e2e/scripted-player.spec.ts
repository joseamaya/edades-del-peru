import { test, expect } from '@playwright/test';

/**
 * The `ScriptedPlayer` bot is the player-side difficulty benchmark. It must
 * actually play a skirmish through the `PlayerCommand` API: build a barracks,
 * train an army and push. Deterministic (fixed steps, no RNG).
 */
test('the scripted player builds a barracks and an army', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    g.ais.length = 0;
    g.addAI(1, 'easy'); // only player 1 gets an AI; player 0 is the bot
    const bot = new (
      window as unknown as { ScriptedPlayer: new (g: unknown, p: number) => { update: (dt: number) => void } }
    ).ScriptedPlayer(g, 0);
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 420 && !g.hasEnded(); i++) {
      bot.update(dt);
      g.update(dt, i * dt);
    }
    const barracks = [...g.buildings.values()].filter(
      (b: any) => b.owner === 0 && b.kind === 'barracks' && b.constructionComplete,
    ).length;
    const soldiers = [...g.units.values()].filter((u: any) => u.owner === 0 && !u.dead && u.kind === 'soldier').length;
    return { barracks, soldiers };
  });
  expect(out.barracks).toBeGreaterThanOrEqual(1);
  expect(out.soldiers).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});
