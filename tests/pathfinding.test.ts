import { describe, it, expect } from 'vitest';
import { Pathfinder } from '../src/game/Pathfinding';

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
});
