import * as THREE from 'three';

/**
 * Niebla de guerra en rejilla. Estados: 0=inexplorado, 1=explorado, 2=visible.
 * La textura se aplica directamente en el shader del terreno (pegada al relieve);
 * esta clase solo mantiene la rejilla y expone la textura.
 */
export class Fow {
  readonly size: number;
  readonly cells: number;
  readonly cell: number;
  private grid: Uint8Array;
  private dirty = true;
  readonly texture: THREE.DataTexture;
  enabled = true;

  constructor(size: number, cells = 128) {
    this.size = size;
    this.cells = cells;
    this.cell = size / cells;
    this.grid = new Uint8Array(cells * cells);

    const data = new Uint8Array(cells * cells * 4);
    this.texture = new THREE.DataTexture(data, cells, cells, THREE.RGBAFormat);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
  }

  /** Convierte coordenadas de mundo a celda. */
  private toCell(x: number, z: number): { x: number; z: number } {
    return {
      x: Math.max(0, Math.min(this.cells - 1, Math.floor(x / this.cell))),
      z: Math.max(0, Math.min(this.cells - 1, Math.floor(z / this.cell))),
    };
  }

  /** Revela un área circular de visión. */
  reveal(cx: number, cz: number, radius: number): void {
    const { x, z } = this.toCell(cx, cz);
    const r = Math.ceil(radius / this.cell);
    const r2 = r * r;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r2) continue;
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= this.cells || nz >= this.cells) continue;
        const i = nz * this.cells + nx;
        if (this.grid[i] < 2) {
          this.grid[i] = 2;
          this.dirty = true;
        }
      }
    }
  }

  /** Degrada visible -> explorado (llamar una vez por frame tras revelar). */
  decay(): void {
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === 2) {
        this.grid[i] = 1;
        this.dirty = true;
      }
    }
  }

  isVisible(x: number, z: number): boolean {
    const { x: cx, z: cz } = this.toCell(x, z);
    return this.grid[cz * this.cells + cx] === 2;
  }

  isExplored(x: number, z: number): boolean {
    const { x: cx, z: cz } = this.toCell(x, z);
    return this.grid[cz * this.cells + cx] >= 1;
  }

  /** Sube la textura a la GPU solo si hubo cambios. */
  upload(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const data = this.texture.image.data as Uint8Array;
    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      const o = i * 4;
      // 0 = inexplorado, 150 = explorado, 255 = visible
      data[o] = v === 2 ? 255 : v === 1 ? 150 : 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
    this.texture.needsUpdate = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Mantenido por compatibilidad: no hay mesh que mostrar/ocultar. */
  setFogEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
