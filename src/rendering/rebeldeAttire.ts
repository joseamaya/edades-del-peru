import type { RigVariant } from '../model/defs/modelAssets';
import { REBELDE_SPEC, isRebeldeVariant, rebeldeRoleForVariant } from '../model/defs/rebeldeCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { dressUniform } from './uniformAttire';

/** Presentation-only late-colonial rebel outfit for m7 (`INCA` in the Viceroyalty). */
export function dressRebelde(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isRebeldeVariant(variant)) return null;
  const role = rebeldeRoleForVariant(variant);
  if (!role) return null;
  return dressUniform(rig, variant, REBELDE_SPEC, role);
}
