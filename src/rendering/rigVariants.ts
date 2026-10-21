import type { RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import { dressCaralWorker } from './workerAttire';

export interface RigVariantHandle {
  setCarrying?(carrying: boolean, color?: number): void;
  dispose(): void;
}

/** Apply the presentation-only dressing for a rig variant. */
export function applyRigVariant(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  switch (variant) {
    case 'caral_worker':
      return dressCaralWorker(rig);
    default:
      return null;
  }
}
