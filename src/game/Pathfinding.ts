/** A* pathfinding over a grid with static obstacles. */

import { terrainSlope } from '../util/math';

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

/** Cell radius searched for the nearest walkable cell of a blocked endpoint. */
const REACH_SEARCH_RADIUS = 12;

/** A walkable, approachable stand point near a harvest target. */
interface StandCandidate {
  x: number;
  z: number;
  targetDist: number;
  centerX: number;
  centerZ: number;
  startDist: number;
}

/**
 * Steepest terrain a unit may traverse (0 flat .. 1 cliff, same scale as
 * `Terrain.getSlope`). Cells above it are baked non-walkable, so units cannot
 * cross mountains/cliffs; `Game.canPlace` uses the same limit so anything
 * buildable stays reachable. Measured on the shipped maps, only the steepest
 * ~0.4–3.6% of land cells exceed it (valleys/terraces are well below).
 */
export const MAX_WALKABLE_SLOPE = 0.5;

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
  /** Bumped whenever the walkable grid changes; used to invalidate approach caches. */
  revision = 0;
  private obstacles: Obstacle[] = [];
  private heap = new MinHeap();
  private gScore: Float64Array;
  private cameFrom: Int32Array;
  private closed: Uint8Array;
  /** Terrain-only blockage (water/steep), kept so `rebuild` does not lose it. */
  private terrainBlocked: Uint8Array | null = null;
  /** Connected components of walkable cells, recomputed lazily per revision. */
  private components: Int32Array | null = null;
  private componentsRevision = -1;

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
    this.revision++;
  }

  removeObstacle(o: Obstacle): void {
    const i = this.obstacles.indexOf(o);
    if (i >= 0) this.obstacles.splice(i, 1);
    this.rebuild();
    this.revision++;
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

  /** Mark cells non-traversable due to water or too-steep terrain (call with terrain height). */
  bakeTerrain(heightFn: (x: number, z: number) => number, waterLevel: number): void {
    const { cols, cell } = this.grid;
    this.grid.walkable.fill(1);
    for (let z = 0; z < cols; z++) {
      for (let x = 0; x < cols; x++) {
        const wx = x * cell + cell / 2;
        const wz = z * cell + cell / 2;
        const h = heightFn(wx, wz);
        // same scale as Terrain.getSlope (shared helper)
        const slope = terrainSlope(heightFn, wx, wz, cell);
        if (h < waterLevel + 0.35 || slope > MAX_WALKABLE_SLOPE) {
          this.grid.walkable[z * cols + x] = 0;
        }
      }
    }
    // snapshot the terrain-only mask, then re-apply the obstacles on top (idempotent)
    this.terrainBlocked = this.grid.walkable.slice();
    for (const o of this.obstacles) this.rasterize(o);
    this.revision++;
  }

  isWalkable(wx: number, wz: number): boolean {
    const { cols, cell } = this.grid;
    const x = Math.floor(wx / cell);
    const z = Math.floor(wz / cell);
    if (x < 0 || z < 0 || x >= cols || z >= cols) return false;
    return this.grid.walkable[z * cols + x] === 1;
  }

  /**
   * Flood-fill the walkable cells into connected components (same 8-way
   * no-corner-cutting rule as A*), cached until the grid revision changes.
   */
  private ensureComponents(): Int32Array {
    const { cols } = this.grid;
    const walkable = this.grid.walkable;
    if (!this.components || this.components.length !== cols * cols) {
      this.components = new Int32Array(cols * cols);
    }
    const comp = this.components;
    if (this.componentsRevision === this.revision) return comp;

    comp.fill(0);
    const stack: number[] = [];
    let id = 0;
    for (let i = 0; i < comp.length; i++) {
      if (comp[i] !== 0 || walkable[i] === 0) continue;
      id++;
      comp[i] = id;
      stack.push(i);
      while (stack.length > 0) {
        const cur = stack.pop()!;
        const cx = cur % cols;
        const cz = Math.floor(cur / cols);
        for (let d = 0; d < 8; d++) {
          const nx = cx + DIRS[d][0];
          const nz = cz + DIRS[d][1];
          if (nx < 0 || nz < 0 || nx >= cols || nz >= cols) continue;
          const ni = nz * cols + nx;
          if (comp[ni] !== 0 || walkable[ni] === 0) continue;
          if (d >= 4 && (walkable[cz * cols + nx] === 0 || walkable[nz * cols + cx] === 0)) continue;
          comp[ni] = id;
          stack.push(ni);
        }
      }
    }
    this.componentsRevision = this.revision;
    return comp;
  }

  /** Component id of the walkable region containing (wx, wz); 0 when blocked/out of bounds. */
  componentAt(wx: number, wz: number): number {
    const { cols, cell } = this.grid;
    const x = Math.floor(wx / cell);
    const z = Math.floor(wz / cell);
    if (x < 0 || z < 0 || x >= cols || z >= cols) return 0;
    return this.ensureComponents()[z * cols + x];
  }

  /**
   * Coarse O(1) reachability test: true when the nearest walkable cell to each
   * endpoint shares a component. It can report false negatives when a node's
   * nearest walkable cell sits in a different component than its harvest stand
   * point, so use `reachableToNode` to decide a harvest target; this is for
   * whole-region questions.
   */
  reachable(sx: number, sz: number, tx: number, tz: number, maxR = REACH_SEARCH_RADIUS): boolean {
    const start = this.resolveComponent(sx, sz, maxR);
    if (start === 0) return false;
    const goal = this.resolveComponent(tx, tz, maxR);
    return goal !== 0 && start === goal;
  }

  /** Component of the cell at (wx, wz), falling back to the nearest walkable cell. */
  private resolveComponent(wx: number, wz: number, maxR: number): number {
    const { cols } = this.grid;
    const x = this.clampCell(wx);
    const z = this.clampCell(wz);
    const comp = this.ensureComponents();
    const c = comp[z * cols + x];
    if (c !== 0) return c;
    const alt = this.nearestWalkable(x, z, maxR);
    if (!alt) return 0;
    return comp[alt.z * cols + alt.x];
  }

  /** Cell coordinate clamped to the grid (floor of a world coordinate / cell). */
  private clampCell(world: number): number {
    const { cols, cell } = this.grid;
    return Math.max(0, Math.min(cols - 1, Math.floor(world / cell)));
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
      const alt = this.nearestWalkable(goal.x, goal.z, REACH_SEARCH_RADIUS);
      if (!alt) return [];
      goal.x = alt.x;
      goal.z = alt.z;
    }
    if (this.grid.walkable[start.z * cols + start.x] === 0) {
      const alt = this.nearestWalkable(start.x, start.z, REACH_SEARCH_RADIUS);
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
          // no corner cutting: reject the diagonal if EITHER orthogonal cell is
          // blocked, so a unit cannot slip through a one-cell corner gap
          const ax = bz * cols + nx;
          const az = nz * cols + bx;
          if (this.grid.walkable[ax] === 0 || this.grid.walkable[az] === 0) continue;
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

  /**
   * Path to a stand point inside a walkable cell within `standRadius` world units
   * of (tx, tz). Resource nodes block their own cell (and, for now, the four
   * orthogonal neighbours), so a regular `pathfind` can end up to two cells away
   * — outside the worker's harvest range. This searches the cells around the
   * target and returns a path whose last waypoint is a point inside a walkable
   * cell, close enough to harvest from.
   *
   * The returned path is a normal path to the cell centre plus the stand point,
   * so movement code only needs to follow the waypoints. It returns [] when no
   * cell within range has a reachable stand point.
   */
  findApproachPath(sx: number, sz: number, tx: number, tz: number, standRadius: number): { x: number; z: number }[] {
    if (!(standRadius > 0)) return [];
    const candidates = this.standCandidates(sx, sz, tx, tz, standRadius);
    if (candidates.length === 0) return [];
    candidates.sort((a, b) => a.targetDist - b.targetDist || a.startDist - b.startDist);

    const tried = new Set<string>();
    let attempts = 0;
    for (const candidate of candidates) {
      const key = candidate.centerX + ',' + candidate.centerZ;
      if (tried.has(key)) continue;
      tried.add(key);
      if (attempts++ >= 8) break;
      const path = this.pathfind(sx, sz, candidate.centerX, candidate.centerZ);
      if (path.length === 0) continue;
      const last = path[path.length - 1];
      if (Math.hypot(last.x - candidate.x, last.z - candidate.z) > 0.05) {
        path.push({ x: candidate.x, z: candidate.z });
      }
      return path;
    }
    return [];
  }

  /**
   * Walkable, approachable stand points within `standRadius` of (tx, tz). Shared by
   * `findApproachPath` (which then A*-searches to one) and `reachableToNode` (which
   * only needs the component of a stand point).
   */
  private standCandidates(sx: number, sz: number, tx: number, tz: number, standRadius: number): StandCandidate[] {
    const { cols, cell } = this.grid;
    const candidates: StandCandidate[] = [];
    const minX = Math.max(0, Math.floor((tx - standRadius) / cell) - 1);
    const maxX = Math.min(cols - 1, Math.floor((tx + standRadius) / cell) + 1);
    const minZ = Math.max(0, Math.floor((tz - standRadius) / cell) - 1);
    const maxZ = Math.min(cols - 1, Math.floor((tz + standRadius) / cell) + 1);

    for (let cz = minZ; cz <= maxZ; cz++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const idx = cz * cols + cx;
        if (this.grid.walkable[idx] === 0) continue;
        const x0 = cx * cell;
        const z0 = cz * cell;
        const px = Math.min(Math.max(tx, x0), x0 + cell);
        const pz = Math.min(Math.max(tz, z0), z0 + cell);
        const dx = px - tx;
        const dz = pz - tz;
        const targetDist = Math.sqrt(dx * dx + dz * dz);
        if (targetDist > standRadius) continue;

        const centreX = x0 + cell / 2;
        const centreZ = z0 + cell / 2;
        let standX: number;
        let standZ: number;
        if (targetDist < 1e-6) {
          const centreDist = Math.hypot(centreX - tx, centreZ - tz);
          if (centreDist > standRadius) continue;
          standX = centreX;
          standZ = centreZ;
        } else {
          // Stay just inside the cell: d + 0.12 is past the boundary, so the
          // point is unambiguously walkable and still as close as possible.
          const standDist = Math.min(standRadius, targetDist + 0.12);
          standX = tx + (dx / targetDist) * standDist;
          standZ = tz + (dz / targetDist) * standDist;
        }
        if (!this.isWalkable(standX, standZ)) continue;
        if (!this.approachClear(tx, tz, standX, standZ)) continue;
        candidates.push({
          x: standX,
          z: standZ,
          targetDist,
          centerX: centreX,
          centerZ: centreZ,
          startDist: Math.hypot(standX - sx, standZ - sz),
        });
      }
    }
    return candidates;
  }

  /**
   * Cheap reachability test for a harvest target: true when a walkable, approachable
   * stand point within `standRadius` shares the worker's connected component. It is a
   * superset of `findApproachPath` success (a stand point in the worker's component is
   * reachable by A*), so it can reject unreachable nodes without an A* search while
   * preserving the node the caller would otherwise have picked.
   */
  reachableToNode(sx: number, sz: number, tx: number, tz: number, standRadius: number): boolean {
    if (!(standRadius > 0)) return false;
    const start = this.resolveComponent(sx, sz, REACH_SEARCH_RADIUS);
    if (start === 0) return false;
    const comp = this.ensureComponents();
    const { cols } = this.grid;
    for (const c of this.standCandidates(sx, sz, tx, tz, standRadius)) {
      if (comp[this.clampCell(c.z) * cols + this.clampCell(c.x)] === start) return true;
    }
    return false;
  }

  /**
   * Line of sight from a stand point toward a blocked target, ignoring the
   * target's own blocked cell (the worker stops at harvest range and never
   * enters it). A wall between the stand cell and the target cell rejects the
   * candidate, so a worker cannot harvest through a building.
   */
  private approachClear(tx: number, tz: number, sx: number, sz: number): boolean {
    const { cell } = this.grid;
    const targetCx = Math.floor(tx / cell);
    const targetCz = Math.floor(tz / cell);
    const dist = Math.hypot(sx - tx, sz - tz);
    if (dist < 1e-6) return true;
    const steps = Math.max(1, Math.ceil(dist / 0.4));
    for (let i = steps; i >= 1; i--) {
      const s = (dist * i) / steps;
      const x = tx + ((sx - tx) / dist) * s;
      const z = tz + ((sz - tz) / dist) * s;
      if (Math.floor(x / cell) === targetCx && Math.floor(z / cell) === targetCz) break;
      if (!this.isWalkable(x, z)) return false;
    }
    return true;
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
