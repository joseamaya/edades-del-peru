import type { Props } from './Props';
import type { TreeInstances } from './TreeInstances';
import { KIT_PROPS, KIT_TREE_VARIANTS, loadKitModel, type VegetationKitId } from './vegetationKit';
import type { PropId } from '../model/defs/props';
import type { TreeVariant } from '../model/defs/profiles';

/**
 * Load the Blender vegetation kit and hand each model to the tree and prop instancers. Until a
 * model arrives (or if it fails to load) the procedural geometry keeps drawing that species. Tree kits
 * are only attached when `withTrees` (coastal maps); a model arriving after the instancers were
 * disposed is disposed instead of attached.
 */
export async function attachVegetationKit(trees: TreeInstances, props: Props, withTrees: boolean): Promise<void> {
  const jobs: Promise<void>[] = [];
  const treeKits = withTrees ? (Object.entries(KIT_TREE_VARIANTS) as [TreeVariant, VegetationKitId][]) : [];
  for (const [variant, id] of treeKits) {
    jobs.push(loadKitModel(id).then((model) => trees.attachKit(variant, model)));
  }
  for (const [prop, id] of Object.entries(KIT_PROPS) as [PropId, VegetationKitId][]) {
    jobs.push(loadKitModel(id).then((model) => props.attachKit(prop, model)));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[vegetation-kit] model failed to load', r.reason);
  }
}
