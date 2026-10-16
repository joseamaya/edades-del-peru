/**
 * Farm yield from the terrain under it — a gameplay abstraction of how Andean
 * agriculture adapted to the ground (terraces, fertile valleys, irrigation).
 * Deterministic and pure, so it is replay/save safe and unit-testable headless.
 * Source of the abstraction: `docs/historia/mapas.md` (andenes, acequias).
 */
export interface FarmYieldFactors {
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
/** How far a canal waters a farm (world units). */
export const CANAL_REACH = 2.5;

/** Multiplier applied to a farm's food reserve (>= 1). Max ~2.44 on real terrain. */
export function farmYieldMultiplier(t: FarmYieldFactors): number {
  const bonus =
    TERRACE_BONUS * clamp01(t.terrace) + MOISTURE_BONUS * clamp01(t.moisture) + CANAL_BONUS * clamp01(t.canal);
  return 1 + bonus;
}

/** Strongest canal within reach of a point (8 directions, so a diagonal canal still counts). */
export function nearbyCanal(getCanal: (x: number, z: number) => number, x: number, z: number): number {
  let best = getCanal(x, z);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    best = Math.max(best, getCanal(x + Math.cos(a) * CANAL_REACH, z + Math.sin(a) * CANAL_REACH));
  }
  return best;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
