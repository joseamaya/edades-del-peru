import { RNG } from '../util/rng';
import { distance2D } from '../util/math';

import type { ResourceNode } from '../entities/ResourceNode';

export type ResourceNodeKind = ResourceNode['kind'];

export interface StartResourceOptions {
  player: number;
  x: number;
  z: number;
  seed: number;
  /** Authored Caral opening keeps the grove on the valley edge. */
  caralOpening?: boolean;
  /** Lower-city centre for the Caral setpiece plan. */
  setpieceLower?: { x: number; z: number };
  isReserved(x: number, z: number): boolean;
  isWalkable(x: number, z: number): boolean;
  /** Fresh iterable per call, including nodes added earlier in this pass. */
  existing(): Iterable<{ pos: { x: number; z: number } }>;
  add(kind: ResourceNodeKind, amount: number, x: number, z: number): void;
}

/**
 * Deterministic opening resource ring for one player. Placement rules, RNG
 * order and fallback spirals match the original Game implementation.
 */
export function placeStartResources(options: StartResourceOptions): void {
  const rng = new RNG(options.seed + options.player * 911);
  const place = (kind: ResourceNodeKind, amount: number, dx: number, dz: number): boolean => {
    const nx = options.x + dx;
    const nz = options.z + dz;
    if (options.isReserved(nx, nz) || !options.isWalkable(nx, nz)) return false;
    const gap = kind === 'tree' ? 6 : 3;
    for (const node of options.existing()) if (distance2D(node.pos.x, node.pos.z, nx, nz) < gap) return false;
    options.add(kind, amount, nx, nz);
    return true;
  };

  if (options.caralOpening) {
    for (let i = 0; i < 5; i++) {
      place('tree', rng.range(140, 200), -18 + rng.range(-1.5, 1.5), rng.range(-1.5, 1.5));
    }
    place('well', 400, -18, 20);
    place('berry', 150, 20, 20);
  } else if (options.setpieceLower) {
    const grove = options.setpieceLower;
    for (let i = 0; i < 8; i++) {
      const tx = grove.x - 14 + rng.range(-4, 4);
      const tz = grove.z - 22 + rng.range(-2, 2);
      place('tree', rng.range(140, 200), tx - options.x, tz - options.z);
    }
    place('mine', 400, -13, -24);
    place('berry', 150, 12, -24);
  } else {
    const slots: Array<{ kind: ResourceNodeKind; amount: number; angle: number; radius: number }> = [
      { kind: 'berry', amount: 180, angle: Math.PI * 1.1, radius: 10 },
      { kind: 'hunt', amount: 180, angle: Math.PI * 1.55, radius: 12 },
      { kind: 'mine', amount: 450, angle: Math.PI * 0.85, radius: 13 },
      { kind: 'well', amount: 420, angle: Math.PI * 1.32, radius: 14 },
    ];
    for (const slot of slots) {
      let done = false;
      for (let k = 0; k < 16 && !done; k++) {
        const angle = slot.angle + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.22;
        const radius = slot.radius + Math.floor(k / 8) * 3;
        done = place(slot.kind, slot.amount, Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      if (!done) {
        for (let r = slot.radius; r <= slot.radius + 18 && !done; r += 2) {
          for (let k = 0; k < 16 && !done; k++) {
            const angle = (k / 16) * Math.PI * 2;
            done = place(slot.kind, slot.amount, Math.cos(angle) * r, Math.sin(angle) * r);
          }
        }
      }
    }
    const groveAngle = Math.PI * 0.25;
    for (let gr = 0; gr < 3; gr++) {
      const gx = Math.cos(groveAngle + gr * 0.7) * (12 + gr * 4);
      const gz = Math.sin(groveAngle + gr * 0.7) * (12 + gr * 4);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        place('tree', 210, gx + Math.cos(a) * 8, gz + Math.sin(a) * 8);
      }
    }
  }
}
