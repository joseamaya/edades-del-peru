import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import { isAndeanVariant } from '../model/defs/andeanCharacters';
import type { RigInstance } from './RigInstance';
import { dressCaralWorker } from './workerAttire';

export interface RigVariantHandle {
  setCarrying?(carrying: boolean, color?: number): void;
  setTask?(state: RigClipState): void;
  dispose(): void;
}

/** Apply the presentation-only dressing for a rig variant. */
export function applyRigVariant(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (variant.startsWith('caral_') || variant.startsWith('inca_') || isAndeanVariant(variant)) {
    return dressCaralWorker(rig, variant);
  }
  return null;
}
