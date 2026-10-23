import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import { dressCaralWorker } from './workerAttire';

export interface RigVariantHandle {
  setCarrying?(carrying: boolean, color?: number): void;
  setTask?(state: RigClipState): void;
  dispose(): void;
}

/** Apply the presentation-only dressing for a rig variant. */
export function applyRigVariant(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  switch (variant) {
    case 'caral_worker_f':
    case 'caral_worker_m':
    case 'caral_scout_f':
    case 'caral_scout_m':
    case 'inca_chasqui_f':
    case 'inca_chasqui_m':
    case 'moche_worker_f':
    case 'moche_worker_m':
    case 'moche_scout_f':
    case 'moche_scout_m':
    case 'moche_soldier_f':
    case 'moche_soldier_m':
    case 'moche_ranged_f':
    case 'moche_ranged_m':
    case 'recuay_worker_f':
    case 'recuay_worker_m':
    case 'recuay_scout_f':
    case 'recuay_scout_m':
    case 'recuay_soldier_f':
    case 'recuay_soldier_m':
    case 'recuay_ranged_f':
    case 'recuay_ranged_m':
      return dressCaralWorker(rig, variant);
    default:
      return null;
  }
}
