import type * as THREE from 'three';
import anfiteatroLod0 from '../assets/scenery/caral/caral_anfiteatro_lod0.glb?url';
import anfiteatroLod1 from '../assets/scenery/caral/caral_anfiteatro_lod1.glb?url';
import pyramidCentralLod0 from '../assets/scenery/caral/caral_pyramid_central_lod0.glb?url';
import pyramidCentralLod1 from '../assets/scenery/caral/caral_pyramid_central_lod1.glb?url';
import pyramidGalleryLod0 from '../assets/scenery/caral/caral_pyramid_gallery_lod0.glb?url';
import pyramidGalleryLod1 from '../assets/scenery/caral/caral_pyramid_gallery_lod1.glb?url';
import pyramidHuancaLod0 from '../assets/scenery/caral/caral_pyramid_huanca_lod0.glb?url';
import pyramidHuancaLod1 from '../assets/scenery/caral/caral_pyramid_huanca_lod1.glb?url';
import pyramidLesserLod0 from '../assets/scenery/caral/caral_pyramid_lesser_lod0.glb?url';
import pyramidLesserLod1 from '../assets/scenery/caral/caral_pyramid_lesser_lod1.glb?url';
import pyramidMayorLod0 from '../assets/scenery/caral/caral_pyramid_mayor_lod0.glb?url';
import pyramidMayorLod1 from '../assets/scenery/caral/caral_pyramid_mayor_lod1.glb?url';
import pyramidQuarryLod0 from '../assets/scenery/caral/caral_pyramid_quarry_lod0.glb?url';
import pyramidQuarryLod1 from '../assets/scenery/caral/caral_pyramid_quarry_lod1.glb?url';
import { loadStaticGltf } from './StaticModel';
import type { LandmarkSceneryModel } from '../model/defs/landmarks';

export type SceneryModelId = LandmarkSceneryModel;

export const SCENERY_MODEL_URLS: Record<SceneryModelId, { lod0: string; lod1: string }> = {
  caral_pyramid_mayor: { lod0: pyramidMayorLod0, lod1: pyramidMayorLod1 },
  caral_pyramid_central: { lod0: pyramidCentralLod0, lod1: pyramidCentralLod1 },
  caral_pyramid_quarry: { lod0: pyramidQuarryLod0, lod1: pyramidQuarryLod1 },
  caral_pyramid_lesser: { lod0: pyramidLesserLod0, lod1: pyramidLesserLod1 },
  caral_pyramid_gallery: { lod0: pyramidGalleryLod0, lod1: pyramidGalleryLod1 },
  caral_pyramid_huanca: { lod0: pyramidHuancaLod0, lod1: pyramidHuancaLod1 },
  caral_anfiteatro: { lod0: anfiteatroLod0, lod1: anfiteatroLod1 },
};

export function loadSceneryModel(id: SceneryModelId): Promise<THREE.Group> {
  return loadStaticGltf(SCENERY_MODEL_URLS[id].lod0);
}
