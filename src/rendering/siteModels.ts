import type * as THREE from 'three';
import siteLod0Url from '../assets/sites/caral/caral_site_lod0.glb?url';
import siteLod1Url from '../assets/sites/caral/caral_site_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';

export type AuthoredSiteId = 'caral_site';

const SITE_MODEL_URLS: Record<AuthoredSiteId, { lod0: string; lod1: string }> = {
  caral_site: { lod0: siteLod0Url, lod1: siteLod1Url },
};

/** Load the campaign site; LOD1 is the RTS default, `?lod=0` previews the master. */
export function loadSiteModel(id: AuthoredSiteId, lod = 1): Promise<THREE.Group> {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lod');
  const level = requested === '0' || requested === '1' ? Number(requested) : lod;
  const urls = SITE_MODEL_URLS[id];
  return loadStaticGltf(level === 0 ? urls.lod0 : urls.lod1, { draco: true });
}
