import { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';
import { genderForId } from './people';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId = 'ual_mannequin' | 'quaternius_alpaca' | 'caral_worker';

/** CC0 Quaternius mannequin: pipeline demo/fallback fixture. */
export const MANNEQUIN_ASSET_ID: ModelAssetId = 'ual_mannequin';
export const RIG_DEMO_ASSET_ID: ModelAssetId = MANNEQUIN_ASSET_ID;
/** Finished Caral worker asset (CC0 body/hair/clips + project-authored cotton cloth). */
export const CARAL_WORKER_ASSET_ID: ModelAssetId = 'caral_worker';
/** Eyes are too small to cast a readable shadow; the garments keep theirs. */
export const CARAL_WORKER_SHADOW_SKIP_MESHES: readonly string[] = ['Eyes_f', 'Eyes_m'];

/** Presentation variants applied on top of a shared rigged asset. */
export type RigVariant =
  | 'caral_worker_f'
  | 'caral_worker_m'
  | 'caral_scout_f'
  | 'caral_scout_m'
  | 'inca_chasqui_f'
  | 'inca_chasqui_m'
  | 'moche_worker_f'
  | 'moche_worker_m'
  | 'moche_scout_f'
  | 'moche_scout_m'
  | 'moche_soldier_f'
  | 'moche_soldier_m'
  | 'moche_ranged_f'
  | 'moche_ranged_m'
  | 'recuay_worker_f'
  | 'recuay_worker_m'
  | 'recuay_scout_f'
  | 'recuay_scout_m'
  | 'recuay_soldier_f'
  | 'recuay_soldier_m'
  | 'recuay_ranged_f'
  | 'recuay_ranged_m'
  | 'chavin_worker_f'
  | 'chavin_worker_m'
  | 'chavin_scout_f'
  | 'chavin_scout_m'
  | 'chavin_soldier_f'
  | 'chavin_soldier_m'
  | 'chavin_ranged_f'
  | 'chavin_ranged_m'
  | 'paracas_worker_f'
  | 'paracas_worker_m'
  | 'paracas_scout_f'
  | 'paracas_scout_m'
  | 'paracas_soldier_f'
  | 'paracas_soldier_m'
  | 'paracas_ranged_f'
  | 'paracas_ranged_m';

/** Animation states mapped to clips; `eat` is fauna-only. A rig may omit any state except `idle`. */
export type RigClipState = 'idle' | 'walk' | 'walk_carry' | 'gather' | 'build' | 'attack' | 'eat';

export const RIG_CLIP_STATES: readonly RigClipState[] = [
  'idle',
  'walk',
  'walk_carry',
  'gather',
  'build',
  'attack',
  'eat',
];

/** Per-variant clip overrides; `null` removes a state (falls back to idle). */
export const RIG_VARIANT_CLIPS: Partial<Record<RigVariant, Partial<Record<RigClipState, string | null>>>> = {
  caral_worker_f: { attack: 'TreeChopping_Loop' },
  caral_worker_m: { attack: 'TreeChopping_Loop' },
  caral_scout_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  caral_scout_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  moche_worker_f: { attack: 'TreeChopping_Loop' },
  moche_worker_m: { attack: 'TreeChopping_Loop' },
  moche_scout_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  moche_scout_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  moche_soldier_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  moche_soldier_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  moche_ranged_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  moche_ranged_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  recuay_worker_f: { attack: 'TreeChopping_Loop' },
  recuay_worker_m: { attack: 'TreeChopping_Loop' },
  recuay_scout_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  recuay_scout_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  recuay_soldier_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  recuay_soldier_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  recuay_ranged_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  recuay_ranged_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  chavin_worker_f: { attack: 'TreeChopping_Loop' },
  chavin_worker_m: { attack: 'TreeChopping_Loop' },
  chavin_scout_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  chavin_scout_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  chavin_soldier_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  chavin_soldier_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  chavin_ranged_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  chavin_ranged_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  paracas_worker_f: { attack: 'TreeChopping_Loop' },
  paracas_worker_m: { attack: 'TreeChopping_Loop' },
  paracas_scout_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  paracas_scout_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  paracas_soldier_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  paracas_soldier_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'TreeChopping_Loop' },
  paracas_ranged_f: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  paracas_ranged_m: { walk: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
};

/** Playback-rate reference for in-place walk clips (world units per second). */
export const WALK_CLIP_REFERENCE_SPEED = 1.4;
export const WALK_CLIP_RATE_MIN = 0.6;
export const WALK_CLIP_RATE_MAX = 1.6;

export interface RigStateInput {
  moving: boolean;
  gathering: boolean;
  building: boolean;
  attacking: boolean;
  carrying: boolean;
}

/**
 * Priority: locomotion, then the worker's actual task, then combat, else idle.
 * Walking with a load uses the carry locomotion clip, never a work gesture.
 */
export function rigClipStateFor(input: RigStateInput): RigClipState {
  if (input.moving) return input.carrying ? 'walk_carry' : 'walk';
  if (input.gathering) return 'gather';
  if (input.building) return 'build';
  if (input.attacking) return 'attack';
  return 'idle';
}

export interface RigModelChoice {
  asset: ModelAssetId;
  variant?: RigVariant;
}

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * The migration is progressive: this pilot covers the Caral worker and scout.
 */
export function unitModelAsset(kind: UnitKind, era: Era, civ: CivId, id = 0): RigModelChoice | null {
  if (civ === CivId.CARAL && era === Era.FORMATIVE) {
    const female = genderForId(id) === 'female';
    if (kind === UnitKind.WORKER) {
      return { asset: CARAL_WORKER_ASSET_ID, variant: female ? 'caral_worker_f' : 'caral_worker_m' };
    }
    if (kind === UnitKind.SCOUT) {
      return { asset: CARAL_WORKER_ASSET_ID, variant: female ? 'caral_scout_f' : 'caral_scout_m' };
    }
  }
  if (civ === CivId.INCA && era === Era.TAHUANTINSUYO && kind === UnitKind.SCOUT) {
    const female = genderForId(id) === 'female';
    return { asset: CARAL_WORKER_ASSET_ID, variant: female ? 'inca_chasqui_f' : 'inca_chasqui_m' };
  }
  const andeanCulture =
    civ === CivId.MOCHE
      ? 'moche'
      : civ === CivId.RECUAY
        ? 'recuay'
        : civ === CivId.CHAVIN
          ? 'chavin'
          : civ === CivId.PARACAS
            ? 'paracas'
            : null;
  if (andeanCulture && era === Era.REGIONAL_STATES) {
    const suffix = genderForId(id) === 'female' ? 'f' : 'm';
    const variant = (role: 'worker' | 'scout' | 'soldier' | 'ranged'): RigVariant =>
      `${andeanCulture}_${role}_${suffix}` as RigVariant;
    if (kind === UnitKind.WORKER) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('worker') };
    if (kind === UnitKind.SCOUT) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('scout') };
    if (kind === UnitKind.SOLDIER) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('soldier') };
    if (kind === UnitKind.MUSKETEER || kind === UnitKind.RIFLEMAN) {
      return { asset: CARAL_WORKER_ASSET_ID, variant: variant('ranged') };
    }
  }
  return null;
}

/** Models that must be ready before a match starts (all participating civs are covered). */
export function modelAssetIdsForMatch(period: HistoricalPeriod, civs: readonly CivId[]): ModelAssetId[] {
  // Period-locked matches: ARCHAIC starts in Era.FORMATIVE and LATE_HORIZON
  // in Era.TAHUANTINSUYO, so this preload mirrors `unitModelAsset`.
  const caral = period === HistoricalPeriod.ARCHAIC && civs.includes(CivId.CARAL);
  const inca = period === HistoricalPeriod.LATE_HORIZON && civs.includes(CivId.INCA);
  const moche =
    period === HistoricalPeriod.EARLY_INTERMEDIATE && civs.some((c) => c === CivId.MOCHE || c === CivId.RECUAY);
  const earlyHorizon =
    period === HistoricalPeriod.EARLY_HORIZON && civs.some((c) => c === CivId.CHAVIN || c === CivId.PARACAS);
  const paracasInEarlyIntermediate = period === HistoricalPeriod.EARLY_INTERMEDIATE && civs.includes(CivId.PARACAS);
  return caral || inca || moche || earlyHorizon || paracasInEarlyIntermediate ? [CARAL_WORKER_ASSET_ID] : [];
}
