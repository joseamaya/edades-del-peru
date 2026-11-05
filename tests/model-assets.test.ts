import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  RIG_VARIANT_CLIPS,
  modelAssetIdsForMatch,
  rigClipStateFor,
  unitModelAsset,
} from '../src/model/defs/modelAssets';
import { CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { MOUNTED_SPECS } from '../src/model/defs/mountedCharacters';
import { siegeSpecForVariant } from '../src/model/defs/siegeCharacters';
import {
  acquireRig,
  clearModelAssets,
  loadModelAsset,
  loadModelAssetFromData,
  modelAssetStatus,
  preloadModelAssets,
  type LoadedModelAsset,
} from '../src/rendering/ModelAssets';

const MODEL_URL = new URL('../src/assets/models/ual_mannequin.glb', import.meta.url);
const WORKER_URL = new URL('../src/assets/models/caral_worker.glb', import.meta.url);
const MOUNTED_URL = new URL('../src/assets/models/mounted_rig.glb', import.meta.url);
const SIEGE_URL = new URL('../src/assets/models/siege_rig.glb', import.meta.url);
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

  it('reports a failed URL load and keeps the fallback available', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockRejectedValue(new Error('404'));
    const asset = await loadModelAsset('ual_mannequin');
    expect(asset).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('using the procedural fallback'));
    expect(modelAssetStatus(['ual_mannequin'])[0]).toMatchObject({ state: 'failed', error: '404' });
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
    expect(RIG_VARIANT_CLIPS.realistas_soldier_m?.attack).toBe('Punch_Jab');
    expect(RIG_VARIANT_CLIPS.republica_ranged_f?.attack).toBe('Punch_Jab');
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
    expect(unitModelAsset(UnitKind.CAVALRY, Era.CONTEMPORARY, CivId.REPUBLIC)).toBeNull();
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
    expect(unitModelAsset(UnitKind.SOLDIER, Era.CONTEMPORARY, CivId.REPUBLIC)).toBeNull();
  });

  it('loads the mounted rig and dresses cavalry variants', async () => {
    const data = fs.readFileSync(fileURLToPath(MOUNTED_URL));
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const asset = await loadModelAssetFromData('mounted_rig', buffer);
    expect(asset.clipNames.has('Idle_Loop')).toBe(true);
    expect(asset.clipNames.has('Walk_Loop')).toBe(true);
    expect(asset.clipNames.has('Attack')).toBe(true);
    const rig = acquireRig('mounted_rig', 'mounted_realistas')!;
    expect(rig.hasState('idle')).toBe(true);
    expect(rig.hasState('walk')).toBe(true);
    expect(rig.hasState('attack')).toBe(true);
    expect(rig.hasDeathClip()).toBe(true);
    expect(rig.root.getObjectByName('GEO-Hat-Morion-Crown')?.visible).toBe(true);
    expect(rig.root.getObjectByName('GEO-Hat-Bicorn-Crown')?.visible).toBe(false);
    const trousers = rig.root.getObjectByName('GEO-Merged-Rider-Trousers') as THREE.Mesh;
    expect((trousers.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      MOUNTED_SPECS.mounted_realistas.trousers,
    );
    const sword = rig.root.getObjectByName('GEO-Rider-Sword-Blade') as THREE.Mesh;
    expect((sword.material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(
      MOUNTED_SPECS.mounted_realistas.hatColor,
    );
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
    const coat = rig.root.getObjectByName('GEO-Crew-Crew-Coat') as THREE.Mesh;
    expect((coat.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      siegeSpecForVariant('siege_cannon_realistas').coat,
    );
    rig.dispose();
  });

  it('adds a coat, hat and firearm to a post-colonial rig', async () => {
    await load();
    const rig = acquireRig('ual_mannequin', 'realistas_soldier_m')!;
    expect(rig.root.getObjectByName('attire_post_coat')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_hat')).toBeDefined();
    expect(rig.root.getObjectByName('attire_post_weapon')).toBeDefined();
    rig.dispose();
  });

  it('ships a worker GLB with one skeleton, the worker clips and the cotton garment', () => {
    const file = fs.readFileSync(fileURLToPath(WORKER_URL));
    const jsonLength = file.readUInt32LE(12);
    const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as {
      animations: { name: string }[];
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
        'Sprint_Loop',
        'Farm_Harvest',
        'Walk_Carry_Loop',
        'Punch_Jab',
      ]),
    );
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
