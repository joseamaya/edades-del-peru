import type * as THREE from 'three';
import siteLod0Url from '../assets/sites/caral/caral_site_lod0.glb?url';
import siteLod1Url from '../assets/sites/caral/caral_site_lod1.glb?url';
import chavinLod0Url from '../assets/sites/chavin/chavin_site_lod0.glb?url';
import chavinLod1Url from '../assets/sites/chavin/chavin_site_lod1.glb?url';
import mocheLod0Url from '../assets/sites/moche/moche_site_lod0.glb?url';
import mocheLod1Url from '../assets/sites/moche/moche_site_lod1.glb?url';
import wariLod0Url from '../assets/sites/wari/wari_site_lod0.glb?url';
import wariLod1Url from '../assets/sites/wari/wari_site_lod1.glb?url';
import chancaLod0Url from '../assets/sites/chanca/chanca_fortress_lod0.glb?url';
import chancaLod1Url from '../assets/sites/chanca/chanca_fortress_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';
import type { AuthoredSiteId } from '../model/defs/sites';

const SITE_MODEL_URLS: Partial<Record<AuthoredSiteId, { lod0: string; lod1: string }>> = {
  caral_site: { lod0: siteLod0Url, lod1: siteLod1Url },
  chavin_site: { lod0: chavinLod0Url, lod1: chavinLod1Url },
  moche_site: { lod0: mocheLod0Url, lod1: mocheLod1Url },
  wari_site: { lod0: wariLod0Url, lod1: wariLod1Url },
  chanca_site: { lod0: chancaLod0Url, lod1: chancaLod1Url },
};

/** Load the campaign site; LOD1 is the RTS default, `?lod=0` previews the master. */
export async function loadSiteModel(id: AuthoredSiteId): Promise<THREE.Group> {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('lod');
  const level = requested === '0' ? 0 : 1;
  const urls = SITE_MODEL_URLS[id];
  if (!urls) throw new Error(`[site] no model registered for ${id}`);
  const model = await loadStaticGltf(level === 0 ? urls.lod0 : urls.lod1, { draco: true });
  model.userData.sourceLod = level;
  return model;
}
