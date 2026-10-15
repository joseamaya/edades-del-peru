import { CivId, Era } from '../../core/types';
import { ArchStyle, getCiv } from './civs';

export type WallMaterial = 'adobe' | 'fieldstone' | 'cut-stone' | 'megalithic' | 'brick' | 'concrete' | 'metal';

export type RoofMaterial = 'thatch' | 'flat-stone' | 'tile' | 'flat-metal';

export type FoundationKind = 'platform' | 'terrace' | 'plinth' | 'none';

export interface ArchitectureOrnament {
  niches?: boolean;
  frieze?: boolean;
  megalithBlocks?: boolean;
  tapestry?: boolean;
}

/**
 * Historical architectural identity of a civilization at a tech level. Extends the
 * existing `CivVisual`/`ArchStyle` layer (same styles) by naming its materials,
 * roof, foundation and ornaments, so buildings read as different cultures rather
 * than a recolour. Keyed by `Era` so it matches the model cache key. Consumed by
 * `ProceduralModel` (Phase 4). Landmarks belong to the map profile (`profiles.ts`).
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
  provenance: string;
}

type ArchBase = Omit<HistoricalArchitectureProfile, 'id' | 'style' | 'provenance'>;

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
  'highland-terraced': { wall: 'fieldstone', roof: 'thatch', foundation: 'terrace', monumentalTiers: 2, ornament: {} },
  colonial: { wall: 'brick', roof: 'tile', foundation: 'plinth', monumentalTiers: 1, ornament: {} },
  republican: { wall: 'concrete', roof: 'flat-metal', foundation: 'plinth', monumentalTiers: 1, ornament: {} },
};

/** Per-civilization overrides (they keep the same `ArchStyle`). */
const CIV_ARCH: Partial<Record<CivId, Partial<ArchBase>>> = {
  // Caral's monumental compounds have no painted frieze (that is a Moche/Chimú trait)
  [CivId.CARAL]: { ornament: {}, monumentalTiers: 2 },
  // Chavín: carved stone temple with tenon heads and large blocks
  [CivId.CHAVIN]: {
    wall: 'fieldstone',
    roof: 'flat-stone',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { niches: true, megalithBlocks: true },
  },
  // Cupisnique: early north-coast adobe platforms with modelled friezes
  [CivId.CUPISNIQUE]: { monumentalTiers: 3, ornament: { frieze: true } },
  // Paracas: coastal adobe with funerary textiles
  [CivId.PARACAS]: { monumentalTiers: 2, ornament: { tapestry: true } },
  // Moche huacas (e.g. Huaca del Sol) tower over the earlier coastal platforms
  [CivId.MOCHE]: { monumentalTiers: 3 },
  // Nazca: plain adobe ceremonial mounds (Cahuachi)
  [CivId.NAZCA]: { monumentalTiers: 2, ornament: {} },
  // Wari: planned stone compounds
  [CivId.WARI]: { wall: 'fieldstone', roof: 'thatch', monumentalTiers: 3, ornament: { niches: true } },
  // Tiahuanaco: taller megalithic platforms (Akapana-like) than the generic altiplano base
  [CivId.TIAHUANACO]: { monumentalTiers: 4 },
  // Chimú: large walled adobe citadels with painted friezes
  [CivId.CHIMU]: { monumentalTiers: 3, ornament: { frieze: true } },
  // Chincha: adobe ceremonial complex (La Centinela)
  [CivId.CHINCHA]: { monumentalTiers: 3, ornament: { frieze: true } },
  // Chanca: hilltop stone fortresses
  [CivId.CHANCA]: { wall: 'fieldstone', roof: 'flat-stone', foundation: 'terrace', monumentalTiers: 2, ornament: {} },
  // Collas/Lupaca: funerary towers (chullpas), simpler than Tiahuanaco
  [CivId.COLLAS_LUPACA]: { monumentalTiers: 2, ornament: { megalithBlocks: true } },
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
  [CivId.CHAVIN]: 'docs/historia/civilizaciones/chavin.md',
  [CivId.CUPISNIQUE]: 'docs/historia/civilizaciones/cupisnique.md',
  [CivId.PARACAS]: 'docs/historia/civilizaciones/paracas.md',
  [CivId.MOCHE]: 'docs/historia/civilizaciones/moche.md',
  [CivId.NAZCA]: 'docs/historia/civilizaciones/nazca.md',
  [CivId.WARI]: 'docs/historia/civilizaciones/wari.md',
  [CivId.TIAHUANACO]: 'docs/historia/civilizaciones/tiahuanaco.md',
  [CivId.CHIMU]: 'docs/historia/civilizaciones/chimu.md',
  [CivId.CHINCHA]: 'docs/historia/civilizaciones/chincha.md',
  [CivId.CHANCA]: 'docs/historia/civilizaciones/chanca.md',
  [CivId.COLLAS_LUPACA]: 'docs/historia/civilizaciones/collas_lupaca.md',
  [CivId.INCA]: 'docs/historia/civilizaciones/inca.md',
};

const PROFILE_CACHE = new Map<string, HistoricalArchitectureProfile>();

/**
 * Architectural profile for a civilization at a tech level. After 1532 (`era >=
 * VICEROYALTY`) the era governs the look (colonial/republican), matching
 * `Builder.isAndean` in the model generator; the civilization's own style only
 * applies pre-Hispanic. Keyed by `Era`, which is what the model cache and
 * `Builder.isAndean` use.
 */
export function archProfileFor(civId: CivId, era: Era): HistoricalArchitectureProfile {
  const key = `${civId}|${era}`;
  const cached = PROFILE_CACHE.get(key);
  if (cached) return cached;

  const civ = getCiv(civId);
  const style: ArchStyle = era >= Era.REPUBLIC ? 'republican' : era >= Era.VICEROYALTY ? 'colonial' : civ.visual.arch;

  const useCivOverride = style === civ.visual.arch;
  const override = useCivOverride ? CIV_ARCH[civId] : undefined;
  const base = STYLE_BASES[style];

  const profile: HistoricalArchitectureProfile = {
    id: key,
    style,
    ...base,
    ...(override ?? {}),
    ornament: override?.ornament ?? base.ornament,
    provenance: CIV_ARCH_SOURCE[civId] ?? 'docs/historia/arquitectura.md',
  };
  PROFILE_CACHE.set(key, profile);
  return profile;
}
