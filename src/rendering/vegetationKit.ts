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
import pacaeLod0 from '../assets/vegetation/caral/caral_pacae_lod0.glb?url';
import pacaeLod1 from '../assets/vegetation/caral/caral_pacae_lod1.glb?url';
import totoraLod0 from '../assets/vegetation/caral/caral_totora_lod0.glb?url';
import totoraLod1 from '../assets/vegetation/caral/caral_totora_lod1.glb?url';
import molleLod0 from '../assets/vegetation/andes/andes_molle_lod0.glb?url';
import molleLod1 from '../assets/vegetation/andes/andes_molle_lod1.glb?url';
import pacayLod0 from '../assets/vegetation/andes/andes_pacay_lod0.glb?url';
import pacayLod1 from '../assets/vegetation/andes/andes_pacay_lod1.glb?url';
import ichuLod0 from '../assets/vegetation/andes/andes_ichu_lod0.glb?url';
import ichuLod1 from '../assets/vegetation/andes/andes_ichu_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';
import { preserveAlphaCoverage } from './alphaCoverage';
import { dequantize } from './mergeStatic';
import type { GeographicRegion, TreeVariant, VegetationPack } from '../model/defs/profiles';
import type { PropId } from '../model/defs/props';

/**
 * Blender vegetation kit for the Supe valley (scripts/blender/build_caral_vegetation_kit.py,
 * docs/design/art-direction.md §7). Each species ships a LOD0 and a LOD1 GLB; every LOD holds one
 * mesh per material (bark/stems and alpha-masked leaf or plume cards).
 */
export type VegetationKitId =
  'huarango' | 'sauce' | 'cana_brava' | 'carrizo' | 'totora' | 'pacae' | 'molle' | 'pacay' | 'ichu';

/** Kit LOD0 radii by pack; a pack owns its own policy. */
export const KIT_LOD0_RADIUS = 45;
export const KIT_LOD0_RADIUS_LOW = 25;
export const KIT_LOD0_RADIUS_ANDES = 18;

/** A regional kit set; the mission chooses its pack explicitly (`MapOverrides.vegetationKit`). */
export type { VegetationPack };

const VEGETATION_KIT_URLS: Record<VegetationKitId, { lod0: string; lod1: string }> = {
  huarango: { lod0: huarangoLod0, lod1: huarangoLod1 },
  sauce: { lod0: sauceLod0, lod1: sauceLod1 },
  cana_brava: { lod0: canaBravaLod0, lod1: canaBravaLod1 },
  carrizo: { lod0: carrizoLod0, lod1: carrizoLod1 },
  totora: { lod0: totoraLod0, lod1: totoraLod1 },
  pacae: { lod0: pacaeLod0, lod1: pacaeLod1 },
  molle: { lod0: molleLod0, lod1: molleLod1 },
  pacay: { lod0: pacayLod0, lod1: pacayLod1 },
  ichu: { lod0: ichuLod0, lod1: ichuLod1 },
};

/**
 * Tree variants drawn with the kit. The game's `algarrobo` is Prosopis, i.e. the huarango. A mission
 * opts into a regional pack (`MapOverrides.vegetationKit`); Caral's coastal profile does so by region.
 */
export const KIT_TREE_VARIANTS: Partial<Record<TreeVariant, VegetationKitId>> = {
  algarrobo: 'huarango',
  sauce: 'sauce',
};

/** Tambotoco's highland valley: the two valley trees plus the shared riverbank willow. */
export const KIT_TREE_VARIANTS_ANDES: Partial<Record<TreeVariant, VegetationKitId>> = {
  molle: 'molle',
  pacay: 'pacay',
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

/** Highland pack: the shared reeds; the ichu tufts stay in the procedural ground-cover instancer. */
export const KIT_PROPS_ANDES: Partial<Record<PropId, VegetationKitId>> = {
  totora: 'totora',
  carrizo: 'carrizo',
};

export interface VegetationPackDef {
  trees: Partial<Record<TreeVariant, VegetationKitId>>;
  props: Partial<Record<PropId, VegetationKitId>>;
  /** Dense pack: only the near leaf cards cast, keeping the shared shadow pass inside its cap. */
  nearLeafShadows: boolean;
  lod0Radius: { high: number; low: number };
}

export const VEGETATION_PACKS: Record<VegetationPack, VegetationPackDef> = {
  caral: {
    trees: KIT_TREE_VARIANTS,
    props: KIT_PROPS,
    nearLeafShadows: false,
    lod0Radius: { high: KIT_LOD0_RADIUS, low: KIT_LOD0_RADIUS_LOW },
  },
  andes: {
    trees: KIT_TREE_VARIANTS_ANDES,
    props: KIT_PROPS_ANDES,
    nearLeafShadows: true,
    lod0Radius: { high: KIT_LOD0_RADIUS_ANDES, low: KIT_LOD0_RADIUS_ANDES },
  },
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
    preserveAlphaCoverage(std);
  }
  // Stems and trunks are open-ended tubes seen from above: keep the glTF double-sided flag.
  std.side = THREE.DoubleSide;
  material.needsUpdate = true;
  return leaf;
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

/**
 * Prepared kit models are kept for the session (like the rigged model assets): every match reuses
 * them instead of fetching, meshopt-decoding and merging the GLBs again. Instancers never dispose
 * them; a failed load is forgotten so the next match retries.
 */
const kitCache = new Map<VegetationKitId, Promise<KitModel>>();

export function loadKitModel(id: VegetationKitId): Promise<KitModel> {
  let model = kitCache.get(id);
  if (!model) {
    const urls = VEGETATION_KIT_URLS[id];
    model = Promise.all([loadStaticGltf(urls.lod0), loadStaticGltf(urls.lod1)]).then(([lod0, lod1]): KitModel => ({
      id,
      lods: [partsFromScene(lod0), partsFromScene(lod1)],
    }));
    model.catch(() => kitCache.delete(id));
    kitCache.set(id, model);
  }
  return model;
}
