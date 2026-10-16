import { RNG } from '../../util/rng';
import { landscapeWeight, type CulturalLandscapeProfile, type LandscapeFeature } from './landscape';

/** Terrain queries the planner needs (satisfied by `Terrain`; fake in tests). */
export interface LandscapeQuery {
  size: number;
  isWater(x: number, z: number): boolean;
  isBuildable(x: number, z: number): boolean;
  getSlope(x: number, z: number): number;
  /** Agricultural terracing strength (0..~0.55). */
  getTerrace(x: number, z: number): number;
  /** Canal strength (0..1) carved into the terrain. */
  getCanal(x: number, z: number): number;
}

export interface LandscapePlacement {
  feature: LandscapeFeature;
  x: number;
  z: number;
  yaw: number;
  /** Footprint size in world units. */
  size: number;
}

/** Features the renderer knows how to draw in this phase (single source of truth). */
export const RENDERED_FEATURES = ['plaza', 'field', 'road', 'path', 'canal', 'terrace', 'wall', 'corral'] as const;

/**
 * Deterministic plan of the cultural landscape for a map: where each implemented
 * feature sits. Pure (no THREE) so it is unit-testable headless. The same
 * `seed + profile` always yields the same plan, like the terrain heightfield.
 */
export function planCulturalLandscape(
  profile: CulturalLandscapeProfile,
  seed: number,
  q: LandscapeQuery,
): LandscapePlacement[] {
  const rng = new RNG((seed * 2246822519 + 101) >>> 0);
  const out: LandscapePlacement[] = [];
  const center = q.size / 2;
  // how far features spread from the hub, per settlement shape (all four differ)
  const spread =
    profile.settlementShape === 'dispersed'
      ? 1.3
      : profile.settlementShape === 'grid'
        ? 0.8
        : profile.settlementShape === 'hilltop'
          ? 0.85
          : 1;

  const plaza = landscapeWeight(profile, 'plaza');
  let hub = { x: center, z: center };
  if (plaza > 0) {
    const spot = findFlatSpot(q, rng, center, 0.1, 0.42);
    if (spot) {
      hub = spot;
      out.push({ feature: 'plaza', x: spot.x, z: spot.z, yaw: 0, size: 4 + plaza * 4 });
    }
  }

  const field = landscapeWeight(profile, 'field');
  if (field > 0) {
    const count = Math.round(2 + field * 5);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(6, (16 + field * 10) * spread);
      const x = hub.x + Math.cos(a) * r;
      const z = hub.z + Math.sin(a) * r;
      if (!q.isBuildable(x, z) || q.isWater(x, z) || q.getSlope(x, z) > 0.3) continue;
      out.push({ feature: 'field', x, z, yaw: rng.range(0, Math.PI * 2), size: 2.5 + field * 2 });
    }
  }

  const road = landscapeWeight(profile, 'road');
  if (road > 0) pushSpokes(out, q, rng, hub, spread, 'road', 2 + Math.round(road * 2), 0.25, 0.42, 4, 2);

  const path = landscapeWeight(profile, 'path');
  if (path > 0) pushSpokes(out, q, rng, hub, spread, 'path', 1 + Math.round(path * 2), 0.15, 0.3, 3, 1.4);

  const wall = landscapeWeight(profile, 'wall');
  if (wall > 0) {
    for (let i = 0; i < Math.round(2 + wall * 4); i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(5, 12) * spread;
      const x = hub.x + Math.cos(a) * r;
      const z = hub.z + Math.sin(a) * r;
      if (!q.isBuildable(x, z) || q.isWater(x, z) || q.getSlope(x, z) > 0.35) continue;
      out.push({ feature: 'wall', x, z, yaw: a, size: 3 });
    }
  }

  const corral = landscapeWeight(profile, 'corral');
  if (corral > 0) {
    for (let i = 0; i < Math.max(1, Math.round(corral * 3)); i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(6, 14) * spread;
      const x = hub.x + Math.cos(a) * r;
      const z = hub.z + Math.sin(a) * r;
      if (!q.isBuildable(x, z) || q.isWater(x, z) || q.getSlope(x, z) > 0.4) continue;
      out.push({ feature: 'corral', x, z, yaw: 0, size: 4 + corral * 2 });
    }
  }

  if (landscapeWeight(profile, 'terrace') > 0) {
    for (let z = 3; z < q.size - 3; z += 3) {
      for (let x = 3; x < q.size - 3; x += 3) {
        if (q.getTerrace(x, z) <= 0.3) continue;
        if (q.isWater(x, z) || !q.isBuildable(x, z) || q.getSlope(x, z) > 0.5) continue;
        out.push({ feature: 'terrace', x, z, yaw: 0, size: 2.4 });
      }
    }
  }

  if (landscapeWeight(profile, 'canal') > 0) {
    for (let z = 3; z < q.size - 3; z += 2) {
      for (let x = 3; x < q.size - 3; x += 2) {
        if (q.getCanal(x, z) > 0) out.push({ feature: 'canal', x, z, yaw: 0, size: 3 });
      }
    }
  }

  return out;
}

/** Push a road/path as `spokes` radial lines of tiles from the hub. */
function pushSpokes(
  out: LandscapePlacement[],
  q: LandscapeQuery,
  rng: RNG,
  hub: { x: number; z: number },
  spread: number,
  feature: LandscapeFeature,
  spokes: number,
  minLen: number,
  maxLen: number,
  stepLen: number,
  size: number,
): void {
  for (let s = 0; s < spokes; s++) {
    const a = (s / spokes) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const len = rng.range(minLen, maxLen) * q.size * spread;
    const steps = Math.max(3, Math.round(len / stepLen));
    for (let i = 1; i <= steps; i++) {
      const x = hub.x + Math.cos(a) * (len * (i / steps));
      const z = hub.z + Math.sin(a) * (len * (i / steps));
      if (!q.isBuildable(x, z) || q.isWater(x, z)) continue;
      out.push({ feature, x, z, yaw: a, size });
    }
  }
}

/** A flat, buildable spot in a ring around `center`, with a deterministic grid fallback. */
function findFlatSpot(
  q: LandscapeQuery,
  rng: RNG,
  center: number,
  rMin: number,
  rMax: number,
): { x: number; z: number } | null {
  for (let i = 0; i < 60; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(rMin, rMax) * q.size;
    const x = center + Math.cos(a) * r;
    const z = center + Math.sin(a) * r;
    if (q.isWater(x, z) || !q.isBuildable(x, z) || q.getSlope(x, z) > 0.25) continue;
    return { x, z };
  }
  // the random ring can be all water (coastal maps): fall back to a fixed scan
  const step = Math.max(4, q.size / 12);
  for (let z = step; z < q.size - step; z += step) {
    for (let x = step; x < q.size - step; x += step) {
      if (!q.isWater(x, z) && q.isBuildable(x, z) && q.getSlope(x, z) <= 0.25) return { x, z };
    }
  }
  return null;
}
