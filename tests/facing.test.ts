import { describe, expect, it } from 'vitest';
import { angleDelta, facingRotation } from '../src/util/math';

describe('model facing', () => {
  it('maps movement yaw to the rotation of a +Z-facing model', () => {
    const forward = (yaw: number): [number, number] => [Math.sin(facingRotation(yaw)), Math.cos(facingRotation(yaw))];
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7, -2.1]) {
      const [x, z] = forward(yaw);
      expect(x).toBeCloseTo(Math.cos(yaw), 6);
      expect(z).toBeCloseTo(Math.sin(yaw), 6);
    }
  });

  it('uses the shortest signed delta between angles', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 6);
    expect(angleDelta(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2, 6);
    expect(angleDelta(0.2, Math.PI * 2 - 0.2)).toBeCloseTo(-0.4, 6);
    expect(angleDelta(-0.2, 0.2)).toBeCloseTo(0.4, 6);
  });
});
