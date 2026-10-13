import { test, expect } from '@playwright/test';
import { MISSIONS } from '../../src/campaign/defs/campaign';

/**
 * Every mission is booted headless and checked for the failure mode that would
 * make it unwinnable (or end before the player acts): an objective, trigger or
 * `mark` tag that resolves to no live entity. `Mission.start` tags existing
 * buildings by `mark`, so after boot the tags must exist for the mission to be
 * playable.
 */
for (const mis of MISSIONS) {
  test(`campaign ${mis.id} boots with its objective tags resolved`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?mission=${mis.id}&seed=777&fog=0&low=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    const out = await page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const def = g.mission?.def;
      if (!def) return { noMission: true, missing: [] as string[], ended: false };
      const tagged = new Set<string>();
      for (const u of g.units.values()) if (u.tag && !u.dead) tagged.add(u.tag);
      for (const b of g.buildings.values()) if (b.tag && !b.dead) tagged.add(b.tag);
      const missing: string[] = [];
      for (const o of def.objectives)
        if (o.entityTag && !tagged.has(o.entityTag)) missing.push(`${o.id}:${o.entityTag}`);
      for (const m of def.mark ?? []) if (!tagged.has(m.tag)) missing.push(`mark:${m.tag}`);
      for (const t of def.triggers) {
        const c = t.condition;
        if ((c.type === 'entity_dead' || c.type === 'unit_near') && c.entityTag && !tagged.has(c.entityTag)) {
          missing.push(`${t.id}:${c.entityTag}`);
        }
      }
      return { noMission: false, missing, ended: g.mission.ended };
    });
    expect(out.noMission, `${mis.id} has no mission`).toBe(false);
    expect(out.missing, `${mis.id} has unresolved tags`).toEqual([]);
    expect(out.ended, `${mis.id} ended at boot`).toBe(false);
    expect(errors).toEqual([]);
  });
}
