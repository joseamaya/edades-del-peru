import type { GeographicRegion } from './profiles';

/**
 * Cultural features a region can carry, drawn on top of the natural terrain.
 * Covers the full PRP §8 vocabulary; some entries are composed render variants
 * rather than new geometry (see `docs/design/cultural-landscape.md`).
 */
export type LandscapeFeature =
  | 'road'
  | 'path'
  | 'canal'
  | 'terrace'
  | 'field'
  | 'plaza'
  | 'courtyard'
  | 'platform'
  | 'ceremonial'
  | 'wall'
  | 'fortification'
  | 'bridge'
  | 'corral';

export interface LandscapeRule {
  feature: LandscapeFeature;
  /** 0 = absent .. 1 = dominant. Scales density/length. */
  weight: number;
}

/**
 * Cultural identity of a map: which features a region tends to carry and how its
 * settlement clusters. Modifies the existing generator (like `HistoricalMapProfile`);
 * deterministic from `seed + profile`. Features are **plausible/abstraction**
 * readings of documented traits (see `docs/historia/`), not reconstructions.
 */
export interface CulturalLandscapeProfile {
  features: LandscapeRule[];
  settlementShape: 'riverside' | 'hilltop' | 'dispersed' | 'grid';
  provenance: string;
}

/**
 * Region defaults. This iteration implements the coast (Moche / Caral) slice —
 * canal, field, road and plaza; the remaining regions are filled in later phases
 * (their `features` stay empty so nothing is drawn there yet).
 */
export const LANDSCAPE: Record<GeographicRegion, CulturalLandscapeProfile> = {
  north_coast: {
    features: [
      { feature: 'canal', weight: 0.8 },
      { feature: 'field', weight: 0.8 },
      { feature: 'road', weight: 0.5 },
      { feature: 'plaza', weight: 0.4 },
    ],
    settlementShape: 'riverside',
    provenance: 'docs/historia/mapas.md (Moche/Chimú: riego de valle; Chan Chan)',
  },
  central_coast: {
    features: [
      { feature: 'canal', weight: 0.7 },
      { feature: 'field', weight: 0.7 },
      { feature: 'road', weight: 0.4 },
      { feature: 'plaza', weight: 0.5 },
    ],
    settlementShape: 'riverside',
    provenance: 'docs/historia/civilizaciones/caral.md (canales de riego; plazas)',
  },
  south_coast: {
    features: [],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (Paracas/Nazca/Chincha)',
  },
  andean_valley: {
    features: [],
    settlementShape: 'riverside',
    provenance: 'docs/historia/mapas.md (Chavín/Recuay/Huanca)',
  },
  high_andes: {
    features: [],
    settlementShape: 'hilltop',
    provenance: 'docs/historia/mapas.md (Inca/Wari/Chanca)',
  },
  altiplano: {
    features: [],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (Tiahuanaco/Collas)',
  },
  amazon: {
    features: [],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (selva alta)',
  },
};

export function landscapeWeight(profile: CulturalLandscapeProfile, feature: LandscapeFeature): number {
  return profile.features.find((f) => f.feature === feature)?.weight ?? 0;
}
