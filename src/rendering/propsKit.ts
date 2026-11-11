import * as THREE from 'three';
import granodioriteLod0 from '../assets/props/caral/caral_granodiorite_lod0.glb?url';
import granodioriteLod1 from '../assets/props/caral/caral_granodiorite_lod1.glb?url';
import { applyArchSurface, archPartsFromScene } from './architectureKit';
import { loadStaticGltf } from './StaticModel';
import type { QuarryStyle } from '../model/defs/profiles';

/** Blender prop kit (scripts/blender/build_caral_props_kit.py). */
export type PropsKitId = QuarryStyle;

const URLS: Record<PropsKitId, { lod0: string; lod1: string }> = {
  granodiorite: { lod0: granodioriteLod0, lod1: granodioriteLod1 },
};

export interface PropsKitPart {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

export interface PropsKitModel {
  id: PropsKitId;
  lods: [PropsKitPart[], PropsKitPart[]];
}

const cache = new Map<PropsKitId, Promise<PropsKitModel>>();

function partsFrom(root: THREE.Object3D): PropsKitPart[] {
  const parts: PropsKitPart[] = [];
  for (const [name, part] of archPartsFromScene(root)) {
    const material = part.material as THREE.MeshStandardMaterial;
    applyArchSurface(material, name);
    parts.push({ geometry: part.geometry, material });
  }
  return parts;
}

/** Load and prepare a prop kit, cached for the session (the instancer never disposes it). */
export function loadPropsKit(id: PropsKitId): Promise<PropsKitModel> {
  let model = cache.get(id);
  if (!model) {
    const urls = URLS[id];
    model = Promise.all([loadStaticGltf(urls.lod0), loadStaticGltf(urls.lod1)]).then(([lod0, lod1]) => ({
      id,
      lods: [partsFrom(lod0), partsFrom(lod1)],
    }));
    model.catch(() => cache.delete(id));
    cache.set(id, model);
  }
  return model;
}
