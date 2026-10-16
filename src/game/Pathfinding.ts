/** A* pathfinding over a grid with static obstacles. */

export interface PathGrid {
  cols: number;
  rows: number;
  cell: number; // cell size in world units
  walkable: Uint8Array;
}

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Chebyshev cell distance to an obstacle goal accepted as "arrived" (see pathfind). */
const GOAL_PROXIMITY = 2;

/** Reusable min binary heap (avoids O(n) forEach per iteration). */
class MinHeap {
  private idx: number[] = [];
  private key: number[] = [];

  clear(): void {
    this.idx.length = 0;
    this.key.length = 0;
  }

  get size(): number {
    return this.idx.length;
  }

  push(i: number, k: number): void {
    this.idx.push(i);
    this.key.push(k);
    let c = this.idx.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.key[p] <= this.key[c]) break;
      this.swap(p, c);
      c = p;
    }
  }

  pop(): number {
    const top = this.idx[0];
    const lastI = this.idx.pop()!;
    const lastK = this.key.pop()!;
    const n = this.idx.length;
    if (n > 0) {
      this.idx[0] = lastI;
      this.key[0] = lastK;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < n && this.key[l] < this.key[m]) m = l;
        if (r < n && this.key[r] < this.key[m]) m = r;
        if (m === c) break;
        this.swap(m, c);
        c = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const ti = this.idx[a];
    this.idx[a] = this.idx[b];
    this.idx[b] = ti;
    const tk = this.key[a];
    this.key[a] = this.key[b];
    this.key[b] = tk;
  }
}

export class Pathfinder {
  grid: PathGrid;
  private obstacles: Obstacle[] = [];
  private heap = new MinHeap();
  private gScore: Float64Array;
  private cameFrom: Int32Array;
  private closed: Uint8Array;
  /** Terrain-only blockage (water/steep), kept so `rebuild` does not lose it. */
  private terrainBlocked: Uint8Array | null = null;

  constructor(size: number, cellSize: number) {
    const cols = Math.ceil(size / cellSize);
    this.grid = { cols, rows: cols, cell: cellSize, walkable: new Uint8Array(cols * cols).fill(1) };
    const n = cols * cols;
    this.gScore = new Float64Array(n);
    this.cameFrom = new Int32Array(n);
    this.closed = new Uint8Array(n);
  }

  addObstacle(o: Obstacle): void {
    this.obstacles.push(o);
    this.rasterize(o);
  }

  removeObstacle(o: Obstacle): void {
    const i = this.obstacles.indexOf(o);
    if (i >= 0) this.obstacles.splice(i, 1);
    this.rebuild();
  }

  private rasterize(o: Obstacle): void {
    const { cols, cell } = this.grid;
    const r = Math.max(1, Math.ceil(o.radius / cell));
    const cx = Math.floor(o.x / cell);
    const cz = Math.floor(o.z / cell);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= cols || z >= cols) continue;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > r) continue;
        this.grid.walkable[z * cols + x] = 0;
      }
    }
  }

  private rebuild(): void {
    // restore the terrain mask first: filling with 1 would otherwise turn water
    // (baked non-walkable) back into walkable whenever an obstacle is removed
    if (this.terrainBlocked) this.grid.walkable.set(this.terrainBlocked);
    else this.grid.walkable.fill(1);
    for (const o of this.obstacles) this.rasterize(o);
  }

  /** Mark cells non-traversable due to slope or water (call with terrain height). */
  bakeTerrain(heightFn: (x: number, z: number) => number, waterLevel: number): void {
    const { cols, cell } = this.grid;
    this.grid.walkable.fill(1);
    for (let z = 0; z < cols; z++) {
      for (let x = 0; x < cols; x++) {
        const wx = x * cell + cell / 2;
        const wz = z * cell + cell / 2;
        const h = heightFn(wx, wz);
        if (h < waterLevel + 0.35) {
          this.grid.walkable[z * cols + x] = 0;
        }
      }
    }
    // snapshot the terrain-only mask, then re-apply the obstacles on top (idempotent)
    this.terrainBlocked = this.grid.walkable.slice();
    for (const o of this.obstacles) this.rasterize(o);
  }

  isWalkable(wx: number, wz: number): boolean {
    const { cols, cell } = this.grid;
    const x = Math.floor(wx / cell);
    const z = Math.floor(wz / cell);
    if (x < 0 || z < 0 || x >= cols || z >= cols) return false;
    return this.grid.walkable[z * cols + x] === 1;
  }

  /** A* returning waypoints in world coordinates (cell centers). */
  pathfind(sx: number, sz: number, tx: number, tz: number): { x: number; z: number }[] {
    const { cols, cell } = this.grid;
    const start = { x: Math.floor(sx / cell), z: Math.floor(sz / cell) };
    const goal = { x: Math.floor(tx / cell), z: Math.floor(tz / cell) };
    start.x = Math.max(0, Math.min(cols - 1, start.x));
    start.z = Math.max(0, Math.min(cols - 1, start.z));
    goal.x = Math.max(0, Math.min(cols - 1, goal.x));
    goal.z = Math.max(0, Math.min(cols - 1, goal.z));

    // A goal sitting on an obstacle (building, resource node) is not directly
    // traversable: accept any cell within GOAL_PROXIMITY of it. Picking a single
    // `nearestWalkable` cell is not enough — it can be an isolated pocket.
    const destX = goal.x;
    const destZ = goal.z;
    const destWalkable = this.grid.walkable[goal.z * cols + goal.x] === 1;
    if (!destWalkable) {
      const alt = this.nearestWalkable(goal.x, goal.z, 12);
      if (!alt) return [];
      goal.x = alt.x;
      goal.z = alt.z;
    }
    if (this.grid.walkable[start.z * cols + start.x] === 0) {
      const alt = this.nearestWalkable(start.x, start.z, 12);
      if (!alt) return [];
      start.x = alt.x;
      start.z = alt.z;
    }
    if (start.x === goal.x && start.z === goal.z) return [];

    const startIdx = start.z * cols + start.x;
    const goalIdx = goal.z * cols + goal.x;

    // reused arrays (no allocations per call)
    this.gScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.closed.fill(0);
    this.heap.clear();

    this.gScore[startIdx] = 0;
    this.heap.push(startIdx, this.heuristic(start.x, start.z, goal.x, goal.z));

    while (this.heap.size > 0) {
      const best = this.heap.pop();
      if (this.closed[best]) continue;
      if (best === goalIdx) {
        return this.reconstruct(this.cameFrom, best, cell);
      }
      if (!destWalkable) {
        const bx = best % cols;
        const bz = (best - bx) / cols;
        if (Math.max(Math.abs(bx - destX), Math.abs(bz - destZ)) <= GOAL_PROXIMITY) {
          return this.reconstruct(this.cameFrom, best, cell);
        }
      }
      this.closed[best] = 1;

      const bx = best % cols;
      const bz = Math.floor(best / cols);
      const g = this.gScore[best];

      for (let d = 0; d < 8; d++) {
        const nx = bx + DIRS[d][0];
        const nz = bz + DIRS[d][1];
        if (nx < 0 || nz < 0 || nx >= cols || nz >= cols) continue;
        const ni = nz * cols + nx;
        if (this.closed[ni] || this.grid.walkable[ni] === 0) continue;
        const diag = d >= 4;
        if (diag) {
          // avoid cutting corners between obstacles
          const ax = bz * cols + nx;
          const az = nz * cols + bx;
          if (this.grid.walkable[ax] === 0 && this.grid.walkable[az] === 0) continue;
        }
        const cost = g + (diag ? 1.4142 : 1);
        if (cost < this.gScore[ni]) {
          this.gScore[ni] = cost;
          this.cameFrom[ni] = best;
          this.heap.push(ni, cost + this.heuristic(nx, nz, goal.x, goal.z));
        }
      }
    }
    return [];
  }

  private heuristic(x: number, z: number, gx: number, gz: number): number {
    const dx = Math.abs(x - gx);
    const dz = Math.abs(z - gz);
    return Math.max(dx, dz) + 0.41 * Math.min(dx, dz);
  }

  private nearestWalkable(x: number, z: number, maxR: number): { x: number; z: number } | null {
    const { cols } = this.grid;
    for (let r = 1; r <= maxR; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= cols || nz >= cols) continue;
          if (this.grid.walkable[nz * cols + nx]) return { x: nx, z: nz };
        }
      }
    }
    return null;
  }

  private reconstruct(cameFrom: Int32Array, end: number, cell: number): { x: number; z: number }[] {
    const pts: { x: number; z: number }[] = [];
    let cur = end;
    const { cols } = this.grid;
    let guard = 0;
    while (cur >= 0 && guard++ < 10000) {
      const cx = cur % cols;
      const cz = Math.floor(cur / cols);
      pts.push({ x: cx * cell + cell / 2, z: cz * cell + cell / 2 });
      cur = cameFrom[cur];
    }
    pts.reverse();
    return this.smooth(pts);
  }

  /** Smooth the path by removing collinear points. */
  private smooth(pts: { x: number; z: number }[]): { x: number; z: number }[] {
    if (pts.length <= 2) return pts;
    const out: { x: number; z: number }[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = out[out.length - 1];
      const b = pts[i];
      const c = pts[i + 1];
      const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
      if (Math.abs(cross) > 0.05) {
        out.push(b);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
}
