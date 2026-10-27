import { test, expect } from '@playwright/test';

/**
 * Faction visual differentiation: two coetaneous civilizations in a match must
 * build visibly different models. Structural check (vertex counts), not pixel
 * snapshots — see `yarn shot` for the manual visual review.
 */
test('coetaneous civilizations build different-looking bases', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const sig = (group: any): { verts: number; meshes: number } => {
      let verts = 0;
      let meshes = 0;
      group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          verts += o.geometry.attributes.position.count;
          meshes++;
        }
      });
      return { verts, meshes };
    };
    const centerOf = (owner: number) =>
      [...g.buildings.values()].find((b: any) => b.owner === owner && b.kind === 'center' && !b.dead) as any;
    const c0 = centerOf(0);
    const c1 = centerOf(1);
    return {
      civ0: g.players[0].civ,
      civ1: g.players[1].civ,
      v0: sig(c0.view.group),
      v1: sig(c1.view.group),
    };
  });
  expect(out.civ0).not.toBe(out.civ1);
  expect(out.v0.verts).toBeGreaterThan(500);
  expect(out.v1.verts).toBeGreaterThan(500);
  const key = (s: { verts: number; meshes: number }): string => `${s.verts}:${s.meshes}`;
  expect(key(out.v0), 'the two civilizations must not look identical').not.toBe(key(out.v1));
});

/**
 * The historical-slice centers must be structurally different (material/structure
 * come from the architecture profile): Caral, Moche and Inca share no exact mesh.
 */
test('the Caral, Moche and Inca centers have distinct structures', async ({ page }) => {
  const signature = async (mission: string) => {
    await page.goto(`/?mission=${mission}&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    return page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead) as any;
      let verts = 0;
      let meshes = 0;
      center.view.group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          verts += o.geometry.attributes.position.count;
          meshes++;
        }
      });
      return { civ: g.players[0].civ as string, verts, meshes };
    });
  };

  const caral = await signature('m1_caral');
  const moche = await signature('m3_moche_recuay');
  const inca = await signature('m5_yahuar_pampa');

  expect(caral.civ).toBe('caral');
  expect(moche.civ).toBe('moche');
  expect(inca.civ).toBe('inca');
  const signatures = new Set([
    `${caral.verts}:${caral.meshes}`,
    `${moche.verts}:${moche.meshes}`,
    `${inca.verts}:${inca.meshes}`,
  ]);
  expect(signatures.size, 'the three centers must not share a structure').toBe(3);
});

/**
 * Coetaneous highland civilizations used to share the same center (fieldstone,
 * terrace, two tiers): only colour differed. The civic silhouette motif (a
 * documented pucará vs andenes) must make the shapes differ too.
 */
test('coetaneous highland centers differ by silhouette motif', async ({ page }) => {
  const capture = async (civ: string) => {
    await page.goto(`/?civ=${civ}&period=4&play=1&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    return page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead) as any;
      let verts = 0;
      let meshes = 0;
      center.view.group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          verts += o.geometry.attributes.position.count;
          meshes++;
        }
      });
      return {
        civ: g.players[0].civ as string,
        motif: center.view.group.userData.civSilhouette as string | undefined,
        verts,
        meshes,
      };
    });
  };

  const chanca = await capture('chanca');
  const huanca = await capture('huanca');
  expect(chanca.civ).toBe('chanca');
  expect(huanca.civ).toBe('huanca');
  expect(chanca.motif).toBe('pucara');
  expect(huanca.motif).toBe('terraces');
  expect(`${chanca.verts}:${chanca.meshes}`).not.toBe(`${huanca.verts}:${huanca.meshes}`);
});

/**
 * The silhouette layer is not center-only: defensive buildings carry the same
 * documented marker, so two coetaneous highland pucarás no longer share a shape.
 */
test('coetaneous highland fortresses differ by silhouette motif', async ({ page }) => {
  const capture = async (civ: string) => {
    await page.goto(`/?civ=${civ}&period=4&play=1&fog=0&low=1&noloop=1`);
    await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
      timeout: 30_000,
    });
    return page.evaluate(() => {
      const g = (window as unknown as { game: any }).game;
      const center = [...g.buildings.values()].find((b: any) => b.owner === 0 && b.kind === 'center' && !b.dead);
      g.addResource(0, { food: 0, wood: 500, silver: 500, stone: 500 });
      const fortress = g.spawnScriptedBuilding('fortress', 0, center.pos.x + 9, center.pos.z + 6);
      if (!fortress) throw new Error('could not place the fortress');
      let verts = 0;
      let meshes = 0;
      fortress.view.group.traverse((o: any) => {
        if (o.isMesh && o.geometry?.attributes?.position) {
          verts += o.geometry.attributes.position.count;
          meshes++;
        }
      });
      return {
        motif: fortress.view.group.userData.civSilhouette as string | undefined,
        verts,
        meshes,
      };
    });
  };

  const chanca = await capture('chanca');
  const huanca = await capture('huanca');
  expect(chanca.motif).toBe('pucara');
  expect(huanca.motif).toBe('terraces');
  expect(`${chanca.verts}:${chanca.meshes}`).not.toBe(`${huanca.verts}:${huanca.meshes}`);
});
