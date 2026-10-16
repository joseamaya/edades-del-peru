/**
 * Farm yield from the terrain under it — a gameplay abstraction of how Andean
 * agriculture adapted to the ground (terraces, fertile valleys, irrigation).
 * Deterministic and pure, so it is replay/save safe and unit-testable headless.
 */
export interface FarmTerrain {
  /** Terracing strength under the farm (0 none .. ~0.55 shelf). */
  terrace: number;
  /** Soil moisture (0 dry .. 1 humid). */
  moisture: number;
  /** Irrigation canal strength near the farm (0 none .. 1). */
  canal: number;
}

const TERRACE_BONUS = 0.8;
const MOISTURE_BONUS = 0.4;
const CANAL_BONUS = 0.6;

/** Multiplier applied to a farm's food reserve (>= 1). */
export function farmYieldMultiplier(t: FarmTerrain): number {
  const bonus =
    TERRACE_BONUS * clamp01(t.terrace) + MOISTURE_BONUS * clamp01(t.moisture) + CANAL_BONUS * clamp01(t.canal);
  return 1 + bonus;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
