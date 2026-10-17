/**
 * Fog-of-war shading shared by the terrain shader (`Terrain.ts`) and the injected
 * layer materials (`FowMaterial.ts`). The zone thresholds live here once and the
 * GLSL is generated from them, so the terrain and the cultural layers cannot
 * drift apart. `Fow` writes 0 (unexplored), ~0.59 (explored) and 1 (visible).
 */
export const FOW_ZONES = {
  exploredLow: 0.3,
  exploredHigh: 0.65,
  visibleLow: 0.72,
  visibleHigh: 0.95,
  /** Dim factor in explored-but-not-visible cells (0 = black). */
  exploredDim: 0.42,
} as const;

/** GLSL `fowDim(value)` — mirrors `fowDimFactor` by construction. */
export const FOW_DIM_GLSL = /* glsl */ `
float fowDim(float value) {
  float explored = smoothstep(${FOW_ZONES.exploredLow}, ${FOW_ZONES.exploredHigh}, value);
  float visible = smoothstep(${FOW_ZONES.visibleLow}, ${FOW_ZONES.visibleHigh}, value);
  return mix(mix(0.0, ${FOW_ZONES.exploredDim}, explored), 1.0, visible);
}`;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Reference implementation of the fog dim factor (unexplored → 0, explored →
 * `exploredDim`, visible → 1). Reads the same `FOW_ZONES` as `FOW_DIM_GLSL`, so the
 * two stay in sync; used by the unit test to validate the three fog zones.
 */
export function fowDimFactor(value: number): number {
  const dim = FOW_ZONES.exploredDim * smoothstep(FOW_ZONES.exploredLow, FOW_ZONES.exploredHigh, value);
  return dim + (1 - dim) * smoothstep(FOW_ZONES.visibleLow, FOW_ZONES.visibleHigh, value);
}
