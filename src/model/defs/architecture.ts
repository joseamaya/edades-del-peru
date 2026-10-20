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
 * Documented civic silhouette marker, built into/around the center so two
 * coetaneous civilizations read differently by shape (not only colour).
 * Each motif abstracts an attested form (plaza, ramp, enclosure, tower…);
 * see `docs/historia/arquitectura.md` §1 and the civ dossiers.
 */
export type SilhouetteMotif =
  | 'none'
  | 'circular-plaza'
  | 'tenon-heads'
  | 'stone-heads'
  | 'funerary-enclosure'
  | 'ramp'
  | 'low-mound'
  | 'stelae'
  | 'perimeter-wall'
  | 'sunken-court'
  | 'citadel'
  | 'pucara'
  | 'chullpa'
  | 'terraces'
  | 'ushnu';

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
  /** Civic silhouette marker used by the base center and defensive buildings. */
  silhouette: SilhouetteMotif;
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
    silhouette: 'none',
  },
  'andean-masonry': {
    wall: 'cut-stone',
    roof: 'thatch',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { niches: true },
    silhouette: 'none',
  },
  'altiplano-stone': {
    wall: 'megalithic',
    roof: 'flat-stone',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { megalithBlocks: true, niches: true },
    silhouette: 'none',
  },
  'highland-terraced': {
    wall: 'fieldstone',
    roof: 'thatch',
    foundation: 'terrace',
    monumentalTiers: 2,
    ornament: {},
    silhouette: 'none',
  },
  colonial: { wall: 'brick', roof: 'tile', foundation: 'plinth', monumentalTiers: 1, ornament: {}, silhouette: 'none' },
  republican: {
    wall: 'concrete',
    roof: 'flat-metal',
    foundation: 'plinth',
    monumentalTiers: 1,
    ornament: {},
    silhouette: 'none',
  },
};

/** Per-civilization overrides (they keep the same `ArchStyle`). */
const CIV_ARCH: Partial<Record<CivId, Partial<ArchBase>>> = {
  // Caral's monumental compounds have no painted frieze (that is a Moche/Chimú trait)
  [CivId.CARAL]: { ornament: {}, monumentalTiers: 2, silhouette: 'circular-plaza' },
  // Chavín: carved stone temple with tenon heads and large blocks
  [CivId.CHAVIN]: {
    wall: 'fieldstone',
    roof: 'flat-stone',
    foundation: 'platform',
    monumentalTiers: 3,
    ornament: { niches: true, megalithBlocks: true },
    silhouette: 'tenon-heads',
  },
  // Cupisnique: early north-coast adobe huacas with modelled friezes and stone heads
  [CivId.CUPISNIQUE]: {
    monumentalTiers: 3,
    ornament: { frieze: true, megalithBlocks: true },
    silhouette: 'stone-heads',
  },
  // Paracas: coastal adobe with funerary textiles
  [CivId.PARACAS]: { monumentalTiers: 2, ornament: { tapestry: true }, silhouette: 'funerary-enclosure' },
  // Moche huacas (e.g. Huaca del Sol) tower over the earlier coastal platforms
  [CivId.MOCHE]: { monumentalTiers: 3, silhouette: 'ramp' },
  // Nazca: low adobe ceremonial mounds (Cahuachi)
  [CivId.NAZCA]: { monumentalTiers: 1, ornament: {}, silhouette: 'low-mound' },
  // Recuay: fortified highland centers with carved stelae (Pashash)
  [CivId.RECUAY]: { silhouette: 'stelae' },
  // Wari: planned stone compounds
  [CivId.WARI]: {
    wall: 'fieldstone',
    roof: 'thatch',
    monumentalTiers: 3,
    ornament: { niches: true },
    silhouette: 'perimeter-wall',
  },
  // Tiahuanaco: taller megalithic platforms (Akapana-like) than the generic altiplano base
  [CivId.TIAHUANACO]: { monumentalTiers: 4, silhouette: 'sunken-court' },
  // Chimú: large walled adobe citadels with painted friezes
  [CivId.CHIMU]: { monumentalTiers: 3, ornament: { frieze: true }, silhouette: 'citadel' },
  // Chincha: lower adobe ceremonial complex (La Centinela)
  [CivId.CHINCHA]: { monumentalTiers: 2, silhouette: 'ramp' },
  // Chanca: hilltop stone fortresses
  [CivId.CHANCA]: {
    wall: 'fieldstone',
    roof: 'flat-stone',
    foundation: 'terrace',
    monumentalTiers: 2,
    ornament: {},
    silhouette: 'pucara',
  },
  // Huanca: ayllu centers on terraced valley slopes (Mantaro)
  [CivId.HUANCA]: { silhouette: 'terraces' },
  // Collas/Lupaca: funerary towers (chullpas), simpler than Tiahuanaco
  [CivId.COLLAS_LUPACA]: {
    monumentalTiers: 2,
    ornament: { megalithBlocks: true },
    silhouette: 'chullpa',
  },
  [CivId.INCA]: {
    wall: 'cut-stone',
    roof: 'thatch',
    foundation: 'terrace',
    monumentalTiers: 3,
    ornament: { niches: true, tapestry: true },
    silhouette: 'ushnu',
  },
};

const CIV_ARCH_SOURCE: Partial<Record<CivId, string>> = {
  [CivId.CARAL]: 'docs/historia/civilizaciones/caral.md',
  [CivId.CHAVIN]: 'docs/historia/civilizaciones/chavin.md',
  [CivId.CUPISNIQUE]: 'docs/historia/civilizaciones/cupisnique.md',
  [CivId.PARACAS]: 'docs/historia/civilizaciones/paracas.md',
  [CivId.MOCHE]: 'docs/historia/civilizaciones/moche.md',
  [CivId.NAZCA]: 'docs/historia/civilizaciones/nazca.md',
  [CivId.RECUAY]: 'docs/historia/civilizaciones/recuay.md',
  [CivId.WARI]: 'docs/historia/civilizaciones/wari.md',
  [CivId.TIAHUANACO]: 'docs/historia/civilizaciones/tiahuanaco.md',
  [CivId.CHIMU]: 'docs/historia/civilizaciones/chimu.md',
  [CivId.CHINCHA]: 'docs/historia/civilizaciones/chincha.md',
  [CivId.CHANCA]: 'docs/historia/civilizaciones/chanca.md',
  [CivId.HUANCA]: 'docs/historia/civilizaciones/huanca.md',
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
