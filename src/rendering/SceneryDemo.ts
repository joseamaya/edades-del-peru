import { SCENERY_ASSETS, type SceneryAssetId } from './sceneryAssets';
import { mountStaticShowcase, type StaticShowcaseHandle } from './StaticShowcase';

export type SceneryDemoHandle = StaticShowcaseHandle;

export async function mountSceneryDemo(assetId: SceneryAssetId): Promise<SceneryDemoHandle> {
  return mountStaticShowcase(SCENERY_ASSETS[assetId]);
}
