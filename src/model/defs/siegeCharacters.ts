import { CivId, Era, UnitKind } from '../../core/types';
import { POST_COLONIAL_SPECS, postColonialCultureForCiv, type PostColonialCulture } from './postColonialCharacters';

export const SIEGE_WEAPONS = ['cannon', 'mortar', 'tank'] as const;
export type SiegeWeapon = (typeof SIEGE_WEAPONS)[number];

export const SIEGE_VARIANTS = [
  'siege_cannon_realistas',
  'siege_cannon_patriotas',
  'siege_cannon_republica',
  'siege_cannon_chile',
  'siege_cannon_rebelde',
  'siege_mortar_realistas',
  'siege_mortar_patriotas',
  'siege_mortar_republica',
  'siege_mortar_chile',
  'siege_mortar_rebelde',
  'siege_tank_republica',
  'siege_tank_chile',
] as const;

export type SiegeRigVariant = (typeof SIEGE_VARIANTS)[number];

export interface SiegeSpec {
  coat: number;
  trim: number;
  trousers: number;
  wood: number;
  tankHull: number;
  tankTrack: number;
}

const SIEGE_SPECS: Record<PostColonialCulture | 'rebelde', SiegeSpec> = {
  realistas: siegeSpec('realistas', 0x5a3a1e, 0x3f4a2a, 0x151515),
  patriotas: siegeSpec('patriotas', 0x5a3a1e, 0x3f4a2a, 0x151515),
  republica: siegeSpec('republica', 0x5a3a1e, 0x3f4a2a, 0x151515),
  chile: siegeSpec('chile', 0x5a3a1e, 0x3f4a2a, 0x151515),
  rebelde: {
    coat: 0x6a3a2a,
    trim: 0xd8a040,
    trousers: 0x3a2a1a,
    wood: 0x4a2a14,
    tankHull: 0x3f4a2a,
    tankTrack: 0x151515,
  },
};

function siegeSpec(culture: PostColonialCulture, wood: number, tankHull: number, tankTrack: number): SiegeSpec {
  const post = POST_COLONIAL_SPECS[culture];
  return { coat: post.coat, trim: post.trim, trousers: post.trousers, wood, tankHull, tankTrack };
}

export function isSiegeVariant(variant: string): variant is SiegeRigVariant {
  return (SIEGE_VARIANTS as readonly string[]).includes(variant);
}

export function siegeVariantFor(kind: UnitKind, era: Era, civ: CivId): SiegeRigVariant | null {
  if (kind === UnitKind.TANK) {
    if (era !== Era.CONTEMPORARY) return null;
    if (civ === CivId.REPUBLIC) return 'siege_tank_republica';
    if (civ === CivId.CHILE) return 'siege_tank_chile';
    return null;
  }
  if (kind !== UnitKind.ARTILLERY && kind !== UnitKind.MORTAR) return null;
  if (era !== Era.VICEROYALTY && era !== Era.REPUBLIC) return null;
  const weapon: SiegeWeapon = kind === UnitKind.MORTAR ? 'mortar' : 'cannon';
  if (civ === CivId.INCA) return `siege_${weapon}_rebelde` as SiegeRigVariant;
  const culture = postColonialCultureForCiv(civ);
  if (!culture) return null;
  return `siege_${weapon}_${culture}` as SiegeRigVariant;
}

export function siegeSpecForVariant(variant: SiegeRigVariant): SiegeSpec {
  const culture = variant.split('_')[2] as PostColonialCulture | 'rebelde';
  return SIEGE_SPECS[culture];
}
