import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  RIG_VARIANT_CLIPS,
  modelAssetIdsForMatch,
  rigClipStateFor,
  unitModelAsset,
} from '../src/model/defs/modelAssets';
import { CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { CIVS } from '../src/model/defs/civs';
import { BUILDING_DEFS } from '../src/model/defs/buildings';
import type { PersonGender } from '../src/model/defs/people';
import { andeanCultureForVariant, andeanPalette, andeanRoleForVariant } from '../src/model/defs/andeanCharacters';
import { getPeriod } from '../src/model/defs/periods';
import { unitTrainableInPeriod } from '../src/model/defs/units';
import { MOUNTED_SPECS } from '../src/model/defs/mountedCharacters';
import { MODERN_SPECS } from '../src/model/defs/modernCharacters';
import { siegeSpecForVariant } from '../src/model/defs/siegeCharacters';
import { HEAD_FIT, workerToolFor } from '../src/rendering/workerAttire';
import {
  acquireRig,
  clearModelAssets,
  loadModelAsset,
  loadModelAssetFromData,
  modelAssetStatus,
  preloadModelAssets,
  type LoadedModelAsset,
} from '../src/rendering/ModelAssets';
import { MODEL_ASSET_DEFS } from '../src/rendering/modelAssetRegistry';
import { CONSOLIDATED_SOURCE_LAYER } from '../src/rendering/modelConsolidation';

const MODEL_URL = new URL('../src/assets/models/ual_mannequin.glb', import.meta.url);
const WORKER_URL = new URL('../src/assets/models/caral_worker.glb', import.meta.url);
const MOUNTED_URL = new URL('../src/assets/models/quaternius_horse.glb', import.meta.url);
const SIEGE_URL = new URL('../src/assets/models/siege_rig.glb', import.meta.url);
const VEHICLE_URL = new URL('../src/assets/models/vehicle_rig.glb', import.meta.url);
let glb: ArrayBuffer;

beforeAll(() => {
  const file = fs.readFileSync(fileURLToPath(MODEL_URL));
  glb = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
});

afterEach(() => {
  clearModelAssets();
  vi.restoreAllMocks();
});

function load(): Promise<LoadedModelAsset> {
  return loadModelAssetFromData('ual_mannequin', glb);
}

/** Bounds of a dressed piece in its geometry space: the dress frame, relative to the bone it rides. */
function localBox(mesh: THREE.Mesh): THREE.Box3 {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.clone();
}

function firstMesh(root: THREE.Object3D): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  root.traverse((obj) => {
    if (!found && (obj as THREE.Mesh).isMesh) found = obj as THREE.Mesh;
  });
  if (!found) throw new Error('no mesh in the fixture');
  return found;
}

function bone(root: THREE.Object3D, name: string): THREE.Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing bone ${name}`);
  return found;
}

describe('rigged model assets', () => {
  it('loads a local GLB with materials and animation clips', async () => {
    const asset = await load();
    expect(asset.clipNames.size).toBeGreaterThan(1);
    expect(asset.clipNames.has('Idle_Loop')).toBe(true);
    expect(asset.clipNames.has('Walk_Loop')).toBe(true);

    let skinned = 0;
    const materials = new Set<THREE.Material>();
    asset.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      materials.add(mesh.material as THREE.Material);
    });
    expect(skinned).toBeGreaterThan(0);
    expect(materials.size).toBeGreaterThan(0);
  });

  it('plays the one-shot hit reaction as an overlay and resumes a different state', async () => {
    await load();
    const rig = acquireRig('ual_mannequin')!;
    rig.play('idle', 0);
    rig.update(0.1);
    expect(rig.hitPlaying).toBe(false);
    rig.playHit(0);
    expect(rig.hitPlaying).toBe(true);
    // A new state requested during the flinch must actually start when the clip ends.
    rig.play('walk', 0);
    rig.update(0.5);
    expect(rig.hitPlaying).toBe(false);
    expect(rig.currentState).toBe('walk');
    const thigh = bone(rig.root, 'thigh_l').quaternion.clone();
    for (let i = 0; i < 6; i++) rig.update(0.05);
    expect(bone(rig.root, 'thigh_l').quaternion.equals(thigh)).toBe(false);
    rig.dispose();
  });

  it('clones skeletons and mixers independently for each instance', async () => {
    const asset = await load();
    const a = acquireRig('ual_mannequin');
    const b = acquireRig('ual_mannequin');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    const meshA = firstMesh(a!.root);
    const meshB = firstMesh(b!.root);
    expect(meshA.geometry).toBe(meshB.geometry);
    expect(meshA.material).toBe(meshB.material);
    expect((meshA as THREE.SkinnedMesh).skeleton).not.toBe((meshB as THREE.SkinnedMesh).skeleton);
    expect(bone(a!.root, 'Head')).not.toBe(bone(b!.root, 'Head'));

    const position = a!.root.position.clone();
    a!.play('idle', 0);
    b!.play('gather', 0);
    for (let i = 0; i < 45; i++) {
      a!.update(1 / 60);
      b!.update(1 / 60);
    }
    expect(bone(a!.root, 'Head').quaternion.equals(bone(b!.root, 'Head').quaternion)).toBe(false);
    expect(a!.root.position.equals(position)).toBe(true);

    const aHead = bone(a!.root, 'Head').quaternion.clone();
    b!.play('idle', 0);
    b!.update(1);
    expect(bone(a!.root, 'Head').quaternion.equals(aHead)).toBe(true);
    expect(asset.refs).toBe(2);
    a!.dispose();
    b!.dispose();
    expect(asset.refs).toBe(0);
  });

  it('switches clips without restarting the current one', async () => {
    await load();
    const rig = acquireRig('ual_mannequin')!;
    rig.play('walk', 0);
    rig.update(0.5);
    const time = rig.time;
    rig.play('walk', 0);
    rig.update(0.5);
    expect(rig.currentState).toBe('walk');
    expect(rig.time).toBeGreaterThan(time);

    rig.play('gather', 0);
    rig.update(0.25);
    expect(rig.currentState).toBe('gather');
    expect(rig.currentClipName).toBe('Fixing_Kneeling');
    rig.dispose();
  });

  it('freezes a rig pose for a corpse', async () => {
    await load();
    const rig = acquireRig('ual_mannequin')!;
    rig.play('walk', 0);
    rig.update(0.25);
    rig.playDeath();
    expect(rig.currentState).toBeNull();
    rig.update(1);
    rig.dispose();
  });

  it('falls back to the procedural path when a rig is not preloaded', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(acquireRig('ual_mannequin')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('procedural fallback'));
    expect(modelAssetStatus(['ual_mannequin'])[0].state).toBe('idle');
  });

  it('rejects a corrupt local model without caching it', async () => {
    await expect(loadModelAssetFromData('ual_mannequin', new ArrayBuffer(8))).rejects.toThrow();
    expect(modelAssetStatus(['ual_mannequin'])[0].state).toBe('idle');
  });

  it('reports a failed load and keeps the fallback available', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The demo mannequin is intentionally not registered in the production registry; the test
    // asserts the fallback path for an unavailable asset, not a specific fetch error.
    const asset = await loadModelAsset('ual_mannequin');
    expect(asset).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('using the procedural fallback'));
    expect(modelAssetStatus(['ual_mannequin'])[0]).toMatchObject({ state: 'failed' });
    expect(acquireRig('ual_mannequin')).toBeNull();
  });

  it('keeps shared resources alive until every rig is disposed', async () => {
    const asset = await load();
    const geometry = firstMesh(asset.scene).geometry;
    const dispose = vi.spyOn(geometry, 'dispose');
    const a = acquireRig('ual_mannequin')!;
    const b = acquireRig('ual_mannequin')!;

    a.dispose();
    expect(asset.refs).toBe(1);
    expect(dispose).not.toHaveBeenCalled();

    b.dispose();
    expect(asset.refs).toBe(0);
    expect(dispose).not.toHaveBeenCalled();

    clearModelAssets();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('maps the Caral worker to the finished worker asset and preloads it for Caral matches', () => {
    expect(unitModelAsset(UnitKind.WORKER, Era.FORMATIVE, CivId.CARAL, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_worker_f',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.FORMATIVE, CivId.CARAL, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_worker_m',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.FORMATIVE, CivId.CARAL, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_scout_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.FORMATIVE, CivId.CARAL, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_scout_m',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.REGIONAL_STATES, CivId.CARAL)).toBeNull();
    expect(unitModelAsset(UnitKind.WORKER, Era.FORMATIVE, CivId.MOCHE)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.ARCHAIC, [CivId.CARAL])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.ARCHAIC, [CivId.MOCHE])).toEqual(['quaternius_alpaca']);
    expect(modelAssetIdsForMatch(HistoricalPeriod.VICEROYALTY, [CivId.REALISTAS])).toContain('caral_worker');
  });

  it('selects the hero asset only for Manco in a Killke match', () => {
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 9, 'male', 'manco_capac')).toEqual({
      asset: 'tambotoco_hero',
      variant: 'inca_killke_soldier_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 9, 'male', 'ayar_auca')?.asset).toBe(
      'caral_worker',
    );
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 9, 'male')?.asset).toBe(
      'caral_worker',
    );
  });

  it('preloads the Tambotoco hero for Killke matches', () => {
    const file = fileURLToPath(new URL('../src/assets/models/tambotoco_hero.glb', import.meta.url));
    expect(fs.statSync(file).size).toBeLessThan(1_600_000);
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_INTERMEDIATE, [CivId.INCA_KILLKE])).toContain('tambotoco_hero');
  });

  it('resolves the longest Andean culture prefix and its palette', () => {
    expect(andeanCultureForVariant('inca_killke_soldier_f')).toBe('inca_killke');
    expect(andeanRoleForVariant('inca_killke_soldier_f')).toBe('soldier');
    expect(andeanPalette('inca_killke').primary).toBe(0xb08a4a);
    expect(andeanCultureForVariant('ayllus_worker_m')).toBe('ayllus');
    expect(andeanCultureForVariant('inca_chasqui_m')).toBeNull();
  });

  it('gives the Killke señorío and the valley ayllus their own variants', () => {
    expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 1)?.variant).toBe(
      'inca_killke_worker_m',
    );
    expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, CivId.AYLLUS, 1)?.variant).toBe('ayllus_worker_m');
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.AYLLUS, 2)?.variant).toBe('ayllus_soldier_f');
  });

  it('lets a named hero gender override the unit-id split for body and garments', () => {
    const byId = unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 2);
    expect(byId?.variant).toBe('inca_killke_soldier_f');
    const hero = unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 2, 'male');
    expect(hero?.variant).toBe('inca_killke_soldier_m');
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 3, 'female')?.variant).toBe(
      'inca_killke_soldier_f',
    );
    // The Killke señorío has its own variant, and the recursion must carry the override.
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA_KILLKE, 3, 'female')?.asset).toBe(
      'caral_worker',
    );
  });

  it('maps post-1532 humanoid classes to colonial/republican rig variants', () => {
    expect(unitModelAsset(UnitKind.SOLDIER, Era.VICEROYALTY, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_soldier_f',
    });
    expect(unitModelAsset(UnitKind.MUSKETEER, Era.VICEROYALTY, CivId.REALISTAS, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_ranged_m',
    });
    expect(unitModelAsset(UnitKind.MISSIONARY, Era.REPUBLIC, CivId.PATRIOTAS, 4)).toEqual({
      asset: 'caral_worker',
      variant: 'patriotas_missionary_f',
    });
    expect(unitModelAsset(UnitKind.RIFLEMAN, Era.REPUBLIC, CivId.CHILE, 5)).toEqual({
      asset: 'caral_worker',
      variant: 'chile_ranged_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REPUBLIC, CivId.REPUBLIC, 6)).toEqual({
      asset: 'caral_worker',
      variant: 'republica_soldier_f',
    });
    expect(unitModelAsset(UnitKind.SNIPER, Era.REPUBLIC, CivId.PATRIOTAS, 7)).toEqual({
      asset: 'caral_worker',
      variant: 'patriotas_ranged_m',
    });
    expect(unitModelAsset(UnitKind.COMMISSAR, Era.REPUBLIC, CivId.PATRIOTAS)).toBeNull();
    expect(RIG_VARIANT_CLIPS.realistas_soldier_m?.attack).toBe('Sword_Regular_A');
    expect(RIG_VARIANT_CLIPS.republica_ranged_f?.attack).toBe('Pistol_Shoot');
    expect(unitModelAsset(UnitKind.HUSSAR, Era.REPUBLIC, CivId.CHILE)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_chile',
    });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.VICEROYALTY, CivId.REALISTAS)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_realistas',
    });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.VICEROYALTY, CivId.INCA)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_rebelde',
    });
    // The hueste's scripted Andean allies keep the Inca rig, not the Spanish one.
    expect(unitModelAsset(UnitKind.INCA_WARRIOR, Era.VICEROYALTY, CivId.HUESTE_INDIANA, 8)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_soldier_f',
    });
    // The Inca slinger keeps the Andean ranged rig in the conquest missions, not a firearm model.
    expect(unitModelAsset(UnitKind.INCA_SLINGER, Era.VICEROYALTY, CivId.INCA, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_ranged_m',
    });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_tank_republica',
    });
    expect(unitModelAsset(UnitKind.CARAVAN, Era.VICEROYALTY, CivId.REALISTAS)).toEqual({
      asset: 'quaternius_alpaca',
      variant: 'caravan',
    });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.FORMATIVE, CivId.REALISTAS)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.VICEROYALTY, [CivId.REALISTAS])).toContain('mounted_rig');
    expect(modelAssetIdsForMatch(HistoricalPeriod.ARCHAIC, [CivId.CARAL])).not.toContain('mounted_rig');
    expect(unitModelAsset(UnitKind.TANK, Era.REPUBLIC, CivId.CHILE)).toBeNull();
    expect(unitModelAsset(UnitKind.ARTILLERY, Era.REPUBLIC, CivId.CHILE)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_cannon_chile',
    });
    expect(unitModelAsset(UnitKind.MORTAR, Era.REPUBLIC, CivId.CHILE)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_mortar_chile',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.CONTEMPORARY, CivId.REPUBLIC, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'contemporary_republica_soldier_m',
    });
  });

  it('keeps the Inca of 1536 and 1572 in the Andean rig and gives m7 the rebel outfit', () => {
    const soldier = (missionId: string, kind = UnitKind.SOLDIER, gender: PersonGender = 'male') =>
      unitModelAsset(kind, Era.VICEROYALTY, CivId.INCA, 1, gender, '', missionId);
    expect(soldier('m_cusco_1536')).toEqual({ asset: 'caral_worker', variant: 'inca_soldier_m' });
    expect(soldier('m_vilcabamba')).toEqual({ asset: 'caral_worker', variant: 'inca_soldier_m' });
    expect(soldier('m7_tupac_amaru')).toEqual({ asset: 'caral_worker', variant: 'rebelde_soldier_m' });
    expect(soldier('m_cusco_1536', UnitKind.MUSKETEER)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_ranged_m',
    });
    expect(soldier('m7_tupac_amaru', UnitKind.MUSKETEER)).toEqual({
      asset: 'caral_worker',
      variant: 'rebelde_ranged_m',
    });
    expect(soldier('m_cusco_1536', UnitKind.WORKER, 'female')).toEqual({
      asset: 'caral_worker',
      variant: 'inca_worker_f',
    });
    // The 1536/1572 rosters exclude these two; a mod that unlocks them gets the procedural fallback.
    expect(soldier('m_cusco_1536', UnitKind.SNIPER)).toBeNull();
    expect(soldier('m_cusco_1536', UnitKind.MISSIONARY)).toBeNull();
    // No mission (free play) does not get the 1780 rebel abstraction.
    expect(soldier('')).toEqual({ asset: 'caral_worker', variant: 'inca_soldier_m' });
  });

  it('maps the remaining pre-Hispanic cultures and the Caral infantry', () => {
    for (const [civ, culture, era, period] of [
      [CivId.CUPISNIQUE, 'cupisnique', Era.REGIONAL_STATES, HistoricalPeriod.EARLY_HORIZON],
      [CivId.NAZCA, 'nazca', Era.REGIONAL_STATES, HistoricalPeriod.EARLY_INTERMEDIATE],
      [CivId.CHINCHA, 'chincha', Era.TAHUANTINSUYO, HistoricalPeriod.LATE_INTERMEDIATE],
      [CivId.COLLAS_LUPACA, 'collas_lupaca', Era.TAHUANTINSUYO, HistoricalPeriod.LATE_INTERMEDIATE],
      [CivId.HUANCA, 'huanca', Era.TAHUANTINSUYO, HistoricalPeriod.LATE_INTERMEDIATE],
    ] as const) {
      for (const [kind, role] of [
        [UnitKind.WORKER, 'worker'],
        [UnitKind.SCOUT, 'scout'],
        [UnitKind.SOLDIER, 'soldier'],
        [UnitKind.MUSKETEER, 'ranged'],
        [UnitKind.RIFLEMAN, 'ranged'],
      ] as const) {
        expect(unitModelAsset(kind, era, civ, 2)).toEqual({
          asset: 'caral_worker',
          variant: `${culture}_${role}_f`,
        });
      }
      expect(modelAssetIdsForMatch(period, [civ])).toContain('caral_worker');
    }
    expect(unitModelAsset(UnitKind.SOLDIER, Era.FORMATIVE, CivId.CARAL, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_soldier_m',
    });
    expect(unitModelAsset(UnitKind.MUSKETEER, Era.FORMATIVE, CivId.CARAL, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_ranged_f',
    });
  });

  it('maps the Amauta to an unarmed Inca variant', () => {
    expect(unitModelAsset(UnitKind.COMMISSAR, Era.TAHUANTINSUYO, CivId.INCA, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_amauta_f',
    });
    expect(RIG_VARIANT_CLIPS.inca_amauta_f?.attack).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.INCA])).toContain('caral_worker');
  });

  it('covers Realistas in the Independence period and the post-1532 workers and scouts', () => {
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REPUBLIC, CivId.REALISTAS, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_soldier_m',
    });
    expect(unitModelAsset(UnitKind.SNIPER, Era.REPUBLIC, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_ranged_f',
    });
    expect(unitModelAsset(UnitKind.MISSIONARY, Era.REPUBLIC, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_missionary_f',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.REPUBLIC, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.REPUBLIC, CivId.REALISTAS, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_scout_m',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.VICEROYALTY, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.REPUBLIC, CivId.PATRIOTAS, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'patriotas_scout_m',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.REPUBLIC, CivId.REPUBLIC, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'republica_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.REPUBLIC, CivId.CHILE, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'chile_scout_m',
    });
    expect(RIG_VARIANT_CLIPS.realistas_worker_f?.gather).toBe('Farm_Harvest');
    expect(RIG_VARIANT_CLIPS.realistas_bicorn_worker_f?.gather).toBe('Farm_Harvest');
    expect(RIG_VARIANT_CLIPS.realistas_bicorn_soldier_m?.attack).toBe('Sword_Regular_A');
    expect(RIG_VARIANT_CLIPS.republica_worker_m?.build).toBe('Push_Loop');
    expect(RIG_VARIANT_CLIPS.republica_worker_m?.walk_carry).toBe('Walk_Carry_Loop');
    expect(modelAssetIdsForMatch(HistoricalPeriod.INDEPENDENCE, [CivId.REALISTAS])).toContain('caral_worker');
  });

  it('keeps the morion in 1535–1572 and wears the bicorn in 1780–1826', () => {
    expect(
      unitModelAsset(UnitKind.SOLDIER, Era.VICEROYALTY, CivId.REALISTAS, 2, undefined, '', 'm_cusco_1536'),
    ).toEqual({ asset: 'caral_worker', variant: 'realistas_soldier_f' });
    expect(
      unitModelAsset(UnitKind.SOLDIER, Era.VICEROYALTY, CivId.REALISTAS, 2, undefined, '', 'm_vilcabamba'),
    ).toEqual({ asset: 'caral_worker', variant: 'realistas_soldier_f' });
    expect(
      unitModelAsset(UnitKind.SOLDIER, Era.VICEROYALTY, CivId.REALISTAS, 2, undefined, '', 'm7_tupac_amaru'),
    ).toEqual({ asset: 'caral_worker', variant: 'realistas_bicorn_soldier_f' });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REPUBLIC, CivId.REALISTAS, 2, undefined, '', 'm_real_felipe')).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_bicorn_soldier_f',
    });
    expect(
      unitModelAsset(UnitKind.CAVALRY, Era.VICEROYALTY, CivId.REALISTAS, 2, undefined, '', 'm_cusco_1536'),
    ).toEqual({ asset: 'mounted_rig', variant: 'mounted_realistas' });
    expect(
      unitModelAsset(UnitKind.CAVALRY, Era.VICEROYALTY, CivId.REALISTAS, 2, undefined, '', 'm7_tupac_amaru'),
    ).toEqual({ asset: 'mounted_rig', variant: 'mounted_realistas_bicorn' });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.REPUBLIC, CivId.REALISTAS, 2)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_realistas_bicorn',
    });
  });

  it('maps contemporary Republic humanoids to the modern uniform', () => {
    for (const [kind, role] of [
      [UnitKind.WORKER, 'worker'],
      [UnitKind.SCOUT, 'scout'],
      [UnitKind.SOLDIER, 'soldier'],
      [UnitKind.MUSKETEER, 'ranged'],
      [UnitKind.RIFLEMAN, 'ranged'],
      [UnitKind.SNIPER, 'sniper'],
      [UnitKind.MISSIONARY, 'missionary'],
    ] as const) {
      expect(unitModelAsset(kind, Era.CONTEMPORARY, CivId.REPUBLIC, 2)).toEqual({
        asset: 'caral_worker',
        variant: `contemporary_republica_${role}_f`,
      });
    }
    expect(RIG_VARIANT_CLIPS.contemporary_republica_worker_f?.gather).toBe('Farm_Harvest');
    expect(RIG_VARIANT_CLIPS.contemporary_republica_worker_m?.walk_carry).toBe('Walk_Carry_Loop');
    expect(RIG_VARIANT_CLIPS.contemporary_republica_ranged_m?.attack).toBe('Pistol_Shoot');
    expect(RIG_VARIANT_CLIPS.contemporary_republica_sniper_m?.attack).toBe('Pistol_Shoot');
    expect(RIG_VARIANT_CLIPS.contemporary_republica_missionary_f?.attack).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.CONTEMPORARY, [CivId.REPUBLIC])).toEqual(
      expect.arrayContaining(['caral_worker', 'vehicle_rig']),
    );
    for (const era of [Era.FORMATIVE, Era.REGIONAL_STATES, Era.TAHUANTINSUYO, Era.VICEROYALTY, Era.REPUBLIC]) {
      const choice = unitModelAsset(UnitKind.SOLDIER, era, CivId.REPUBLIC);
      expect(choice?.variant?.startsWith('contemporary_republica_') ?? false).toBe(false);
    }
  });

  it('maps the m7 Inca rebels to the late-colonial rebel presentation', async () => {
    for (const [kind, role] of [
      [UnitKind.WORKER, 'worker'],
      [UnitKind.SCOUT, 'scout'],
      [UnitKind.SOLDIER, 'soldier'],
      [UnitKind.MUSKETEER, 'ranged'],
      [UnitKind.RIFLEMAN, 'ranged'],
      [UnitKind.SNIPER, 'ranged'],
      [UnitKind.MISSIONARY, 'missionary'],
    ] as const) {
      expect(unitModelAsset(kind, Era.VICEROYALTY, CivId.INCA, 2, 'female', '', 'm7_tupac_amaru')).toEqual({
        asset: 'caral_worker',
        variant: `rebelde_${role}_f`,
      });
    }
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.INCA, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_soldier_m',
    });
    expect(unitModelAsset(UnitKind.HUSSAR, Era.VICEROYALTY, CivId.INCA)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_rebelde',
    });
    expect(unitModelAsset(UnitKind.ARTILLERY, Era.VICEROYALTY, CivId.INCA)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_cannon_rebelde',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.VICEROYALTY, CivId.REALISTAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'realistas_soldier_f',
    });
    expect(RIG_VARIANT_CLIPS.rebelde_ranged_m?.attack).toBe('Pistol_Shoot');
    expect(RIG_VARIANT_CLIPS.rebelde_worker_f?.gather).toBe('Farm_Harvest');
    expect(RIG_VARIANT_CLIPS.rebelde_missionary_m?.attack).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.VICEROYALTY, [CivId.INCA])).toEqual(
      expect.arrayContaining(['caral_worker', 'mounted_rig', 'siege_rig']),
    );

    await load();
    const rig = acquireRig('ual_mannequin', 'rebelde_soldier_m')!;
    expect(rig.root.getObjectByName('attire_post_weapon')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_sleeve_upper_l')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_morion')).toBeUndefined();
    rig.dispose();

    // The Amauta's tech is Late Horizon-only, so m7 never offers it (#327).
    expect(unitTrainableInPeriod(UnitKind.COMMISSAR, HistoricalPeriod.VICEROYALTY, CivId.INCA)).toBe(false);
    expect(unitModelAsset(UnitKind.COMMISSAR, Era.VICEROYALTY, CivId.INCA, 1, 'male', '', 'm7_tupac_amaru')).toBeNull();
  });

  it('covers every trainable unit combination', () => {
    const combos: { civ: CivId; period: HistoricalPeriod; kind: UnitKind }[] = [];
    for (const civ of CIVS) {
      for (const period of civ.periods) {
        for (const kind of Object.values(UnitKind)) {
          if (unitTrainableInPeriod(kind, period, civ.id)) combos.push({ civ: civ.id, period, kind });
        }
      }
    }
    for (const kind of Object.values(UnitKind)) {
      if (unitTrainableInPeriod(kind, HistoricalPeriod.VICEROYALTY, CivId.INCA)) {
        combos.push({ civ: CivId.INCA, period: HistoricalPeriod.VICEROYALTY, kind });
      }
    }
    const missing = combos.filter(({ civ, period, kind }) => {
      // The 1536/1572 rosters exclude the sniper and the missionary; see the explicit null
      // assertions in the Inca test. No campaign unit reaches them.
      if (civ === CivId.INCA && period === HistoricalPeriod.VICEROYALTY) {
        if (kind === UnitKind.SNIPER || kind === UnitKind.MISSIONARY) return false;
      }
      return unitModelAsset(kind, getPeriod(period).level, civ) === null;
    });
    expect(missing).toEqual([]);
  });

  it('loads the cavalry horse and dresses its coat and saddle per side', async () => {
    const data = fs.readFileSync(fileURLToPath(MOUNTED_URL));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const asset = await loadModelAssetFromData('mounted_rig', buffer);
    for (const clip of ['Idle', 'Walk', 'Gallop', 'Attack_Headbutt', 'Death']) {
      expect(asset.clipNames.has(clip), clip).toBe(true);
    }
    const rig = acquireRig('mounted_rig', 'mounted_realistas')!;
    expect(rig.hasState('idle')).toBe(true);
    expect(rig.hasState('walk')).toBe(true);
    expect(rig.hasState('run')).toBe(true);
    expect(rig.hasState('attack')).toBe(true);
    expect(rig.hasDeathClip()).toBe(true);
    expect(rig.referenceSpeed('walk')).toBe(2.4);
    expect(rig.referenceSpeed('run')).toBe(4.2);
    expect(rig.runSpeedThreshold()).toBe(3.8);
    const coatOf = (root: THREE.Object3D): number | null => {
      let hex: number | null = null;
      root.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if ((o as THREE.Mesh).isMesh && m?.name === 'Main') hex = m.color.getHex();
      });
      return hex;
    };
    expect(coatOf(rig.root)).toBe(MOUNTED_SPECS.mounted_realistas.horseCoat);
    expect(rig.root.getObjectByName('attire_mounted_saddle')).toBeDefined();
    // The mount loads as one mesh per material; `dressMounted` merges them (the saddle stays its own draw)
    // into one vertex-coloured mesh. The eight sources stay on layer 31 with their materials inspectable.
    const drawn: THREE.Mesh[] = [];
    const sources: THREE.Mesh[] = [];
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if (mesh.layers.mask === (1 << CONSOLIDATED_SOURCE_LAYER) >>> 0) sources.push(mesh);
      else if (mesh.name === 'rig:consolidated') drawn.push(mesh);
    });
    expect(drawn).toHaveLength(1);
    expect(sources.filter((mesh) => mesh.name.startsWith('Horse'))).toHaveLength(8);
    const merged = drawn[0].material as THREE.MeshStandardMaterial;
    expect(merged.vertexColors).toBe(true);
    // The merged material keeps the horse's surface, not the matte saddle leather that is attached after.
    const horse = sources.find((mesh) => mesh.name === 'Horse_1')!.material as THREE.MeshStandardMaterial;
    expect(merged.roughness).toBe(horse.roughness);
    expect(merged.metalness).toBe(horse.metalness);
    // The coat colour is baked into vertex colours: at least one vertex carries the side's coat.
    const coat = new THREE.Color(MOUNTED_SPECS.mounted_realistas.horseCoat);
    const color = drawn[0].geometry.getAttribute('color');
    let coatBaked = false;
    for (let i = 0; i < color.count && !coatBaked; i++) {
      coatBaked =
        Math.abs(color.getX(i) - coat.r) < 1e-3 &&
        Math.abs(color.getY(i) - coat.g) < 1e-3 &&
        Math.abs(color.getZ(i) - coat.b) < 1e-3;
    }
    expect(coatBaked).toBe(true);
    // The shared worker is not cached in this test: the horse goes riderless instead of a placeholder.
    let rider = false;
    rig.root.traverse((o) => {
      if (o.name === 'rig:caral_worker') rider = true;
    });
    expect(rider).toBe(false);
    rig.dispose();

    const patriot = acquireRig('mounted_rig', 'mounted_patriotas')!;
    expect(coatOf(patriot.root)).toBe(MOUNTED_SPECS.mounted_patriotas.horseCoat);
    patriot.dispose();
  });

  it('seats the rider on its own skeleton and keeps it out of the mount merge', async () => {
    const read = (url: URL): ArrayBuffer => {
      const file = fs.readFileSync(fileURLToPath(url));
      return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    };
    // The worker carries textures; Node has no `self`/image decoding, and the seat only needs the rig.
    const previousSelf = (globalThis as { self?: unknown }).self;
    const textureLoad = THREE.TextureLoader.prototype.load;
    (globalThis as { self?: unknown }).self = globalThis;
    THREE.TextureLoader.prototype.load = function (_url, onLoad) {
      const texture = new THREE.Texture();
      onLoad?.(texture);
      return texture;
    };
    try {
      await loadModelAssetFromData('mounted_rig', read(MOUNTED_URL));
      await loadModelAssetFromData('caral_worker', read(WORKER_URL));
      const rig = acquireRig('mounted_rig', 'mounted_realistas')!;

      const rider = rig.root.getObjectByName('rig:caral_worker');
      expect(rider).toBeDefined();
      expect(rider!.parent?.name).toBe('Torso2');

      // The merged horse mesh is the consolidated draw that is not the rider's own.
      let mergedHorse: THREE.SkinnedMesh | null = null;
      rig.root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        const workerBones = mesh.skeleton?.bones.some((b) => b.name === 'pelvis') ?? true;
        if (!mergedHorse && mesh.isSkinnedMesh && mesh.name === 'rig:consolidated' && !workerBones) mergedHorse = mesh;
      });
      expect(mergedHorse).not.toBeNull();
      expect(mergedHorse!.skeleton.bones.some((b) => b.name === 'thigh_l')).toBe(false);
      rig.dispose();
    } finally {
      THREE.TextureLoader.prototype.load = textureLoad;
      if (previousSelf === undefined) delete (globalThis as { self?: unknown }).self;
      else (globalThis as { self?: unknown }).self = previousSelf;
    }
  });

  it('falls back from run to walk on rigs without a gallop', async () => {
    await load();
    const rig = acquireRig('ual_mannequin')!;
    rig.play('run', 0);
    expect(rig.currentState).toBe('walk');
    expect(rig.currentClipName).toBe('Walk_Loop');
    rig.dispose();
  });

  it('maps and dresses the siege and tank rigs', async () => {
    expect(unitModelAsset(UnitKind.ARTILLERY, Era.VICEROYALTY, CivId.REALISTAS)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_cannon_realistas',
    });
    expect(unitModelAsset(UnitKind.MORTAR, Era.REPUBLIC, CivId.PATRIOTAS)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_mortar_patriotas',
    });
    expect(unitModelAsset(UnitKind.TANK, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_tank_republica',
    });
    expect(unitModelAsset(UnitKind.ARTILLERY, Era.FORMATIVE, CivId.REALISTAS)).toBeNull();
    expect(unitModelAsset(UnitKind.TANK, Era.VICEROYALTY, CivId.REPUBLIC)).toBeNull();
    expect(unitModelAsset(UnitKind.ARTILLERY, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_cannon_republica',
    });
    expect(unitModelAsset(UnitKind.MORTAR, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_mortar_republica',
    });
    expect(unitModelAsset(UnitKind.CAVALRY, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'siege_rig',
      variant: 'siege_tank_republica',
    });
    expect(modelAssetIdsForMatch(HistoricalPeriod.VICEROYALTY, [CivId.REALISTAS])).toEqual(
      expect.arrayContaining(['mounted_rig', 'siege_rig']),
    );
    expect(modelAssetIdsForMatch(HistoricalPeriod.VICEROYALTY, [CivId.INCA])).toEqual(
      expect.arrayContaining(['mounted_rig', 'siege_rig']),
    );

    const data = fs.readFileSync(fileURLToPath(SIEGE_URL));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const asset = await loadModelAssetFromData('siege_rig', buffer);
    expect(asset.clipNames.has('Attack')).toBe(true);
    const rig = acquireRig('siege_rig', 'siege_cannon_realistas')!;
    expect(rig.hasState('walk')).toBe(true);
    expect(rig.hasDeathClip()).toBe(true);
    expect(rig.root.getObjectByName('GEO-Cannon-Siege-Wood')?.visible).toBe(true);
    expect(rig.root.getObjectByName('GEO-Crew-Crew-Coat')?.visible).toBe(true);
    expect(rig.root.getObjectByName('GEO-Tank-Tank-Hull')?.visible).toBe(false);
    for (const name of [
      'GEO-Crew-Crew-Coat',
      'GEO-Crew-Crew-Trim',
      'GEO-Crew-Crew-Trousers',
      'GEO-Cannon-Siege-Wood',
      'GEO-Tank-Tank-Hull',
      'GEO-Tank-Tank-Track',
    ]) {
      expect(rig.root.getObjectByName(name), name).toBeDefined();
    }
    const coat = rig.root.getObjectByName('GEO-Crew-Crew-Coat') as THREE.Mesh;
    expect((coat.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      siegeSpecForVariant('siege_cannon_realistas').coat,
    );

    const mortarRig = acquireRig('siege_rig', 'siege_mortar_patriotas')!;
    expect(mortarRig.root.getObjectByName('GEO-Mortar-Siege-Metal')?.visible).toBe(true);
    expect(mortarRig.root.getObjectByName('GEO-Cannon-Siege-Wood')?.visible).toBe(false);
    expect(mortarRig.root.getObjectByName('GEO-Crew-Crew-Coat')?.visible).toBe(true);
    mortarRig.dispose();

    const tankRig = acquireRig('siege_rig', 'siege_tank_republica')!;
    expect(tankRig.root.getObjectByName('GEO-Tank-Tank-Hull')?.visible).toBe(true);
    expect(tankRig.root.getObjectByName('GEO-Crew-Crew-Coat')?.visible).toBe(false);
    tankRig.dispose();

    const rebelRig = acquireRig('siege_rig', 'siege_cannon_rebelde')!;
    const rebelCoat = rebelRig.root.getObjectByName('GEO-Crew-Crew-Coat') as THREE.Mesh;
    expect((rebelCoat.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      siegeSpecForVariant('siege_cannon_rebelde').coat,
    );
    rebelRig.dispose();
    rig.dispose();
  });

  it('maps and dresses the contemporary vehicles', async () => {
    expect(unitModelAsset(UnitKind.HUSSAR, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'vehicle_rig',
      variant: 'vehicle_motorcycle',
    });
    expect(unitModelAsset(UnitKind.ANTI_AIR, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'vehicle_rig',
      variant: 'vehicle_aa',
    });
    expect(unitModelAsset(UnitKind.NUCLEAR, Era.CONTEMPORARY, CivId.REPUBLIC)).toEqual({
      asset: 'vehicle_rig',
      variant: 'vehicle_rockets',
    });
    expect(unitModelAsset(UnitKind.HUSSAR, Era.REPUBLIC, CivId.REPUBLIC)).toEqual({
      asset: 'mounted_rig',
      variant: 'mounted_republica',
    });
    expect(unitModelAsset(UnitKind.HUSSAR, Era.CONTEMPORARY, CivId.CHILE)).toBeNull();
    expect(RIG_VARIANT_CLIPS.vehicle_motorcycle?.attack).toBe('Attack');

    const data = fs.readFileSync(fileURLToPath(VEHICLE_URL));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const asset = await loadModelAssetFromData('vehicle_rig', buffer);
    expect(asset.clipNames.has('Idle_Loop')).toBe(true);
    expect(asset.clipNames.has('Walk_Loop')).toBe(true);
    expect(asset.clipNames.has('Attack')).toBe(true);

    const moto = acquireRig('vehicle_rig', 'vehicle_motorcycle')!;
    expect(moto.hasState('idle')).toBe(true);
    expect(moto.hasState('walk')).toBe(true);
    expect(moto.hasState('attack')).toBe(true);
    expect(moto.hasDeathClip()).toBe(true);
    expect(moto.root.getObjectByName('GEO-Moto-Vehicle-Metal')?.visible).toBe(true);
    expect(moto.root.getObjectByName('GEO-AA-Vehicle-Metal')?.visible).toBe(false);
    expect(moto.root.getObjectByName('GEO-Rocket-Vehicle-Metal')?.visible).toBe(false);
    const uniform = moto.root.getObjectByName('GEO-Moto-Rider-Uniform') as THREE.Mesh;
    expect((uniform.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      MODERN_SPECS.contemporary_republica.uniform,
    );
    moto.dispose();

    const aa = acquireRig('vehicle_rig', 'vehicle_aa')!;
    expect(aa.root.getObjectByName('GEO-AA-Vehicle-Metal')?.visible).toBe(true);
    expect(aa.root.getObjectByName('GEO-Moto-Vehicle-Metal')?.visible).toBe(false);
    aa.dispose();

    const rockets = acquireRig('vehicle_rig', 'vehicle_rockets')!;
    expect(rockets.root.getObjectByName('GEO-Rocket-Vehicle-Metal')?.visible).toBe(true);
    expect(rockets.root.getObjectByName('GEO-AA-Vehicle-Metal')?.visible).toBe(false);
    rockets.dispose();
  });

  it('adds period headwear, sleeves and a firearm to a post-colonial rig', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'realistas_soldier_m')!;
    expect(rig.root.getObjectByName('attire_post_sleeve_upper_l')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_morion')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_weapon')).toBeDefined();
    rig.dispose();

    const late = acquireRig('ual_mannequin', 'realistas_bicorn_soldier_m')!;
    expect(late.root.getObjectByName('attire_post_bicorn')).toBeDefined();
    late.dispose();
  });

  it('shapes the bicorn into a two-cornered hat', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'realistas_bicorn_soldier_m')!;
    const bicorn = rig.root.getObjectByName('attire_post_bicorn') as THREE.Mesh;
    const box =
      bicorn.geometry.boundingBox ??
      new THREE.Box3().setFromBufferAttribute(bicorn.geometry.getAttribute('position') as THREE.BufferAttribute);
    // A bicorn's points run across the head (x) with a narrow front-to-back (z) footprint. The bounds
    // also reject the old box brim (0.34 x 0.2), which would pass a bare x > z comparison.
    expect(box.max.x - box.min.x).toBeGreaterThan(0.44);
    expect(box.max.z - box.min.z).toBeLessThan(0.3);
    rig.dispose();
  });

  it('dresses the documented Andean warriors with their own shaped gear', async () => {
    await load();
    const moche = acquireRig('ual_mannequin', 'moche_soldier_m')!;
    for (const name of [
      'attire_andean_helmet',
      'attire_andean_backflap',
      'attire_andean_ear',
      'attire_andean_belt',
      'attire_andean_shield',
      'attire_andean_macana',
      'attire_andean_macana_head',
    ]) {
      expect(moche.root.getObjectByName(name), name).not.toBeNull();
    }
    // The back armour is a trapezoid: wider at the bottom than at the top.
    const backflap = moche.root.getObjectByName('attire_andean_backflap') as THREE.Mesh;
    const positions = backflap.geometry.getAttribute('position');
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      minY = Math.min(minY, positions.getY(i));
      maxY = Math.max(maxY, positions.getY(i));
    }
    const widthAt = (y: number): number => {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        if (Math.abs(positions.getY(i) - y) > 1e-3) continue;
        min = Math.min(min, positions.getX(i));
        max = Math.max(max, positions.getX(i));
      }
      return max - min;
    };
    expect(widthAt(maxY)).toBeLessThan(widthAt(minY));
    moche.dispose();

    const wari = acquireRig('ual_mannequin', 'wari_soldier_m')!;
    for (const name of [
      'attire_andean_pectoral',
      'attire_andean_backplate',
      'attire_andean_pectoral_strap',
      'attire_andean_ear',
    ]) {
      expect(wari.root.getObjectByName(name), name).not.toBeNull();
    }
    expect(wari.root.getObjectByName('attire_andean_helmet')).toBeUndefined();
    wari.dispose();

    const worker = acquireRig('ual_mannequin', 'moche_worker_m')!;
    expect(worker.root.getObjectByName('attire_andean_helmet')).toBeUndefined();
    expect(worker.root.getObjectByName('attire_andean_backflap')).toBeUndefined();
    worker.dispose();
  });

  it('fits the Inca cotton helmet to the measured skull instead of the bone', async () => {
    await load();
    for (const [variant, fit] of [
      ['inca_soldier_m', HEAD_FIT.m],
      ['inca_soldier_f', HEAD_FIT.f],
    ] as const) {
      const rig = acquireRig('ual_mannequin', variant)!;
      const helmet = rig.root.getObjectByName('attire_andean_padded_helmet') as THREE.Mesh;
      expect(helmet, variant).toBeDefined();
      // The geometry is built in the dress frame, i.e. relative to the Head bone, so its bounds are the
      // head-local numbers even while the idle clip turns the head.
      const box = localBox(helmet);
      // Rim at the brow; top at the crown the body was measured at (not a bowl above the ears).
      expect(box.min.y, `${variant} rim`).toBeGreaterThan(fit.brow - 0.02);
      expect(box.min.y, `${variant} rim`).toBeLessThan(fit.brow + 0.02);
      expect(box.max.y, `${variant} crown`).toBeGreaterThan(fit.crown - 0.02);
      expect(box.max.x - box.min.x, `${variant} width`).toBeLessThan(fit.radius * 2.4);
      // The skull sits forward of the jaw bone; a cap centred on the bone tips backwards.
      expect((box.min.z + box.max.z) / 2, `${variant} centre`).toBeGreaterThan(0.02);
      rig.dispose();
    }
  });

  it('fits the conical helmet, ear spools and headband to the head', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'moche_soldier_m')!;
    const box = localBox(rig.root.getObjectByName('attire_andean_helmet') as THREE.Mesh);
    // A fitted cap that rises to a point above the crown, not a cone sunk into the skull.
    expect(box.max.y).toBeGreaterThan(HEAD_FIT.m.crown + 0.05);
    expect(box.min.y).toBeGreaterThan(0.06);
    expect(box.min.y).toBeLessThan(0.15);
    expect(box.max.x - box.min.x).toBeLessThan(0.3);
    const ears = localBox(rig.root.getObjectByName('attire_andean_ear') as THREE.Mesh);
    expect(Math.abs(ears.getCenter(new THREE.Vector3()).y - 0.115)).toBeLessThan(0.05);
    expect(ears.max.x - ears.min.x).toBeGreaterThan(0.18);
    // A helmet replaces the band: nothing may poke through the cap.
    expect(rig.root.getObjectByName('attire_headband')).toBeUndefined();
    rig.dispose();

    // On a bare-headed warrior the band rides the hairline, above the brows it used to cover.
    const bare = acquireRig('ual_mannequin', 'recuay_soldier_m')!;
    const band = localBox(bare.root.getObjectByName('attire_headband') as THREE.Mesh);
    expect(band.getCenter(new THREE.Vector3()).y).toBeGreaterThan(0.15);
    bare.dispose();
  });

  it('holds the porra by its grip, head up at rest and on the march', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'moche_soldier_m')!;
    const grip = rig.root.getObjectByName('attire_andean_weapon');
    const shaft = rig.root.getObjectByName('attire_andean_macana');
    const head = rig.root.getObjectByName('attire_andean_macana_head');
    expect(grip?.parent?.name).toBe('hand_r');
    expect(shaft?.parent).toBe(grip);
    expect(head?.parent).toBe(grip);
    for (const [clip, at] of [
      ['idle', 0.4],
      ['run', 0.35],
      ['run', 0.6],
    ] as const) {
      rig.play(clip, 0);
      rig.update(at);
      rig.root.updateMatrixWorld(true);
      const hand = rig.root.getObjectByName('hand_r')!.getWorldPosition(new THREE.Vector3());
      const club = head!.getWorldPosition(new THREE.Vector3());
      // The star no longer drops to the ankle when the shared clip swings the arm.
      expect(club.y - hand.y, `${clip} at ${at}`).toBeGreaterThan(0.35);
    }
    rig.dispose();
  });

  it('grips the rodela at the hand instead of hanging it at the thigh', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'moche_soldier_m')!;
    rig.play('idle', 0);
    rig.update(0.4);
    rig.root.updateMatrixWorld(true);
    const hand = rig.root.getObjectByName('hand_l')!.getWorldPosition(new THREE.Vector3());
    const shield = rig.root.getObjectByName('attire_andean_shield')!;
    const centre = new THREE.Box3().setFromObject(shield).getCenter(new THREE.Vector3());
    expect(centre.distanceTo(hand)).toBeLessThan(0.25);
    rig.dispose();
  });

  it('ships a worker GLB with one skeleton, the worker clips and the cotton garment', () => {
    const file = fs.readFileSync(fileURLToPath(WORKER_URL));
    const jsonLength = file.readUInt32LE(12);
    const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as {
      animations: { name: string; samplers: { input: number }[] }[];
      accessors: { max?: number[] }[];
      skins: { joints: number[] }[];
      nodes: { name?: string }[];
    };
    expect(json.skins.length).toBeGreaterThan(0);
    expect(new Set(json.skins.map((skin) => skin.joints.join(','))).size).toBe(1);
    const joints = json.skins[0].joints.length;
    expect(joints).toBeGreaterThan(0);
    for (const skin of json.skins) expect(skin.joints).toHaveLength(joints);
    expect(json.animations.map((clip) => clip.name)).toEqual(
      expect.arrayContaining([
        'Idle_Loop',
        'Walk_Loop',
        'Jog_Fwd_Loop',
        'Farm_Harvest',
        'Walk_Carry_Loop',
        'Punch_Jab',
        'Pistol_Shoot',
        'Sword_Regular_A',
        'OverhandThrow',
        'Death01',
        'Hit_Chest',
      ]),
    );
    expect(MODEL_ASSET_DEFS.caral_worker.clips.run).toBe('Jog_Fwd_Loop');
    expect(MODEL_ASSET_DEFS.caral_worker.hitClip).toBe('Hit_Chest');
    const clipDuration = (name: string): number => {
      const clip = json.animations.find((entry) => entry.name === name);
      if (!clip) return 0;
      return Math.max(...clip.samplers.map((sampler) => json.accessors[sampler.input]?.max?.[0] ?? 0));
    };
    expect(clipDuration('Jog_Fwd_Loop')).toBeGreaterThan(0.8);
    expect(clipDuration('Hit_Chest')).toBeGreaterThan(0.25);
    expect(json.nodes.map((node) => node.name)).toEqual(
      expect.arrayContaining([
        'Body_f',
        'Body_m',
        'Hair_f',
        'Hair_m',
        'Eyes_f',
        'Eyes_m',
        'Eyebrows_f',
        'Eyebrows_m',
        'attire_tunic_f',
        'attire_tunic_m',
        'attire_skirt_f',
        'attire_skirt_chasqui_f',
        'attire_wrap_m',
        'attire_sash',
        'attire_belt_chasqui',
      ]),
    );
  });

  it('maps Andean combat and death clips from the shared worker GLB', () => {
    expect(RIG_VARIANT_CLIPS.chanca_soldier_m?.attack).toBe('Sword_Regular_A');
    expect(RIG_VARIANT_CLIPS.chanca_ranged_m?.attack).toBe('OverhandThrow');
    expect(RIG_VARIANT_CLIPS.chanca_worker_m?.attack).toBe('Punch_Jab');
    expect(MODEL_ASSET_DEFS.caral_worker.deathClip).toBe('Death01');
    expect(MODEL_ASSET_DEFS.caral_worker.clips.attack).toBe('Punch_Jab');
  });

  it('uses the firearm clip for ranged roles and the stock swing for line infantry', () => {
    for (const variant of [
      'realistas_ranged_m',
      'patriotas_ranged_m',
      'republica_ranged_m',
      'chile_ranged_m',
      'rebelde_ranged_m',
      'contemporary_republica_ranged_m',
      'contemporary_republica_sniper_m',
    ] as const) {
      expect(RIG_VARIANT_CLIPS[variant]?.attack, variant).toBe('Pistol_Shoot');
    }
    for (const variant of [
      'realistas_soldier_m',
      'patriotas_soldier_m',
      'republica_soldier_m',
      'chile_soldier_m',
      'rebelde_soldier_m',
      'contemporary_republica_soldier_m',
    ] as const) {
      expect(RIG_VARIANT_CLIPS[variant]?.attack, variant).toBe('Sword_Regular_A');
    }
    // Honderos keep the sling throw; the firearm clip is not inherited by the Andean line.
    expect(RIG_VARIANT_CLIPS.inca_ranged_m?.attack).toBe('OverhandThrow');
    expect(RIG_VARIANT_CLIPS.moche_ranged_m?.attack).toBe('OverhandThrow');
  });

  it('adds the Caral accessories to a compatible rig and toggles the carried load', async () => {
    // The shipped GLB is covered by the e2e test; this checks the attachment
    // handle against the shared 65-bone skeleton without loading its textures.
    await load();
    const rig = acquireRig('ual_mannequin', 'caral_worker_f')!;
    const headband = rig.root.getObjectByName('attire_headband') as THREE.Mesh;
    const carry = rig.root.getObjectByName('attire_carry')!;
    const tool = rig.root.getObjectByName('attire_tool')!;
    expect(headband).toBeDefined();
    expect(carry).toBeDefined();
    expect(tool).toBeDefined();
    expect(carry.visible).toBe(false);
    expect(tool.visible).toBe(true);

    rig.setCarrying(true, 0x44cc44);
    expect(carry.visible).toBe(true);
    expect(tool.visible).toBe(false);
    const bag = carry.children[0] as THREE.Mesh;
    expect((bag.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x44cc44);
    rig.setCarrying(false);
    expect(carry.visible).toBe(false);
    expect(tool.visible).toBe(true);

    expect(RIG_VARIANT_CLIPS.caral_worker_f?.attack).toBe('TreeChopping_Loop');
    expect(RIG_VARIANT_CLIPS.caral_worker_m?.attack).toBe('TreeChopping_Loop');

    const dispose = vi.spyOn(headband.geometry, 'dispose');
    rig.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('hands the Caral worker the tool of the task and a shicra for stone', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'caral_worker_m')!;
    const stick = rig.root.getObjectByName('attire_tool')!;
    const axe = rig.root.getObjectByName('attire_axe')!;
    const maul = rig.root.getObjectByName('attire_maul')!;
    const shicra = rig.root.getObjectByName('attire_shicra')!;
    expect([stick, axe, maul, shicra].every(Boolean)).toBe(true);
    expect(workerToolFor('tree')).toBe('axe');
    expect(workerToolFor('well')).toBe('maul');
    expect(workerToolFor('berry')).toBe('stick');
    const shown = () => [stick.visible, axe.visible, maul.visible];

    rig.setGatherKind('tree');
    rig.play('chop', 0);
    expect(shown()).toEqual([false, true, false]);
    // The load fills on the back while the swing goes on: the axe stays in hand (it used to vanish).
    rig.setCarrying(true, 0x8a7a5a, 'wood');
    expect(axe.visible).toBe(true);
    expect(shicra.visible).toBe(false);
    rig.play('walk_carry', 0);
    expect(shown()).toEqual([false, false, false]);

    rig.setGatherKind('well');
    rig.setCarrying(true, 0x8a7a5a, 'stone');
    expect(shicra.visible).toBe(true);
    rig.play('chop', 0);
    expect(shown()).toEqual([false, false, true]);

    rig.setCarrying(false);
    rig.setGatherKind('berry');
    rig.play('gather', 0);
    expect(shown()).toEqual([true, false, false]);
    rig.dispose();
  });

  it('swings at trees and quarries and falls back to the harvest on rigs without the swing', () => {
    expect(
      rigClipStateFor({
        moving: false,
        gathering: true,
        building: false,
        attacking: false,
        carrying: false,
        chopping: true,
      }),
    ).toBe('chop');
    expect(
      rigClipStateFor({ moving: false, gathering: true, building: false, attacking: false, carrying: false }),
    ).toBe('gather');
    // Only the Andean workers, who hold an axe or a hammerstone, swing; the tool-less colonial worker harvests.
    expect(RIG_VARIANT_CLIPS.caral_worker_m?.chop).toBe('TreeChopping_Loop');
    expect(RIG_VARIANT_CLIPS.inca_worker_m?.chop).toBe('TreeChopping_Loop');
    expect(MODEL_ASSET_DEFS.caral_worker.clips.chop).toBeUndefined();
    expect(RIG_VARIANT_CLIPS.realistas_worker_m?.chop).toBeUndefined();
  });

  it('dresses the Caral scout with commoner clothes but no chasqui gear', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'caral_scout_f')!;
    expect(rig.root.getObjectByName('attire_headband')).toBeDefined();
    expect(rig.root.getObjectByName('attire_mantle')).toBeDefined();
    expect(rig.root.getObjectByName('attire_canteen')).toBeUndefined();
    expect(rig.root.getObjectByName('attire_tool')).toBeUndefined();
    expect(RIG_VARIANT_CLIPS.caral_scout_f?.walk).toBe('Walk_Loop');
    expect(RIG_VARIANT_CLIPS.caral_scout_m?.walk).toBe('Walk_Loop');
    expect(RIG_VARIANT_CLIPS.caral_scout_f?.attack).toBe('Punch_Jab');
    expect(rig.hasState('attack')).toBe(true);
    rig.play('attack', 0);
    expect(rig.currentState).toBe('attack');
    expect(rig.currentClipName).toBe('Punch_Jab');
    rig.dispose();
  });

  it('keeps the chasqui set reserved for the Inca, without the digging stick', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'inca_chasqui_f')!;
    expect(rig.root.getObjectByName('attire_headband')).toBeDefined();
    expect(rig.root.getObjectByName('attire_canteen')).toBeDefined();
    expect(rig.root.getObjectByName('attire_tool')).toBeUndefined();
    expect(RIG_VARIANT_CLIPS.inca_chasqui_f?.walk).toBe('Walk_Loop');
    expect(RIG_VARIANT_CLIPS.inca_chasqui_m?.walk).toBe('Walk_Loop');
    rig.dispose();
  });

  it('maps the Inca scout to the chasqui presentation and preloads it for the Inca period', () => {
    expect(unitModelAsset(UnitKind.SCOUT, Era.TAHUANTINSUYO, CivId.INCA, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_chasqui_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.TAHUANTINSUYO, CivId.INCA, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_chasqui_m',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, CivId.INCA, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.FORMATIVE, CivId.INCA)).toBeNull();
    expect(unitModelAsset(UnitKind.SCOUT, Era.TAHUANTINSUYO, CivId.CARAL)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.INCA])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.MOCHE])).toEqual(['quaternius_alpaca']);
  });

  it('maps the Moche and Recuay infantry to their rigged variants', () => {
    expect(unitModelAsset(UnitKind.WORKER, Era.REGIONAL_STATES, CivId.MOCHE, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'moche_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.REGIONAL_STATES, CivId.MOCHE, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'moche_scout_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REGIONAL_STATES, CivId.MOCHE, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'moche_soldier_f',
    });
    expect(unitModelAsset(UnitKind.MUSKETEER, Era.REGIONAL_STATES, CivId.MOCHE, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'moche_ranged_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REGIONAL_STATES, CivId.RECUAY, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'recuay_soldier_f',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.MOCHE)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_INTERMEDIATE, [CivId.MOCHE])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_INTERMEDIATE, [CivId.RECUAY])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_INTERMEDIATE, [CivId.CARAL])).toEqual(['quaternius_alpaca']);
  });

  it('maps Chavín and Paracas infantry to their rigged variants', () => {
    expect(unitModelAsset(UnitKind.WORKER, Era.REGIONAL_STATES, CivId.CHAVIN, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'chavin_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.REGIONAL_STATES, CivId.CHAVIN, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'chavin_scout_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REGIONAL_STATES, CivId.CHAVIN, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'chavin_soldier_f',
    });
    expect(unitModelAsset(UnitKind.MUSKETEER, Era.REGIONAL_STATES, CivId.PARACAS, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'paracas_ranged_m',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.REGIONAL_STATES, CivId.PARACAS, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'paracas_soldier_f',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.CHAVIN)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_HORIZON, [CivId.CHAVIN])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_HORIZON, [CivId.PARACAS])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_INTERMEDIATE, [CivId.PARACAS])).toContain('caral_worker');
  });

  it('maps Wari and Tiahuanaco infantry to the Middle Horizon variants', () => {
    expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, CivId.WARI, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'wari_worker_f',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.WARI, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'wari_soldier_m',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, CivId.TIAHUANACO, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'tiahuanaco_worker_f',
    });
    expect(unitModelAsset(UnitKind.SCOUT, Era.TAHUANTINSUYO, CivId.TIAHUANACO, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'tiahuanaco_scout_m',
    });
    expect(unitModelAsset(UnitKind.MUSKETEER, Era.TAHUANTINSUYO, CivId.TIAHUANACO, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'tiahuanaco_ranged_f',
    });
    expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, CivId.TIAHUANACO, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'tiahuanaco_soldier_m',
    });
    expect(modelAssetIdsForMatch(HistoricalPeriod.MIDDLE_HORIZON, [CivId.WARI, CivId.TIAHUANACO])).toContain(
      'caral_worker',
    );
    expect(modelAssetIdsForMatch(HistoricalPeriod.MIDDLE_HORIZON, [CivId.MOCHE])).toEqual(['quaternius_alpaca']);
    expect(modelAssetIdsForMatch(HistoricalPeriod.EARLY_HORIZON, [CivId.MOCHE])).toEqual(['quaternius_alpaca']);
  });

  it('maps Chanca, Chimú and Inca infantry to the Late Horizon variants', () => {
    for (const [civ, culture] of [
      [CivId.CHANCA, 'chanca'],
      [CivId.CHIMU, 'chimu'],
      [CivId.INCA, 'inca'],
    ] as const) {
      expect(unitModelAsset(UnitKind.WORKER, Era.TAHUANTINSUYO, civ, 2)).toEqual({
        asset: 'caral_worker',
        variant: `${culture}_worker_f`,
      });
      expect(unitModelAsset(UnitKind.SOLDIER, Era.TAHUANTINSUYO, civ, 3)).toEqual({
        asset: 'caral_worker',
        variant: `${culture}_soldier_m`,
      });
      expect(unitModelAsset(UnitKind.MUSKETEER, Era.TAHUANTINSUYO, civ, 2)).toEqual({
        asset: 'caral_worker',
        variant: `${culture}_ranged_f`,
      });
    }
    expect(unitModelAsset(UnitKind.SCOUT, Era.TAHUANTINSUYO, CivId.INCA, 3)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_chasqui_m',
    });
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.CHANCA, CivId.INCA])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.CHIMU, CivId.INCA])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.CHANCA])).toEqual(['quaternius_alpaca']);
    expect(modelAssetIdsForMatch(HistoricalPeriod.LATE_HORIZON, [CivId.MOCHE])).toEqual(['quaternius_alpaca']);
  });

  it('maps movement, tasks and combat to clip states by priority', () => {
    expect(rigClipStateFor({ moving: true, gathering: true, building: false, attacking: true, carrying: false })).toBe(
      'walk',
    );
    expect(
      rigClipStateFor({
        moving: true,
        gathering: false,
        building: false,
        attacking: false,
        carrying: false,
        running: true,
      }),
    ).toBe('run');
    expect(rigClipStateFor({ moving: true, gathering: false, building: false, attacking: false, carrying: true })).toBe(
      'walk_carry',
    );
    expect(rigClipStateFor({ moving: false, gathering: true, building: false, attacking: true, carrying: false })).toBe(
      'gather',
    );
    expect(
      rigClipStateFor({ moving: false, gathering: false, building: true, attacking: false, carrying: false }),
    ).toBe('build');
    expect(
      rigClipStateFor({ moving: false, gathering: false, building: false, attacking: true, carrying: false }),
    ).toBe('attack');
    expect(
      rigClipStateFor({ moving: false, gathering: false, building: false, attacking: false, carrying: false }),
    ).toBe('idle');
  });

  it('preloads idempotently and reports the registry status', async () => {
    const asset = await load();
    await preloadModelAssets(['ual_mannequin', 'ual_mannequin']);
    const [status] = modelAssetStatus(['ual_mannequin']);
    expect(status.state).toBe('ready');
    expect(status.clips).toContain(asset.definition.clips.idle);
  });
});

describe('late-era building models', () => {
  const forbidden = /(_atomic|_information|_modern)$|^(plant_|exchange_)/;
  for (const era of [Era.VICEROYALTY, Era.REPUBLIC] as const) {
    it(`uses a period-appropriate model family in era ${era}`, () => {
      for (const def of Object.values(BUILDING_DEFS)) {
        const type = def.eraModel[era]?.type;
        if (type) expect(type).not.toMatch(forbidden);
      }
    });
  }

  it('maps the core buildings to the stone/brick family', () => {
    expect(BUILDING_DEFS.center.eraModel[Era.VICEROYALTY]?.type).toBe('center_imperial');
    expect(BUILDING_DEFS.center.eraModel[Era.REPUBLIC]?.type).toBe('center_imperial');
    expect(BUILDING_DEFS.house.eraModel[Era.REPUBLIC]?.type).toBe('house_steam');
    expect(BUILDING_DEFS.mill.eraModel[Era.REPUBLIC]?.type).toBe('mill_imperial');
    expect(BUILDING_DEFS.sawmill.eraModel[Era.REPUBLIC]?.type).toBe('sawmill_imperial');
    expect(BUILDING_DEFS.smelter.eraModel[Era.REPUBLIC]?.type).toBe('smelter_imperial');
    expect(BUILDING_DEFS.barracks.eraModel[Era.VICEROYALTY]?.type).toBe('barracks_imperial');
    expect(BUILDING_DEFS.fortress.eraModel[Era.REPUBLIC]?.type).toBe('fortress_imperial');
    expect(BUILDING_DEFS.refinery.eraModel[Era.REPUBLIC]?.type).toBe('refinery');
    expect(BUILDING_DEFS.wall.eraModel[Era.REPUBLIC]?.type).toBe('wall_colonial');
    expect(BUILDING_DEFS.market.eraModel[Era.REPUBLIC]?.type).toBe('market_imperial');
  });
});
