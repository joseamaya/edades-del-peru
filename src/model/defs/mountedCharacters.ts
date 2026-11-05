import { CivId } from '../../core/types';
import {
  POST_COLONIAL_SPECS,
  postColonialCultureForCiv,
  type PostColonialCulture,
  type PostColonialSpec,
} from './postColonialCharacters';

export const MOUNTED_VARIANTS = [
  'mounted_realistas',
  'mounted_patriotas',
  'mounted_republica',
  'mounted_chile',
  'mounted_inca',
] as const;

export type MountedRigVariant = (typeof MOUNTED_VARIANTS)[number];

export type MountedHat = PostColonialSpec['hat'];

export interface MountedSpec {
  coat: number;
  trim: number;
  trousers: number;
  hat: MountedHat;
  hatColor: number;
}

export const MOUNTED_SPECS: Record<MountedRigVariant, MountedSpec> = {
  mounted_realistas: specFromCulture('realistas'),
  mounted_patriotas: specFromCulture('patriotas'),
  mounted_republica: specFromCulture('republica'),
  mounted_chile: specFromCulture('chile'),
  mounted_inca: {
    coat: 0x6a3a2a,
    trim: 0xd8a040,
    trousers: 0x3a2a1a,
    hat: 'bicorn',
    hatColor: 0x2a1c12,
  },
};

function specFromCulture(culture: PostColonialCulture): MountedSpec {
  const spec = POST_COLONIAL_SPECS[culture];
  return { coat: spec.coat, trim: spec.trim, trousers: spec.trousers, hat: spec.hat, hatColor: spec.hatColor };
}

export function isMountedVariant(variant: string): variant is MountedRigVariant {
  return (MOUNTED_VARIANTS as readonly string[]).includes(variant);
}

export function mountedVariantForCiv(civ: CivId): MountedRigVariant | null {
  if (civ === CivId.INCA) return 'mounted_inca';
  const culture = postColonialCultureForCiv(civ);
  return culture ? (`mounted_${culture}` as MountedRigVariant) : null;
}
