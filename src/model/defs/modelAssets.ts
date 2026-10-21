import { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId = 'ual_mannequin';

/** CC0 Quaternius mannequin: pipeline base for the demo and the Caral worker variant. */
export const MANNEQUIN_ASSET_ID: ModelAssetId = 'ual_mannequin';
export const RIG_DEMO_ASSET_ID: ModelAssetId = MANNEQUIN_ASSET_ID;

/** Presentation variants applied on top of a shared rigged asset. */
export type RigVariant = 'caral_worker';

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

export interface UnitModelChoice {
  asset: ModelAssetId;
  variant?: RigVariant;
}

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * The migration is progressive: this pilot covers the Caral worker only.
 */
export function unitModelAsset(kind: UnitKind, era: Era, civ: CivId): UnitModelChoice | null {
  if (kind === UnitKind.WORKER && civ === CivId.CARAL && era <= Era.FORMATIVE) {
    return { asset: MANNEQUIN_ASSET_ID, variant: 'caral_worker' };
  }
  return null;
}

/** Models that must be ready before a match starts (all participating civs are covered). */
export function modelAssetIdsForMatch(period: HistoricalPeriod, civs: readonly CivId[]): ModelAssetId[] {
  if (period === HistoricalPeriod.ARCHAIC && civs.includes(CivId.CARAL)) return [MANNEQUIN_ASSET_ID];
  return [];
}
