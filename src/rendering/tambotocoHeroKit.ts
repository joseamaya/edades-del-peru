import * as THREE from 'three';
import caveLod0Url from '../assets/architecture/tambotoco/tambotoco_cave_lod0.glb?url';
import caveLod1Url from '../assets/architecture/tambotoco/tambotoco_cave_lod1.glb?url';
import huacaLod0Url from '../assets/architecture/tambotoco/tambotoco_huaca_lod0.glb?url';
import huacaLod1Url from '../assets/architecture/tambotoco/tambotoco_huaca_lod1.glb?url';
import { disposeStaticGltf, loadStaticGltf } from './StaticModel';

export interface TambotocoHeroModel {
  readonly lod0: THREE.Group;
  readonly lod1: THREE.Group;
}

/** Optional hero assets for `AylluSite`; a missing pair keeps the procedural fallback. */
export interface TambotocoHeroAssets {
  readonly cave?: TambotocoHeroModel;
  readonly huaca?: TambotocoHeroModel;
}

async function loadPair(name: string, lod0Url: string, lod1Url: string): Promise<TambotocoHeroModel | null> {
  const results = await Promise.allSettled([loadStaticGltf(lod0Url), loadStaticGltf(lod1Url)]);
  const lod0 = results[0].status === 'fulfilled' ? results[0].value : null;
  const lod1 = results[1].status === 'fulfilled' ? results[1].value : null;
  if (!lod0 || !lod1) {
    console.warn(`[tambotoco-hero] ${name} failed to load; keeping the procedural fallback`);
    if (lod0) disposeStaticGltf(lod0);
    if (lod1) disposeStaticGltf(lod1);
    return null;
  }
  return { lod0, lod1 };
}

/**
 * Load the cave mouth and the Huanacaure huaca. The site keeps its procedural cave/stone until both
 * LODs of a piece arrive; a failed load never leaves a hole in the opening.
 */
export async function loadTambotocoHeroAssets(): Promise<TambotocoHeroAssets> {
  const [cave, huaca] = await Promise.all([
    loadPair('cave', caveLod0Url, caveLod1Url),
    loadPair('huaca', huacaLod0Url, huacaLod1Url),
  ]);
  return {
    ...(cave ? { cave } : {}),
    ...(huaca ? { huaca } : {}),
  };
}
