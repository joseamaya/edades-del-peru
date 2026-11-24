import { CARAL_WORKER_SHADOW_SKIP_MESHES, type ModelAssetId, type RigClipState } from '../model/defs/modelAssets';

/**
 * Local model files bundled by Vite. `?url` keeps them as separate assets
 * (hashed in production) instead of inlining them into the JS chunk. The
 * list is explicit so the 1.9 MB demo mannequin stays out of the production bundle.
 */
import alpacaUrl from '../assets/models/quaternius_alpaca.glb?url';
import caralWorkerUrl from '../assets/models/caral_worker.glb?url';
import tambotocoHeroUrl from '../assets/models/tambotoco_hero.glb?url';
import mountedHorseUrl from '../assets/models/quaternius_horse.glb?url';
import siegeRigUrl from '../assets/models/siege_rig.glb?url';
import vehicleRigUrl from '../assets/models/vehicle_rig.glb?url';

export interface ModelAssetDefinition {
  readonly url: string;
  /** Multiplier applied to the model's metres so it matches the stylised game scale. */
  readonly scale: number;
  /** Extra yaw (radians) for models whose forward axis is not the game's +Z. */
  readonly yawOffset: number;
  /** Gameplay state -> clip name in the GLB. `idle` is required. */
  readonly clips: Partial<Record<RigClipState, string>>;
  /** World units/s the walk/trot clip was authored for; defaults to the shared 1.4. */
  readonly walkReferenceSpeed?: number;
  /** World units/s the run/gallop clip was authored for; defaults to the walk reference. */
  readonly runReferenceSpeed?: number;
  /** Speed at which a rig with a `run` clip gallops; defaults to the shared threshold. */
  readonly runSpeedThreshold?: number;
  /** Optional one-shot clip used by `RigInstance.playDeath`. */
  readonly deathClip?: string;
  /** Optional one-shot hit reaction, played as a presentation overlay. */
  readonly hitClip?: string;
  /** Ground the bind-pose feet at y=0 (units and terrestrial fauna). */
  readonly ground: boolean;
  /** Extra world-space lift after grounding (avoids clip-driven foot penetration). */
  readonly groundClearance?: number;
  /** Merge flat-coloured skinned primitives into one mesh/material (draw-call budget). */
  readonly consolidate?: boolean;
  /** Tiny meshes that skip the shadow pass (they cast no readable shadow). */
  readonly shadowSkipMeshes?: readonly string[];
}

const ALPACA_URL = alpacaUrl;
const CARAL_WORKER_URL = caralWorkerUrl;
const MOUNTED_RIG_URL = mountedHorseUrl;
const SIEGE_RIG_URL = siegeRigUrl;
const VEHICLE_RIG_URL = vehicleRigUrl;

/** Shared clip set and grounding for the mounted, siege and vehicle platform rigs. */
const PLATFORM_RIG: Omit<ModelAssetDefinition, 'url'> = {
  scale: 1,
  yawOffset: Math.PI,
  ground: true,
  groundClearance: 0.02,
  deathClip: 'Death',
  clips: {
    idle: 'Idle_Loop',
    walk: 'Walk_Loop',
    walk_carry: 'Walk_Loop',
    attack: 'Attack',
  },
};

/**
 * The mannequin is the pipeline's validation fixture (Quaternius Universal
 * Animation Library, CC0). It is not imported into the production bundle; the
 * model tests load it from disk and `?rig=1` previews the shipped worker.
 */
export const MODEL_ASSET_DEFS: Record<ModelAssetId, ModelAssetDefinition> = {
  ual_mannequin: {
    url: '',
    scale: 0.78,
    yawOffset: 0,
    ground: true,
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      walk_carry: 'Walk_Loop',
      gather: 'Fixing_Kneeling',
      build: 'Fixing_Kneeling',
      attack: 'Sword_Attack',
    },
    hitClip: 'Hit_Chest',
  },
  /**
   * Caral worker/scout: Quaternius Universal Base Characters body/hair (CC0)
   * with project-authored cotton garments and clips from UAL1/UAL2. The
   * generated GLB is built by `scripts/build_caral_worker.mjs`.
   */
  caral_worker: {
    url: CARAL_WORKER_URL,
    scale: 1,
    yawOffset: 0,
    ground: true,
    groundClearance: 0.01,
    // Stylized jog reference for the UAL clip; scouts and charging infantry run above the shared 3.8
    // threshold, and a 3.0 m/s reference keeps the playback rate near 1.5–1.8 instead of the 2.2 clamp.
    runReferenceSpeed: 3,
    shadowSkipMeshes: CARAL_WORKER_SHADOW_SKIP_MESHES,
    // Farm_Harvest reads as the digging-stick harvest; the asset has no
    // construction clip, so Push_Loop is the explicit pushing/placing
    // abstraction for building. TreeChopping_Loop stays for the Caral tool swing.
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      walk_carry: 'Walk_Carry_Loop',
      run: 'Jog_Fwd_Loop',
      gather: 'Farm_Harvest',
      build: 'Push_Loop',
      attack: 'Punch_Jab',
    },
    deathClip: 'Death01',
    hitClip: 'Hit_Chest',
  },
  /**
   * Tambotoco hero: male-only derivation of the Caral worker with the Killke outfit and the
   * combat/death clips. Built by `scripts/build_caral_worker.mjs --hero`.
   */
  tambotoco_hero: {
    url: tambotocoHeroUrl,
    scale: 1,
    yawOffset: 0,
    ground: true,
    groundClearance: 0.01,
    runReferenceSpeed: 3,
    shadowSkipMeshes: CARAL_WORKER_SHADOW_SKIP_MESHES,
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      walk_carry: 'Walk_Loop',
      run: 'Jog_Fwd_Loop',
      attack: 'Sword_Regular_A',
    },
    deathClip: 'Death01',
    hitClip: 'Hit_Chest',
  },
  /**
   * Cavalry mount: Quaternius' CC0 «Horse» (Ultimate Animated Animal Pack), slimmed by
   * `scripts/build_mounted_horse.mjs`. The rider is the shared infantry body, seated by `dressMounted`.
   * `scale` brings the withers to ~1.6 m against the 1.86 m person (art direction §4.1).
   */
  mounted_rig: {
    url: MOUNTED_RIG_URL,
    scale: 0.46,
    yawOffset: 0,
    ground: true,
    groundClearance: 0.02,
    deathClip: 'Death',
    clips: { idle: 'Idle', walk: 'Walk', walk_carry: 'Walk', run: 'Gallop', attack: 'Attack_Headbutt' },
    // Walk is a working trot and Gallop a full gallop; their cadence follows the unit speed. Heavy cavalry
    // (3.6) trots; hussars and default-scale matches gallop, and an attack/attack_move order charges.
    walkReferenceSpeed: 2.4,
    runReferenceSpeed: 4.2,
    runSpeedThreshold: 3.8,
  },
  /**
   * Project-authored siege crew and vehicles. The source is
   * `art-src/blender/scenes/siege_rig.blend`, built by
   * `scripts/blender/build_siege_rig.py`.
   */
  siege_rig: {
    url: SIEGE_RIG_URL,
    ...PLATFORM_RIG,
  },
  /**
   * Project-authored contemporary vehicles (motorcycle, AA, rocket truck).
   * The source is `art-src/blender/scenes/vehicle_rig.blend`, built by
   * `scripts/blender/build_vehicle_rig.py`.
   */
  vehicle_rig: {
    url: VEHICLE_RIG_URL,
    ...PLATFORM_RIG,
  },
  /**
   * Quaternius Ultimate Animated Animal Pack alpaca (CC0). Used as the
   * Andean camelid stand-in for the llama species; the raw model is ~5.43 m
   * tall, so `scale` normalises it to the game's stylised ~1.6 m.
   */
  quaternius_alpaca: {
    url: ALPACA_URL,
    scale: 0.3,
    yawOffset: 0,
    ground: true,
    groundClearance: 0.02,
    consolidate: true,
    clips: {
      idle: 'Idle',
      walk: 'Walk',
      eat: 'Eating',
    },
  },
};
