import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { modelAssetIdsForMatch, rigClipStateFor, unitModelAsset } from '../src/model/defs/modelAssets';
import { CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';
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
    b!.play('work', 0);
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

    rig.play('work', 0);
    rig.update(0.25);
    expect(rig.currentState).toBe('work');
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
    expect(unitModelAsset(UnitKind.WORKER, Era.FORMATIVE, CivId.CARAL)).toEqual({
      asset: 'caral_worker',
      variant: 'caral_worker',
    });
    expect(unitModelAsset(UnitKind.WORKER, Era.REGIONAL_STATES, CivId.CARAL)).toBeNull();
    expect(unitModelAsset(UnitKind.WORKER, Era.FORMATIVE, CivId.MOCHE)).toBeNull();
    expect(modelAssetIdsForMatch(HistoricalPeriod.ARCHAIC, [CivId.CARAL])).toContain('caral_worker');
    expect(modelAssetIdsForMatch(HistoricalPeriod.ARCHAIC, [CivId.MOCHE])).toEqual([]);
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
      expect.arrayContaining(['Idle_Loop', 'Walk_Loop', 'Farm_Harvest', 'Walk_Carry_Loop']),
    );
    expect(json.nodes.map((node) => node.name)).toEqual(
      expect.arrayContaining(['attire_tunic', 'attire_skirt', 'attire_sash']),
    );
  });

  it('adds the Caral accessories to a compatible rig and toggles the carried load', async () => {
    // The shipped GLB is covered by the e2e test; this checks the attachment
    // handle against the shared 65-bone skeleton without loading its textures.
    await load();
    const rig = acquireRig('ual_mannequin', 'caral_worker')!;
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

    rig.play('attack', 0);
    expect(rig.currentState).toBe('idle');

    const dispose = vi.spyOn(headband.geometry, 'dispose');
    rig.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('maps movement, work and combat to clip states by priority', () => {
    expect(rigClipStateFor({ moving: true, working: true, attacking: true })).toBe('walk');
    expect(rigClipStateFor({ moving: false, working: true, attacking: true })).toBe('work');
    expect(rigClipStateFor({ moving: false, working: false, attacking: true })).toBe('attack');
    expect(rigClipStateFor({ moving: false, working: false, attacking: false })).toBe('idle');
  });

  it('preloads idempotently and reports the registry status', async () => {
    const asset = await load();
    await preloadModelAssets(['ual_mannequin', 'ual_mannequin']);
    const [status] = modelAssetStatus(['ual_mannequin']);
    expect(status.state).toBe('ready');
    expect(status.clips).toContain(asset.definition.clips.idle);
  });
});
