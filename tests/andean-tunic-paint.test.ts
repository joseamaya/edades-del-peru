import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { acquireRig, clearModelAssets, loadModelAssetFromData } from '../src/rendering/ModelAssets';
import type { RigInstance } from '../src/rendering/RigInstance';
import { COTTON_WEAVE } from '../src/rendering/workerAttire';

const WORKER_URL = new URL('../src/assets/models/caral_worker.glb', import.meta.url);
const textureLoad = THREE.TextureLoader.prototype.load;

beforeAll(async () => {
  // Node has no `self` and no image decoding; the parser only needs a texture object here, and the paint
  // reads the material's tint, not its map.
  (globalThis as unknown as { self: unknown }).self = globalThis;
  THREE.TextureLoader.prototype.load = function (_url, onLoad) {
    const texture = new THREE.Texture();
    onLoad?.(texture);
    return texture;
  };
  const file = fs.readFileSync(fileURLToPath(WORKER_URL));
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  await loadModelAssetFromData('caral_worker', buffer);
});

afterAll(() => {
  THREE.TextureLoader.prototype.load = textureLoad;
  clearModelAssets();
});

function bodyOf(rig: RigInstance, male = true): THREE.SkinnedMesh {
  const body = rig.root.getObjectByName(male ? 'Body_m' : 'Body_f');
  if (!body || !(body as THREE.SkinnedMesh).isSkinnedMesh) throw new Error('no skinned body');
  return body as THREE.SkinnedMesh;
}

/** The strongest bone of every body vertex, in the bind pose the garments were derived from. */
function dominantBones(body: THREE.SkinnedMesh): string[] {
  const skinIndex = body.geometry.getAttribute('skinIndex');
  const skinWeight = body.geometry.getAttribute('skinWeight');
  const bones = body.skeleton.bones;
  const out: string[] = [];
  for (let i = 0; i < skinIndex.count; i++) {
    let best = -1;
    let weight = 0;
    for (let k = 0; k < 4; k++) {
      const value = skinWeight.getComponent(i, k);
      if (value > weight) {
        weight = value;
        best = skinIndex.getComponent(i, k);
      }
    }
    out.push(bones[best]?.name ?? '');
  }
  return out;
}

function paintAlpha(body: THREE.SkinnedMesh, index: number): number {
  return body.geometry.getAttribute('paint').getW(index);
}

function paintColor(body: THREE.SkinnedMesh, index: number): THREE.Color {
  const paint = body.geometry.getAttribute('paint');
  return new THREE.Color(paint.getX(index), paint.getY(index), paint.getZ(index));
}

function clothColor(rig: RigInstance, name: string): THREE.Color {
  const mesh = rig.root.getObjectByName(name) as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial;
  return new THREE.Color(COTTON_WEAVE).multiply(material.color);
}

function expectColor(actual: THREE.Color, expected: THREE.Color): void {
  // The paint is stored as a hex tint round-trip, so allow the 8-bit sRGB quantization.
  expect(actual.r).toBeCloseTo(expected.r, 2);
  expect(actual.g).toBeCloseTo(expected.g, 2);
  expect(actual.b).toBeCloseTo(expected.b, 2);
}

describe('Andean tunic body paint', () => {
  it('paints the torso under the Inca tunic but not the bare lower arms, hands or feet', () => {
    const rig = acquireRig('caral_worker', 'inca_soldier_m')!;
    try {
      const body = bodyOf(rig);
      const bones = dominantBones(body);
      const expected = clothColor(rig, 'attire_tunic_m');
      let torso = 0;
      let painted = 0;
      for (let i = 0; i < bones.length; i++) {
        if (/^spine_0[123]$/.test(bones[i])) {
          torso++;
          if (paintAlpha(body, i) === 1) {
            painted++;
            if (painted === 1) expectColor(paintColor(body, i), expected);
          }
        }
        if (/^(hand_[lr]|lowerarm_[lr]|foot_[lr]|calf_[lr]|Head)$/.test(bones[i])) {
          expect(paintAlpha(body, i), boneLabel(bones[i], i)).toBe(0);
        }
      }
      // The neck and the shoulder top sit at the tunic's clipped boundary; the covered torso must dominate.
      expect(torso).toBeGreaterThan(20);
      expect(painted).toBeGreaterThan(torso * 0.75);
    } finally {
      rig.dispose();
    }
  });

  it('matches each culture’s tinted cloth (Moche red, Caral cream) rather than the skin', () => {
    const moche = acquireRig('caral_worker', 'moche_soldier_m')!;
    try {
      const body = bodyOf(moche);
      const index = spineVertex(body);
      expect(paintAlpha(body, index)).toBe(1);
      expectColor(paintColor(body, index), clothColor(moche, 'attire_tunic_m'));
      expect(paintColor(body, index).r).toBeGreaterThan(paintColor(body, index).g);
    } finally {
      moche.dispose();
    }

    const caral = acquireRig('caral_worker', 'caral_worker_m')!;
    try {
      const body = bodyOf(caral);
      const index = spineVertex(body);
      expect(paintAlpha(body, index)).toBe(1);
      expectColor(paintColor(body, index), new THREE.Color(COTTON_WEAVE));
    } finally {
      caral.dispose();
    }
  });

  it('paints the pelvis under the chasqui skirt', () => {
    const rig = acquireRig('caral_worker', 'inca_chasqui_f')!;
    try {
      const body = bodyOf(rig, false);
      const pelvis = dominantBones(body)
        .map((bone, index) => (bone === 'pelvis' ? index : -1))
        .filter((index) => index >= 0);
      expect(pelvis.length).toBeGreaterThan(0);
      const painted = pelvis.find((index) => paintAlpha(body, index) === 1);
      expect(painted).toBeDefined();
      expectColor(paintColor(body, painted!), clothColor(rig, 'attire_skirt_chasqui_f'));
      // The skirt covers the hips, not the whole pelvis ring: most of the pelvis vertices are painted.
      expect(pelvis.filter((index) => paintAlpha(body, index) === 1).length).toBeGreaterThan(pelvis.length * 0.5);
    } finally {
      rig.dispose();
    }
  });

  it('follows a hero accent when the cloth is retinted after dressing', () => {
    const rig = acquireRig('caral_worker', 'inca_killke_soldier_m')!;
    try {
      rig.setClothColors(0xd04020, 0xd04020);
      const body = bodyOf(rig);
      const index = spineVertex(body);
      expect(paintAlpha(body, index)).toBe(1);
      expectColor(paintColor(body, index), new THREE.Color(COTTON_WEAVE).multiply(new THREE.Color(0xd04020)));
    } finally {
      rig.dispose();
    }
  });
});

function spineVertex(body: THREE.SkinnedMesh): number {
  const index = dominantBones(body).findIndex((bone) => bone === 'spine_02' || bone === 'spine_01');
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

function boneLabel(bone: string, index: number): string {
  return `${bone} vertex ${index}`;
}
