import { CivId, Era, HistoricalPeriod, UnitKind } from '../../core/types';
import { getCiv } from './civs';
import { getPeriod } from './periods';
import { genderForId } from './people';
import { unitBaseKind } from './units';
import {
  ANDEAN_CULTURES,
  ANDEAN_ROLES,
  andeanCultureForEra,
  type AndeanRole,
  type AndeanRigVariant,
} from './andeanCharacters';
import {
  POST_COLONIAL_CULTURES,
  POST_COLONIAL_ROLES,
  postColonialCultureForCiv,
  type PostColonialRigVariant,
  type PostColonialRole,
} from './postColonialCharacters';
import { MOUNTED_VARIANTS, mountedVariantForCiv, type MountedRigVariant } from './mountedCharacters';
import type { RebeldeRigVariant } from './rebeldeCharacters';
import { VEHICLE_VARIANTS, vehicleVariantFor, type VehicleRigVariant } from './vehicleCharacters';
import {
  MODERN_CULTURES,
  MODERN_ROLES,
  modernCultureForCiv,
  type ModernRigVariant,
  type ModernRole,
} from './modernCharacters';
import { SIEGE_VARIANTS, siegeVariantFor, type SiegeRigVariant } from './siegeCharacters';

/** Registered rigged models. Add the id here and to the rendering registry. */
export type ModelAssetId =
  'ual_mannequin' | 'quaternius_alpaca' | 'caral_worker' | 'mounted_rig' | 'siege_rig' | 'vehicle_rig';

/** CC0 Quaternius mannequin: pipeline demo/fallback fixture. */
export const MANNEQUIN_ASSET_ID: ModelAssetId = 'ual_mannequin';
export const RIG_DEMO_ASSET_ID: ModelAssetId = MANNEQUIN_ASSET_ID;
/** Finished Caral worker asset (CC0 body/hair/clips + project-authored cotton cloth). */
export const CARAL_WORKER_ASSET_ID: ModelAssetId = 'caral_worker';
export const MOUNTED_RIG_ASSET_ID: ModelAssetId = 'mounted_rig';
export const SIEGE_RIG_ASSET_ID: ModelAssetId = 'siege_rig';
export const VEHICLE_RIG_ASSET_ID: ModelAssetId = 'vehicle_rig';
/**
 * Eyes are too small to cast a readable shadow; the garments keep theirs. (Eyebrows keep the flags of
 * the hair so they merge into its draw call, see consolidateRig.)
 */
export const CARAL_WORKER_SHADOW_SKIP_MESHES: readonly string[] = ['Eyes_f', 'Eyes_m'];

/** Presentation variants applied on top of a shared rigged asset. */
export type RigVariant =
  | 'caral_worker_f'
  | 'caral_worker_m'
  | 'caral_scout_f'
  | 'caral_scout_m'
  | 'inca_chasqui_f'
  | 'inca_chasqui_m'
  | AndeanRigVariant
  | PostColonialRigVariant
  | RebeldeRigVariant
  | ModernRigVariant
  | MountedRigVariant
  | SiegeRigVariant
  | VehicleRigVariant;

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
  amauta: { ...ANDEAN_NON_WORKER_CLIPS, attack: null },
};

const FIELD_ROLE_CLIPS = {
  soldier: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  ranged: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  missionary: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: null },
  worker: {
    walk: 'Walk_Loop',
    walk_carry: 'Walk_Carry_Loop',
    gather: 'Farm_Harvest',
    build: 'Push_Loop',
    attack: 'Punch_Jab',
  },
  scout: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
} satisfies Record<PostColonialRole, Partial<Record<RigClipState, string | null>>>;

const POST_COLONIAL_ROLE_CLIPS: Record<
  PostColonialRole,
  Partial<Record<RigClipState, string | null>>
> = FIELD_ROLE_CLIPS;

const POST_COLONIAL_VARIANT_CLIPS = variantClips(
  POST_COLONIAL_CULTURES,
  POST_COLONIAL_ROLES,
  (role) => POST_COLONIAL_ROLE_CLIPS[role],
) as Partial<Record<PostColonialRigVariant, Partial<Record<RigClipState, string | null>>>>;

const REBELDE_VARIANT_CLIPS = variantClips(
  ['rebelde'],
  POST_COLONIAL_ROLES,
  (role) => FIELD_ROLE_CLIPS[role],
) as Partial<Record<RebeldeRigVariant, Partial<Record<RigClipState, string | null>>>>;

const MODERN_ROLE_CLIPS: Record<ModernRole, Partial<Record<RigClipState, string | null>>> = {
  ...FIELD_ROLE_CLIPS,
  sniper: FIELD_ROLE_CLIPS.ranged,
};

const MODERN_VARIANT_CLIPS = variantClips(MODERN_CULTURES, MODERN_ROLES, (role) => MODERN_ROLE_CLIPS[role]) as Partial<
  Record<ModernRigVariant, Partial<Record<RigClipState, string | null>>>
>;

/** Shared clip set for the mounted, siege and vehicle platform rigs. */
const PLATFORM_CLIPS: Partial<Record<RigClipState, string | null>> = {
  walk: 'Walk_Loop',
  walk_carry: 'Walk_Loop',
  gather: null,
  build: null,
  attack: 'Attack',
};

const MOUNTED_VARIANT_CLIPS = Object.fromEntries(
  MOUNTED_VARIANTS.map((variant) => [variant, PLATFORM_CLIPS] as const),
) as Partial<Record<MountedRigVariant, Partial<Record<RigClipState, string | null>>>>;

const SIEGE_VARIANT_CLIPS = Object.fromEntries(
  SIEGE_VARIANTS.map((variant) => [variant, PLATFORM_CLIPS] as const),
) as Partial<Record<SiegeRigVariant, Partial<Record<RigClipState, string | null>>>>;

const VEHICLE_VARIANT_CLIPS = Object.fromEntries(
  VEHICLE_VARIANTS.map((variant) => [variant, PLATFORM_CLIPS] as const),
) as Partial<Record<VehicleRigVariant, Partial<Record<RigClipState, string | null>>>>;

function variantClips<R extends string>(
  cultures: readonly string[],
  roles: readonly R[],
  clipsFor: (role: R) => Partial<Record<RigClipState, string | null>>,
): Record<string, Partial<Record<RigClipState, string | null>>> {
  return Object.fromEntries(
    cultures.flatMap((culture) =>
      (['f', 'm'] as const).flatMap((gender) =>
        roles.map((role) => [`${culture}_${role}_${gender}`, clipsFor(role)] as const),
      ),
    ),
  );
}

const ANDEAN_VARIANT_CLIPS = variantClips(
  ANDEAN_CULTURES,
  ANDEAN_ROLES,
  (role) => ANDEAN_CLIP_OVERRIDES[role],
) as Partial<Record<AndeanRigVariant, Partial<Record<RigClipState, string | null>>>>;

/** Per-variant clip overrides; `null` removes a state (falls back to idle). */
export const RIG_VARIANT_CLIPS: Partial<Record<RigVariant, Partial<Record<RigClipState, string | null>>>> = {
  ...ANDEAN_VARIANT_CLIPS,
  ...POST_COLONIAL_VARIANT_CLIPS,
  ...REBELDE_VARIANT_CLIPS,
  ...MODERN_VARIANT_CLIPS,
  ...MOUNTED_VARIANT_CLIPS,
  ...SIEGE_VARIANT_CLIPS,
  ...VEHICLE_VARIANT_CLIPS,
  caral_worker_f: { attack: 'TreeChopping_Loop' },
  caral_worker_m: { attack: 'TreeChopping_Loop' },
  caral_scout_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  caral_scout_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_f: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
  inca_chasqui_m: { walk: 'Walk_Loop', walk_carry: 'Walk_Loop', gather: null, build: null, attack: 'Punch_Jab' },
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

/** Field role shared by the documented post-1532 cultures and the m7 rebels. */
function postColonialFieldRole(kind: UnitKind): PostColonialRole | null {
  if (kind === UnitKind.SOLDIER) return 'soldier';
  if (
    kind === UnitKind.MUSKETEER ||
    kind === UnitKind.RIFLEMAN ||
    kind === UnitKind.SNIPER ||
    kind === UnitKind.ANTI_AIR
  ) {
    return 'ranged';
  }
  if (kind === UnitKind.MISSIONARY) return 'missionary';
  if (kind === UnitKind.WORKER) return 'worker';
  if (kind === UnitKind.SCOUT) return 'scout';
  return null;
}

/**
 * Rigged model for a unit kind, or `null` to keep the procedural model.
 * Every pre-Hispanic Andean culture, the post-1532 humanoids, the m7 Inca rebels,
 * the contemporary Republic humanoids and the Inca Amauta use the shared humanoid
 * rig; contemporary Republic vehicles use the dedicated vehicle rig.
 */
export function unitModelAsset(kind: UnitKind, era: Era, civ: CivId, id = 0): RigModelChoice | null {
  const baseKind = unitBaseKind(kind);
  if (baseKind !== kind) return unitModelAsset(baseKind, era, civ, id);
  // The Killke señorío and the valley ayllus share the Inca/Chanca kits until they get their own.
  if (civ === CivId.INCA_KILLKE) return unitModelAsset(kind, era, CivId.INCA, id);
  if (civ === CivId.AYLLUS) return unitModelAsset(kind, era, CivId.CHANCA, id);
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
  if (kind === UnitKind.CARAVAN) {
    return { asset: 'quaternius_alpaca' };
  }
  if ((kind === UnitKind.HUSSAR || kind === UnitKind.CAVALRY) && (era === Era.VICEROYALTY || era === Era.REPUBLIC)) {
    const variant = mountedVariantForCiv(civ);
    if (variant) return { asset: MOUNTED_RIG_ASSET_ID, variant };
  }
  const siegeVariant = siegeVariantFor(kind, era, civ);
  if (siegeVariant) return { asset: SIEGE_RIG_ASSET_ID, variant: siegeVariant };
  const vehicleVariant = vehicleVariantFor(kind, era, civ);
  if (vehicleVariant) return { asset: VEHICLE_RIG_ASSET_ID, variant: vehicleVariant };
  if (civ === CivId.INCA && era === Era.VICEROYALTY) {
    // INCA has no Viceroyalty period; this is the m7 campaign override (1780).
    const role = postColonialFieldRole(kind);
    if (role) {
      const suffix = genderForId(id) === 'female' ? 'f' : 'm';
      return { asset: CARAL_WORKER_ASSET_ID, variant: `rebelde_${role}_${suffix}` as RebeldeRigVariant };
    }
  }
  const modernCulture = modernCultureForCiv(civ);
  if (modernCulture && era === Era.CONTEMPORARY) {
    const role: ModernRole | null =
      kind === UnitKind.SOLDIER
        ? 'soldier'
        : kind === UnitKind.SNIPER
          ? 'sniper'
          : kind === UnitKind.MUSKETEER || kind === UnitKind.RIFLEMAN
            ? 'ranged'
            : kind === UnitKind.MISSIONARY
              ? 'missionary'
              : kind === UnitKind.WORKER
                ? 'worker'
                : kind === UnitKind.SCOUT
                  ? 'scout'
                  : null;
    if (role) {
      const suffix = genderForId(id) === 'female' ? 'f' : 'm';
      return { asset: CARAL_WORKER_ASSET_ID, variant: `${modernCulture}_${role}_${suffix}` };
    }
  }
  const postColonial = postColonialCultureForCiv(civ);
  const postColonialEra =
    postColonial === 'realistas' ? era === Era.VICEROYALTY || era === Era.REPUBLIC : era === Era.REPUBLIC;
  if (postColonial && postColonialEra) {
    const role = postColonialFieldRole(kind);
    if (role) {
      const suffix = genderForId(id) === 'female' ? 'f' : 'm';
      return { asset: CARAL_WORKER_ASSET_ID, variant: `${postColonial}_${role}_${suffix}` };
    }
  }
  if (andeanCulture) {
    const suffix = genderForId(id) === 'female' ? 'f' : 'm';
    const variant = (role: AndeanRole): RigVariant => `${andeanCulture}_${role}_${suffix}` as RigVariant;
    if (kind === UnitKind.WORKER) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('worker') };
    if (kind === UnitKind.SCOUT) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('scout') };
    if (kind === UnitKind.SOLDIER) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('soldier') };
    if (kind === UnitKind.MUSKETEER || kind === UnitKind.RIFLEMAN) {
      return { asset: CARAL_WORKER_ASSET_ID, variant: variant('ranged') };
    }
    if (kind === UnitKind.COMMISSAR) return { asset: CARAL_WORKER_ASSET_ID, variant: variant('amauta') };
  }
  return null;
}

/** Models that must be ready before a match starts (all participating civs are covered). */
export function modelAssetIdsForMatch(period: HistoricalPeriod, civs: readonly CivId[]): ModelAssetId[] {
  const era = getPeriod(period).level;
  const kinds = Object.values(UnitKind);
  const ids = new Set<ModelAssetId>();
  for (const civ of civs) {
    // Campaign player civs may use a period outside their CivDef (m7 uses INCA in the Viceroyalty).
    if (civ !== CivId.INCA && !getCiv(civ).periods.includes(period)) continue;
    for (const kind of kinds) {
      const choice = unitModelAsset(kind, era, civ);
      if (choice) ids.add(choice.asset);
    }
  }
  ids.add('quaternius_alpaca');
  return [...ids];
}
