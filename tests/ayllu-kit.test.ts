import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AylluSite } from '../src/rendering/AylluSite';
import { aylluHut, slab, terracedField, type Parts } from '../src/rendering/aylluKit';
import {
  TAMBOTOCO_FIELDS,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../src/model/defs/tambotocoLayout';

/** A synthetic slope with the same order of magnitude as the Pacaritambo valley. */
const slope = (x: number, z: number): number => 3 + x * 0.1 + z * 0.04;

const HUTS: readonly AylluHut[] = [
  ...TAMBOTOCO_SHRINE_HUTS,
  ...TAMBOTOCO_VILLAGES.flatMap((v) => v.huts),
  ...TAMBOTOCO_INTICANCHA_HUTS,
];

function verticalRange(parts: Parts): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const g of parts) {
    const position = g.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
  }
  return { min, max };
}

describe('the ayllu kit', () => {
  it('buries every plinth below the lowest ground it spans', () => {
    const parts: Parts = [];
    const top = slab(parts, new THREE.Color('#ffffff'), {
      x: 10,
      z: 10,
      w: 6,
      d: 4,
      lift: 0.1,
      burial: 0.8,
      getHeight: slope,
    });
    const corners = [
      [7, 8],
      [13, 8],
      [13, 12],
      [7, 12],
    ] as const;
    const highest = Math.max(...corners.map(([x, z]) => slope(x, z)));
    const lowest = Math.min(...corners.map(([x, z]) => slope(x, z)));
    // The slab samples a 3x3 grid; on a plane its top is still the highest corner plus the lift.
    expect(top).toBeCloseTo(highest + 0.1, 5);
    const range = verticalRange(parts);
    expect(range.min).toBeLessThanOrEqual(lowest - 0.79);
    expect(range.max).toBeCloseTo(top, 5);
  });

  it('stands every house volume on its own plinth', () => {
    for (const hut of HUTS) {
      const parts: Parts = [];
      const result = aylluHut(parts, hut, slope);
      const ground = slope(hut.x, hut.z);
      // The roof rises above the eave, but by a roof's height, not a tower's.
      expect(result.top - result.eave, `${hut.kind ?? 'house'} at ${hut.x},${hut.z}`).toBeGreaterThan(0.4);
      expect(result.top - result.eave).toBeLessThan(1.4);
      // The plinth is buried at the lowest corner of its footprint, so nothing floats on the slope.
      expect(verticalRange(parts).min).toBeLessThan(ground);
    }
  });

  it('draws three distinct dwelling silhouettes and uses all of them in the layout', () => {
    const kinds = new Set(HUTS.map((h) => h.kind ?? 'house'));
    expect([...kinds].sort()).toEqual(['house', 'shed', 'storehouse']);
    for (const village of TAMBOTOCO_VILLAGES) {
      expect(
        village.huts.some((h) => h.kind === 'storehouse'),
        village.name,
      ).toBe(true);
    }
  });

  it('terraces a field instead of floating one rectangle over the slope', () => {
    const parts: Parts = [];
    terracedField(parts, TAMBOTOCO_FIELDS[0]!, slope);
    const range = verticalRange(parts);
    expect(range.min).toBeLessThan(slope(TAMBOTOCO_FIELDS[0]!.x, TAMBOTOCO_FIELDS[0]!.z));
    expect(range.max - range.min).toBeGreaterThan(0.9);
  });

  it('shows the site by phase and keeps the latest pieces for the founded settlement', () => {
    const parent = new THREE.Group();
    const site = new AylluSite(parent, (x, z) => slope(x, z) + 4, 4, {
      phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
      initial: 'cave',
    });
    const phases = site.group.children.map((g) => g.children[0]?.name);
    expect(phases).toEqual(['ayllu:cave', 'ayllu:huanacaure', 'ayllu:inticancha', 'ayllu:fundada']);
    site.setPhase('cave');
    expect(site.group.children.filter((g) => g.visible)).toHaveLength(1);
    site.setPhase('fundada');
    expect(site.group.children.filter((g) => g.visible)).toHaveLength(4);
    site.dispose();
  });
});
