import { describe, it, expect } from 'vitest';
import {
  clampToBounds,
  dragToWorld,
  edgeFactor,
  edgeVector,
  groundQuad,
  keyPanVector,
  normalize2D,
  rotateToWorld,
  worldPerPixel,
} from '../src/core/cameraMath';
import { CAMERA_SPEED_SCALE } from '../src/core/Config';

const rect = { left: 0, top: 0, right: 800, bottom: 600 };
const mag = (v: { x: number; y: number }): number => Math.hypot(v.x, v.y);

describe('camera keyboard pan', () => {
  it('moves along a single axis for cardinal keys', () => {
    expect(keyPanVector(['w'])).toEqual({ x: 0, y: -1 });
    expect(keyPanVector(['s'])).toEqual({ x: 0, y: 1 });
    expect(keyPanVector(['a'])).toEqual({ x: -1, y: 0 });
    expect(keyPanVector(['d'])).toEqual({ x: 1, y: 0 });
    // arrows are aliases
    expect(keyPanVector(['arrowup'])).toEqual({ x: 0, y: -1 });
    expect(keyPanVector(['arrowright'])).toEqual({ x: 1, y: 0 });
  });

  it('normalizes diagonals so W+A is not faster than W', () => {
    const w = keyPanVector(['w']);
    const wa = keyPanVector(['w', 'a']);
    expect(mag(wa)).toBeCloseTo(1, 6);
    expect(mag(wa)).toBeCloseTo(mag(w), 6);
  });

  it('is zero with no keys', () => {
    expect(keyPanVector([])).toEqual({ x: 0, y: 0 });
  });
});

describe('edge scrolling', () => {
  it('is zero outside the edge zone', () => {
    expect(edgeVector(400, 300, rect, 36)).toEqual({ x: 0, y: 0 });
  });

  it('is non-zero inside the zone', () => {
    const v = edgeVector(10, 300, rect, 36); // left edge
    expect(v.x).toBeLessThan(0);
    expect(Math.abs(v.y)).toBeLessThan(1e-6);
  });

  it('grows toward the border', () => {
    const near = edgeVector(rect.left + 30, 300, rect, 36);
    const closer = edgeVector(rect.left + 10, 300, rect, 36);
    const at = edgeVector(rect.left, 300, rect, 36);
    expect(Math.abs(near.x)).toBeLessThan(Math.abs(closer.x));
    expect(Math.abs(closer.x)).toBeLessThanOrEqual(Math.abs(at.x));
    expect(Math.abs(at.x)).toBeCloseTo(1, 6);
  });

  it('normalizes a corner (not faster than an edge)', () => {
    const corner = edgeVector(rect.left, rect.top, rect, 36);
    const edge = edgeVector(rect.left, 300, rect, 36);
    expect(mag(corner)).toBeCloseTo(1, 6);
    expect(mag(edge)).toBeCloseTo(1, 6);
  });

  it('clamps the progressive factor to [-1, 1]', () => {
    expect(edgeFactor(-100, 0, 800, 36)).toBe(-1);
    expect(edgeFactor(900, 0, 800, 36)).toBe(1);
    expect(edgeFactor(400, 0, 800, 36)).toBe(0);
  });
});

describe('middle-drag (grab the map)', () => {
  it('scales the screen delta by world-per-pixel', () => {
    const d = dragToWorld(100, 0, 0, 0.05);
    expect(d.x).toBeCloseTo(-100 * 0.05, 6);
    expect(d.y).toBeCloseTo(0, 6);
  });

  it('inverts direction relative to a camera-follow pan', () => {
    const wpp = 0.04;
    const grab = dragToWorld(50, 20, 0.7, wpp);
    const cameraFollow = rotateToWorld(50 * wpp, 20 * wpp, 0.7);
    expect(grab.x).toBeCloseTo(-cameraFollow.x, 6);
    expect(grab.y).toBeCloseTo(-cameraFollow.y, 6);
  });

  it('rotates with the camera yaw', () => {
    const straight = dragToWorld(0, 100, 0, 0.05);
    const rotated = dragToWorld(0, 100, Math.PI / 2, 0.05);
    expect(straight.x).toBeCloseTo(0, 6);
    expect(Math.abs(rotated.x)).toBeGreaterThan(0.1);
  });
});

describe('zoom-dependent speed', () => {
  it('world-per-pixel grows with zoom', () => {
    const fov = (48 * Math.PI) / 180;
    const near = worldPerPixel(28, fov, 800);
    const mid = worldPerPixel(100, fov, 800);
    const far = worldPerPixel(210, fov, 800);
    expect(near).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(near);
    expect(far).toBeGreaterThan(mid);
  });

  it('is zero for a degenerate viewport', () => {
    expect(worldPerPixel(50, 1, 0)).toBe(0);
  });
});

describe('map bounds', () => {
  it('clamps the target inside the map with a margin', () => {
    const c = clampToBounds(-100, 999, 192, 20, 20, 6);
    expect(c.x).toBeCloseTo(20 - 6, 6);
    expect(c.y).toBeCloseTo(192 - 20 + 6, 6);
  });

  it('centers an axis when the viewport is wider than the map', () => {
    const c = clampToBounds(0, 0, 192, 200, 20, 6);
    expect(c.x).toBeCloseTo(96, 6);
  });

  it('leaves an in-bounds target untouched', () => {
    expect(clampToBounds(96, 96, 192, 20, 20, 6)).toEqual({ x: 96, y: 96 });
  });
});

describe('vector helpers', () => {
  it('normalize2D keeps direction, unit length; zero stays zero', () => {
    const v = normalize2D(3, 4);
    expect(mag(v)).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(0.6, 6);
    expect(normalize2D(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('camera speed presets', () => {
  it('are ordered slow < normal < fast, with normal = 1', () => {
    expect(CAMERA_SPEED_SCALE.slow).toBeLessThan(CAMERA_SPEED_SCALE.normal);
    expect(CAMERA_SPEED_SCALE.normal).toBeLessThan(CAMERA_SPEED_SCALE.fast);
    expect(CAMERA_SPEED_SCALE.normal).toBe(1);
  });
});

// The camera sits at `target + (sin yaw, cos yaw)*horiz` and looks at the target,
// so its ground basis is forward=(-sin, -cos) and right=(cos, -sin). Panning must
// follow that basis — the regression that made WASD/edge move sideways.
describe('pan direction matches the camera basis', () => {
  type V = { x: number; y: number };
  const forward = (yaw: number): V => ({ x: -Math.sin(yaw), y: -Math.cos(yaw) });
  const right = (yaw: number): V => ({ x: Math.cos(yaw), y: -Math.sin(yaw) });
  const dot = (a: V, b: V): number => a.x * b.x + a.y * b.y;
  const expectVec = (a: V, b: V): void => {
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  };
  const key = (k: string, yaw: number): V => {
    const v = keyPanVector([k]);
    return rotateToWorld(v.x, v.y, yaw);
  };

  it('at yaw=0, W moves north (-z) and D moves east (+x)', () => {
    expectVec(key('w', 0), { x: 0, y: -1 });
    expectVec(key('s', 0), { x: 0, y: 1 });
    expectVec(key('a', 0), { x: -1, y: 0 });
    expectVec(key('d', 0), { x: 1, y: 0 });
  });

  for (const yaw of [0, Math.PI / 4, 1.2, -0.5]) {
    it(`W/A/S/D follow the camera basis at yaw=${yaw.toFixed(2)}`, () => {
      const f = forward(yaw);
      const r = right(yaw);
      expectVec(key('w', yaw), f);
      expectVec(key('s', yaw), { x: -f.x, y: -f.y });
      expectVec(key('d', yaw), r);
      expectVec(key('a', yaw), { x: -r.x, y: -r.y });
    });
  }

  it('edge at the bottom pans toward the bottom of the screen', () => {
    for (const yaw of [0, Math.PI / 4, 1.2]) {
      const v = edgeVector(400, 600, rect, 36); // bottom edge -> (0, +1)
      const w = rotateToWorld(v.x, v.y, yaw);
      // mostly backward (-forward), not sideways
      expect(dot(w, forward(yaw))).toBeLessThan(-0.9);
      expect(Math.abs(dot(w, right(yaw)))).toBeLessThan(0.05);
    }
  });
});

describe('ground footprint', () => {
  it('is north-up at yaw 0 and rotates with the camera', () => {
    const northUp = groundQuad(100, 100, 50, 2, 0);
    for (const [point, x, y] of [
      [northUp[0], 45, 131],
      [northUp[1], 155, 131],
      [northUp[2], 155, 69],
      [northUp[3], 45, 69],
    ] as const) {
      expect(point.x).toBeCloseTo(x, 6);
      expect(point.y).toBeCloseTo(y, 6);
    }

    const diagonal = groundQuad(100, 100, 50, 2, Math.PI / 4);
    const topMid = {
      x: (diagonal[2].x + diagonal[3].x) / 2,
      y: (diagonal[2].y + diagonal[3].y) / 2,
    };
    expect(topMid.x).toBeLessThan(100);
    expect(topMid.y).toBeLessThan(100);
    expect(diagonal[0].x).not.toBeCloseTo(diagonal[3].x);
  });
});
