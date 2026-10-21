import type { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId = 'ual_mannequin';

/** Asset used by the `?rig=1` visual harness (a pipeline fixture, not final art). */
export const RIG_DEMO_ASSET_ID: ModelAssetId = 'ual_mannequin';

/** Gameplay states mapped to clips; a rig may omit any state except `idle`. */
export type RigClipState = 'idle' | 'walk' | 'work' | 'attack';

export const RIG_CLIP_STATES: readonly RigClipState[] = ['idle', 'walk', 'work', 'attack'];

export interface RigStateInput {
  moving: boolean;
  working: boolean;
  attacking: boolean;
}

/** Priority: locomotion, then work, then combat, else idle. */
export function rigClipStateFor(input: RigStateInput): RigClipState {
  if (input.moving) return 'walk';
  if (input.working) return 'work';
  if (input.attacking) return 'attack';
  return 'idle';
}

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * The migration is progressive: #108 (worker) and later issues opt units in here.
 */
export function unitModelAsset(_kind: UnitKind, _era: Era, _civ: CivId): ModelAssetId | null {
  return null;
}

/** Models that must be ready before a match starts (all participating civs are covered). */
export function modelAssetIdsForMatch(_period: HistoricalPeriod, _civs: readonly CivId[]): ModelAssetId[] {
  return [];
}
