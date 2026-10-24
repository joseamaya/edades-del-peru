import * as THREE from 'three';
import cityLod0Url from '../assets/cities/caral_city_lod0.glb?url';
import cityLod1Url from '../assets/cities/caral_city_lod1.glb?url';
import {
  mountStaticShowcase,
  SHOWCASE_SAND,
  SHOWCASE_SKY,
  type StaticShowcaseHandle,
  type StaticShowcaseOptions,
} from './StaticShowcase';

export type CityDemoHandle = StaticShowcaseHandle;

/**
 * The Blender GLB exports MAT-Sand_Desert without a baseColorFactor, so three.js
 * falls back to white. Use a sandy colour in the viewer until the material is
 * fixed in the source export.
 */
function fixMaterials(root: THREE.Object3D): void {
  const sand = new THREE.Color(SHOWCASE_SAND);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material instanceof THREE.MeshStandardMaterial && material.name === 'MAT-Sand_Desert') {
        material.color.copy(sand);
        material.roughness = 0.95;
        material.needsUpdate = true;
      }
    }
  });
}

const options: StaticShowcaseOptions = {
  handleName: '__cityDemo',
  eyebrow: 'Blender GLB · Caral',
  title: 'Ciudad Sagrada',
  note: 'MAT-Sand_Desert corregido en el visor: el GLB no exporta su baseColor. Los puestos de plaza deben revisarse contra la nota histórica de Caral antes de la campaña.',
  lod0Url: cityLod0Url,
  lod1Url: cityLod1Url,
  sky: SHOWCASE_SKY,
  fog: [90, 240],
  camera: {
    position: [28, 16, 34],
    target: [0, 1, 0],
    minDistance: 12,
    maxDistance: 160,
  },
  ground: { color: SHOWCASE_SAND, y: -0.22, size: 240 },
  shadow: { extent: 42, far: 160 },
  boundsLabel: (size) =>
    `Huella ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} · pivote centrado a nivel de suelo · Y-up · escalera +Z`,
  fixMaterials,
};

export async function mountCityDemo(): Promise<CityDemoHandle> {
  return mountStaticShowcase(options);
}
