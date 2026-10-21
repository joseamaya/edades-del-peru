import type { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId = 'ual_mannequin';

/** Gameplay states mapped to clips; a rig may omit any state except `idle`. */
export type RigClipState = 'idle' | 'walk' | 'work' | 'attack' | 'death';

export const RIG_CLIP_STATES: readonly RigClipState[] = ['idle', 'walk', 'work', 'attack', 'death'];

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * The migration is progressive: #108 (worker) and later issues opt units in here.
 */
export function unitModelAsset(_kind: UnitKind, _era: Era, _civ: CivId): ModelAssetId | null {
  return null;
}

/** Models that must be ready before a match starts (loaded during boot). */
export function modelAssetIdsForMatch(_period: HistoricalPeriod, _civ: CivId): ModelAssetId[] {
  return [];
}
