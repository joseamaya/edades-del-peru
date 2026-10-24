import type * as THREE from 'three';
import anfiteatroLod0 from '../assets/scenery/caral/caral_anfiteatro_lod0.glb?url';
import anfiteatroLod1 from '../assets/scenery/caral/caral_anfiteatro_lod1.glb?url';
import pyramidLod0 from '../assets/scenery/caral/caral_pyramid_mayor_lod0.glb?url';
import pyramidLod1 from '../assets/scenery/caral/caral_pyramid_mayor_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';

export type SceneryModelId = 'caral_pyramid_mayor' | 'caral_anfiteatro';

export const SCENERY_MODEL_URLS: Record<SceneryModelId, { lod0: string; lod1: string }> = {
  caral_pyramid_mayor: { lod0: pyramidLod0, lod1: pyramidLod1 },
  caral_anfiteatro: { lod0: anfiteatroLod0, lod1: anfiteatroLod1 },
};

export function loadSceneryModel(id: SceneryModelId): Promise<THREE.Group> {
  return loadStaticGltf(SCENERY_MODEL_URLS[id].lod0);
}
