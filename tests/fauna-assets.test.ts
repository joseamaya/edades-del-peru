import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { acquireRig, clearModelAssets, loadModelAssetFromData } from '../src/rendering/ModelAssets';
import { clearFaunaTemplates } from '../src/rendering/faunaModels';
import { Wildlife } from '../src/rendering/Wildlife';

const MODEL_URL = new URL('../src/assets/models/quaternius_alpaca.glb', import.meta.url);
let glb: ArrayBuffer;

beforeAll(() => {
  const file = fs.readFileSync(fileURLToPath(MODEL_URL));
  glb = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
});

afterEach(() => {
  clearModelAssets();
  clearFaunaTemplates();
  vi.restoreAllMocks();
});

describe('rigged fauna assets', () => {
  it('loads the alpaca with idle, walk and eat clips', async () => {
    const asset = await loadModelAssetFromData('quaternius_alpaca', glb);
    expect(asset.clipNames.has('Idle')).toBe(true);
    expect(asset.clipNames.has('Walk')).toBe(true);
    expect(asset.clipNames.has('Eating')).toBe(true);
    expect(asset.definition.scale).toBeGreaterThan(0);
  });

  it('keeps the procedural fallback when the fauna asset is unavailable', () => {
    const wildlife = new Wildlife(new THREE.Scene());
    wildlife.spawn([{ id: 'llama', x: 4, z: 6, scale: 1 }], () => 0);
    const before = wildlife.debugSnapshot();
    expect(before).toHaveLength(1);
    expect(before[0].rigged).toBe(false);
    wildlife.update(1 / 60);
    wildlife.dispose();
  });

  it('clones independent camelid skeletons and grounds the feet', async () => {
    const asset = await loadModelAssetFromData('quaternius_alpaca', glb);
    const a = acquireRig('quaternius_alpaca')!;
    const b = acquireRig('quaternius_alpaca')!;
    expect(a.root.getObjectByName('Head')).not.toBe(b.root.getObjectByName('Head'));

    a.play('idle', 0);
    b.play('walk', 0);
    for (let i = 0; i < 30; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(a.root.getObjectByName('Head')!.quaternion.equals(b.root.getObjectByName('Head')!.quaternion)).toBe(false);

    const bounds = new THREE.Box3().setFromObject(a.root);
    expect(Math.abs(bounds.min.y - (asset.definition.groundClearance ?? 0))).toBeLessThan(0.01);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1);

    a.play('eat', 0.25);
    a.update(0.3);
    expect(a.currentState).toBe('eat');
    a.play('walk', 0.25);
    a.update(0.3);
    expect(a.currentState).toBe('walk');

    a.dispose();
    b.dispose();
  });
});
