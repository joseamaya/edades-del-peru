import { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';
import { getPeriod } from './periods';
import { genderForId } from './people';
import {
  ANDEAN_CULTURES,
  ANDEAN_ROLES,
  andeanCultureForEra,
  type AndeanRole,
  type AndeanRigVariant,
} from './andeanCharacters';

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
  | AndeanRigVariant;

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

/** Role-based clip overrides shared by every Andean culture; `null` removes a state. */
const ANDEAN_NON_WORKER_CLIPS: Partial<Record<RigClipState, string | null>> = {
  walk: 'Walk_Loop',
  gather: null,
  build: null,
  attack: 'Punch_Jab',
};

const ANDEAN_CLIP_OVERRIDES: Record<AndeanRole, Partial<Record<RigClipState, string | null>>> = {
  worker: { attack: 'TreeChopping_Loop' },
  scout: ANDEAN_NON_WORKER_CLIPS,
  soldier: { ...ANDEAN_NON_WORKER_CLIPS, attack: 'TreeChopping_Loop' },
  ranged: ANDEAN_NON_WORKER_CLIPS,
};

const ANDEAN_VARIANT_CLIPS = Object.fromEntries(
  ANDEAN_CULTURES.flatMap((culture) =>
    (['f', 'm'] as const).flatMap((gender) =>
      ANDEAN_ROLES.map((role) => [`${culture}_${role}_${gender}`, ANDEAN_CLIP_OVERRIDES[role]] as const),
    ),
  ),
) as Partial<Record<AndeanRigVariant, Partial<Record<RigClipState, string | null>>>>;

/** Per-variant clip overrides; `null` removes a state (falls back to idle). */
export const RIG_VARIANT_CLIPS: Partial<Record<RigVariant, Partial<Record<RigClipState, string | null>>>> = {
  caral_worker_f: { attack: 'TreeChopping_Loop' },
  caral_worker_m: { attack: 'TreeChopping_Loop' },
  caral_scout_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  caral_scout_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  ...ANDEAN_VARIANT_CLIPS,
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
 * The migration is progressive: Caral worker/scout, the Inca chasqui and the
 * pre-Hispanic Andean infantry share the same rig.
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
  const andeanCulture = andeanCultureForEra(civ, era);
  if (andeanCulture) {
    const suffix = genderForId(id) === 'female' ? 'f' : 'm';
    const variant = (role: AndeanRole): RigVariant => `${andeanCulture}_${role}_${suffix}` as RigVariant;
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
  const era = getPeriod(period).level;
  const kinds = [UnitKind.WORKER, UnitKind.SCOUT, UnitKind.SOLDIER, UnitKind.MUSKETEER];
  const rigged = civs.some((civ) => kinds.some((kind) => unitModelAsset(kind, era, civ) !== null));
  return rigged ? [CARAL_WORKER_ASSET_ID] : [];
}
