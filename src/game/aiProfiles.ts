import type { Era } from '../core/types';

/** The four difficulty levels, matching `GameSettings['difficulty']`. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'legendary';

/**
 * Strategic shape of an AI opponent. `DIFFICULTY_MULT` (Config) still tunes the
 * decision cadence (`reaction`), macro size (`econ`) and attack frequency
 * (`aggression`); this profile decides *what the AI tries to do*, so higher
 * difficulties play differently (bigger economy, more tech, coordinated waves,
 * raids) — never with a hidden resource or production bonus.
 */
export interface AIProfile {
  /** Worker target at era 0 and growth per era, capped, before the econ multiplier. */
  workerBase: number;
  workerPerEra: number;
  workerCap: number;
  /**
   * Military target size: base plus growth per era. Also the army the AI wants
   * before it invests in non-essential buildings, so a bigger target turns the
   * economy into military strength instead of building sprawl.
   */
  armyBase: number;
  armyPerEra: number;
  /** Soldiers required before launching an attack: base plus growth per era. */
  attackThresholdBase: number;
  attackThresholdPerEra: number;
  /** Buildings the AI is willing to have under construction at once. */
  maxConcurrentBuilds: number;
  /** Keep at least this much of each resource in reserve when researching. */
  techReserve: number;
  /** Retreat below this HP ratio (lower = braver). */
  retreatHp: number;
  /** Raid enemy workers with idle soldiers, not only buildings. */
  raidEconomy: boolean;
  /** Build advanced military buildings (arsenal, stable) beyond the barracks. */
  advancedMilitary: boolean;
}

export const AI_PROFILES: Record<Difficulty, AIProfile> = {
  easy: {
    workerBase: 6,
    workerPerEra: 1.5,
    workerCap: 12,
    armyBase: 4,
    armyPerEra: 3,
    attackThresholdBase: 7,
    attackThresholdPerEra: 3,
    maxConcurrentBuilds: 1,
    techReserve: 200,
    retreatHp: 0.5,
    raidEconomy: false,
    advancedMilitary: false,
  },
  normal: {
    workerBase: 8,
    workerPerEra: 2,
    workerCap: 16,
    armyBase: 6,
    armyPerEra: 5,
    attackThresholdBase: 4,
    attackThresholdPerEra: 2,
    maxConcurrentBuilds: 1,
    techReserve: 0,
    retreatHp: 0.35,
    raidEconomy: false,
    advancedMilitary: true,
  },
  hard: {
    workerBase: 9,
    workerPerEra: 2.2,
    workerCap: 18,
    armyBase: 8,
    armyPerEra: 6,
    attackThresholdBase: 4,
    attackThresholdPerEra: 2,
    maxConcurrentBuilds: 2,
    techReserve: 40,
    retreatHp: 0.3,
    raidEconomy: true,
    advancedMilitary: true,
  },
  legendary: {
    workerBase: 10,
    workerPerEra: 2.5,
    workerCap: 20,
    armyBase: 10,
    armyPerEra: 7,
    attackThresholdBase: 4,
    attackThresholdPerEra: 2,
    maxConcurrentBuilds: 2,
    techReserve: 0,
    retreatHp: 0.3,
    raidEconomy: true,
    advancedMilitary: true,
  },
};

/** The profile for a difficulty (falls back to `normal`). */
export function profileFor(difficulty: Difficulty | undefined): AIProfile {
  return AI_PROFILES[difficulty ?? 'normal'] ?? AI_PROFILES.normal;
}

/** Desired worker count for the era. */
export function workerTarget(profile: AIProfile, era: Era): number {
  return Math.max(4, Math.round(Math.min(profile.workerBase + era * profile.workerPerEra, profile.workerCap)));
}

/** Desired standing army size for the era. */
export function armyTarget(profile: AIProfile, era: Era): number {
  return profile.armyBase + era * profile.armyPerEra;
}

/** Soldiers required before committing to an attack in the era. */
export function attackThreshold(profile: AIProfile, era: Era): number {
  return profile.attackThresholdBase + era * profile.attackThresholdPerEra;
}
