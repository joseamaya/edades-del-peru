import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const LOD0 = new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod0.glb', import.meta.url);
const LOD1 = new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod1.glb', import.meta.url);

let lod0: GLTF;
let lod1: GLTF;

function parse(url: URL): Promise<GLTF> {
  const file = fs.readFileSync(fileURLToPath(url));
  const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  return new Promise((resolve, reject) => new GLTFLoader().parse(data, '', resolve, reject));
}

function triangles(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    count += (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.getAttribute('position').count) / 3;
  });
  return count;
}

function stats(root: THREE.Object3D) {
  let meshes = 0;
  let skinned = 0;
  const materials = new Set<string>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) if (material?.name) materials.add(material.name);
  });
  return { meshes, skinned, materials: [...materials].sort() };
}

beforeAll(async () => {
  [lod0, lod1] = await Promise.all([parse(LOD0), parse(LOD1)]);
});

describe('Caral Pyramid Mayor scenery GLB', () => {
  it('is a static glTF with two LODs and no animations or skins', () => {
    expect(lod0.animations).toHaveLength(0);
    expect(lod1.animations).toHaveLength(0);
    const a = stats(lod0.scene);
    const b = stats(lod1.scene);
    expect(a.meshes).toBe(7);
    expect(b.meshes).toBe(7);
    expect(a.skinned).toBe(0);
    expect(b.skinned).toBe(0);
    expect(a.materials).toHaveLength(7);
    expect(b.materials).toEqual(a.materials);
  });

  it('keeps the documented LOD triangle budgets', () => {
    expect(triangles(lod0.scene)).toBe(6044);
    expect(triangles(lod1.scene)).toBe(2408);
    expect(triangles(lod1.scene)).toBeLessThan(triangles(lod0.scene));
  });

  it('matches the game-scale bounds and ground pivot', () => {
    lod0.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(lod0.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    expect(size.x).toBeCloseTo(13.904, 2);
    expect(size.y).toBeCloseTo(2.7744, 2);
    expect(size.z).toBeCloseTo(15.5352, 2);
    expect(Math.abs(center.x)).toBeLessThan(0.01);
    expect(Math.abs(center.z)).toBeLessThan(0.01);
    expect(box.min.y).toBeCloseTo(-0.16, 2);
  });

  it('keeps the ceremonial material set and excludes the sand plaza fallback', () => {
    const names = stats(lod0.scene).materials;
    expect(names).toContain('MAT-Fire_Ember');
    expect(names).toContain('MAT-Plaster_White');
    expect(names).toContain('MAT-Stone_Granodiorite');
    expect(names).toContain('MAT-Thatch_Reed');
    expect(names).not.toContain('MAT-Sand_Desert');
  });
});
