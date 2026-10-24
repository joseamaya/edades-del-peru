/**
 * Optional, mission-authored terrain features. Coordinates are normalized to the
 * map (`0..1`), so the same layout works for any playable size. Used by the pure
 * heightfield generator and by the scenery exclusion queries.
 */
/**
 * Axis-aligned rectangle. Coordinates are in the caller's space: normalized
 * (`0..1`) for terrain layouts and world units for scene keep-out rectangles.
 */
export interface TerrainRect {
  x: number;
  z: number;
  /** Half-extent along X. */
  rx: number;
  /** Half-extent along Z. */
  rz: number;
}

/** A dry crossing raised above the waterline so units can walk across. */
export interface TerrainFord {
  /** Normalized centre along X. */
  x: number;
  /** Normalized full width along X. */
  width: number;
}

/** East-west river valley (the Supe in the Caral scenario). */
export interface TerrainRiver {
  /** Normalized centre line along Z at the west edge. */
  z: number;
  /** Normalized full channel width. */
  width: number;
  /** Normalized full valley width (banks + floodplain); defaults to 3.5x the channel. */
  valleyWidth?: number;
  /** Gentle meander amplitude, normalized. */
  amplitude?: number;
  phase?: number;
  /** Crossings raised above the waterline (walkable fords/causeways). */
  fords?: TerrainFord[];
}

export interface TerrainLayout {
  river?: TerrainRiver;
  /** Flat desert terraces (normalized rectangles). */
  flats?: TerrainRect[];
}

/** Whether a normalized point lies inside a rect, with an optional normalized margin. */
export function insideTerrainRect(r: TerrainRect, x: number, z: number, margin = 0): boolean {
  return Math.abs(x - r.x) <= r.rx + margin && Math.abs(z - r.z) <= r.rz + margin;
}

/** Whether a normalized point lies in any rect. */
export function insideAnyTerrainRect(rects: readonly TerrainRect[] | undefined, x: number, z: number): boolean {
  return !!rects?.some((r) => insideTerrainRect(r, x, z));
}
