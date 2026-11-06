import { CivId } from '../../core/types';
import { roleForVariant } from './variantHelpers';
import type { PostColonialRole, PostColonialSpec } from './postColonialCharacters';

export const REBELDE_ROLES = ['soldier', 'ranged', 'missionary', 'worker', 'scout'] as const;
export type RebeldeRole = (typeof REBELDE_ROLES)[number];
export type RebeldeRigVariant = `rebelde_${RebeldeRole}_${'f' | 'm'}`;

/**
 * Late-colonial rebel abstraction for m7 (`INCA` in the Viceroyalty).
 * The dossier documents indigenous and mestizo rebels without a uniform, so this
 * is an earth-tone civilian presentation with no Spanish military headwear and
 * no Tahuantinsuyo outfit. The firearm is the era abstraction for m7 (1780).
 */
export const REBELDE_SPEC: PostColonialSpec = {
  civ: CivId.INCA,
  coat: 0x6a4a30,
  trim: 0xc8a040,
  trousers: 0x3a2a1a,
  hat: 'none',
  hatColor: 0x2a1c12,
  weapon: 'musket',
  sidearm: 'none',
};

export function isRebeldeVariant(variant: string): variant is RebeldeRigVariant {
  return variant.startsWith('rebelde_');
}

export function rebeldeRoleForVariant(variant: string): PostColonialRole {
  return roleForVariant(REBELDE_ROLES, variant) ?? 'soldier';
}
