import type { Props } from './Props';
import type { TreeInstances } from './TreeInstances';
import { KIT_PROPS, loadKitModel, VEGETATION_PACKS, type VegetationKitId, type VegetationPack } from './vegetationKit';
import type { PropId } from '../model/defs/props';
import type { TreeVariant } from '../model/defs/profiles';

/**
 * Load the Blender vegetation kit and hand each model to the tree and prop instancers. Until a
 * model arrives (or if it fails to load) the procedural geometry keeps drawing that species. A pack
 * chooses the regional tree and prop set, plus whether only its near canopy casts; no pack (inland
 * skirmish) keeps the shared reeds. A model arriving after the instancers were disposed is disposed
 * instead of attached.
 */
export async function attachVegetationKit(
  trees: TreeInstances,
  props: Props,
  pack: VegetationPack | null,
): Promise<void> {
  const jobs: Promise<void>[] = [];
  const def = pack ? VEGETATION_PACKS[pack] : null;
  const nearLeafShadows = def?.nearLeafShadows ?? false;
  for (const [variant, id] of Object.entries(def?.trees ?? {}) as [TreeVariant, VegetationKitId][]) {
    jobs.push(loadKitModel(id).then((model) => trees.attachKit(variant, model, { nearLeafShadows })));
  }
  for (const [prop, id] of Object.entries(def?.props ?? KIT_PROPS) as [PropId, VegetationKitId][]) {
    jobs.push(loadKitModel(id).then((model) => props.attachKit(prop, model)));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[vegetation-kit] model failed to load', r.reason);
  }
}
