import type * as THREE from 'three';
import birdUrl from '../assets/fauna/caral/caral_bird.glb?url';
import deerUrl from '../assets/fauna/caral/caral_deer.glb?url';
import type { SpeciesId } from '../model/defs/wildlife';
import { disposeStaticGltf, loadStaticGltf } from './StaticModel';
import { dequantize } from './mergeStatic';
import type { FaunaKitParts, Wildlife } from './Wildlife';

/**
 * Blender fauna kit (scripts/blender/build_caral_fauna_kit.py): one GLB per species with a `body`
 * node and one `leg` or `wing` node, vertex-coloured, pivots matching the procedural templates.
 */
export const FAUNA_KIT_URLS: Partial<Record<SpeciesId, string>> = {
  deer: deerUrl,
  riparian_bird: birdUrl,
};

/** Read the named parts out of a loaded kit scene (geometry only; the game supplies the material). */
export function faunaPartsFromScene(root: THREE.Object3D): FaunaKitParts | null {
  root.updateMatrixWorld(true);
  const parts: Partial<Record<'body' | 'leg' | 'wing', THREE.BufferGeometry>> = {};
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    // GLTFLoader names a single-primitive mesh after its node.
    const name = (mesh.name || mesh.parent?.name || '') as 'body' | 'leg' | 'wing';
    if (name !== 'body' && name !== 'leg' && name !== 'wing') return;
    const geometry = dequantize(mesh.geometry);
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingSphere();
    parts[name] = geometry;
  });
  return parts.body ? { body: parts.body, leg: parts.leg, wing: parts.wing } : null;
}

/** Load the kit for the species on the map; procedural models stay if a GLB fails. */
export async function attachFaunaKit(wildlife: Wildlife): Promise<void> {
  const present = wildlife.species();
  const jobs = (Object.entries(FAUNA_KIT_URLS) as [SpeciesId, string][])
    .filter(([id]) => present.has(id) && !wildlife.hasKit(id))
    .map(async ([id, url]) => {
      const root = await loadStaticGltf(url);
      const parts = faunaPartsFromScene(root);
      disposeStaticGltf(root);
      if (!parts) throw new Error(`fauna kit ${id} has no body`);
      wildlife.attachKit(id, parts);
    });
  for (const r of await Promise.allSettled(jobs)) {
    if (r.status === 'rejected') console.warn('[fauna-kit] model failed to load', r.reason);
  }
}
