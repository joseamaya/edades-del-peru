import { CivId } from '../../core/types';
import {
  POST_COLONIAL_SPECS,
  postColonialCultureForCiv,
  type PostColonialCulture,
  type PostColonialSpec,
} from './postColonialCharacters';
import { REBELDE_PALETTE } from './rebeldeCharacters';

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

/** Presentation-only horse coat and points (mane, tail, lower legs). */
export interface HorsePalette {
  horseCoat: number;
  horsePoints: number;
}

export type MountedSpec = Pick<PostColonialSpec, 'coat' | 'trim' | 'trousers' | 'hat' | 'hatColor'> & HorsePalette;

/** Bay/chestnut/dark-bay variety; a presentation abstraction, not a breed claim. */
const HORSE_COATS: Record<PostColonialCulture | 'rebelde', HorsePalette> = {
  realistas: { horseCoat: 0x6a4224, horsePoints: 0x1c120b },
  patriotas: { horseCoat: 0x8a5a34, horsePoints: 0x4a2c18 },
  republica: { horseCoat: 0x5a3a22, horsePoints: 0x2a1a10 },
  chile: { horseCoat: 0x7a4a28, horsePoints: 0x2a1a10 },
  rebelde: { horseCoat: 0x6b4a30, horsePoints: 0x2e1d12 },
};

export const MOUNTED_SPECS: Record<MountedRigVariant, MountedSpec> = {
  mounted_realistas: { ...specFromCulture('realistas'), ...HORSE_COATS.realistas },
  mounted_patriotas: { ...specFromCulture('patriotas'), ...HORSE_COATS.patriotas },
  mounted_republica: { ...specFromCulture('republica'), ...HORSE_COATS.republica },
  mounted_chile: { ...specFromCulture('chile'), ...HORSE_COATS.chile },
  mounted_rebelde: {
    ...REBELDE_PALETTE,
    hat: 'bicorn',
    ...HORSE_COATS.rebelde,
  },
};

function specFromCulture(
  culture: PostColonialCulture,
): Pick<PostColonialSpec, 'coat' | 'trim' | 'trousers' | 'hat' | 'hatColor'> {
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
