import { describe, expect, it, vi } from 'vitest';
import { Projectile } from '../src/entities/Projectile';
import { Vec3 } from '../src/sim/Vec3';

function shot(target: Vec3, extra: Partial<ConstructorParameters<typeof Projectile>[0]> = {}) {
  return new Projectile({
    from: new Vec3(0, 0, 0),
    target,
    speed: 5,
    damage: 10,
    kind: 'arrow',
    owner: 0,
    ...extra,
  });
}

describe('Projectile simulation', () => {
  it('travels towards the target and hits it', () => {
    const onHit = vi.fn();
    const p = shot(new Vec3(10, 0, 0), { targetId: 7, onHit });
    p.update(1);
    expect(p.pos.x).toBeCloseTo(5);
    expect(p.dead).toBe(false);
    p.update(2);
    expect(p.dead).toBe(true);
    expect(p.impact).toBe(true);
    expect(onHit).toHaveBeenCalledWith(7);
  });

  it('expires without an impact after its lifetime', () => {
    const onHit = vi.fn();
    const p = shot(new Vec3(100, 0, 0), { onHit });
    p.update(9);
    expect(p.dead).toBe(true);
    expect(p.impact).toBe(false);
    expect(onHit).not.toHaveBeenCalled();
  });

  it('re-aims at a moving target when homing is available', () => {
    const target = new Vec3(10, 0, 0);
    const p = shot(target, { targetId: 3, getTargetPos: () => target });
    target.set(10, 0, 10);
    p.update(0.1);
    expect(p.target.z).toBeCloseTo(10);
  });

  it('applies the parabolic arc', () => {
    const flat = shot(new Vec3(10, 0, 0));
    flat.update(1);
    const arc = shot(new Vec3(10, 0, 0), { arc: 1 });
    arc.update(1);
    expect(arc.pos.y).toBeGreaterThan(flat.pos.y);
  });
});
