import type { SiteBlocker } from './sites';

/** Shared data contract for the Blender architecture kits (Caral, Chavín, Cusco, colonial, republican, independence, moche, wari). */
export type ArchitectureKitId =
  'caral' | 'chavin' | 'cusco' | 'colonial' | 'republic' | 'independence' | 'moche' | 'wari' | 'killke';
export type ArchAssetId = string;

export interface ArchPlacement {
  asset: ArchAssetId;
  x: number;
  z: number;
  /** Yaw in radians; the models face +Z. */
  rotY: number;
  /** Non-uniform scale (x, y, z) of the model. */
  scale: [number, number, number];
  /** Raise the model above the ground it sits on (model units, before scaling). */
  lift?: number;
  /** First phase in which the piece stands; omitted means from the opening. */
  since?: string;
  /** First phase in which the piece is gone again (e.g. Caral's fair tents under the sealed city). */
  until?: string;
  /** Asset used instead of `asset` in each phase (e.g. the Caral Pyramid Mayor). */
  phaseAssets?: Partial<Record<string, ArchAssetId>>;
  /**
   * Seat the piece at the ground under its centre instead of the lowest point of its footprint, for a
   * hillside building whose modelled footing reaches down. The doorway stays at grade and the uphill
   * wall cuts into the slope.
   */
  seat?: 'centre';
}

/** A kit piece's solid ground footprint in its own model space (metres, +Z front), before scaling. */
export interface ArchFootprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Navigation blockers for a kit layout, from the same placements the renderer bakes: every placed piece
 * with a footprint blocks the axis-aligned bounds of its scaled, turned footprint. One source for what is
 * drawn and what blocks, headless included. Pieces without a footprint (a plaza floor) stay walkable.
 * `SiteBlocker` is reused so the layout cannot drift from the site's blocker contract.
 */
export function layoutBlockers(
  layout: readonly ArchPlacement[],
  footprints: Partial<Record<ArchAssetId, ArchFootprint>>,
): SiteBlocker[] {
  const out: SiteBlocker[] = [];
  for (const p of layout) {
    const f = footprints[p.asset];
    if (!f) continue;
    const cos = Math.cos(p.rotY);
    const sin = Math.sin(p.rotY);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const lx of [f.minX, f.maxX]) {
      for (const lz of [f.minZ, f.maxZ]) {
        const sx = lx * p.scale[0];
        const sz = lz * p.scale[2];
        // The renderer's yaw (Matrix4.compose about +Y): x' = x cos + z sin, z' = -x sin + z cos.
        const x = p.x + sx * cos + sz * sin;
        const z = p.z - sx * sin + sz * cos;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
    out.push({
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      w: maxX - minX,
      d: maxZ - minZ,
      ...(p.since ? { since: p.since } : {}),
      ...(p.until ? { until: p.until } : {}),
    });
  }
  return out;
}
