import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import canaBravaLod0 from '../assets/vegetation/caral/caral_cana_brava_lod0.glb?url';
import canaBravaLod1 from '../assets/vegetation/caral/caral_cana_brava_lod1.glb?url';
import carrizoLod0 from '../assets/vegetation/caral/caral_carrizo_lod0.glb?url';
import carrizoLod1 from '../assets/vegetation/caral/caral_carrizo_lod1.glb?url';
import huarangoLod0 from '../assets/vegetation/caral/caral_huarango_lod0.glb?url';
import huarangoLod1 from '../assets/vegetation/caral/caral_huarango_lod1.glb?url';
import sauceLod0 from '../assets/vegetation/caral/caral_sauce_lod0.glb?url';
import sauceLod1 from '../assets/vegetation/caral/caral_sauce_lod1.glb?url';
import totoraLod0 from '../assets/vegetation/caral/caral_totora_lod0.glb?url';
import totoraLod1 from '../assets/vegetation/caral/caral_totora_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';
import type { GeographicRegion, TreeVariant } from '../model/defs/profiles';
import type { PropId } from '../model/defs/props';

/**
 * Blender vegetation kit for the Supe valley (scripts/blender/build_caral_vegetation_kit.py,
 * docs/design/art-direction.md §7). Each species ships a LOD0 and a LOD1 GLB; every LOD holds one
 * mesh per material (bark/stems and alpha-masked leaf or plume cards).
 */
export type VegetationKitId = 'huarango' | 'sauce' | 'cana_brava' | 'carrizo' | 'totora';

export const VEGETATION_KIT_URLS: Record<VegetationKitId, { lod0: string; lod1: string }> = {
  huarango: { lod0: huarangoLod0, lod1: huarangoLod1 },
  sauce: { lod0: sauceLod0, lod1: sauceLod1 },
  cana_brava: { lod0: canaBravaLod0, lod1: canaBravaLod1 },
  carrizo: { lod0: carrizoLod0, lod1: carrizoLod1 },
  totora: { lod0: totoraLod0, lod1: totoraLod1 },
};

/**
 * Tree variants drawn with the kit. The game's `algarrobo` is Prosopis, i.e. the huarango. The kit
 * is authored for the Supe valley, so it only replaces trees on coastal maps (`isCoastalRegion`).
 */
export const KIT_TREE_VARIANTS: Partial<Record<TreeVariant, VegetationKitId>> = {
  algarrobo: 'huarango',
  sauce: 'sauce',
};

export function isCoastalRegion(region: GeographicRegion): boolean {
  return region === 'north_coast' || region === 'central_coast' || region === 'south_coast';
}

/** Terrain props drawn with the kit (visual only). */
export const KIT_PROPS: Partial<Record<PropId, VegetationKitId>> = {
  totora: 'totora',
  cana_brava: 'cana_brava',
  carrizo: 'carrizo',
};

export interface KitPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Alpha-masked cards that sway with the wind (leaves, plumes). */
  leaf: boolean;
}

/** `lods[0]` is the near model, `lods[1]` the far one. */
export interface KitModel {
  id: VegetationKitId;
  lods: [KitPart[], KitPart[]];
}

/** Card materials need alpha testing (not blending) so they sort and cast shadows correctly. */
function prepareMaterial(material: THREE.Material): boolean {
  const std = material as THREE.MeshStandardMaterial;
  const leaf = material.alphaTest > 0 || material.transparent || /Leaf|Plume/.test(material.name);
  if (leaf) {
    std.alphaTest = 0.5;
    std.transparent = false;
    std.depthWrite = true;
  }
  // Stems and trunks are open-ended tubes seen from above: keep the glTF double-sided flag.
  std.side = THREE.DoubleSide;
  material.needsUpdate = true;
  return leaf;
}

/**
 * Copy every attribute to plain Float32 (meshopt GLBs use KHR_mesh_quantization: normalized
 * integers with the scale on the node), so baking the node transform cannot clip them.
 */
export function dequantize(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const src = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const data = new Float32Array(src.count * src.itemSize);
    for (let i = 0; i < src.count; i++) {
      for (let c = 0; c < src.itemSize; c++) data[i * src.itemSize + c] = src.getComponent(i, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, src.itemSize));
  }
  if (geometry.index) out.setIndex(Array.from(geometry.index.array as ArrayLike<number>));
  return out;
}

/** Bake every mesh of a loaded GLB into one geometry per material. */
export function partsFromScene(root: THREE.Object3D): KitPart[] {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const geometry = dequantize(mesh.geometry);
    geometry.applyMatrix4(mesh.matrixWorld);
    const list = byMaterial.get(mesh.material) ?? [];
    list.push(geometry);
    byMaterial.set(mesh.material, list);
    mesh.geometry.dispose();
  });
  const parts: KitPart[] = [];
  for (const [material, geometries] of byMaterial) {
    const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (!geometry) continue;
    if (geometries.length > 1) geometries.forEach((g) => g.dispose());
    geometry.computeBoundingSphere();
    parts.push({ geometry, material, leaf: prepareMaterial(material) });
  }
  parts.sort((a, b) => Number(a.leaf) - Number(b.leaf));
  return parts;
}

export async function loadKitModel(id: VegetationKitId): Promise<KitModel> {
  const urls = VEGETATION_KIT_URLS[id];
  const [lod0, lod1] = await Promise.all([loadStaticGltf(urls.lod0), loadStaticGltf(urls.lod1)]);
  return { id, lods: [partsFromScene(lod0), partsFromScene(lod1)] };
}

export function disposeKitModel(model: KitModel): void {
  for (const parts of model.lods) {
    for (const part of parts) {
      part.geometry.dispose();
      const std = part.material as THREE.MeshStandardMaterial;
      std.map?.dispose();
      part.material.dispose();
    }
  }
}
