import manifestJson from './manifest.json';
import { CIVS } from '../model/defs/civs';
import { PERIODS } from '../model/defs/periods';
import { MAP_PROFILES } from '../model/defs/profiles';
import { IMAGE_TYPE_RULES } from './imageTypes';
import type { ArtManifest, ArtManifestRecord, ArtNature, ArtScope, ManifestValidationIssue, SceneType } from './types';

const manifest = manifestJson as unknown as ArtManifest;

/** The committed manifest. Generated assets are additive; an empty manifest is valid. */
export const ART_MANIFEST: ArtManifest = manifest;

const ART_NATURES: ArtNature[] = ['reconstruction', 'abstraction', 'concept-art', 'reference'];
const ART_SCOPES: ArtScope[] = ['campaign', 'mission', 'civilization'];
const SCENE_TYPES: SceneType[] = [
  'urban_ceremonial',
  'architecture',
  'daily_life',
  'agriculture',
  'craft',
  'ritual',
  'landscape',
  'panorama',
  'portrait_reference',
  'campaign_scene',
  'map',
];

export interface ArtLookupOptions {
  /** Include assets that have not passed human review (for `?art=all`). */
  includeUnreviewed?: boolean;
}

function visible(record: ArtManifestRecord, options: ArtLookupOptions): boolean {
  return record.reviewed || options.includeUnreviewed === true;
}

function typeOrder(type: ArtManifestRecord['type']): number {
  return Object.keys(IMAGE_TYPE_RULES).indexOf(type);
}

function sortRecords(records: ArtManifestRecord[]): ArtManifestRecord[] {
  return [...records].sort((a, b) => typeOrder(a.type) - typeOrder(b.type) || a.id.localeCompare(b.id));
}

export function artForMission(missionId: string, options: ArtLookupOptions = {}): ArtManifestRecord[] {
  return sortRecords(ART_MANIFEST.assets.filter((a) => a.missionId === missionId && visible(a, options)));
}

export function artIntroForMission(missionId: string, options: ArtLookupOptions = {}): ArtManifestRecord | undefined {
  return artForMission(missionId, options).find((a) => a.type === 'campaign-intro');
}

export function artForCampaign(campaignId: string, options: ArtLookupOptions = {}): ArtManifestRecord[] {
  return sortRecords(
    ART_MANIFEST.assets.filter((a) => a.campaignId === campaignId && a.scope === 'campaign' && visible(a, options)),
  );
}

export function artIntroForCampaign(campaignId: string, options: ArtLookupOptions = {}): ArtManifestRecord | undefined {
  return artForCampaign(campaignId, options).find((a) => a.type === 'campaign-intro');
}

/** Resolve a `public/` asset path to a cache-busted URL. */
export function artAssetUrl(record: ArtManifestRecord | string, version?: string): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const asset = typeof record === 'string' ? record : record.asset;
  const clean = asset.replace(/^\/+/, '');
  const query = version ? `?v=${encodeURIComponent(version)}` : '';
  return `${prefix}${clean}${query}`;
}

/** Build a `srcset` string for the main asset plus its generated variants. */
export function artAssetSrcset(record: ArtManifestRecord): string | undefined {
  const entries = [
    ...record.variants.map((v) => `${artAssetUrl(v.asset, record.promptVersion)} ${v.width}w`),
    `${artAssetUrl(record, record.promptVersion)} ${record.width}w`,
  ];
  return entries.length > 1 ? entries.join(', ') : undefined;
}

export function artReviewLabel(record: ArtManifestRecord): string {
  return record.reviewed ? 'Revisada' : 'Borrador sin revisar';
}

function issue(issues: ManifestValidationIssue[], field: string, message: string, id?: string): void {
  issues.push({ id, field, message });
}

function requiredString(
  issues: ManifestValidationIssue[],
  record: ArtManifestRecord,
  field: keyof ArtManifestRecord,
): void {
  const value = record[field];
  if (typeof value !== 'string' || !value.trim()) issue(issues, String(field), 'must be a non-empty string', record.id);
}

function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

/**
 * Pure manifest validation (no filesystem). The CLI adds file existence, WebP
 * header, dimensions and byte-budget checks on top of this.
 */
export function validateManifestData(manifestToCheck: ArtManifest): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  if (manifestToCheck.version !== 1) issue(issues, 'version', 'must be 1');
  if (!Array.isArray(manifestToCheck.assets)) {
    issue(issues, 'assets', 'must be an array');
    return issues;
  }

  const ids = new Set<string>();
  for (const record of manifestToCheck.assets) {
    if (ids.has(record.id)) issue(issues, 'id', 'duplicate id', record.id);
    ids.add(record.id);

    requiredString(issues, record, 'id');
    requiredString(issues, record, 'topic');
    requiredString(issues, record, 'asset');
    requiredString(issues, record, 'prompt');
    requiredString(issues, record, 'negativePrompt');
    requiredString(issues, record, 'promptVersion');
    requiredString(issues, record, 'provider');
    requiredString(issues, record, 'model');
    requiredString(issues, record, 'generatedAt');
    requiredString(issues, record, 'disclaimer');
    requiredString(issues, record, 'alt');
    requiredString(issues, record, 'caption');
    requiredString(issues, record, 'sha256');

    if (record.provider !== 'blender') {
      issue(issues, 'provider', 'this branch only accepts blender renders', record.id);
    }
    if (!CIVS.some((c) => c.id === record.civilization)) {
      issue(issues, 'civilization', `unknown civilization "${String(record.civilization)}"`, record.id);
    }
    if (!PERIODS.some((p) => p.id === record.period)) {
      issue(issues, 'period', `unknown period "${String(record.period)}"`, record.id);
    }
    if (!MAP_PROFILES[record.region]) {
      issue(issues, 'region', `unknown region "${String(record.region)}"`, record.id);
    }
    if (!IMAGE_TYPE_RULES[record.type]) issue(issues, 'type', 'unknown image type', record.id);
    if (!SCENE_TYPES.includes(record.sceneType)) issue(issues, 'sceneType', 'unknown scene type', record.id);
    if (!ART_NATURES.includes(record.nature)) issue(issues, 'nature', 'unknown nature', record.id);
    if (!ART_SCOPES.includes(record.scope)) issue(issues, 'scope', 'unknown scope', record.id);
    if (!Number.isInteger(record.era) || record.era < 0 || record.era > 5) {
      issue(issues, 'era', 'must be an integer 0..5', record.id);
    }

    if (record.scope === 'campaign' && !record.campaignId) {
      issue(issues, 'campaignId', 'campaign scope requires campaignId', record.id);
    }
    if (record.scope === 'mission' && !record.missionId) {
      issue(issues, 'missionId', 'mission scope requires missionId', record.id);
    }

    if (!record.asset.startsWith('media/generated/') || record.asset.includes('..') || record.asset.startsWith('/')) {
      issue(issues, 'asset', 'must be a relative path under media/generated/', record.id);
    }
    if (!record.asset.endsWith('.webp')) issue(issues, 'asset', 'must be a .webp asset', record.id);
    if (!Array.isArray(record.variants)) {
      issue(issues, 'variants', 'must be an array', record.id);
    } else {
      for (const variant of record.variants) {
        if (
          !variant.asset.startsWith('media/generated/') ||
          variant.asset.includes('..') ||
          variant.asset.startsWith('/')
        ) {
          issue(issues, 'variants', 'variant must be under media/generated/', record.id);
        }
        if (!variant.asset.endsWith('.webp')) issue(issues, 'variants', 'variant must be .webp', record.id);
        if (!(variant.width > 0) || !(variant.height > 0) || !(variant.bytes > 0)) {
          issue(issues, 'variants', 'variant dimensions and bytes must be positive', record.id);
        }
      }
    }

    if (!Array.isArray(record.sources) || record.sources.length === 0) {
      issue(issues, 'sources', 'at least one historical source is required', record.id);
    } else {
      for (const source of record.sources) {
        if (typeof source !== 'string' || !source.trim()) {
          issue(issues, 'sources', 'sources must be non-empty strings', record.id);
        }
      }
    }

    if (!record.promptVersion.startsWith('v')) {
      issue(issues, 'promptVersion', 'must start with a version prefix', record.id);
    }
    if (Number.isNaN(Date.parse(record.generatedAt))) {
      issue(issues, 'generatedAt', 'must be an ISO date', record.id);
    }
    if (record.reviewed) {
      if (!record.reviewer) issue(issues, 'reviewer', 'reviewed assets need a reviewer', record.id);
      if (!record.reviewedAt || Number.isNaN(Date.parse(record.reviewedAt))) {
        issue(issues, 'reviewedAt', 'reviewed assets need an ISO review date', record.id);
      }
    }
    if (!(record.width > 0) || !(record.height > 0) || !(record.sourceWidth > 0) || !(record.sourceHeight > 0)) {
      issue(issues, 'dimensions', 'width/height/source dimensions must be positive', record.id);
    }
    if (!(record.bytes > 0)) issue(issues, 'bytes', 'must be positive', record.id);
    if (record.format !== 'webp') issue(issues, 'format', 'must be webp', record.id);
    if (!isHex64(record.sha256)) issue(issues, 'sha256', 'must be a 64-character hex digest', record.id);
    if (record.crop !== 'cover-attention' && record.crop !== 'none') {
      issue(issues, 'crop', 'must be cover-attention or none', record.id);
    }

    const blender = record.blender;
    if (!blender || typeof blender !== 'object') {
      issue(issues, 'blender', 'blender provenance is required', record.id);
    } else {
      if (!blender.sceneFile?.trim()) issue(issues, 'blender.sceneFile', 'must be non-empty', record.id);
      if (!blender.sourceRender?.trim()) issue(issues, 'blender.sourceRender', 'must be non-empty', record.id);
      if (!isHex64(blender.sourceSha256 ?? '')) {
        issue(issues, 'blender.sourceSha256', 'must be a 64-character hex digest', record.id);
      }
      if (!blender.confidence?.trim()) issue(issues, 'blender.confidence', 'must be non-empty', record.id);
      if (!blender.camera?.trim()) issue(issues, 'blender.camera', 'must be non-empty', record.id);
      if (!blender.license?.trim()) issue(issues, 'blender.license', 'must be non-empty', record.id);
      if (!blender.author?.trim()) issue(issues, 'blender.author', 'must be non-empty', record.id);
      if (!blender.renderedAt || Number.isNaN(Date.parse(blender.renderedAt))) {
        issue(issues, 'blender.renderedAt', 'must be an ISO date', record.id);
      }
      if (!['cycles', 'eevee', 'workbench', 'unknown'].includes(blender.renderer)) {
        issue(issues, 'blender.renderer', 'unknown renderer', record.id);
      }
      if (blender.sceneAssetId !== null && typeof blender.sceneAssetId !== 'string') {
        issue(issues, 'blender.sceneAssetId', 'must be a string or null', record.id);
      }
    }
  }
  return issues;
}
