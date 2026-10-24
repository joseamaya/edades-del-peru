import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const LOD0 = new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod0.glb', import.meta.url);
const LOD1 = new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod1.glb', import.meta.url);
const MANIFEST = JSON.parse(
  fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_mayor_manifest.json'), 'utf8'),
) as {
  lods: {
    LOD0: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
    LOD1: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
  };
};

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
    expect(a.meshes).toBe(MANIFEST.lods.LOD0.draw_calls);
    expect(b.meshes).toBe(MANIFEST.lods.LOD1.draw_calls);
    expect(a.skinned).toBe(0);
    expect(b.skinned).toBe(0);
    expect(a.materials).toEqual(MANIFEST.lods.LOD0.materials);
    expect(b.materials).toEqual(a.materials);
  });

  it('keeps the documented LOD triangle budgets', () => {
    expect(triangles(lod0.scene)).toBe(MANIFEST.lods.LOD0.triangles);
    expect(triangles(lod1.scene)).toBe(MANIFEST.lods.LOD1.triangles);
    expect(triangles(lod1.scene)).toBeLessThan(triangles(lod0.scene));
  });

  it('matches the game-scale bounds and ground pivot', () => {
    lod0.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(lod0.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sourceSize = MANIFEST.lods.LOD0.bounds.size;
    expect(size.x).toBeCloseTo(sourceSize[0], 2);
    expect(size.y).toBeCloseTo(sourceSize[2], 2);
    expect(size.z).toBeCloseTo(sourceSize[1], 2);
    expect(Math.abs(center.x)).toBeLessThan(0.01);
    expect(Math.abs(center.z)).toBeLessThan(0.01);
    expect(box.min.y).toBeCloseTo(MANIFEST.lods.LOD0.bounds.min[2], 2);
  });

  it('matches the LOD1 game bounds and ground pivot', () => {
    lod1.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(lod1.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sourceSize = MANIFEST.lods.LOD1.bounds.size;
    expect(size.x).toBeCloseTo(sourceSize[0], 2);
    expect(size.y).toBeCloseTo(sourceSize[2], 2);
    expect(size.z).toBeCloseTo(sourceSize[1], 2);
    expect(Math.abs(center.x)).toBeLessThan(0.01);
    expect(Math.abs(center.z)).toBeLessThan(0.01);
    expect(box.min.y).toBeCloseTo(MANIFEST.lods.LOD1.bounds.min[2], 2);
  });

  it('keeps the ceremonial material set and excludes the sand plaza and market props', () => {
    const names = stats(lod0.scene).materials;
    expect(names).toContain('MAT-Fire_Ember');
    expect(names).toContain('MAT-Plaster_White');
    expect(names).toContain('MAT-Stone_Granodiorite');
    expect(names).toContain('MAT-Thatch_Reed');
    expect(names).not.toContain('MAT-Sand_Desert');
    expect(names).not.toContain('MAT-Textile_Cotton');
    expect(names).not.toContain('MAT-Wood_Warm');
  });
});
