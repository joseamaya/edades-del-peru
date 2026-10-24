import type { CivId, Era, HistoricalPeriod } from '../core/types';
import type { GeographicRegion } from '../model/defs/profiles';

/** Purpose of a generated historical artwork. */
export type ImageType =
  | 'campaign-intro'
  | 'campaign-scene'
  | 'educational'
  | 'architecture'
  | 'daily-life'
  | 'technology'
  | 'agriculture'
  | 'religion'
  | 'map'
  | 'environment'
  | 'character-reference'
  | 'tour-concept'
  | 'reconstruction';

/** How the image relates to the historical record. */
export type ArtNature = 'reconstruction' | 'abstraction' | 'concept-art' | 'reference';

/** What the image is attached to. */
export type ArtScope = 'campaign' | 'mission' | 'civilization';

/** Visual focus of the scene. */
export type SceneType =
  | 'urban_ceremonial'
  | 'architecture'
  | 'daily_life'
  | 'agriculture'
  | 'craft'
  | 'ritual'
  | 'landscape'
  | 'panorama'
  | 'portrait_reference'
  | 'campaign_scene'
  | 'map';

export type BlenderRenderer = 'cycles' | 'eevee' | 'workbench' | 'unknown';

export interface BlenderProvenance {
  /** `.blend` file used for the render, relative to the source root. */
  sceneFile: string;
  /** Source PNG, relative to the source root. */
  sourceRender: string;
  /** SHA-256 of the source PNG. */
  sourceSha256: string;
  /** Row/asset id in `caral_asset_manifest.csv` when applicable. */
  sceneAssetId: string | null;
  /** `documentado`, `blockout`, etc. from the Blender asset manifest. */
  confidence: string;
  camera: string;
  renderer: BlenderRenderer;
  license: string;
  author: string;
  renderedAt: string;
}

export interface ArtVariant {
  /** Path relative to `public/` (e.g. `media/generated/...`). */
  asset: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ArtManifestRecord {
  id: string;
  type: ImageType;
  scope: ArtScope;
  campaignId: string | null;
  missionId: string | null;
  civilization: CivId;
  period: HistoricalPeriod;
  era: Era;
  region: GeographicRegion;
  topic: string;
  sceneType: SceneType;
  /** Path relative to `public/` (e.g. `media/generated/...`). */
  asset: string;
  variants: ArtVariant[];
  sources: string[];
  promptVersion: string;
  /** Description of the render/view (not an AI prompt). */
  prompt: string;
  negativePrompt: string;
  provider: 'blender';
  model: string;
  generatedAt: string;
  nature: ArtNature;
  reviewed: boolean;
  reviewer: string | null;
  reviewedAt: string | null;
  disclaimer: string;
  /** Player-facing alternative text. */
  alt: string;
  /** Player-facing caption shown under the image. */
  caption: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  crop: 'cover-attention' | 'none';
  bytes: number;
  format: 'webp';
  sha256: string;
  blender: BlenderProvenance;
}

export interface ArtManifest {
  version: 1;
  assets: ArtManifestRecord[];
}

export interface ManifestValidationIssue {
  id?: string;
  field: string;
  message: string;
}

/** One entry in `art-src/blender/<pilot>/renders.json`. */
export interface BlenderSourceAsset {
  id: string;
  type: ImageType;
  scope: ArtScope;
  campaignId?: string;
  missionId?: string;
  civilization: CivId;
  period: HistoricalPeriod;
  era?: Era;
  region: GeographicRegion;
  topic: string;
  sceneType: SceneType;
  /** Path relative to `public/`. */
  asset: string;
  /** Source PNG path relative to the manifest `sourceRoot`. */
  render: string;
  /** Optional pinned SHA-256 of the source PNG; verified when present. */
  sourceSha256?: string;
  sceneFile: string;
  sceneAssetId?: string;
  confidence: string;
  camera: string;
  renderer: BlenderRenderer;
  license: string;
  author: string;
  renderedAt: string;
  sources: string[];
  alt: string;
  caption: string;
  nature: ArtNature;
  /** Optional target dimensions; defaults to the image-type rule. */
  width?: number;
  height?: number;
  maxBytes?: number;
  variantWidth?: number;
}

export interface BlenderSourceManifest {
  version: 1;
  /** External Blender project root (absolute or relative to the repo). */
  sourceRoot: string;
  assets: BlenderSourceAsset[];
}
