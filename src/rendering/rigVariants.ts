import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import { isAndeanVariant } from '../model/defs/andeanCharacters';
import { isPostColonialVariant } from '../model/defs/postColonialCharacters';
import { isRebeldeVariant } from '../model/defs/rebeldeCharacters';
import { isModernVariant } from '../model/defs/modernCharacters';
import { dressPostColonial } from './postColonialAttire';
import { dressRebelde } from './rebeldeAttire';
import { dressModern } from './modernAttire';
import { dressMounted } from './mountedAttire';
import { dressSiege } from './siegeAttire';
import { isMountedVariant } from '../model/defs/mountedCharacters';
import { isSiegeVariant } from '../model/defs/siegeCharacters';
import { isVehicleVariant } from '../model/defs/vehicleCharacters';
import type { RigInstance } from './RigInstance';
import { dressVehicle } from './vehicleAttire';
import { dressCaralWorker } from './workerAttire';

export interface RigVariantHandle {
  setCarrying?(carrying: boolean, color?: number): void;
  setTask?(state: RigClipState): void;
  /** Kind of the resource node being worked ('fishing' swaps the tool for a net), or null. */
  setGatherKind?(kind: string | null): void;
  /** Whether a fisher's net is back in the hand (it is hidden while cast; see FishingNetFx). */
  setNetInHand?(inHand: boolean): void;
  dispose(): void;
}

/** Apply the presentation-only dressing for a rig variant. */
export function applyRigVariant(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (isMountedVariant(variant)) return dressMounted(rig, variant);
  if (isSiegeVariant(variant)) return dressSiege(rig, variant);
  if (isVehicleVariant(variant)) return dressVehicle(rig, variant);
  if (isModernVariant(variant)) return dressModern(rig, variant);
  if (isRebeldeVariant(variant)) return dressRebelde(rig, variant);
  if (isPostColonialVariant(variant)) return dressPostColonial(rig, variant);
  if (variant.startsWith('caral_') || variant.startsWith('inca_') || isAndeanVariant(variant)) {
    return dressCaralWorker(rig, variant);
  }
  return null;
}
