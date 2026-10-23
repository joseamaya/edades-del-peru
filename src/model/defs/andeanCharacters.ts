import { CivId, Era } from '../../core/types';
import { getCiv } from './civs';
import { getPeriod } from './periods';
import { hexToRgb } from '../../util/math';

export const ANDEAN_CULTURES = [
  'moche',
  'recuay',
  'chavin',
  'paracas',
  'wari',
  'tiahuanaco',
  'chanca',
  'chimu',
  'inca',
] as const;
export const ANDEAN_ROLES = ['worker', 'scout', 'soldier', 'ranged'] as const;
export type AndeanCulture = (typeof ANDEAN_CULTURES)[number];
export type AndeanRole = (typeof ANDEAN_ROLES)[number];
export type AndeanRigVariant = `${AndeanCulture}_${AndeanRole}_${'f' | 'm'}`;

/** Presentation-only Andean outfit profile; colours come from the civ defs. */
export interface AndeanSpec {
  /** Accessory metal (not a team/civ colour); `null` when the culture has none. */
  metal: number | null;
  helmet: boolean;
  backflap: boolean;
  ear: boolean;
  belt: boolean;
  shield: boolean;
  manta: 'none' | 'short' | 'long';
  macanaHead: 'stone' | 'accent';
  pectoral: boolean;
  facePaint: boolean;
  shoulderSash: boolean;
}

export const ANDEAN_CIV: Record<AndeanCulture, CivId> = {
  moche: CivId.MOCHE,
  recuay: CivId.RECUAY,
  chavin: CivId.CHAVIN,
  paracas: CivId.PARACAS,
  wari: CivId.WARI,
  tiahuanaco: CivId.TIAHUANACO,
  chanca: CivId.CHANCA,
  chimu: CivId.CHIMU,
  inca: CivId.INCA,
};

/**
 * Chavín/Paracas garments are not documented in detail, so they use the shared
 * tunic/headband plus a simple manta abstraction. The Moche warrior gear is the
 * documented set in `docs/historia/atuendos.md`.
 */
export const ANDEAN_SPECS: Record<AndeanCulture, AndeanSpec> = {
  moche: {
    metal: 0xc8a040,
    helmet: true,
    backflap: true,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'accent',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  recuay: {
    metal: 0xb08a50,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'accent',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  chavin: {
    metal: null,
    helmet: false,
    backflap: false,
    ear: false,
    belt: false,
    shield: false,
    manta: 'short',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  paracas: {
    metal: null,
    helmet: false,
    backflap: false,
    ear: false,
    belt: false,
    shield: false,
    manta: 'long',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  wari: {
    metal: 0xc8a040,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'stone',
    pectoral: true,
    facePaint: false,
    shoulderSash: false,
  },
  tiahuanaco: {
    metal: 0xc8a040,
    helmet: true,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  chanca: {
    metal: 0xc8a040,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: true,
    shoulderSash: false,
  },
  chimu: {
    metal: 0xd8b050,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: false,
    shoulderSash: false,
  },
  inca: {
    metal: 0xf0d060,
    helmet: false,
    backflap: false,
    ear: true,
    belt: true,
    shield: true,
    manta: 'none',
    macanaHead: 'stone',
    pectoral: false,
    facePaint: false,
    shoulderSash: true,
  },
};

export function andeanCultureForCiv(civ: CivId): AndeanCulture | null {
  return (ANDEAN_CULTURES as readonly string[]).includes(civ) ? (civ as AndeanCulture) : null;
}

export function andeanCultureForEra(civ: CivId, era: Era): AndeanCulture | null {
  const culture = andeanCultureForCiv(civ);
  return culture && getCiv(civ).periods.some((period) => getPeriod(period).level === era) ? culture : null;
}

export function andeanCultureForVariant(variant: string): AndeanCulture | null {
  if (variant.startsWith('inca_chasqui_')) return null;
  const culture = variant.split('_')[0] as AndeanCulture;
  return (ANDEAN_CULTURES as readonly string[]).includes(culture) ? culture : null;
}

export function andeanRoleForVariant(variant: string): AndeanRole | null {
  const role = variant.split('_')[1] as AndeanRole;
  return ANDEAN_ROLES.includes(role) ? role : null;
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
