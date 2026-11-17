import type { Props } from './Props';
import type { TreeInstances } from './TreeInstances';
import {
  KIT_PROPS,
  KIT_PROPS_ANDES,
  KIT_TREE_VARIANTS,
  KIT_TREE_VARIANTS_ANDES,
  loadKitModel,
  type VegetationKitId,
  type VegetationPack,
} from './vegetationKit';
import type { PropId } from '../model/defs/props';
import type { TreeVariant } from '../model/defs/profiles';

/**
 * Load the Blender vegetation kit and hand each model to the tree and prop instancers. Until a
 * model arrives (or if it fails to load) the procedural geometry keeps drawing that species. A pack
 * chooses the regional tree set; props keep the shared reeds, and the highland pack swaps the generic
 * shrub for ichu. A model arriving after the instancers were disposed is disposed instead of attached.
 */
export async function attachVegetationKit(
  trees: TreeInstances,
  props: Props,
  pack: VegetationPack | null,
): Promise<void> {
  const jobs: Promise<void>[] = [];
  const treeKits = pack === 'andes' ? KIT_TREE_VARIANTS_ANDES : pack === 'caral' ? KIT_TREE_VARIANTS : undefined;
  if (treeKits) {
    for (const [variant, id] of Object.entries(treeKits) as [TreeVariant, VegetationKitId][]) {
      jobs.push(loadKitModel(id).then((model) => trees.attachKit(variant, model)));
    }
  }
  const propKits = pack === 'andes' ? KIT_PROPS_ANDES : KIT_PROPS;
  for (const [prop, id] of Object.entries(propKits) as [PropId, VegetationKitId][]) {
    jobs.push(loadKitModel(id).then((model) => props.attachKit(prop, model)));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[vegetation-kit] model failed to load', r.reason);
  }
}
