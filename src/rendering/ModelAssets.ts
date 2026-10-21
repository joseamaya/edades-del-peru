import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { ModelAssetId, RigVariant } from '../model/defs/modelAssets';
import { MODEL_ASSET_DEFS, type ModelAssetDefinition } from './modelAssetRegistry';
import { RigInstance } from './RigInstance';

export interface LoadedModelAsset {
  readonly id: ModelAssetId;
  readonly scene: THREE.Group;
  readonly clipNames: Map<string, THREE.AnimationClip>;
  readonly definition: ModelAssetDefinition;
  /** Live rigs cloned from this asset (shared geometry/material/texture owners). */
  refs: number;
  /** Drop one rig reference; after teardown the last one frees the shared resources. */
  release(): void;
}

export type ModelAssetState = 'idle' | 'loading' | 'ready' | 'failed';

export interface ModelAssetStatus {
  id: ModelAssetId;
  state: ModelAssetState;
  error?: string;
  refs: number;
  clips: string[];
}

const cache = new Map<ModelAssetId, LoadedModelAsset>();
const pending = new Map<ModelAssetId, Promise<LoadedModelAsset | null>>();
const failures = new Map<ModelAssetId, string>();
const fallbackWarned = new Set<ModelAssetId>();
let generation = 0;
let teardown = false;

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
] as const;

function parseGltf(loader: GLTFLoader, data: ArrayBuffer | string): Promise<GLTF> {
  return new Promise((resolve, reject) => loader.parse(data, '', resolve, reject));
}

function finalize(id: ModelAssetId, gltf: GLTF, definition: ModelAssetDefinition): LoadedModelAsset {
  if (!gltf.scene) throw new Error('the file has no scene');
  if (!gltf.animations.length) throw new Error('the file has no animation clips');

  const clipNames = new Map<string, THREE.AnimationClip>();
  for (const clip of gltf.animations) clipNames.set(clip.name, clip);

  const idleClip = definition.clips.idle;
  if (!idleClip || !clipNames.has(idleClip)) {
    throw new Error(`missing required idle clip "${idleClip ?? '(unmapped)'}"`);
  }
  for (const [state, name] of Object.entries(definition.clips)) {
    if (name && !clipNames.has(name)) console.warn(`[models] "${id}" has no clip "${name}" (state ${state})`);
  }

  gltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // A skinned mesh's bind-pose bounding sphere does not follow the bones.
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
  });

  const asset: LoadedModelAsset = {
    id,
    scene: gltf.scene,
    clipNames,
    definition,
    refs: 0,
    release: () => releaseModelAsset(asset),
  };
  return asset;
}

function releaseModelAsset(asset: LoadedModelAsset): void {
  asset.refs = Math.max(0, asset.refs - 1);
  if (!teardown || asset.refs > 0) return;
  disposeAsset(asset);
  if (cache.get(asset.id) === asset) cache.delete(asset.id);
}

function disposeAsset(asset: LoadedModelAsset): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  asset.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const key of TEXTURE_KEYS) {
        const texture = (material as unknown as Record<string, unknown>)[key] as THREE.Texture | undefined;
        if (texture?.isTexture) textures.add(texture);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

function failureMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Load a registered asset from its bundled URL (deduplicated and cached). */
export function loadModelAsset(id: ModelAssetId): Promise<LoadedModelAsset | null> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;

  const definition = MODEL_ASSET_DEFS[id];
  if (!definition?.url) {
    const error = `no local file registered for "${id}"`;
    failures.set(id, error);
    console.warn(`[models] ${error}; using the procedural fallback`);
    return Promise.resolve(null);
  }

  teardown = false;
  const startedAt = generation;
  const promise = new GLTFLoader()
    .loadAsync(definition.url)
    .then((gltf) => {
      const asset = finalize(id, gltf, definition);
      if (startedAt !== generation) {
        disposeAsset(asset);
        return null;
      }
      cache.set(id, asset);
      failures.delete(id);
      return asset;
    })
    .catch((err: unknown) => {
      const error = failureMessage(err);
      if (startedAt === generation) failures.set(id, error);
      console.warn(`[models] failed to load "${id}" (${definition.url}): ${error}; using the procedural fallback`);
      return null;
    })
    .finally(() => {
      if (pending.get(id) === promise) pending.delete(id);
    });

  pending.set(id, promise);
  return promise;
}

/** Parse an in-memory GLB/glTF and install it in the cache (tests, tooling). */
export async function loadModelAssetFromData(
  id: ModelAssetId,
  data: ArrayBuffer | string,
  definition: ModelAssetDefinition = MODEL_ASSET_DEFS[id],
): Promise<LoadedModelAsset> {
  const cached = cache.get(id);
  if (cached) return cached;
  teardown = false;
  const gltf = await parseGltf(new GLTFLoader(), data);
  const asset = finalize(id, gltf, definition);
  cache.set(id, asset);
  failures.delete(id);
  return asset;
}

/** Preload a list of assets; failures never reject, the caller keeps the fallback. */
export async function preloadModelAssets(ids: readonly ModelAssetId[]): Promise<void> {
  await Promise.all([...new Set(ids)].map((id) => loadModelAsset(id)));
}

/**
 * Create a rig if its asset is already loaded. This is intentionally
 * synchronous so entity construction never waits on I/O; a missing model logs
 * a fallback diagnostic and keeps the procedural mesh.
 */
export function acquireRig(id: ModelAssetId, variant?: RigVariant): RigInstance | null {
  const asset = cache.get(id);
  if (asset) return new RigInstance(asset, variant);

  if (!fallbackWarned.has(id)) {
    fallbackWarned.add(id);
    const reason = failures.get(id) ?? 'not loaded before the entity was created';
    console.warn(`[models] "${id}" unavailable (${reason}); using the procedural fallback`);
  }
  return null;
}

export function modelAssetStatus(
  ids: readonly ModelAssetId[] = Object.keys(MODEL_ASSET_DEFS) as ModelAssetId[],
): ModelAssetStatus[] {
  return ids.map((id) => {
    const asset = cache.get(id);
    const error = failures.get(id);
    const state: ModelAssetState = asset ? 'ready' : pending.has(id) ? 'loading' : error ? 'failed' : 'idle';
    return {
      id,
      state,
      error,
      refs: asset?.refs ?? 0,
      clips: asset ? [...asset.clipNames.keys()] : [],
    };
  });
}

/**
 * Request teardown of the shared cache. Assets with live rigs stay cached until
 * the last instance releases them, so shared geometry is never disposed under
 * an entity that still uses it.
 */
export function clearModelAssets(): void {
  generation++;
  teardown = true;
  pending.clear();
  for (const [id, asset] of [...cache]) {
    if (asset.refs > 0) continue;
    disposeAsset(asset);
    cache.delete(id);
  }
  failures.clear();
  fallbackWarned.clear();
}
