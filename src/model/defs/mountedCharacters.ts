import { CivId } from '../../core/types';
import {
  POST_COLONIAL_SPECS,
  postColonialCultureForCiv,
  type PostColonialCulture,
  type PostColonialSpec,
} from './postColonialCharacters';

/**
 * Uniform abstractions for post-1532 mounted units; see docs/historia/atuendos.md §6.
 * The m7 rebel palette is an explicitly undocumented earth-tone abstraction.
 */
export const MOUNTED_VARIANTS = [
  'mounted_realistas',
  'mounted_patriotas',
  'mounted_republica',
  'mounted_chile',
  'mounted_rebelde',
] as const;

export type MountedRigVariant = (typeof MOUNTED_VARIANTS)[number];

export type MountedSpec = Pick<PostColonialSpec, 'coat' | 'trim' | 'trousers' | 'hat' | 'hatColor'>;

export const MOUNTED_SPECS: Record<MountedRigVariant, MountedSpec> = {
  mounted_realistas: specFromCulture('realistas'),
  mounted_patriotas: specFromCulture('patriotas'),
  mounted_republica: specFromCulture('republica'),
  mounted_chile: specFromCulture('chile'),
  mounted_rebelde: {
    coat: 0x6a3a2a,
    trim: 0xd8a040,
    trousers: 0x3a2a1a,
    hat: 'bicorn',
    hatColor: 0x2a1c12,
  },
};

function specFromCulture(culture: PostColonialCulture): MountedSpec {
  const { coat, trim, trousers, hat, hatColor } = POST_COLONIAL_SPECS[culture];
  return { coat, trim, trousers, hat, hatColor };
}

export function isMountedVariant(variant: string): variant is MountedRigVariant {
  return (MOUNTED_VARIANTS as readonly string[]).includes(variant);
}

const MOUNTED_BY_CULTURE: Record<PostColonialCulture, MountedRigVariant> = {
  realistas: 'mounted_realistas',
  patriotas: 'mounted_patriotas',
  republica: 'mounted_republica',
  chile: 'mounted_chile',
};

export function mountedVariantForCiv(civ: CivId): MountedRigVariant | null {
  if (civ === CivId.INCA) return 'mounted_rebelde';
  const culture = postColonialCultureForCiv(civ);
  return culture ? MOUNTED_BY_CULTURE[culture] : null;
}
