import { CivId } from '../../core/types';

export const POST_COLONIAL_CULTURES = ['realistas', 'patriotas', 'republica', 'chile'] as const;
export const POST_COLONIAL_ROLES = ['soldier', 'ranged', 'commissar', 'missionary'] as const;

export type PostColonialCulture = (typeof POST_COLONIAL_CULTURES)[number];
export type PostColonialRole = (typeof POST_COLONIAL_ROLES)[number];
export type PostColonialRigVariant = `${PostColonialCulture}_${PostColonialRole}_${'f' | 'm'}`;

export interface PostColonialSpec {
  civ: CivId;
  coat: number;
  trim: number;
  trousers: number;
  hat: 'morion' | 'bicorn' | 'kepi';
  weapon: 'musket' | 'rifle' | 'sword' | 'none';
}

/** Uniform abstractions from `docs/historia/atuendos.md` §6. */
export const POST_COLONIAL_SPECS: Record<PostColonialCulture, PostColonialSpec> = {
  realistas: {
    civ: CivId.REALISTAS,
    coat: 0x2a3f6a,
    trim: 0xc8302a,
    trousers: 0x2b2f36,
    hat: 'morion',
    weapon: 'musket',
  },
  patriotas: {
    civ: CivId.PATRIOTAS,
    coat: 0x2a4a8a,
    trim: 0xe8e0d0,
    trousers: 0x2b2f36,
    hat: 'bicorn',
    weapon: 'musket',
  },
  republica: {
    civ: CivId.REPUBLIC,
    coat: 0xb03030,
    trim: 0xe8e8e8,
    trousers: 0x2b2f36,
    hat: 'kepi',
    weapon: 'rifle',
  },
  chile: { civ: CivId.CHILE, coat: 0x1f3a6a, trim: 0xc8302a, trousers: 0x2b2f36, hat: 'kepi', weapon: 'rifle' },
};

export function isPostColonialVariant(variant: string): variant is PostColonialRigVariant {
  return (POST_COLONIAL_CULTURES as readonly string[]).some((culture) => variant.startsWith(`${culture}_`));
}

export function postColonialCultureForVariant(variant: string): PostColonialCulture | null {
  const culture = POST_COLONIAL_CULTURES.find((entry) => variant.startsWith(`${entry}_`));
  return culture ?? null;
}

export function postColonialRoleForVariant(variant: string): PostColonialRole {
  if (variant.includes('_ranged_')) return 'ranged';
  if (variant.includes('_commissar_')) return 'commissar';
  if (variant.includes('_missionary_')) return 'missionary';
  return 'soldier';
}
