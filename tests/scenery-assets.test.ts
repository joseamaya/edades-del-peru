import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

interface SceneryManifest {
  lods: {
    LOD0: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
    LOD1: { triangles: number; draw_calls: number; materials: string[]; bounds: { min: number[]; size: number[] } };
  };
}

const ASSETS = [
  {
    id: 'caral_pyramid_mayor',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_mayor_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_mayor_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Stone_Granodiorite', 'MAT-Thatch_Reed'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_pyramid_central',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_central_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_central_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_central_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_pyramid_quarry',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_quarry_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_quarry_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_quarry_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_pyramid_lesser',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_lesser_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_lesser_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_lesser_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Plaster_Yellow', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_pyramid_gallery',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_gallery_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_gallery_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_gallery_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_pyramid_huanca',
    lod0: new URL('../src/assets/scenery/caral/caral_pyramid_huanca_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_pyramid_huanca_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_pyramid_huanca_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Plaster_Yellow', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Sand_Desert', 'MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: null,
  },
  {
    id: 'caral_anfiteatro',
    lod0: new URL('../src/assets/scenery/caral/caral_anfiteatro_lod0.glb', import.meta.url),
    lod1: new URL('../src/assets/scenery/caral/caral_anfiteatro_lod1.glb', import.meta.url),
    manifest: JSON.parse(
      fs.readFileSync(path.resolve('art-src/blender/exports/caral/caral_anfiteatro_manifest.json'), 'utf8'),
    ) as SceneryManifest,
    required: ['MAT-Fire_Ember', 'MAT-Plaster_White', 'MAT-Sand_Desert', 'MAT-Stone_Granodiorite'],
    forbidden: ['MAT-Textile_Cotton', 'MAT-Wood_Warm'],
    sandColor: '9d8563',
  },
];

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

function materialColor(root: THREE.Object3D, name: string): string | null {
  let color: string | null = null;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material instanceof THREE.MeshStandardMaterial && material.name === name)
        color = material.color.getHexString();
    }
  });
  return color;
}

describe.each(ASSETS)('$id scenery GLB', (asset) => {
  let lod0: GLTF;
  let lod1: GLTF;

  beforeAll(async () => {
    [lod0, lod1] = await Promise.all([parse(asset.lod0), parse(asset.lod1)]);
  });

  it('is a static glTF with two LODs and no animations or skins', () => {
    expect(lod0.animations).toHaveLength(0);
    expect(lod1.animations).toHaveLength(0);
    const a = stats(lod0.scene);
    const b = stats(lod1.scene);
    expect(a.meshes).toBe(asset.manifest.lods.LOD0.draw_calls);
    expect(b.meshes).toBe(asset.manifest.lods.LOD1.draw_calls);
    expect(a.skinned).toBe(0);
    expect(b.skinned).toBe(0);
    expect(a.materials).toEqual(asset.manifest.lods.LOD0.materials);
    expect(b.materials).toEqual(a.materials);
  });

  it('keeps the documented LOD triangle budgets', () => {
    expect(triangles(lod0.scene)).toBe(asset.manifest.lods.LOD0.triangles);
    expect(triangles(lod1.scene)).toBe(asset.manifest.lods.LOD1.triangles);
    expect(triangles(lod1.scene)).toBeLessThan(triangles(lod0.scene));
  });

  it('matches the game-scale bounds and ground pivot', () => {
    lod0.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(lod0.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sourceSize = asset.manifest.lods.LOD0.bounds.size;
    expect(size.x).toBeCloseTo(sourceSize[0], 2);
    expect(size.y).toBeCloseTo(sourceSize[2], 2);
    expect(size.z).toBeCloseTo(sourceSize[1], 2);
    expect(Math.abs(center.x)).toBeLessThan(0.01);
    expect(Math.abs(center.z)).toBeLessThan(0.01);
    expect(box.min.y).toBeCloseTo(asset.manifest.lods.LOD0.bounds.min[2], 2);
  });

  it('matches the LOD1 game bounds and ground pivot', () => {
    lod1.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(lod1.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const sourceSize = asset.manifest.lods.LOD1.bounds.size;
    expect(size.x).toBeCloseTo(sourceSize[0], 2);
    expect(size.y).toBeCloseTo(sourceSize[2], 2);
    expect(size.z).toBeCloseTo(sourceSize[1], 2);
    expect(Math.abs(center.x)).toBeLessThan(0.01);
    expect(Math.abs(center.z)).toBeLessThan(0.01);
    expect(box.min.y).toBeCloseTo(asset.manifest.lods.LOD1.bounds.min[2], 2);
  });

  it('keeps the required materials and excludes the market props', () => {
    const names = stats(lod0.scene).materials;
    for (const material of asset.required) expect(names).toContain(material);
    for (const material of asset.forbidden) expect(names).not.toContain(material);
  });

  it('exports the expected sand base color where used', () => {
    if (!asset.sandColor) return;
    expect(materialColor(lod0.scene, 'MAT-Sand_Desert')).toBe(asset.sandColor);
  });
});
