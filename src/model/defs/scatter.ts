import { RNG, weightedPick } from '../../util/rng';
import type { AmbientQuery } from './ambientQuery';

/** Terrain sampled at a candidate point (passed to the per-region weight function). */
export interface AmbientSample {
  height: number;
  water: boolean;
  beach: boolean;
  /** 0 flat .. 1 steep. */
  slope: number;
  /** 0 dry .. 1 wet. */
  moisture: number;
}

export interface AmbientPlacement<T> {
  id: T;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

/** Steepest ground an ambient item may sit on. */
const MAX_SLOPE = 0.85;

/**
 * Scatter ambient items over `[0,size]`: sample dry candidate points, pick an id
 * by weight and keep the first `count`. Pure (same seed + region + query →
 * same result). Shared by props and wildlife.
 */
export function scatterAmbient<T>(opts: {
  seed: number;
  size: number;
  count: number;
  /** Max candidate tries per placed item. */
  guard: number;
  scaleRange: [number, number];
  query: AmbientQuery;
  optionsFor: (s: AmbientSample) => Array<[T, number]>;
}): AmbientPlacement<T>[] {
  const { seed, size, count, guard, scaleRange, query, optionsFor } = opts;
  const rng = new RNG(seed);
  const out: AmbientPlacement<T>[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * guard) {
    const x = rng.range(6, size - 6);
    const z = rng.range(6, size - 6);
    const water = query.isWater(x, z);
    if (water) continue;
    const sample: AmbientSample = {
      height: query.getHeight(x, z),
      water,
      beach: query.isBeach(x, z),
      slope: query.getSlope(x, z),
      moisture: query.getMoisture(x, z),
    };
    if (sample.slope > MAX_SLOPE) continue; // never on a cliff face
    const id = weightedPick(rng, optionsFor(sample));
    if (id === null) continue; // no habitat here: try another point
    out.push({ id, x, z, rotY: rng.range(0, Math.PI * 2), scale: rng.range(scaleRange[0], scaleRange[1]) });
  }
  return out;
}
