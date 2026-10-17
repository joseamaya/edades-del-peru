import * as THREE from 'three';

/** World units covered by one tile of a generated ground texture. */
export const GROUND_TILE = 4;

/** Scale a geometry's UVs so a shared texture repeats (baked into the geometry). */
export function scaleUv(g: THREE.BufferGeometry, rx: number, ry: number): void {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  uv.needsUpdate = true;
}
