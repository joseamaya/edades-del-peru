import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { acquireRig, clearModelAssets, loadModelAssetFromData } from '../src/rendering/ModelAssets';
import type { RigInstance } from '../src/rendering/RigInstance';
import { COTTON_WEAVE } from '../src/rendering/workerAttire';

const WORKER_URL = new URL('../src/assets/models/caral_worker.glb', import.meta.url);
const HERO_URL = new URL('../src/assets/models/tambotoco_hero.glb', import.meta.url);
const textureLoad = THREE.TextureLoader.prototype.load;
const previousSelf = (globalThis as { self?: unknown }).self;

beforeAll(async () => {
  // Node has no `self` and no image decoding; the parser only needs a texture object here, and the paint
  // reads the material's tint, not its map.
  (globalThis as { self?: unknown }).self = globalThis;
  THREE.TextureLoader.prototype.load = function (_url, onLoad) {
    const texture = new THREE.Texture();
    onLoad?.(texture);
    return texture;
  };
  for (const [id, url] of [
    ['caral_worker', WORKER_URL],
    ['tambotoco_hero', HERO_URL],
  ] as const) {
    const file = fs.readFileSync(fileURLToPath(url));
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    await loadModelAssetFromData(id, buffer);
  }
});

afterAll(() => {
  THREE.TextureLoader.prototype.load = textureLoad;
  if (previousSelf === undefined) delete (globalThis as { self?: unknown }).self;
  else (globalThis as { self?: unknown }).self = previousSelf;
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
      // The lowest thigh vertex (the knee) is well below the skirt: the bare leg stays skin.
      const thigh = bones.map((bone, index) => (bone === 'thigh_l' ? index : -1)).filter((index) => index >= 0);
      expect(thigh.length).toBeGreaterThan(0);
      const knee = thigh.reduce((min, index) =>
        body.geometry.getAttribute('position').getY(index) < body.geometry.getAttribute('position').getY(min)
          ? index
          : min,
      );
      expect(paintAlpha(body, knee)).toBe(0);
      // The #630 captures showed the shoulder: the clavicle/upper-arm vertices under the short sleeve are
      // painted, not left as skin.
      const shoulders = bones
        .map((bone, index) => (/^(clavicle_[lr]|upperarm_[lr])$/.test(bone) ? index : -1))
        .filter((index) => index >= 0);
      expect(shoulders.some((index) => paintAlpha(body, index) === 1)).toBe(true);
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

  it('covers the other Andean cultures and both genders', () => {
    for (const variant of [
      'chanca_soldier_m',
      'recuay_soldier_f',
      'wari_soldier_m',
      'chimu_soldier_f',
      'inca_soldier_f',
      'moche_soldier_f',
    ] as const) {
      const rig = acquireRig('caral_worker', variant)!;
      try {
        const male = variant.endsWith('_m');
        const body = bodyOf(rig, male);
        const index = spineVertex(body);
        expect(paintAlpha(body, index), variant).toBe(1);
        expectColor(paintColor(body, index), clothColor(rig, male ? 'attire_tunic_m' : 'attire_tunic_f'));
      } finally {
        rig.dispose();
      }
    }
  });

  it('paints the longer uncu of the hero and follows its accent', () => {
    const rig = acquireRig('tambotoco_hero', 'inca_killke_soldier_m')!;
    try {
      const body = bodyOf(rig);
      const bones = dominantBones(body);
      const wrap = rig.root.getObjectByName('attire_wrap_m') as THREE.SkinnedMesh;
      const wrapBottom = posedMinY(wrap);
      const point = new THREE.Vector3();
      // The wrap covers the upper thigh; a painted tunic-coloured thigh vertex below it can only come from
      // the hero's longer uncu (the `longTunic` branch).
      const belowWrap = bones
        .map((bone, index) => (bone === 'thigh_l' ? index : -1))
        .filter((index) => index >= 0)
        .find((index) => {
          body.getVertexPosition(index, point).applyMatrix4(body.matrixWorld);
          return point.y < wrapBottom + 0.01 && paintAlpha(body, index) === 1;
        });
      const tunic = (rig.root.getObjectByName('attire_tunic_m') as THREE.Mesh).material as THREE.MeshStandardMaterial;
      expect(belowWrap).toBeDefined();
      expectColor(paintColor(body, belowWrap!), new THREE.Color(COTTON_WEAVE).multiply(tunic.color));
      rig.setClothColors(0xd04020);
      const index = spineVertex(body);
      expect(paintAlpha(body, index)).toBe(1);
      expectColor(
        paintColor(body, index),
        new THREE.Color(COTTON_WEAVE).multiply(tunic.color).multiply(new THREE.Color(0xd04020)),
      );
    } finally {
      rig.dispose();
    }
  });

  it('paints the normal skirt and wrap in their own colour', () => {
    for (const [variant, male, garment] of [
      ['inca_soldier_f', false, 'attire_skirt_f'],
      ['moche_soldier_m', true, 'attire_wrap_m'],
    ] as const) {
      const rig = acquireRig('caral_worker', variant)!;
      try {
        const body = bodyOf(rig, male);
        const pelvis = dominantBones(body)
          .map((bone, index) => (bone === 'pelvis' ? index : -1))
          .filter((index) => index >= 0);
        const painted = pelvis.find((index) => paintAlpha(body, index) === 1);
        expect(painted, variant).toBeDefined();
        expectColor(paintColor(body, painted!), clothColor(rig, garment));
      } finally {
        rig.dispose();
      }
    }
  });
});

function posedMinY(mesh: THREE.SkinnedMesh): number {
  const point = new THREE.Vector3();
  let min = Infinity;
  const position = mesh.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
    min = Math.min(min, point.y);
  }
  return min;
}

function spineVertex(body: THREE.SkinnedMesh): number {
  const index = dominantBones(body).findIndex((bone) => bone === 'spine_02' || bone === 'spine_01');
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

function boneLabel(bone: string, index: number): string {
  return `${bone} vertex ${index}`;
}
