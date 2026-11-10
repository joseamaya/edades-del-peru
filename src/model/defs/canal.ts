import { distanceToPath } from '../../util/math';

/** Default water width for an authored canal in world units. */
export const DEFAULT_CANAL_WIDTH = 2.2;
/** Distance from the channel centreline where the irrigation bonus fades out (m). */
export const CANAL_IRRIGATION_REACH = 2.5;
/** Channel is dry (and its stone plug back in place) from this drought level. */
export const CANAL_DRY_DROUGHT = 0.35;
/** The winter flood fills the channel from this wet-season level. */
export const CANAL_WET_FLOW = 0.35;
/** Extra bed width beyond the water ribbon (m). */
export const CANAL_BED_EXTRA = 1;
/** Width of each earth berm (m). */
export const CANAL_BANK_WIDTH = 0.6;
/** Margin kept free of props and resources beyond the bank edge (m). */
export const CANAL_PROP_MARGIN = 2.5;

/** Half-width from the trace to the outer edge of the earth berms. */
export function canalEdgeHalfWidth(width: number): number {
  return width / 2 + CANAL_BANK_WIDTH * 1.5;
}

/** Irrigation strength (0..1) at a point, from its distance to the authored channel. */
export function canalIrrigationAt(path: readonly { x: number; z: number }[], x: number, z: number): number {
  return Math.max(0, 1 - distanceToPath(x, z, path) / CANAL_IRRIGATION_REACH);
}
