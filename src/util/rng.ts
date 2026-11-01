/** Seeded, reproducible random utilities. */

/** One mulberry32 step: returns the next state and value. */
function mulberry32Step(state: number): { state: number; value: number } {
  let a = state | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { state: a, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function () {
    const r = mulberry32Step(state);
    state = r.state;
    return r.value;
  };
}

export class RNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** [0,1) */
  float(): number {
    const r = mulberry32Step(this.state);
    this.state = r.state;
    return r.value;
  }
  /** Current internal state, for save/load. */
  getState(): number {
    return this.state >>> 0;
  }
  setState(state: number): void {
    this.state = state >>> 0;
  }
  /** [min,max) */
  range(min: number, max: number): number {
    return min + this.float() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  /** true with probability p */
  chance(p: number): boolean {
    return this.float() < p;
  }
  /** random element */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.float() * arr.length)];
  }
  /** -1 or 1 */
  sign(): number {
    return this.float() < 0.5 ? -1 : 1;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export function hashCode(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic weighted pick over `[value, weight]` entries (weights >= 0). */
export function weightedPick<T>(rng: RNG, entries: ReadonlyArray<[T, number]>): T | null {
  let total = 0;
  for (const [, w] of entries) total += Math.max(0, w);
  if (total <= 0) return null;
  let r = rng.range(0, total);
  for (const [value, w] of entries) {
    r -= Math.max(0, w);
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/**
 * Visual-only randomness (smoke, sway, muzzle light). Kept out of the seeded
 * simulation stream so cosmetics can never desync a replay.
 */
export const cosmeticRandom = (): number => Math.random();
