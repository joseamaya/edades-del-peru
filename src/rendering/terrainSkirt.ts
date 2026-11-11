import { smoothstep } from '../util/math';

/** Radial offsets of the terrain apron, as fractions of its full width. The near rings matter most:
 * the camera sees the first few hundred metres outside the map, not the far horizon. */
export const SKIRT_RINGS = [0.005, 0.015, 0.04, 0.1, 0.22, 0.5, 1] as const;

/** 1 on the sea edge, 0 on the land edges; blends across the north/south coasts. Inland maps have no
 * sea edge, so every side gets the land ridge instead of a trough. */
export function skirtSea(x: number, coastal = true): number {
  return coastal ? 1 - smoothstep(18, 40, x) : 0;
}

/** Deterministic low-frequency relief along the apron. */
export function skirtWave(x: number, z: number): number {
  return Math.sin(x * 0.043 + z * 0.071) * 0.6 + Math.sin(x * 0.11 - z * 0.037 + 1.3) * 0.4;
}

export interface SkirtRing {
  /** Height above the map edge. */
  lift: number;
  /** How far the edge colour has drifted towards the dark horizon haze. */
  blend: number;
}

/**
 * Profile of one apron ring. The land side rises to a low ridge at mid-distance and falls back to the
 * edge height at the horizon; the sea side stays just below the water so the existing sea plane covers
 * it. Unlit: the caller bakes the haze into the vertex colour.
 */
export function skirtRing(t: number, wave: number, sea: number): SkirtRing {
  const ridge = Math.sin(Math.PI * Math.min(1, t * 1.25));
  return {
    lift: (1 - sea) * (2.2 + 1.8 * wave) * ridge - sea * 0.5 * t,
    // The camera only sees the first few dozen metres outside the map, so the apron must darken
    // almost immediately; the far outer ring alone cannot hide a cream plane at 200 m.
    blend: Math.min(1, 1.8 * Math.pow(t, 0.2)),
  };
}
