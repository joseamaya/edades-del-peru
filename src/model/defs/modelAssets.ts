import { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId = 'ual_mannequin' | 'quaternius_alpaca';

/** CC0 Quaternius mannequin: pipeline base for the demo and the Caral worker variant. */
export const MANNEQUIN_ASSET_ID: ModelAssetId = 'ual_mannequin';
export const RIG_DEMO_ASSET_ID: ModelAssetId = MANNEQUIN_ASSET_ID;

/** Presentation variants applied on top of a shared rigged asset. */
export type RigVariant = 'caral_worker';

/** Animation states mapped to clips; `eat` is fauna-only. A rig may omit any state except `idle`. */
export type RigClipState = 'idle' | 'walk' | 'work' | 'attack' | 'eat';

export const RIG_CLIP_STATES: readonly RigClipState[] = ['idle', 'walk', 'work', 'attack', 'eat'];

/** Per-variant clip overrides; `null` removes a state (falls back to idle). */
export const RIG_VARIANT_CLIPS: Partial<Record<RigVariant, Partial<Record<RigClipState, string | null>>>> = {
  caral_worker: { attack: null },
};

/** Playback-rate reference for in-place walk clips (world units per second). */
export const WALK_CLIP_REFERENCE_SPEED = 1.4;
export const WALK_CLIP_RATE_MIN = 0.6;
export const WALK_CLIP_RATE_MAX = 1.6;

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

export interface RigModelChoice {
  asset: ModelAssetId;
  variant?: RigVariant;
}

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * The migration is progressive: this pilot covers the Caral worker only.
 */
export function unitModelAsset(kind: UnitKind, era: Era, civ: CivId): RigModelChoice | null {
  if (kind === UnitKind.WORKER && civ === CivId.CARAL && era === Era.FORMATIVE) {
    return { asset: MANNEQUIN_ASSET_ID, variant: 'caral_worker' };
  }
  return null;
}

/** Models that must be ready before a match starts (all participating civs are covered). */
export function modelAssetIdsForMatch(period: HistoricalPeriod, civs: readonly CivId[]): ModelAssetId[] {
  // Period-locked matches: ARCHAIC starts in Era.FORMATIVE, so this preload
  // mirrors `unitModelAsset`'s Caral/Formative rule.
  if (period === HistoricalPeriod.ARCHAIC && civs.includes(CivId.CARAL)) return [MANNEQUIN_ASSET_ID];
  return [];
}
