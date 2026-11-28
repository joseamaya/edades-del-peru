import { expect, test, type Page } from '@playwright/test';

const URL = '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  return errors;
}

test('rigged Caral workers and scouts play an attack clip instead of falling back to idle', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(async () => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 14, base.z + 14, 12);
    const target = g.spawnScriptedBuilding('house', 1, c.x + 1.2, c.z);
    const worker = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'worker');
    const scout = [...g.units.values()].find((u: any) => u.owner === 0 && u.kind === 'scout');
    if (!worker || !scout) throw new Error('missing Caral worker/scout');

    const attack = (unit: any) => {
      unit.clearOrders();
      const x = c.x - 1.8;
      unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
      unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      g.executeCommand({
        kind: 'order',
        unitIds: [unit.id],
        order: { kind: 'attack', entityId: target.id },
        clear: true,
      });
      let time = 0;
      for (let i = 0; i < 150; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
      return {
        variant: unit.rig?.variantId ?? null,
        state: unit.rig?.currentState ?? null,
        clip: unit.rig?.currentClipName ?? null,
      };
    };

    return { worker: attack(worker), scout: attack(scout) };
  });

  expect(result.worker.variant).toMatch(/^caral_worker_[fm]$/);
  expect(result.worker.state).toBe('attack');
  expect(result.worker.clip).toBe('TreeChopping_Loop');
  expect(result.scout.variant).toMatch(/^caral_scout_[fm]$/);
  expect(result.scout.state).toBe('attack');
  expect(result.scout.clip).toBe('Punch_Jab');
  expect(errors).toEqual([]);
});

test('rigged firearm soldiers play the firearm clip and line infantry the stock swing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?mission=m9_guerra_pacifico&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  await page
    .getByRole('button', { name: /COMENZAR MISIÓN/ })
    .click({ timeout: 10_000 })
    .catch(() => {});

  const result = await page.evaluate(async () => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const base = g.playerCenter(0);
    const c = g.findLandNear(base.x + 18, base.z + 18, 24);
    const target = g.spawnScriptedBuilding('house', 1, c.x + 1.4, c.z);
    // A tagged field commander dresses a sabre and overrides the attack clip on purpose.
    const find = (kind: string) =>
      [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead && u.kind === kind && !u.tag);
    const rifleman = find('rifleman');
    const soldier = find('soldier');
    if (!rifleman || !soldier) throw new Error('missing rifleman/soldier');

    const attack = (unit: any) => {
      unit.clearOrders();
      const x = c.x - 1.6;
      unit.pos.set(x, g.terrain.getHeight(x, c.z), c.z);
      unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
      g.executeCommand({
        kind: 'order',
        unitIds: [unit.id],
        order: { kind: 'attack', entityId: target.id },
        clear: true,
      });
      let time = 0;
      for (let i = 0; i < 180; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
      // The project clip must bind to the merged skeleton and differ from the CC0 source: sample the same
      // firing-arm bone at the same instant under Rifle_Shoot and Pistol_Shoot. The source itself moves, so
      // the clip-to-clip angle is the part the recoil owns.
      const arm = unit.rig?.root?.getObjectByName('upperarm_r');
      const clips = unit.rig?.asset?.clipNames;
      let recoil = 0;
      if (unit.rig && arm && clips?.has('Rifle_Shoot') && clips?.has('Pistol_Shoot')) {
        const sample = (name: string) => {
          const mixer = new (window as any).THREE.AnimationMixer(unit.rig.root);
          const action = mixer.clipAction(clips.get(name));
          action.play();
          mixer.update(2 / 24);
          const q = arm.quaternion.clone();
          mixer.stopAllAction();
          return q;
        };
        recoil = sample('Rifle_Shoot').angleTo(sample('Pistol_Shoot'));
      }
      return {
        variant: unit.rig?.variantId ?? null,
        state: unit.rig?.currentState ?? null,
        clip: unit.rig?.currentClipName ?? null,
        recoil,
      };
    };

    // The tagged field commander keeps the sabre override; give the mission time for the tag to land.
    const { commanderById } = await import('/src/model/defs/commanders.ts');
    let time = 20;
    for (let i = 0; i < 180; i++) {
      time += 1 / 60;
      g.loop.onUpdate(1 / 60, time);
    }
    const commander = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead && commanderById(u.tag) && u.rig);
    const commanderClip = commander?.rig?.actions?.get('attack')?.getClip().name ?? null;

    return { rifleman: attack(rifleman), soldier: attack(soldier), commander: commanderClip };
  });

  expect(result.rifleman.variant).toMatch(/^republica_ranged_[fm]$/);
  expect(result.rifleman.state).toBe('attack');
  expect(result.rifleman.clip).toBe('Rifle_Shoot');
  expect(result.rifleman.recoil, 'the rifle clip binds and differs from Pistol_Shoot').toBeGreaterThan(0.05);
  expect(result.soldier.variant).toMatch(/^republica_soldier_[fm]$/);
  expect(result.soldier.state).toBe('attack');
  expect(result.soldier.clip).toBe('Sword_Regular_A');
  expect(result.commander, 'a tagged field commander keeps the sabre override').toBe('Sword_Regular_A');
  expect(errors).toEqual([]);
});
