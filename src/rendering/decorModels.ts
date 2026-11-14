import type * as THREE from 'three';
import chancaLod0Url from '../assets/sites/chanca/chanca_fortress_lod0.glb?url';
import chancaLod1Url from '../assets/sites/chanca/chanca_fortress_lod1.glb?url';
import chimuLod0Url from '../assets/sites/chimu/chimu_compound_lod0.glb?url';
import chimuLod1Url from '../assets/sites/chimu/chimu_compound_lod1.glb?url';
import colonialLod0Url from '../assets/sites/colonial/colonial_church_lod0.glb?url';
import colonialLod1Url from '../assets/sites/colonial/colonial_church_lod1.glb?url';
import independenceLod0Url from '../assets/sites/independence/independence_chapel_lod0.glb?url';
import independenceLod1Url from '../assets/sites/independence/independence_chapel_lod1.glb?url';
import aricaLod0Url from '../assets/sites/arica/arica_battery_lod0.glb?url';
import aricaLod1Url from '../assets/sites/arica/arica_battery_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';
import type { DecorModelId } from '../model/defs/sites';

const DECOR_MODEL_URLS: Record<DecorModelId, { lod0: string; lod1: string }> = {
  chanca_fortress: { lod0: chancaLod0Url, lod1: chancaLod1Url },
  chimu_compound: { lod0: chimuLod0Url, lod1: chimuLod1Url },
  colonial_church: { lod0: colonialLod0Url, lod1: colonialLod1Url },
  independence_chapel: { lod0: independenceLod0Url, lod1: independenceLod1Url },
  arica_battery: { lod0: aricaLod0Url, lod1: aricaLod1Url },
};

export async function loadDecorModel(id: DecorModelId): Promise<THREE.Group> {
  const params = new URLSearchParams(window.location.search);
  const level = params.get('lod') === '0' ? 0 : 1;
  const urls = DECOR_MODEL_URLS[id];
  const model = await loadStaticGltf(level === 0 ? urls.lod0 : urls.lod1);
  model.userData.sourceLod = level;
  return model;
}
