import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import { isAndeanVariant } from '../model/defs/andeanCharacters';
import { isPostColonialVariant } from '../model/defs/postColonialCharacters';
import { dressPostColonial } from './postColonialAttire';
import { dressMounted } from './mountedAttire';
import { dressSiege } from './siegeAttire';
import { isMountedVariant } from '../model/defs/mountedCharacters';
import { isSiegeVariant } from '../model/defs/siegeCharacters';
import type { RigInstance } from './RigInstance';
import { dressCaralWorker } from './workerAttire';

export interface RigVariantHandle {
  setCarrying?(carrying: boolean, color?: number): void;
  setTask?(state: RigClipState): void;
  dispose(): void;
}

/** Apply the presentation-only dressing for a rig variant. */
export function applyRigVariant(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (isMountedVariant(variant)) return dressMounted(rig, variant);
  if (isSiegeVariant(variant)) return dressSiege(rig, variant);
  if (isPostColonialVariant(variant)) return dressPostColonial(rig, variant);
  if (variant.startsWith('caral_') || variant.startsWith('inca_') || isAndeanVariant(variant)) {
    return dressCaralWorker(rig, variant);
  }
  return null;
}
