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
}

const UAL_URL = modelUrls['../assets/models/ual_mannequin.glb'] ?? '';

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
    clips: {
      idle: 'Idle_Loop',
      walk: 'Walk_Loop',
      work: 'Fixing_Kneeling',
      attack: 'Sword_Attack',
    },
  },
};
