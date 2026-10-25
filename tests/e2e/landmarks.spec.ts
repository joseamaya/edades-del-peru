import { test, expect, Page } from '@playwright/test';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
}

async function landmarkInfo(page: Page) {
  await page.waitForFunction(
    () => {
      const landmark = (window as unknown as { game?: any }).game?.landmark;
      if (!landmark) return true;
      let meshes = 0;
      landmark.traverse((object: any) => {
        if (object.isMesh) meshes++;
      });
      return meshes > 0;
    },
    null,
    { timeout: 15_000 },
  );
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const l = g.landmark;
    if (!l) return { id: g.mapProfile.landmark as string | null, present: false };
    let verts = 0;
    let meshes = 0;
    const meshVertCounts: number[] = [];
    l.traverse((o: any) => {
      if (o.isMesh && o.geometry?.attributes?.position) {
        const count = o.geometry.attributes.position.count as number;
        verts += count;
        meshes++;
        meshVertCounts.push(count);
      }
    });
    const size = g.settings.mapSize as number;
    return {
      id: g.mapProfile.landmark as string | null,
      present: true,
      // structural fingerprint: the multiset of per-mesh vertex counts (the plain
      // verts:meshes total is too coarse and collides for distinct landmarks)
      sig: meshVertCounts.sort((a, b) => a - b).join(','),
      x: l.position.x as number,
      z: l.position.z as number,
      verts,
      meshes,
      size,
      dist: Math.hypot(l.position.x - size / 2, l.position.z - size / 2),
      onWater: g.terrain.isWater(l.position.x, l.position.z) as boolean,
    };
  });
}

test('the Caral landmark uses the modular Pyramid Mayor and Anfiteatro GLBs', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const info = await landmarkInfo(page);
  await page.waitForFunction(
    () =>
      (
        window as unknown as {
          game?: { landmark?: { getObjectByName?: (name: string) => unknown } };
        }
      ).game?.landmark?.getObjectByName?.('caral_anfiteatro') !== undefined,
    null,
    { timeout: 15_000 },
  );
  const child = await page.evaluate(() => {
    const landmark = (window as unknown as { game: any }).game.landmark;
    const model = landmark?.getObjectByName('caral_pyramid_mayor');
    const pad = landmark?.getObjectByName('caral_landmark_pad');
    const setpiece = landmark?.getObjectByName('caral_anfiteatro');
    const setpiecePad = landmark?.getObjectByName('caral_landmark_setpiece_pad');
    const THREE = (window as unknown as { THREE: any }).THREE;
    type Traversable = { traverse(callback: (object: { isMesh?: boolean }) => void): void };
    const count = (root: Traversable | null): number => {
      let meshes = 0;
      root?.traverse((object) => {
        if (object.isMesh) meshes++;
      });
      return meshes;
    };
    pad?.updateWorldMatrix(true, false);
    const box = pad && THREE ? new THREE.Box3().setFromObject(pad) : null;
    const size = box?.getSize(new THREE.Vector3()) ?? null;
    setpiece?.updateWorldMatrix(true, false);
    const setpiecePos = setpiece && THREE ? setpiece.getWorldPosition(new THREE.Vector3()) : null;
    const setpiecePadParams = setpiecePad?.userData?.padSize as { x: number; z: number } | undefined;
    return {
      name: model?.name ?? null,
      meshes: count(model),
      pad: pad?.name ?? null,
      padSize: size ? { x: size.x as number, y: size.y as number, z: size.z as number } : null,
      padTop: box?.max.y as number | undefined,
      landmarkY: landmark?.position.y as number | undefined,
      setpiece: {
        name: setpiece?.name ?? null,
        meshes: count(setpiece),
        pad: setpiecePad?.name ?? null,
        padSize: setpiecePadParams
          ? {
              x: setpiecePadParams.x,
              y: setpiecePad?.userData?.padHeight as number,
              z: setpiecePadParams.z,
            }
          : null,
        distance: setpiecePos
          ? Math.hypot(setpiecePos.x - landmark.position.x, setpiecePos.z - landmark.position.z)
          : null,
      },
    };
  });
  expect(info.id).toBe('caral_ceremonial');
  expect(info.present).toBe(true);
  expect(child.name).toBe('caral_pyramid_mayor');
  expect(child.meshes).toBeGreaterThan(0);
  expect(child.pad).toBe('caral_landmark_pad');
  expect(child.padSize!.x).toBeGreaterThan(23);
  expect(child.padSize!.z).toBeGreaterThan(23);
  expect(child.padSize!.y).toBeGreaterThan(2.1);
  expect(child.padTop!).toBeGreaterThanOrEqual(child.landmarkY! - 0.03);
  expect(child.setpiece.name).toBe('caral_anfiteatro');
  expect(child.setpiece.meshes).toBeGreaterThan(0);
  expect(child.setpiece.pad).toBe('caral_landmark_setpiece_pad');
  expect(child.setpiece.padSize!.x).toBeCloseTo(21, 3);
  expect(child.setpiece.padSize!.z).toBeCloseTo(9, 3);
  expect(child.setpiece.padSize!.y).toBeCloseTo(3, 3);
  expect(child.setpiece.distance!).toBeGreaterThan(24.5);
  expect(child.setpiece.distance!).toBeLessThan(80);
});

test('the Caral landmark falls back when the modular GLB fails', async ({ page }) => {
  await page.route('**/*caral_pyramid_mayor_lod0.glb*', (route) => {
    if (route.request().url().includes('?')) return route.continue();
    return route.abort();
  });
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  await page.waitForFunction(
    () =>
      (
        window as unknown as { game?: { landmark?: { getObjectByName?: (name: string) => unknown } } }
      ).game?.landmark?.getObjectByName?.('caral_ceremonial_fallback') !== undefined,
    null,
    { timeout: 15_000 },
  );
  const state = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    return {
      fallback: g.landmark?.getObjectByName('caral_ceremonial_fallback')?.name ?? null,
      ownsStatic: g.landmarkOwnsStatic as boolean,
    };
  });
  expect(state.fallback).toBe('caral_ceremonial_fallback');
  expect(state.ownsStatic).toBe(false);
  await page.evaluate(() => (window as unknown as { game: { destroy(): void } }).game.destroy());
});

test('period maps place their own landmark on land', async ({ page }) => {
  const missions: [string, string][] = [
    ['m1_caral', 'caral_ceremonial'],
    ['m2_chavin', 'chavin_temple'],
    ['m3_moche_recuay', 'moche_huaca'],
    ['m4_wari', 'wari_compound'],
    ['m5_yahuar_pampa', 'inca_ushnu'],
  ];
  const signatures = new Set<string>();
  for (const [mission, id] of missions) {
    await boot(page, `/?mission=${mission}&fog=0&low=1&noloop=1`);
    const info = await landmarkInfo(page);
    expect(info.id, mission).toBe(id);
    expect(info.present).toBe(true);
    expect(info.meshes!).toBeGreaterThan(0);
    expect(info.verts!).toBeGreaterThan(500);
    expect(info.onWater, `${mission} landmark on water`).toBe(false);
    expect(info.dist!).toBeLessThanOrEqual(0.45 * info.size!);
    signatures.add(info.sig!);
  }
  expect(signatures.size, 'the landmarks must not share a structure').toBe(missions.length);
});

test('a civilization outside its landmark period places none', async ({ page }) => {
  // the Realistas' colonial church belongs to the Viceroyalty; in the Independence period it is dropped
  await boot(page, '/?civ=realistas&period=7&seed=777&fog=0&low=1&noloop=1');
  const info = await landmarkInfo(page);
  expect(info.present).toBe(false);
  expect(info.id).toBeNull();
});

test('an incompatible map region drops the landmark', async ({ page }) => {
  // the Inca conquering the north coast (m6): a high-Andes ushnu does not fit a coast
  await boot(page, '/?mission=m6_chimu_inca&fog=0&low=1&noloop=1');
  const info = await landmarkInfo(page);
  expect(info.present).toBe(false);
  expect(info.id).toBeNull();
});

test('post-1532 maps place the colonial / republican landmark', async ({ page }) => {
  await boot(page, '/?civ=realistas&period=6&seed=777&fog=0&low=1&noloop=1');
  expect((await landmarkInfo(page)).id).toBe('colonial_church');
  await boot(page, '/?civ=republica&period=8&seed=777&fog=0&low=1&noloop=1');
  expect((await landmarkInfo(page)).id).toBe('republican_fort');
});

test('period skirmishes place their family landmark', async ({ page }) => {
  const cases: [string, number, string][] = [
    ['cupisnique', 1, 'cupisnique_huaca'],
    ['paracas', 1, 'paracas_necropolis'],
    ['nazca', 2, 'nazca_geoglyph'],
    ['wari', 3, 'wari_compound'],
    ['tiahuanaco', 3, 'tiahuanaco_complex'],
    ['chimu', 4, 'chimu_compound'],
    ['chincha', 4, 'chincha_complex'],
    ['chanca', 4, 'chanca_fortress'],
    ['collas_lupaca', 4, 'collas_chullpa'],
    ['huanca', 4, 'huanca_center'],
    ['recuay', 2, 'recuay_pashash'],
    ['patriotas', 7, 'patriotas_camp'],
    ['chile', 8, 'chile_apostadero'],
  ];
  const signatures = new Set<string>();
  for (const [civ, period, id] of cases) {
    await boot(page, `/?civ=${civ}&period=${period}&seed=777&fog=0&low=1&noloop=1`);
    const info = await landmarkInfo(page);
    expect(info.id, civ).toBe(id);
    expect(info.present, civ).toBe(true);
    expect(info.meshes!, civ).toBeGreaterThan(0);
    expect(info.onWater, `${civ} landmark on water`).toBe(false);
    signatures.add(info.sig!);
  }
  expect(signatures.size, 'the landmarks must not share a structure').toBe(cases.length);
});

test('landmark placement is deterministic for the same seed', async ({ page }) => {
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const a = await landmarkInfo(page);
  await boot(page, '/?mission=m1_caral&fog=0&low=1&noloop=1');
  const b = await landmarkInfo(page);
  expect(a).toEqual(b);
});
