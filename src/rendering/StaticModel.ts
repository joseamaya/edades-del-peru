import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
] as const;

/**
 * Load a static glTF/GLB (architecture, landmarks, setpieces). Unlike
 * `ModelAssets`, it does not require animation clips or a skeleton.
 */
export async function loadStaticGltf(url: string): Promise<THREE.Group> {
  const gltf = await new GLTFLoader().loadAsync(url);
  if (!gltf.scene) throw new Error(`static glTF has no scene: ${url}`);
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  return gltf.scene;
}

/** Free the geometries, materials and textures owned by a static model. */
export function disposeStaticGltf(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const key of TEXTURE_KEYS) {
        const texture = (material as unknown as Record<string, unknown>)[key] as THREE.Texture | undefined;
        if (texture?.isTexture) textures.add(texture);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}
