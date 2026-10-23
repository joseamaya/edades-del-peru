import { expect, test, type Page } from '@playwright/test';

const URL = '/?play=1&period=5&civ=inca&map=andes&seed=777&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('the Inca scout uses the chasqui rigged set for both genders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await boot(page);

  const initial = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const first = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    if (!first) return { ok: false, reason: 'missing opening scout' };
    const scouts = [first];
    for (let i = 1; i <= 5; i++) {
      scouts.push(g.spawnScriptedUnit('scout', 0, base.x + i * 1.5, base.z + i * 1.5));
    }
    const visible = (unit: any, name: string): boolean => {
      const mesh = unit.rig?.root.getObjectByName(name);
      return !!mesh && mesh.visible;
    };
    return {
      ok: true,
      scouts: scouts.map((unit: any) => {
        const variant = unit.rig?.variantId as string | null;
        const male = !!variant?.endsWith('_m');
        return {
          variant,
          male,
          body: visible(unit, male ? 'Body_m' : 'Body_f'),
          otherBody: visible(unit, male ? 'Body_f' : 'Body_m'),
          tunic: visible(unit, male ? 'attire_tunic_m' : 'attire_tunic_f'),
          otherTunic: visible(unit, male ? 'attire_tunic_f' : 'attire_tunic_m'),
          skirt: visible(unit, 'attire_skirt_f'),
          chasquiSkirt: visible(unit, 'attire_skirt_chasqui_f'),
          wrap: visible(unit, 'attire_wrap_m'),
          sash: visible(unit, 'attire_sash'),
          belt: visible(unit, 'attire_belt_chasqui'),
          mantle: visible(unit, 'attire_mantle'),
          tool: visible(unit, 'attire_tool'),
          canteen: visible(unit, 'attire_canteen'),
        };
      }),
    };
  });

  expect(initial.ok, initial.reason).toBe(true);
  expect(initial.scouts.some((scout: any) => !scout.male)).toBe(true);
  expect(initial.scouts.some((scout: any) => scout.male)).toBe(true);
  for (const scout of initial.scouts) {
    expect(scout.variant, 'variant').toMatch(/^inca_chasqui_[fm]$/);
    expect(scout.body, 'gender body').toBe(true);
    expect(scout.otherBody, 'inactive body').toBe(false);
    expect(scout.tunic, 'gender tunic').toBe(true);
    expect(scout.otherTunic, 'inactive tunic').toBe(false);
    expect(scout.belt, 'chasqui belt').toBe(true);
    expect(scout.canteen, 'chasqui gourd').toBe(true);
    expect(scout.sash, 'no commoner sash').toBe(false);
    expect(scout.mantle, 'no Caral scout manta').toBe(false);
    expect(scout.tool, 'no digging stick').toBe(false);
    if (scout.male) {
      expect(scout.wrap, 'male wrap').toBe(true);
      expect(scout.skirt, 'female skirt hidden').toBe(false);
      expect(scout.chasquiSkirt, 'female chasqui skirt hidden').toBe(false);
    } else {
      expect(scout.wrap, 'male wrap hidden').toBe(false);
      expect(scout.skirt, 'commoner skirt hidden').toBe(false);
      expect(scout.chasquiSkirt, 'female chasqui skirt').toBe(true);
    }
  }

  const animation = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    let time = 0;
    scout.clearOrders();
    // Pick a walkable nearby point; the Inca start can face water in one direction.
    let target: { x: number; z: number } | null = null;
    for (let i = 0; i < 16 && !target; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = scout.pos.x + Math.cos(a) * 15;
      const z = scout.pos.z + Math.sin(a) * 15;
      if (!g.pathfinder.isWalkable(x, z)) continue;
      if (g.pathfinder.pathfind(scout.pos.x, scout.pos.z, x, z).length > 0) target = { x, z };
    }
    if (!target) return { moving: null, attack: null };
    scout.issueOrder({ kind: 'move', target }, true);
    for (let i = 0; i < 20; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    const moving = { state: scout.rig?.currentState ?? null, clip: scout.rig?.currentClipName ?? null };
    scout.rig?.play('attack', 0);
    return { moving, attack: scout.rig?.currentClipName ?? null };
  });
  expect(animation.moving).toEqual({ state: 'walk', clip: 'Walk_Loop' });
  expect(animation.attack).toBe('Punch_Jab');
  expect(errors).toEqual([]);
});
