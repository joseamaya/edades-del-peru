import type * as THREE from 'three';

/** Share of a rig's visible triangles that must keep casting a shadow. */
export const RIG_SHADOW_COVERAGE = 0.6;

function triangles(mesh: THREE.Mesh): number {
  const geometry = mesh.geometry;
  const count = geometry.index ? geometry.index.count : (geometry.attributes.position?.count ?? 0);
  return count / 3;
}

/**
 * A unit rig is drawn as one mesh per material (body, hair, eyes, garments, tools, hat trims), and the
 * shadow pass draws each of them again. At the campaign zoom only the silhouette matters, so keep the
 * few meshes that make it up — enough to cover `coverage` of the rig's visible triangles, at least one —
 * and let the rest skip the shadow pass. Only ever turns casting off, so it cannot add a caster.
 *
 * Returns the number of meshes that still cast.
 */
export function limitShadowCasters(root: THREE.Object3D, coverage = RIG_SHADOW_COVERAGE): number {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.visible) meshes.push(mesh);
  });
  if (meshes.length === 0) return 0;
  meshes.sort((a, b) => triangles(b) - triangles(a));
  const total = meshes.reduce((sum, mesh) => sum + triangles(mesh), 0);
  let covered = 0;
  let casters = 0;
  for (const mesh of meshes) {
    if (covered >= total * coverage && casters > 0) break;
    covered += triangles(mesh);
    casters++;
  }
  for (let i = casters; i < meshes.length; i++) meshes[i]!.castShadow = false;
  return casters;
}
