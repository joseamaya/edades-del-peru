import { test, expect, Page } from '@playwright/test';

async function start(page: Page): Promise<void> {
  await page.goto('/?mission=m4_wari&seed=777&fog=0&low=1&noloop=1&intro=0');
  await page.waitForFunction(() => (window as unknown as { game?: any }).game?.mission !== undefined, null, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: /COMENZAR MISIÓN/i }).click();
  await page.waitForTimeout(800);
}

test('m4 loads the authored Wari site', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const names: string[] = [];
    g.landmark?.traverse((o: any) => {
      if (o.isMesh && o.visible) names.push(o.name);
    });
    return {
      model: g.landmark?.getObjectByName('wari_site')?.name ?? null,
      procedural: g.landmark?.getObjectByName('wari_compound')?.name ?? null,
      heritage: g.landmark?.getObjectByName('wari_templo_d')?.userData?.heritageId ?? null,
      anchor: g.siteAnchor,
      names,
    };
  });
  expect(out.model).toBe('wari_site');
  expect(out.procedural).toBeNull();
  expect(out.heritage).toBe('wari_templo_d');
  expect(out.anchor).toEqual({ x: 107.5, z: 102 });
  expect(out.names.some((name) => /Wari_LOD1_(Apron|Terrain)/.test(name))).toBe(false);
});

test('m4 draws the provincial road network', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    const overlays = g.settlements.filter((s: any) => s.group?.name?.startsWith('mission-roads'));
    let meshes = 0;
    for (const overlay of overlays) {
      overlay.group.traverse((o: any) => {
        if (o.isMesh) meshes++;
      });
    }
    const planRoads = overlays.flatMap((s: any) => s.plan.roads);
    const endpoints = new Set(planRoads.flatMap((r: any) => [`${r.from.x},${r.from.z}`, `${r.to.x},${r.to.z}`]));
    return {
      found: overlays.length > 0,
      overlays: overlays.length,
      meshes,
      roads: g.missionLayout?.roads?.length ?? 0,
      planRoads: planRoads.length,
      endpoints: endpoints.size,
      names: overlays.map((s: any) => s.group.name),
    };
  });
  expect(out.found).toBe(true);
  expect(out.overlays).toBe(2);
  expect(out.roads).toBe(4);
  expect(out.planRoads).toBe(4);
  expect(out.endpoints).toBeGreaterThanOrEqual(4);
  expect(out.names).toContain('mission-roads-2');
  expect(out.meshes).toBeGreaterThan(0);
});

test('m4 network and frontier complete the mission without a battle', async ({ page }) => {
  await start(page);
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const m = g.mission;
    g.loop.stop();
    if (g.getPaused()) g.togglePause();
    const center = g.playerCenter(0);
    g.spawnScriptedBuilding('farm', 0, center.x + 8, center.z + 8);
    g.spawnScriptedBuilding('farm', 0, center.x - 8, center.z + 8);
    g.players[0].resources.food = 600;
    const site = g.siteCenter as { x: number; z: number };
    const network = m.def.objectives.find((o: any) => o.id === 'obj_red');
    const nodes = network.nodes.map((n: any) => ({ x: site.x + n.dx, z: site.z + n.dz }));
    for (const node of nodes) g.spawnScriptedBuilding('market', 0, node.x, node.z);
    const dt = 1 / 60;
    let t = 0;
    const step = (seconds: number): void => {
      for (let i = 0; i < Math.ceil(seconds / dt) && !m.ended; i++) {
        const unit = [...g.units.values()].find((u: any) => u.owner === 0 && !u.dead) as any;
        if (unit) unit.pos.set(nodes[0].x, g.terrain.getHeight(nodes[0].x, nodes[0].z), nodes[0].z);
        g.update(dt, t);
        t += dt;
      }
    };
    step(2);
    const networkState = m.getObjectiveState('obj_red') as string;
    const frontier = m.getObjectiveState('obj_frontera') as string;
    step(500);
    return {
      network: networkState,
      frontierActive: frontier,
      frontierDone: m.getObjectiveState('obj_frontera') as string,
      andenes: m.getObjectiveState('obj_andenes') as string,
      supplies: m.getObjectiveState('obj_suministros') as string,
      won: m.won as boolean | null,
    };
  });
  expect(out.network).toBe('completed');
  expect(out.frontierActive).toBe('activo');
  expect(out.frontierDone).toBe('completed');
  expect(out.andenes).toBe('completed');
  expect(out.supplies).toBe('completed');
  expect(out.won).toBe(true);
});
