import type { ModelAssetId, RigClipState } from '../model/defs/modelAssets';

/**
 * Local model files bundled by Vite. `?url` keeps them as separate assets
 * (hashed in production) instead of inlining them into the JS chunk.
 */
const modelUrls = import.meta.glob('../assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface ModelAssetDefinition {
  readonly url: string;
  /** Multiplier applied to the model's metres so it matches the stylised game scale. */
  readonly scale: number;
  /** Extra yaw (radians) for models whose forward axis is not the game's +Z. */
  readonly yawOffset: number;
  /** Gameplay state -> clip name in the GLB. `idle` is required. */
  readonly clips: Partial<Record<RigClipState, string>>;
  /** Ground the bind-pose feet at y=0 (units and terrestrial fauna). */
  readonly ground: boolean;
  /** Extra world-space lift after grounding (avoids clip-driven foot penetration). */
  readonly groundClearance?: number;
  /** Merge flat-coloured skinned primitives into one mesh/material (draw-call budget). */
  readonly consolidate?: boolean;
  /** Tiny or body-conforming meshes that skip the VSM shadow pass. */
  readonly shadowSkipMeshes?: readonly string[];
}

const UAL_URL = modelUrls['../assets/models/ual_mannequin.glb'] ?? '';
const ALPACA_URL = modelUrls['../assets/models/quaternius_alpaca.glb'] ?? '';
const CARAL_WORKER_URL = modelUrls['../assets/models/caral_worker.glb'] ?? '';

/**
 * The mannequin is the pipeline's validation asset (Quaternius Universal
 * Animation Library, CC0). The base mesh is still a generic placeholder; a later
 * iteration replaces it with a bespoke historical mesh.
 */
export const MODEL_ASSET_DEFS: Record<ModelAssetId, ModelAssetDefinition> = {
  ual_mannequin: {
    url: UAL_URL,
    scale: 0.78,
    yawOffset: 0,
    ground: true,
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      work: 'Fixing_Kneeling',
      attack: 'Sword_Attack',
    },
  },
  /**
   * Caral worker: Quaternius Universal Base Characters body/hair (CC0) with a
   * project-authored cotton tunic/skirt/sash and clips from UAL1/UAL2. The
   * generated GLB is built by `scripts/build_caral_worker.mjs`.
   */
  caral_worker: {
    url: CARAL_WORKER_URL,
    scale: 1,
    yawOffset: 0,
    ground: true,
    groundClearance: 0.01,
    // Facial micro-meshes and the thin skirt/sash barely change the silhouette;
    // dropping them from the VSM shadow pass keeps the worker inside its budget.
    shadowSkipMeshes: ['Eyes', 'Eyebrows', 'attire_skirt', 'attire_sash'],
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      work: 'Farm_Harvest',
    },
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
