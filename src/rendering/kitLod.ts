import type * as THREE from 'three';

/**
 * Distance from the camera focus inside which the Caral prop kits draw LOD0. The household pieces and
 * the quarry outcrops are small scenery: one radius and one swap keep them consistent.
 */
export const KIT_LOD1_DISTANCE = 30;

/** Which prop-kit LOD a point uses at the current camera focus. */
export function kitLodFor(x: number, z: number, focus: { x: number; z: number }): 0 | 1 {
  return Math.hypot(x - focus.x, z - focus.z) > KIT_LOD1_DISTANCE ? 1 : 0;
}

/** Show one LOD set and hide the other; a kit with no far LOD always keeps the near one. */
export function showKitLod(lods: [THREE.Object3D[], THREE.Object3D[]], lod: 0 | 1): void {
  const hasFar = lods[1].length > 0;
  for (const mesh of lods[0]) mesh.visible = !hasFar || lod === 0;
  for (const mesh of lods[1]) mesh.visible = hasFar && lod === 1;
}
