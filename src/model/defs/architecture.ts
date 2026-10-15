import { CivId, Era, HistoricalPeriod } from '../../core/types';
import { ArchStyle, getCiv } from './civs';
import { getPeriod } from './periods';
import { landmarkForCiv, type LandmarkId } from './landmarks';

export type WallMaterial =
  'adobe' | 'fieldstone' | 'cut-stone' | 'megalithic' | 'wood' | 'brick' | 'concrete' | 'metal';

export type RoofMaterial = 'thatch' | 'flat-stone' | 'tile' | 'flat-metal';

export type FoundationKind = 'platform' | 'terrace' | 'plinth' | 'none';

export interface ArchitectureOrnament {
  niches?: boolean;
  frieze?: boolean;
  megalithBlocks?: boolean;
  tapestry?: boolean;
}

/**
 * Historical architectural identity of a civilization in a period. Extends the
 * existing `CivVisual`/`ArchStyle` layer (same styles) by naming its materials,
 * roof, foundation and ornaments, so buildings read as different cultures rather
 * than a recolour. Consumed by `ProceduralModel` (Phase 4).
 */
export interface HistoricalArchitectureProfile {
  id: string;
  style: ArchStyle;
  wall: WallMaterial;
  roof: RoofMaterial;
  foundation: FoundationKind;
  /** Height (platform tiers) of monumental buildings; huacas rise above early mounds. */
  monumentalTiers: number;
  ornament: ArchitectureOrnament;
  landmark: LandmarkId | null;
  provenance: string;
}

type ArchBase = Omit<HistoricalArchitectureProfile, 'id' | 'style' | 'landmark' | 'provenance'>;

/** Defaults per architectural style (from `docs/historia/arquitectura.md`). */
const STYLE_BASES: Record<ArchStyle, ArchBase> = {
  'coastal-adobe': {
    wall: 'adobe',
    roof: 'thatch',
    foundation: 'platform',
    monumentalTiers: 2,
    ornament: { frieze: true },
  },
  'andean-masonry': {
    wall: 'cut-stone',
    roof: 'thatch',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { niches: true },
  },
  'altiplano-stone': {
    wall: 'megalithic',
    roof: 'flat-stone',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { megalithBlocks: true, niches: true },
  },
  'highland-terraced': {
    wall: 'fieldstone',
    roof: 'thatch',
    foundation: 'terrace',
    monumentalTiers: 2,
    ornament: { niches: true },
  },
  colonial: { wall: 'brick', roof: 'tile', foundation: 'plinth', monumentalTiers: 1, ornament: {} },
  republican: { wall: 'concrete', roof: 'flat-metal', foundation: 'plinth', monumentalTiers: 1, ornament: {} },
};

/** Per-civilization overrides for the slice (they keep the same `ArchStyle`). */
const CIV_ARCH: Partial<Record<CivId, Partial<ArchBase>>> = {
  // Caral's monumental compounds have no painted frieze (that is a Moche/Chimú trait)
  [CivId.CARAL]: { ornament: {}, monumentalTiers: 2 },
  // Moche huacas (e.g. Huaca del Sol) tower over the earlier coastal platforms
  [CivId.MOCHE]: { monumentalTiers: 3 },
  [CivId.INCA]: {
    wall: 'cut-stone',
    roof: 'thatch',
    foundation: 'terrace',
    monumentalTiers: 3,
    ornament: { niches: true, tapestry: true },
  },
};

const CIV_ARCH_SOURCE: Partial<Record<CivId, string>> = {
  [CivId.CARAL]: 'docs/historia/civilizaciones/caral.md',
  [CivId.MOCHE]: 'docs/historia/civilizaciones/moche.md',
  [CivId.INCA]: 'docs/historia/civilizaciones/inca.md',
};

const PROFILE_CACHE = new Map<string, HistoricalArchitectureProfile>();

/**
 * Architectural profile for a civilization in a period. After 1532 the era
 * governs the look (colonial/republican), matching `Builder.isAndean` in the
 * model generator; the civilization's own style only applies pre-Hispanic.
 */
export function archProfileFor(civId: CivId, period: HistoricalPeriod): HistoricalArchitectureProfile {
  const key = `${civId}|${period}`;
  const cached = PROFILE_CACHE.get(key);
  if (cached) return cached;

  const civ = getCiv(civId);
  const level = getPeriod(period).level;
  const style: ArchStyle =
    level >= Era.REPUBLIC ? 'republican' : level >= Era.VICEROYALTY ? 'colonial' : civ.visual.arch;

  const useCivOverride = style === civ.visual.arch;
  const override = useCivOverride ? CIV_ARCH[civId] : undefined;
  const base = STYLE_BASES[style];

  const profile: HistoricalArchitectureProfile = {
    id: key,
    style,
    ...base,
    ...(override ?? {}),
    ornament: override?.ornament ?? base.ornament,
    landmark: landmarkForCiv(civId, period),
    provenance: CIV_ARCH_SOURCE[civId] ?? 'docs/historia/arquitectura.md',
  };
  PROFILE_CACHE.set(key, profile);
  return profile;
}
