import { layoutBlockers, type ArchFootprint, type ArchPlacement } from './architectureKit';
import { SINGLE_PHASE, type SitePhasePlan } from './sitePhases';

/**
 * The colonial city shared by Lima (1535, 1821), Cusco (1780, 1814) and Miraflores (1881): the Plaza
 * Mayor with its cathedral, cabildo, portales and balconied houses, assembled from the colonial
 * architecture kit (`scripts/blender/build_colonial_architecture_kit.py`). One composition, placed at
 * each site's own anchor; the mission docs record what is documented and what is an abstraction.
 */
export const COLONIAL_PHASE_PLAN: SitePhasePlan = SINGLE_PHASE;

/** The phase in which a colonial mission's city stands (the founding traza is `traza`). */
export const COLONIAL_CITY_PHASE = 'ciudad';

const ONE: [number, number, number] = [1, 1, 1];

const at = (anchor: { x: number; z: number }, dx: number, dz: number) => ({
  x: anchor.x + dx,
  z: anchor.z + dz,
});

/**
 * Solid footprints of the kit pieces in model space (the Blender bounds, game +Z = Blender -Y): the walls,
 * not the roof overhangs or the balcony. The plaza floor has none and stays walkable; the fountain does.
 */
export const COLONIAL_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  catedral: { minX: -12.2, maxX: 12.2, minZ: -6.3, maxZ: 6.3 },
  cabildo: { minX: -8.1, maxX: 8.1, minZ: -4.6, maxZ: 4.6 },
  casona: { minX: -4.6, maxX: 4.6, minZ: -4.1, maxZ: 4.1 },
  portal: { minX: -5.1, maxX: 5.1, minZ: -2.1, maxZ: 2.1 },
  pileta: { minX: -1.8, maxX: 1.8, minZ: -1.8, maxZ: 1.8 },
  patio_wall: { minX: -5.1, maxX: 5.1, minZ: -0.35, maxZ: 0.35 },
};

/** Metres: the plaza's half-depth and the ring of buildings around it (see the kit's manifest bounds). */
const PLAZA_HALF_Z = 13;
const RING_X = 18.5;

/**
 * The plaza composition around `anchor`. `since` delays every building to a construction phase (Lima 1535
 * opens on the traced plaza and the city rises in Act II); the plaza floor always stands.
 */
export function colonialLayoutAt(
  anchor: { x: number; z: number },
  since?: string,
  options: { omit?: readonly string[] } = {},
): readonly ArchPlacement[] {
  const building = (placement: ArchPlacement): ArchPlacement => (since ? { ...placement, since } : placement);
  const placements = [
    // In a founding phase the plaza itself is still being laid out: the packed-earth traza and its cords
    // are drawn by `ColonialLife`, so the paving and the fountain carry the city's `since` too.
    building({ asset: 'plaza', ...at(anchor, 0, 0), rotY: 0, scale: ONE, lift: 0.04 }),
    building({ asset: 'pileta', ...at(anchor, 0, 0), rotY: 0, scale: ONE, lift: 0.16 }),
    // The cathedral closes the north side, its front (game +Z) on the plaza.
    building({ asset: 'catedral', ...at(anchor, 0, -PLAZA_HALF_Z - 6.5), rotY: 0, scale: ONE }),
    // The cabildo faces it from the south.
    building({ asset: 'cabildo', ...at(anchor, 0, PLAZA_HALF_Z + 5.5), rotY: Math.PI, scale: ONE }),
    // Arcades on the east and west sides, houses between them.
    building({ asset: 'portal', ...at(anchor, -RING_X, 0), rotY: Math.PI / 2, scale: ONE }),
    building({ asset: 'portal', ...at(anchor, RING_X, 0), rotY: -Math.PI / 2, scale: ONE }),
    ...[-14.5, 14.5].flatMap((dz) =>
      [-1, 1].map((sx) =>
        building({
          asset: 'casona',
          ...at(anchor, sx * RING_X, dz),
          // Front (+Z) toward the plaza: west houses look east, east houses look west.
          rotY: -sx * (Math.PI / 2),
          scale: ONE,
        }),
      ),
    ),
    // A patio wall closes the cathedral's atrium.
    building({ asset: 'patio_wall', ...at(anchor, 0, -PLAZA_HALF_Z - 15.4), rotY: 0, scale: ONE }),
  ];
  const omit = options.omit;
  return omit?.length ? placements.filter((placement) => !omit.includes(placement.asset)) : placements;
}

/** Every building of the composition blocks, from the same placements the renderer bakes. */
export function colonialCityBlockers(
  anchor: { x: number; z: number },
  since?: string,
  options: { omit?: readonly string[] } = {},
) {
  return layoutBlockers(colonialLayoutAt(anchor, since, options), COLONIAL_KIT_FOOTPRINTS);
}
