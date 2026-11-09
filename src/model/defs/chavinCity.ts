import type { ArchPlacement } from './architectureKit';
import type { SiteBlocker, SiteKeepoutRect } from './sites';
import type { SitePhasePlan } from './sitePhases';
import type { HeritageBuildingId } from './heritage';

export const CHAVIN_PHASE_PLAN: SitePhasePlan = {
  phases: ['old_temple_foundation', 'old_temple', 'new_temple_foundation', 'new_temple', 'apogee'],
  initial: 'old_temple_foundation',
};

/** The former 192 m frame sits at the centre of the 256 m map, so every site-local point moves 32 m. */
export const CHAVIN_SITE_SHIFT = 32;

/** Shift a point from the former 192 m site frame (origin 96) into the 256 m map (origin 128). */
export function chavinPoint<T extends { x: number; z: number }>(p: T): T {
  return { ...p, x: p.x + CHAVIN_SITE_SHIFT, z: p.z + CHAVIN_SITE_SHIFT };
}

/** Re-normalise a keepout from the former 192 m frame, keeping its metres and moving it with the site. */
export function chavinKeepout(r: SiteKeepoutRect): SiteKeepoutRect {
  const k = 192 / 256;
  return {
    x: (r.x * 192 + CHAVIN_SITE_SHIFT) / 256,
    z: (r.z * 192 + CHAVIN_SITE_SHIFT) / 256,
    rx: r.rx * k,
    rz: r.rz * k,
  };
}

/** The source kit keeps the original site frame: every piece is placed at the site origin and scaled. */
const KIT = chavinPoint({ x: 96, z: 96, scale: [0.22, 0.22, 0.22] as [number, number, number] });

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
  { asset: 'fair_tent', ...chavinPoint({ x: 92, z: 104 }), rotY: 0.2, scale: [1, 1, 1], since: 'apogee' },
  { asset: 'fair_tent', ...chavinPoint({ x: 104, z: 106 }), rotY: -0.35, scale: [1, 1, 1], since: 'apogee' },
  { asset: 'fair_tent', ...chavinPoint({ x: 112, z: 96 }), rotY: 0.55, scale: [1, 1, 1], since: 'apogee' },
  // Pilgrims and offering bundles are presentation-only; they stand once the centre is at its apogee.
  { asset: 'pilgrims', ...chavinPoint({ x: 100, z: 98 }), rotY: 0, scale: [1, 1, 1], since: 'apogee' },
];

export const CHAVIN_CITY_BLOCKERS: readonly SiteBlocker[] = [
  { ...chavinPoint({ x: 90, z: 91 }), w: 20, d: 19, since: 'old_temple_foundation' },
  { ...chavinPoint({ x: 107, z: 80 }), w: 25, d: 22, since: 'new_temple_foundation' },
  { ...chavinPoint({ x: 110, z: 85 }), w: 9, d: 7, since: 'new_temple' },
];

/** Phase from which each heritage card stands; omitted cards stand from the opening. */
export const CHAVIN_HERITAGE_SINCE: Partial<Record<HeritageBuildingId, string>> = {
  chavin_plaza_circular: 'old_temple_foundation',
  chavin_edificio_b: 'old_temple_foundation',
  chavin_galeria: 'old_temple_foundation',
  chavin_edificio_a: 'new_temple_foundation',
  chavin_portada: 'new_temple',
};
