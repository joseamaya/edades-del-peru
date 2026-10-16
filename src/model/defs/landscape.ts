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
 * Region defaults. `terrace`/`wall` are rendered as retaining modules on the
 * andenes, `corral` as a low ring and `path` as a narrow road; the coast also has
 * literature-carved `canal`. Feature sets differ per region so the landscape reads
 * differently by geography (coast irrigation vs Andean terracing vs altiplano
 * corrals). Visual only for now (no gameplay effect).
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
    features: [
      { feature: 'field', weight: 0.5 },
      { feature: 'road', weight: 0.4 },
    ],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (Paracas/Nazca/Chincha: valles y pampa)',
  },
  andean_valley: {
    features: [
      { feature: 'terrace', weight: 0.7 },
      { feature: 'field', weight: 0.5 },
      { feature: 'road', weight: 0.6 },
      { feature: 'wall', weight: 0.3 },
    ],
    settlementShape: 'riverside',
    provenance: 'docs/historia/mapas.md (Chavín/Recuay/Huanca: andenes y valle)',
  },
  high_andes: {
    features: [
      { feature: 'terrace', weight: 0.9 },
      { feature: 'road', weight: 0.7 },
      { feature: 'wall', weight: 0.4 },
      { feature: 'plaza', weight: 0.5 },
    ],
    settlementShape: 'hilltop',
    provenance: 'docs/historia/mapas.md (Inca/Wari/Chanca: andenes, Qhapaq Ñan, pucarás)',
  },
  altiplano: {
    features: [
      { feature: 'terrace', weight: 0.4 },
      { feature: 'field', weight: 0.5 },
      { feature: 'corral', weight: 0.4 },
      { feature: 'plaza', weight: 0.5 },
    ],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (Tiahuanaco/Collas: camellones y ganadería)',
  },
  amazon: {
    features: [
      { feature: 'field', weight: 0.3 },
      { feature: 'path', weight: 0.2 },
    ],
    settlementShape: 'dispersed',
    provenance: 'docs/historia/mapas.md (selva alta: cultivos y senderos)',
  },
};

export function landscapeWeight(profile: CulturalLandscapeProfile, feature: LandscapeFeature): number {
  return profile.features.find((f) => f.feature === feature)?.weight ?? 0;
}
