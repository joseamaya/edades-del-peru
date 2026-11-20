import type { RigVariant } from '../model/defs/modelAssets';
import {
  isPostColonialVariant,
  postColonialRoleForVariant,
  postColonialSpecForVariant,
} from '../model/defs/postColonialCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { dressUniform } from './uniformAttire';

/**
 * Presentation-only colonial/republican uniforms on the shared humanoid rig.
 * The coat/hat/weapon colours and silhouettes follow the abstractions in
 * `docs/historia/atuendos.md` §6; no new historical claim is introduced.
 */
export function dressPostColonial(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isPostColonialVariant(variant)) return null;
  const spec = postColonialSpecForVariant(variant);
  if (!spec) return null;
  return dressUniform(rig, variant, spec, postColonialRoleForVariant(variant));
}
