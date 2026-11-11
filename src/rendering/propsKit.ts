import * as THREE from 'three';
import granodioriteLod0 from '../assets/props/caral/caral_granodiorite_lod0.glb?url';
import granodioriteLod1 from '../assets/props/caral/caral_granodiorite_lod1.glb?url';
import hearthLod0 from '../assets/props/caral/caral_hearth_lod0.glb?url';
import hearthLod1 from '../assets/props/caral/caral_hearth_lod1.glb?url';
import dryingRackLod0 from '../assets/props/caral/caral_drying_rack_lod0.glb?url';
import dryingRackLod1 from '../assets/props/caral/caral_drying_rack_lod1.glb?url';
import basketLod0 from '../assets/props/caral/caral_basket_lod0.glb?url';
import basketLod1 from '../assets/props/caral/caral_basket_lod1.glb?url';
import gourdLod0 from '../assets/props/caral/caral_gourd_lod0.glb?url';
import gourdLod1 from '../assets/props/caral/caral_gourd_lod1.glb?url';
import benchLod0 from '../assets/props/caral/caral_bench_lod0.glb?url';
import benchLod1 from '../assets/props/caral/caral_bench_lod1.glb?url';
import windbreakLod0 from '../assets/props/caral/caral_windbreak_lod0.glb?url';
import windbreakLod1 from '../assets/props/caral/caral_windbreak_lod1.glb?url';
import cottonLod0 from '../assets/props/caral/caral_cotton_lod0.glb?url';
import cottonLod1 from '../assets/props/caral/caral_cotton_lod1.glb?url';
import { applyArchSurface, archPartsFromScene } from './architectureKit';
import { loadStaticGltf } from './StaticModel';
import type { QuarryStyle } from '../model/defs/profiles';
import type { DressingKind } from '../model/defs/settlementDressing';

/** Blender prop kit (scripts/blender/build_caral_props_kit.py). */
export type PropsKitId = QuarryStyle | DressingPropId;

/** Household pieces of the Caral prop kit; every id is a `DressingKind` the planner may place. */
export type DressingPropId = Extract<
  DressingKind,
  'hearth' | 'drying_rack' | 'basket' | 'gourd' | 'bench' | 'windbreak' | 'cotton'
>;

const URLS: Record<PropsKitId, { lod0: string; lod1: string }> = {
  granodiorite: { lod0: granodioriteLod0, lod1: granodioriteLod1 },
  hearth: { lod0: hearthLod0, lod1: hearthLod1 },
  drying_rack: { lod0: dryingRackLod0, lod1: dryingRackLod1 },
  basket: { lod0: basketLod0, lod1: basketLod1 },
  gourd: { lod0: gourdLod0, lod1: gourdLod1 },
  bench: { lod0: benchLod0, lod1: benchLod1 },
  windbreak: { lod0: windbreakLod0, lod1: windbreakLod1 },
  cotton: { lod0: cottonLod0, lod1: cottonLod1 },
};

const DRESSING_PROP_IDS: DressingPropId[] = [
  'hearth',
  'drying_rack',
  'basket',
  'gourd',
  'bench',
  'windbreak',
  'cotton',
];

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

/** The household pieces, keyed by the dressing kind the planner places. */
export type DressingKit = Map<DressingKind, PropsKitModel>;

let dressingKit: Promise<DressingKit> | null = null;

/**
 * Load the whole household set. One missing GLB rejects the batch, so a settlement keeps its
 * procedural dressing instead of showing a half-kitted base. A failed batch is retried next match.
 */
export function loadDressingKit(): Promise<DressingKit> {
  if (!dressingKit) {
    dressingKit = Promise.all(DRESSING_PROP_IDS.map(loadPropsKit)).then(
      (models) => new Map(models.map((model) => [model.id as DressingKind, model])),
    );
    dressingKit.catch(() => {
      dressingKit = null;
    });
  }
  return dressingKit;
}
