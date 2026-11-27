import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Particles } from '../src/rendering/Particles';

type Inspectable = {
  additive: { pool: { active: boolean; emissive: boolean }[] };
  normal: { pool: { active: boolean; emissive: boolean }[] };
};

type FlameParticle = { active: boolean; pos: { x: number; z: number }; vel: { y: number } };

const active = (pool: { active: boolean }[]) => pool.filter((p) => p.active).length;

describe('particle layers', () => {
  it('puts fire on the additive layer and smoke on the normal one', () => {
    const particles = new Particles(new THREE.Scene(), 64);
    particles.emit({ x: 0, y: 1, z: 0, kind: 'fire' });
    particles.emit({ x: 0, y: 1, z: 0, kind: 'smoke' });
    const layers = particles as unknown as Inspectable;
    expect(active(layers.additive.pool)).toBe(1);
    expect(active(layers.normal.pool)).toBe(1);
    expect(layers.additive.pool.find((p) => p.active)?.emissive).toBe(true);
    expect(layers.normal.pool.find((p) => p.active)?.emissive).toBe(false);
    particles.dispose();
  });

  it('gives heavy ordnance a larger flash plus smoke than a firearm', () => {
    const particles = new Particles(new THREE.Scene(), 64);
    particles.emitGunFlash(0, 1, 0, true);
    const heavy = particles as unknown as Inspectable;
    expect(active(heavy.additive.pool)).toBe(24);
    expect(active(heavy.normal.pool)).toBe(8);

    particles.clear();
    particles.emitGunFlash(0, 1, 0, false);
    expect(active(heavy.additive.pool)).toBe(6);
    expect(active(heavy.normal.pool)).toBe(0);
    particles.dispose();
  });

  it('advances both layers without leaving a live particle behind', () => {
    const particles = new Particles(new THREE.Scene(), 32);
    particles.emit({ x: 0, y: 1, z: 0, kind: 'fire', life: 0.2 });
    particles.emit({ x: 0, y: 1, z: 0, kind: 'smoke', life: 0.2 });
    for (let i = 0; i < 30; i++) particles.update(1 / 60);
    const layers = particles as unknown as Inspectable;
    expect(active(layers.additive.pool)).toBe(0);
    expect(active(layers.normal.pool)).toBe(0);
    particles.dispose();
  });

  it('keeps a non-emissive flame body on the normal layer', () => {
    const particles = new Particles(new THREE.Scene(), 64);
    particles.emit({ x: 0, y: 1, z: 0, kind: 'fire', emissive: false, count: 3 });
    const layers = particles as unknown as Inspectable;
    expect(active(layers.normal.pool)).toBe(3);
    expect(active(layers.additive.pool)).toBe(0);
    particles.dispose();
  });

  it('spreads a plume over a footprint and makes it climb', () => {
    const particles = new Particles(new THREE.Scene(), 64);
    particles.emit({ x: 0, y: 1, z: 0, kind: 'fire', count: 8, spread: 2, plume: true });
    const pool = (particles as unknown as Inspectable & { additive: { pool: FlameParticle[] } }).additive.pool;
    const flames = pool.filter((p) => p.active);
    expect(new Set(flames.map((p) => p.pos.x.toFixed(2))).size).toBeGreaterThan(1);
    expect(flames.every((p) => p.vel.y > 0)).toBe(true);
    particles.dispose();
  });
});
