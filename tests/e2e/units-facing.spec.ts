import { test, expect, type Page } from '@playwright/test';

const URL = '/?play=1&civ=caral&period=0&map=altiplano&seed=777&fog=0&low=1&noloop=1';

async function boot(page: Page): Promise<void> {
  await page.goto(URL);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

test('units face their movement direction and stop in idle', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const THREE = (window as unknown as { THREE: any }).THREE;
    g.loop.stop();
    const base = g.playerCenter(0);
    let pad: { x: number; z: number } | null = null;
    for (let r = 12; r <= 40 && !pad; r += 4) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = base.x + Math.cos(a) * r;
        const z = base.z + Math.sin(a) * r;
        if (
          g.unitContext.isWalkable(x, z) &&
          g.unitContext.isWalkable(x + 3, z) &&
          g.unitContext.isWalkable(x - 3, z)
        ) {
          pad = { x, z };
          break;
        }
      }
    }
    if (!pad) return { ok: false, reason: 'no clear pad' };
    const start = pad;
    const worker = g.spawnScriptedUnit('worker', 0, start.x, start.z);
    const soldier = g.spawnScriptedUnit('soldier', 0, start.x + 5, start.z + 5);
    const dirs = [
      { dx: 1, dz: 0, name: '+X' },
      { dx: 0, dz: 1, name: '+Z' },
      { dx: -1, dz: 0, name: '-X' },
      { dx: 0, dz: -1, name: '-Z' },
    ];
    const out: { unit: string; dir: string; dot: number; speed: number; state: string | null }[] = [];
    let time = 0;
    const step = (count: number): void => {
      for (let i = 0; i < count; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
    };
    const forwardOf = (u: any): { x: number; z: number } => {
      const q = u.view.group.getWorldQuaternion(new THREE.Quaternion());
      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      return { x: f.x, z: f.z };
    };
    for (const unit of [worker, soldier]) {
      for (const dir of dirs) {
        unit.clearOrders();
        unit.vel.set(0, 0, 0);
        unit.pos.set(start.x, g.terrain.getHeight(start.x, start.z), start.z);
        unit.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
        unit.issueOrder({ kind: 'move', target: { x: start.x + dir.dx * 3, z: start.z + dir.dz * 3 } }, true);
        step(45);
        const f = forwardOf(unit);
        out.push({
          unit: unit.kind,
          dir: dir.name,
          dot: f.x * dir.dx + f.z * dir.dz,
          speed: Math.hypot(unit.vel.x, unit.vel.z),
          state: unit.rig?.currentState ?? null,
        });
      }
    }

    worker.clearOrders();
    worker.vel.set(0, 0, 0);
    worker.pos.set(start.x, g.terrain.getHeight(start.x, start.z), start.z);
    worker.view.setPosition(worker.pos.x, worker.pos.y, worker.pos.z);
    step(90);
    const idleStart = { x: worker.pos.x, z: worker.pos.z };
    step(120);
    const drift = Math.hypot(worker.pos.x - idleStart.x, worker.pos.z - idleStart.z);
    return {
      ok: true,
      out,
      idle: { drift, state: worker.rig?.currentState ?? null },
    };
  });
  expect(result.ok, result.reason).toBe(true);
  for (const row of result.out) {
    expect(row.speed, `${row.unit} ${row.dir} did not move`).toBeGreaterThan(0.1);
    expect(row.dot, `${row.unit} ${row.dir} faces away from travel`).toBeGreaterThan(0.95);
  }
  expect(result.out.filter((row) => row.unit === 'worker').every((row) => row.state === 'walk')).toBe(true);
  expect(result.idle.drift).toBeLessThan(0.05);
  expect(result.idle.state).toBe('idle');
});

test('the human opening workers stay idle; the AI still starts gathering', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    let time = 0;
    const step = (count: number): void => {
      for (let i = 0; i < count; i++) {
        time += 1 / 60;
        g.loop.onUpdate(1 / 60, time);
      }
    };
    step(2);
    const p0 = [...g.units.values()].filter((u: any) => u.owner === 0 && u.kind === 'worker' && !u.dead);
    const p1 = [...g.units.values()].filter((u: any) => u.owner === 1 && u.kind === 'worker' && !u.dead);
    const before = p0.map((u: any) => ({ x: u.pos.x, z: u.pos.z }));
    step(180);
    const after = p0.map((u: any) => ({
      x: u.pos.x,
      z: u.pos.z,
      orders: u.orderQueue.length,
      state: u.rig?.currentState ?? null,
    }));
    return {
      p0: after.map((u: any, i: number) => ({
        ...u,
        drift: Math.hypot(u.x - before[i].x, u.z - before[i].z),
      })),
      p1Orders: p1.map((u: any) => u.orderQueue.length),
    };
  });
  expect(state.p0.length).toBeGreaterThan(0);
  for (const worker of state.p0) {
    expect(worker.orders).toBe(0);
    expect(worker.drift).toBeLessThan(0.05);
    expect(worker.state).toBe('idle');
  }
  expect(state.p1Orders.some((orders: number) => orders > 0)).toBe(true);
});
