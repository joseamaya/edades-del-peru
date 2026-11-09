import type { ArchPlacement } from './architectureKit';
import type { SitePhasePlan } from './sitePhases';
import type { SiteBlocker } from './sites';
import type { HeritageBuildingId } from './heritage';

export const CHAVIN_PHASE_PLAN: SitePhasePlan = {
  phases: ['old_temple_foundation', 'old_temple', 'new_temple_foundation', 'new_temple', 'apogee'],
  initial: 'old_temple_foundation',
};

/** The source kit keeps the original site frame: every piece is placed at the site origin and scaled. */
const KIT = { x: 128, z: 128, scale: [0.22, 0.22, 0.22] as [number, number, number] };

/**
 * The ceremonial centre assembled from the Chavín architecture kit. The source is a representative
 * reconstruction, not a survey; the layout follows the heritage proxies in sites.ts. The Old Temple is
 * built first, then the New Temple and its Portada; the fair tents appear at the apogee.
 */
export const CHAVIN_CITY_LAYOUT: readonly ArchPlacement[] = [
  { asset: 'terraces', ...KIT, rotY: 0 },
  { asset: 'plaza', ...KIT, rotY: 0 },
  { asset: 'edificio_b_foundation', phaseAssets: { old_temple: 'edificio_b' }, ...KIT, rotY: 0 },
  { asset: 'edificio_a_foundation', phaseAssets: { new_temple: 'edificio_a' }, ...KIT, rotY: 0 },
  { asset: 'portada', ...KIT, rotY: 0, since: 'new_temple' },
  // Fair tents use the game-unit Caral tent geometry, placed on the open ground outside the temple.
  { asset: 'fair_tent', x: 122.7, z: 138.7, rotY: 0.2, scale: [1, 1, 1], since: 'apogee' },
  { asset: 'fair_tent', x: 138.7, z: 141.3, rotY: -0.35, scale: [1, 1, 1], since: 'apogee' },
  { asset: 'fair_tent', x: 149.3, z: 128, rotY: 0.55, scale: [1, 1, 1], since: 'apogee' },
  // Pilgrims and offering bundles are presentation-only; they stand once the centre is at its apogee.
  { asset: 'pilgrims', x: 133.3, z: 130.7, rotY: 0, scale: [1, 1, 1], since: 'apogee' },
];

export const CHAVIN_CITY_BLOCKERS: readonly SiteBlocker[] = [
  { x: 120, z: 121.3, w: 20, d: 19, since: 'old_temple_foundation' },
  { x: 142.7, z: 106.7, w: 25, d: 22, since: 'new_temple_foundation' },
  { x: 146.7, z: 113.3, w: 9, d: 7, since: 'new_temple' },
];

/** Phase from which each heritage card stands; omitted cards stand from the opening. */
export const CHAVIN_HERITAGE_SINCE: Partial<Record<HeritageBuildingId, string>> = {
  chavin_plaza_circular: 'old_temple_foundation',
  chavin_edificio_b: 'old_temple_foundation',
  chavin_galeria: 'old_temple_foundation',
  chavin_edificio_a: 'new_temple_foundation',
  chavin_portada: 'new_temple',
};
