/**
 * Grid fog of war. States: 0=unexplored, 1=explored, 2=visible.
 * The grid is pure simulation state; `FowTexture` in the renderer turns `data`
 * into the texture sampled by the terrain shader.
 */
export class Fow {
  readonly size: number;
  readonly cells: number;
  readonly cell: number;
  private grid: Uint8Array;
  private dirty = true;
  /** RGBA bytes consumed by the renderer's DataTexture. */
  readonly data: Uint8Array;
  enabled = true;

  constructor(size: number, cells = 128) {
    this.size = size;
    this.cells = cells;
    this.cell = size / cells;
    this.grid = new Uint8Array(cells * cells);

    this.data = new Uint8Array(cells * cells * 4);
  }

  /** Convert world coordinates to a cell. */
  private toCell(x: number, z: number): { x: number; z: number } {
    return {
      x: Math.max(0, Math.min(this.cells - 1, Math.floor(x / this.cell))),
      z: Math.max(0, Math.min(this.cells - 1, Math.floor(z / this.cell))),
    };
  }

  /** Reveal a circular vision area. */
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

  /** Degrade visible -> explored (call once per frame after revealing). */
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

  /** Refresh the RGBA buffer; returns true when the renderer must re-upload it. */
  flush(): boolean {
    if (!this.dirty) return false;
    this.dirty = false;
    const data = this.data;
    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      const o = i * 4;
      // 0 = unexplored, 150 = explored, 255 = visible
      data[o] = v === 2 ? 255 : v === 1 ? 150 : 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
    return true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Serialize the explored/visible grid (base64) for save/load. */
  serialize(): string {
    let bin = '';
    for (let i = 0; i < this.grid.length; i++) bin += String.fromCharCode(this.grid[i]);
    return btoa(bin);
  }

  restore(data: string): void {
    try {
      const bin = atob(data);
      if (bin.length !== this.grid.length) return;
      for (let i = 0; i < bin.length; i++) this.grid[i] = bin.charCodeAt(i);
      this.dirty = true;
    } catch {
      /* ignore malformed data */
    }
  }

  /** Kept for compatibility: there is no mesh to show/hide. */
  setFogEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
