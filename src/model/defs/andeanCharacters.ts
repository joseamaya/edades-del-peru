import { CivId } from '../../core/types';
import { getCiv } from './civs';
import { hexToRgb } from '../../util/math';

export type AndeanCulture = 'moche' | 'recuay' | 'chavin' | 'paracas';
export type AndeanRole = 'worker' | 'scout' | 'soldier' | 'ranged';
export type AndeanRigVariant = `${AndeanCulture}_${AndeanRole}_${'f' | 'm'}`;

/** Presentation-only Andean outfit profile; colours come from the civ defs. */
export interface AndeanSpec {
  /** Accessory metal (not a team/civ colour). */
  metal: number;
  helmet: boolean;
  backflap: boolean;
  ear: boolean;
  belt: boolean;
  shield: boolean;
  macana: boolean;
  sling: boolean;
  manta: boolean;
}

export const ANDEAN_CULTURES: readonly AndeanCulture[] = ['moche', 'recuay', 'chavin', 'paracas'];

export const ANDEAN_CIV: Record<AndeanCulture, CivId> = {
  moche: CivId.MOCHE,
  recuay: CivId.RECUAY,
  chavin: CivId.CHAVIN,
  paracas: CivId.PARACAS,
};

/**
 * Chavín/Paracas garments are not documented in detail, so they use a simple
 * tunic/headband/manta abstraction. The Moche warrior gear is the documented
 * set in `docs/historia/atuendos.md`.
 */
export const ANDEAN_SPECS: Record<AndeanCulture, AndeanSpec> = {
  moche: {
    metal: 0xc8a040,
    helmet: true,
    backflap: true,
    ear: true,
    belt: true,
    shield: true,
    macana: true,
    sling: true,
    manta: false,
  },
  recuay: {
    metal: 0xb08a50,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    macana: true,
    sling: true,
    manta: false,
  },
  chavin: {
    metal: 0x8a8f94,
    helmet: false,
    backflap: false,
    ear: false,
    belt: false,
    shield: false,
    macana: true,
    sling: true,
    manta: true,
  },
  paracas: {
    metal: 0xc8a040,
    helmet: false,
    backflap: false,
    ear: false,
    belt: false,
    shield: false,
    macana: true,
    sling: true,
    manta: true,
  },
};

export function andeanCultureForCiv(civ: CivId): AndeanCulture | null {
  return (ANDEAN_CULTURES as readonly string[]).includes(civ) ? (civ as AndeanCulture) : null;
}

export function andeanCultureForVariant(variant: string): AndeanCulture | null {
  const culture = variant.split('_')[0] as AndeanCulture;
  return (ANDEAN_CULTURES as readonly string[]).includes(culture) ? culture : null;
}

export function isAndeanVariant(variant: string): boolean {
  return andeanCultureForVariant(variant) !== null;
}

export interface AndeanPalette {
  primary: number;
  secondary: number;
  accent: number;
}

/** Derive the presentation palette from the civilization defs. */
export function andeanPalette(culture: AndeanCulture): AndeanPalette {
  const colors = getCiv(ANDEAN_CIV[culture]).colors;
  const color = (value: string): number => {
    const { r, g, b } = hexToRgb(value);
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  };
  return {
    primary: color(colors.primary),
    secondary: color(colors.secondary),
    accent: color(colors.accent),
  };
}
