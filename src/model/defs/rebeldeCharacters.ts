import { CivId } from '../../core/types';
import { roleForVariant } from './variantHelpers';
import { POST_COLONIAL_ROLES, type PostColonialRole, type PostColonialSpec } from './postColonialCharacters';

/** Earth-tone palette shared by the m7 rebel infantry, cavalry and siege abstractions. */
export const REBELDE_PALETTE = {
  coat: 0x6a3a2a,
  trim: 0xd8a040,
  trousers: 0x3a2a1a,
  hatColor: 0x2a1c12,
} as const;

export type RebeldeRigVariant = `rebelde_${PostColonialRole}_${'f' | 'm'}`;

/**
 * Late-colonial rebel abstraction for m7 (`INCA` in the Viceroyalty, 1780).
 * No specific rebel garment is documented, so this is a presentation-only
 * earth-tone outfit, not a documented uniform and not a Tahuantinsuyo one.
 * The firearm is the era abstraction for m7.
 */
export const REBELDE_SPEC: PostColonialSpec = {
  civ: CivId.INCA,
  ...REBELDE_PALETTE,
  hat: 'none',
  weapon: 'musket',
  sidearm: 'none',
};

export function isRebeldeVariant(variant: string): variant is RebeldeRigVariant {
  return variant.startsWith('rebelde_') && roleForVariant(POST_COLONIAL_ROLES, variant) !== null;
}

export function rebeldeRoleForVariant(variant: string): PostColonialRole | null {
  return roleForVariant(POST_COLONIAL_ROLES, variant);
}
