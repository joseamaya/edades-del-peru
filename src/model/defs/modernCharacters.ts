import { CivId } from '../../core/types';

export const MODERN_CULTURES = ['contemporary_republica'] as const;
export const MODERN_ROLES = ['soldier', 'ranged', 'missionary', 'worker', 'scout'] as const;

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

export function isModernVariant(variant: string): variant is ModernRigVariant {
  return (MODERN_CULTURES as readonly string[]).some((culture) => variant.startsWith(`${culture}_`));
}

export function modernCultureForVariant(variant: string): ModernCulture | null {
  return MODERN_CULTURES.find((culture) => variant.startsWith(`${culture}_`)) ?? null;
}

export function modernRoleForVariant(variant: string): ModernRole {
  if (variant.includes('_ranged_')) return 'ranged';
  if (variant.includes('_missionary_')) return 'missionary';
  if (variant.includes('_worker_')) return 'worker';
  if (variant.includes('_scout_')) return 'scout';
  return 'soldier';
}

export function modernCultureForCiv(civ: CivId): ModernCulture | null {
  return civ === CivId.REPUBLIC ? 'contemporary_republica' : null;
}
