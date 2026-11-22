import { CivId, Era } from '../../core/types';
import { cultureForVariant, roleForVariant } from './variantHelpers';

export const POST_COLONIAL_CULTURES = ['realistas', 'patriotas', 'republica', 'chile'] as const;
export const POST_COLONIAL_ROLES = ['soldier', 'ranged', 'missionary', 'worker', 'scout'] as const;

export type PostColonialCulture = (typeof POST_COLONIAL_CULTURES)[number];
export type PostColonialRole = (typeof POST_COLONIAL_ROLES)[number];
/** The 1535–1572 Spanish keep the morion; 1780–1826 realistas wear the bicorn. */
export type RealistaHat = 'morion' | 'bicorn';
export type PostColonialRigVariant =
  | `${PostColonialCulture}_${PostColonialRole}_${'f' | 'm'}`
  | `realistas_${RealistaHat}_${PostColonialRole}_${'f' | 'm'}`;

export interface PostColonialSpec {
  civ: CivId;
  coat: number;
  trim: number;
  trousers: number;
  hat: 'morion' | 'bicorn' | 'kepi' | 'none';
  hatColor: number;
  weapon: 'musket' | 'rifle' | 'none';
  sidearm: 'sword' | 'none';
}

/** Bicorn colour shared with the patriotas; the late realistas are the same dark felt. */
export const REALISTA_BICORN_HAT_COLOR = 0x2b2f36;

/** The 1780 campaign is the only Viceroyalty mission whose realistas are late-colonial. */
export const REALISTA_BICORN_MISSION_ID = 'm7_tupac_amaru';

/**
 * Headwear for the Spanish/realista humanoids. The Independence missions run on `Era.REPUBLIC`;
 * the 1780 m7 campaign is still `Era.VICEROYALTY` but already late-colonial. 1535, 1536 and 1572
 * keep the morion. A Viceroyalty skirmish has no date, so it keeps the conservative early default.
 */
export function realistaHatFor(era: Era, missionId: string): RealistaHat {
  if (era === Era.REPUBLIC) return 'bicorn';
  if (missionId === REALISTA_BICORN_MISSION_ID) return 'bicorn';
  return 'morion';
}

/** Uniform abstractions from `docs/historia/atuendos.md` §6. */
export const POST_COLONIAL_SPECS: Record<PostColonialCulture, PostColonialSpec> = {
  realistas: {
    civ: CivId.REALISTAS,
    coat: 0x2a3f6a,
    trim: 0xc8302a,
    trousers: 0x2b2f36,
    hat: 'morion',
    hatColor: 0x8a8f94,
    weapon: 'musket',
    sidearm: 'sword',
  },
  patriotas: {
    civ: CivId.PATRIOTAS,
    coat: 0x2a4a8a,
    trim: 0xe8e0d0,
    trousers: 0x2b2f36,
    hat: 'bicorn',
    hatColor: 0x2b2f36,
    weapon: 'musket',
    sidearm: 'none',
  },
  republica: {
    civ: CivId.REPUBLIC,
    coat: 0x2a4a8a,
    trim: 0xe8e8e8,
    trousers: 0x2b2f36,
    hat: 'kepi',
    hatColor: 0x2b2f36,
    weapon: 'rifle',
    sidearm: 'none',
  },
  chile: {
    civ: CivId.CHILE,
    coat: 0x1f3a6a,
    trim: 0xc8302a,
    // «Pantalón garance» (decree of 1878, atuendos.md §4): a bright madder red, not a dark wine. Both
    // armies wear blue coats, so the trousers are what tells a Chilean column from a Peruvian one.
    trousers: 0xb0282a,
    hat: 'kepi',
    hatColor: 0x2b2f36,
    weapon: 'rifle',
    sidearm: 'none',
  },
};

/**
 * Spec for a variant. `realistas_bicorn_*` is the same culture and coat as `realistas_*`, with
 * the late-colonial headwear; every other culture keeps its own spec.
 */
export function postColonialSpecForVariant(variant: string): PostColonialSpec | null {
  const culture = postColonialCultureForVariant(variant);
  if (!culture) return null;
  const spec = POST_COLONIAL_SPECS[culture];
  if (variant.startsWith('realistas_bicorn_')) {
    return { ...spec, hat: 'bicorn', hatColor: REALISTA_BICORN_HAT_COLOR };
  }
  return spec;
}

export function postColonialCultureForVariant(variant: string): PostColonialCulture | null {
  return cultureForVariant(POST_COLONIAL_CULTURES, variant);
}

export function isPostColonialVariant(variant: string): variant is PostColonialRigVariant {
  return postColonialCultureForVariant(variant) !== null;
}

export function postColonialCultureForCiv(civ: CivId): PostColonialCulture | null {
  return POST_COLONIAL_CULTURES.find((culture) => POST_COLONIAL_SPECS[culture].civ === civ) ?? null;
}

export function postColonialRoleForVariant(variant: string): PostColonialRole {
  return roleForVariant(POST_COLONIAL_ROLES, variant) ?? 'soldier';
}
