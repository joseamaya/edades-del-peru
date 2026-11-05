import { CivId } from '../../core/types';
import { cultureForVariant, roleForVariant } from './variantHelpers';

export const MODERN_CULTURES = ['contemporary_republica'] as const;
export const MODERN_ROLES = ['soldier', 'ranged', 'sniper', 'missionary', 'worker', 'scout'] as const;

export type ModernCulture = (typeof MODERN_CULTURES)[number];
export type ModernRole = (typeof MODERN_ROLES)[number];
export type ModernRigVariant = `${ModernCulture}_${ModernRole}_${'f' | 'm'}`;

export interface ModernSpec {
  civ: CivId;
  uniform: number;
  trousers: number;
  vest: number;
  helmet: number;
}

/** Contemporary campaign uniform abstraction from `docs/historia/atuendos.md` §5. */
export const MODERN_SPECS: Record<ModernCulture, ModernSpec> = {
  contemporary_republica: {
    civ: CivId.REPUBLIC,
    uniform: 0x4f5b3f,
    trousers: 0x3b4430,
    vest: 0x2f3826,
    helmet: 0x424b38,
  },
};

export function modernCultureForVariant(variant: string): ModernCulture | null {
  return cultureForVariant(MODERN_CULTURES, variant);
}

export function isModernVariant(variant: string): variant is ModernRigVariant {
  return modernCultureForVariant(variant) !== null;
}

export function modernRoleForVariant(variant: string): ModernRole {
  return roleForVariant(MODERN_ROLES, variant) ?? 'soldier';
}

export function modernCultureForCiv(civ: CivId): ModernCulture | null {
  return MODERN_CULTURES.find((culture) => MODERN_SPECS[culture].civ === civ) ?? null;
}
