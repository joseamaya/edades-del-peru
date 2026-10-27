import { describe, it, expect } from 'vitest';
import { Pathfinder } from '../src/game/Pathfinding';
import { terrainSlope } from '../src/util/math';

describe('Pathfinder', () => {
  it('finds a path between two free points', () => {
    const pf = new Pathfinder(100, 2);
    const path = pf.pathfind(10, 10, 90, 90);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 11, z: 11 });
    expect(path[path.length - 1]).toEqual({ x: 91, z: 91 });
  });

  it('routes around a wall with a gap', () => {
    const pf = new Pathfinder(100, 2);
    for (let z = 0; z < 45; z++) pf.addObstacle({ x: 50, z: z * 2, radius: 1.5 });
    pf.addObstacle({ x: 50, z: 47 * 2, radius: 1.5 });
    const path = pf.pathfind(10, 10, 90, 90);
    expect(path.length).toBeGreaterThan(0);
  });

  it('returns empty when the goal is blocked', () => {
    const pf = new Pathfinder(100, 2);
    for (let z = -5; z < 60; z++) pf.addObstacle({ x: 50, z: z * 2, radius: 1.6 });
    expect(pf.pathfind(10, 50, 90, 50)).toEqual([]);
  });

  it('returns empty when origin and destination are the same cell', () => {
    const pf = new Pathfinder(100, 2);
    expect(pf.pathfind(10, 10, 10.5, 10.5)).toEqual([]);
  });

  it('isWalkable respects obstacles', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 30, z: 30, radius: 3 });
    expect(pf.isWalkable(30, 30)).toBe(false);
    expect(pf.isWalkable(70, 70)).toBe(true);
  });

  it('reaches a goal sitting inside an obstacle (a building) instead of failing', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 50, z: 50, radius: 3 });
    const path = pf.pathfind(20, 20, 50, 50);
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(Math.hypot(last.x - 50, last.z - 50)).toBeLessThanOrEqual(8);
  });

  it('routes around an axis-aligned rectangular obstacle', () => {
    const pf = new Pathfinder(120, 2);
    pf.addObstacle({ x: 60, z: 60, w: 24, d: 24 });
    expect(pf.isWalkable(60, 60)).toBe(false);
    expect(pf.isWalkable(60, 50)).toBe(false);
    const path = pf.pathfind(20, 60, 100, 60);
    expect(path.length).toBeGreaterThan(0);
    for (const point of path) {
      expect(Math.abs(point.x - 60) > 12 || Math.abs(point.z - 60) > 12).toBe(true);
    }
  });

  it('keeps terrain (water) blocked after an obstacle is removed', () => {
    const pf = new Pathfinder(100, 2);
    // a "sea" for x < 20 (height 0 below the water line), land elsewhere
    pf.bakeTerrain((x) => (x < 20 ? 0 : 10), 5);
    expect(pf.isWalkable(10, 50)).toBe(false);
    expect(pf.isWalkable(50, 50)).toBe(true);
    const o = { x: 80, z: 50, radius: 3 };
    pf.addObstacle(o);
    pf.removeObstacle(o);
    // removing an obstacle must not turn the sea back into walkable ground
    expect(pf.isWalkable(10, 50)).toBe(false);
    expect(pf.isWalkable(50, 50)).toBe(true);
  });

  it('does not cut a corner blocked by a single lateral cell', () => {
    const pf = new Pathfinder(20, 2);
    const cols = pf.grid.cols;
    // start cell (1,1) -> goal cell (2,2); only the (2,1) lateral cell is blocked
    pf.grid.walkable[1 * cols + 2] = 0;
    const path = pf.pathfind(3, 3, 5, 5);
    // the single diagonal step is disallowed, so the route must go around it
    expect(path.length).toBeGreaterThanOrEqual(3);
  });
  it('keeps the diagonal when both lateral cells are free', () => {
    const pf = new Pathfinder(20, 2);
    const path = pf.pathfind(3, 3, 5, 5);
    expect(path).toEqual([
      { x: 3, z: 3 },
      { x: 5, z: 5 },
    ]);
  });

  it('bakes too-steep terrain non-walkable but keeps gentle slopes', () => {
    const pf = new Pathfinder(40, 2);
    // gentle (gradient 0.2 -> slope 0.1) for x < 30, a cliff (gradient 5) beyond
    pf.bakeTerrain((x) => (x < 30 ? x * 0.2 : x * 5), 0);
    expect(pf.isWalkable(10, 20)).toBe(true);
    expect(pf.isWalkable(35, 20)).toBe(false);
  });

  it('keeps flat terrain walkable', () => {
    const pf = new Pathfinder(40, 2);
    pf.bakeTerrain(() => 10, 0);
    expect(pf.isWalkable(20, 20)).toBe(true);
  });

  it('keeps steep terrain blocked after an obstacle is removed', () => {
    const pf = new Pathfinder(40, 2);
    pf.bakeTerrain((x) => (x < 30 ? x * 0.2 : x * 5), 0);
    const o = { x: 10, z: 20, radius: 3 };
    pf.addObstacle(o);
    pf.removeObstacle(o);
    expect(pf.isWalkable(35, 20)).toBe(false);
    expect(pf.isWalkable(10, 20)).toBe(true);
  });

  it('blocks crossing a solid cliff and keeps a gap passable', () => {
    // a solid cliff wall across the map: no route (with the old water-only rule
    // the flat wall interior was walkable and a straight path crossed it)
    const solid = new Pathfinder(80, 2);
    solid.bakeTerrain((x) => (x > 28 && x < 34 ? 100 : 10), 0);
    expect(solid.pathfind(10, 40, 60, 40)).toEqual([]);

    // the same wall with a wide gap: a valid route still exists through it
    const gapped = new Pathfinder(80, 2);
    gapped.bakeTerrain((x, z) => (x > 28 && x < 34 && !(z > 5 && z < 20) ? 100 : 10), 0);
    expect(gapped.pathfind(10, 40, 60, 40).length).toBeGreaterThan(0);
  });
});

describe('Pathfinder reachability cache', () => {
  it('reports open ground as reachable and blocked cells as component 0', () => {
    const pf = new Pathfinder(100, 2);
    expect(pf.reachable(10, 10, 90, 90)).toBe(true);
    pf.addObstacle({ x: 30, z: 30, radius: 3 });
    expect(pf.componentAt(30, 30)).toBe(0);
    expect(pf.componentAt(70, 70)).toBeGreaterThan(0);
  });

  it('splits the map when a wall is added and reconnects it when removed', () => {
    const pf = new Pathfinder(100, 2);
    expect(pf.reachable(20, 50, 80, 50)).toBe(true);
    const wall: { x: number; z: number; radius: number }[] = [];
    for (let z = -2; z <= 102; z += 2) {
      const o = { x: 50, z, radius: 2.1 };
      wall.push(o);
      pf.addObstacle(o);
    }
    expect(pf.reachable(20, 50, 80, 50)).toBe(false);
    for (const o of wall) pf.removeObstacle(o);
    expect(pf.reachable(20, 50, 80, 50)).toBe(true);
  });

  it('marks an enclosed pocket unreachable while its cells stay walkable', () => {
    const pf = new Pathfinder(100, 2);
    for (let a = 0; a < 72; a++) {
      const ang = (a / 72) * Math.PI * 2;
      pf.addObstacle({ x: 50 + Math.cos(ang) * 8, z: 50 + Math.sin(ang) * 8, radius: 2.1 });
    }
    expect(pf.isWalkable(50, 50)).toBe(true);
    expect(pf.componentAt(50, 50)).toBeGreaterThan(0);
    expect(pf.reachable(10, 10, 50, 50)).toBe(false);
  });

  it('invalidates the cache when terrain is baked', () => {
    const pf = new Pathfinder(100, 2);
    expect(pf.reachable(10, 50, 90, 50)).toBe(true);
    pf.bakeTerrain((x) => (x > 45 && x < 55 ? 0 : 10), 5);
    expect(pf.reachable(10, 50, 90, 50)).toBe(false);
  });

  it('reachableToNode agrees with findApproachPath and rejects enclosed targets', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 50, z: 50, radius: 1.1 });
    expect(pf.reachableToNode(20, 20, 50, 50, 2.2)).toBe(true);
    expect(pf.findApproachPath(20, 20, 50, 50, 2.2).length).toBeGreaterThan(0);

    // a target sealed in a ring has no stand point in the worker's component
    const sealed = new Pathfinder(100, 2);
    for (let a = 0; a < 72; a++) {
      const ang = (a / 72) * Math.PI * 2;
      sealed.addObstacle({ x: 50 + Math.cos(ang) * 8, z: 50 + Math.sin(ang) * 8, radius: 2.1 });
    }
    expect(sealed.reachableToNode(10, 10, 50, 50, 2.2)).toBe(false);
    expect(sealed.findApproachPath(10, 10, 50, 50, 2.2)).toEqual([]);
  });

  it('agrees with A* on whether a route exists', () => {
    const pf = new Pathfinder(100, 2);
    for (let z = -2; z <= 102; z += 2) pf.addObstacle({ x: 50, z, radius: 2.1 });
    const pairs: [number, number, number, number][] = [
      [20, 20, 80, 80],
      [20, 20, 20, 80],
      [80, 20, 80, 80],
    ];
    for (const [sx, sz, tx, tz] of pairs) {
      expect(pf.reachable(sx, sz, tx, tz)).toBe(pf.pathfind(sx, sz, tx, tz).length > 0);
    }
  });
});

describe('Pathfinder.findApproachPath', () => {
  it('returns a stand point inside harvest range of a blocked target', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 50, z: 50, radius: 1.1 });
    const path = pf.findApproachPath(20, 20, 50, 50, 2.2);
    expect(path.length).toBeGreaterThan(0);
    const last = path[path.length - 1];
    expect(Math.hypot(last.x - 50, last.z - 50)).toBeLessThanOrEqual(2.8);
    expect(pf.isWalkable(last.x, last.z)).toBe(true);
  });

  it('returns empty when no stand point exists within the radius', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 50, z: 50, radius: 6 });
    expect(pf.findApproachPath(20, 20, 50, 50, 2.2)).toEqual([]);
  });

  it('keeps a regular path and also finds an approach path for a small obstacle', () => {
    const pf = new Pathfinder(100, 2);
    pf.addObstacle({ x: 50, z: 50, radius: 1.1 });
    expect(pf.pathfind(20, 20, 50, 50).length).toBeGreaterThan(0);
    expect(pf.findApproachPath(20, 20, 50, 50, 2.2).length).toBeGreaterThan(0);
  });
});

describe('terrainSlope', () => {
  it('is flat, gentle and cliff on the expected scales', () => {
    expect(terrainSlope(() => 10, 20, 20, 2)).toBe(0);
    // gradient 0.2 -> slope 0.1
    expect(terrainSlope((x) => x * 0.2, 20, 20, 2)).toBeCloseTo(0.1, 6);
    // gradient 5 -> clamped to 1
    expect(terrainSlope((x) => x * 5, 20, 20, 2)).toBe(1);
  });
});
