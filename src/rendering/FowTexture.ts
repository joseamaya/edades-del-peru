import * as THREE from 'three';
import type { Fow } from '../game/Fow';

/** Owns the GPU texture for a fog-of-war grid. */
export class FowTexture {
  readonly texture: THREE.DataTexture;

  constructor(private readonly fow: Fow) {
    this.texture = new THREE.DataTexture(fow.data, fow.cells, fow.cells, THREE.RGBAFormat);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
  }

  /** Upload to the GPU only when the grid changed. */
  upload(): void {
    if (this.fow.flush()) this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
