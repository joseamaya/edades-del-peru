import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AylluSite } from '../src/rendering/AylluSite';
import { ageSurface, aylluHut, box, slab, terracedField, type Parts } from '../src/rendering/aylluKit';
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
  it('bakes contact AO against the local ground into the merged colours', () => {
    const parts: Parts = [];
    // The kit builds at absolute terrain heights; this wall stands at 7 m, not at the site datum.
    box(parts, new THREE.Color('#c8b89a'), 0, 7, 0, 2, 2, 2);
    const geometry = parts[0]!;
    ageSurface(geometry, () => 7);
    const position = geometry.getAttribute('position');
    const color = geometry.getAttribute('color');
    let bottom = 0;
    let bottomCount = 0;
    let top = 0;
    let topCount = 0;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const value = color.getX(i);
      if (y < 7.1) {
        bottom += value;
        bottomCount++;
      } else if (y > 8.9) {
        top += value;
        topCount++;
      }
    }
    expect(bottom / bottomCount).toBeLessThan(top / topCount);
    expect(top / topCount).toBeLessThanOrEqual(1);
  });

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

  it('merges each phase by surface family with a textured material', () => {
    const parent = new THREE.Group();
    const site = new AylluSite(parent, (x, z) => slope(x, z) + 4, 4, {
      phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
      initial: 'cave',
    });
    const cave = site.group.children.find((group) => group.name === 'ayllu:cave')!;
    const families = cave.children.map((mesh) => mesh.name.split(':').pop());
    expect(families).toEqual(
      expect.arrayContaining(['stone', 'earth', 'plaster', 'thatch', 'wood', 'crops', 'people']),
    );
    const crops = cave.children.find((child) => child.name.endsWith(':crops'))!;
    site.updateLod(100);
    expect(crops.visible).toBe(false);
    site.updateLod(30);
    expect(crops.visible).toBe(true);
    for (const child of cave.children) {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.vertexColors, mesh.name).toBe(true);
      const flat = mesh.name.endsWith(':people') || mesh.name.endsWith(':crops') || mesh.name.endsWith(':cropsWet');
      if (flat) expect(material.map, mesh.name).toBeNull();
      else expect(material.map, mesh.name).not.toBeNull();
    }
    site.dispose();
  });

  it('greens only the canal-side field material when the acequia opens', () => {
    const parent = new THREE.Group();
    const site = new AylluSite(parent, (x, z) => slope(x, z) + 4, 4, {
      phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
      initial: 'cave',
    });
    const materials = (site as unknown as { materials: Map<string, THREE.MeshStandardMaterial> }).materials;
    const wet = materials.get('cropsWet')!;
    const dry = materials.get('crops')!;
    site.setIrrigated(true);
    expect(wet.color.getHexString()).toBe('d8f0c4');
    expect(dry.color.getHexString()).toBe('ffffff');
    site.setIrrigated(false);
    expect(wet.color.getHexString()).toBe('ffffff');
    site.dispose();
  });

  it('replaces the procedural cave and huaca when the hero GLBs arrive', () => {
    const parent = new THREE.Group();
    const site = new AylluSite(parent, (x, z) => slope(x, z) + 4, 4, {
      phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
      initial: 'cave',
    });
    const cave = { lod0: new THREE.Group(), lod1: new THREE.Group() };
    cave.lod0.name = 'cave-lod0';
    cave.lod1.name = 'cave-lod1';
    const huaca = { lod0: new THREE.Group(), lod1: new THREE.Group() };
    huaca.lod0.name = 'huaca-lod0';
    huaca.lod1.name = 'huaca-lod1';
    site.setHeroAssets({ cave, huaca });
    expect(site.group.getObjectByName('ayllu_hero_cave_fallback')?.visible).toBe(false);
    expect(site.group.getObjectByName('ayllu_hero_huaca_fallback')?.visible).toBe(false);
    expect(site.group.getObjectByName('cave-lod0')?.visible).toBe(true);
    expect(site.group.getObjectByName('cave-lod1')?.visible).toBe(false);
    expect(site.group.getObjectByName('ayllu_hero_cave_glb')?.visible).toBe(true);
    expect(site.group.getObjectByName('ayllu_hero_huaca_glb')?.visible).toBe(false);
    site.setPhase('huanacaure');
    expect(site.group.getObjectByName('ayllu_hero_huaca_glb')?.visible).toBe(true);
    site.setPhase('fundada');
    expect(site.group.getObjectByName('ayllu_hero_huaca_glb')?.visible).toBe(true);
    site.dispose();
  });

  it('shows the site by phase and keeps the latest pieces for the founded settlement', () => {
    const parent = new THREE.Group();
    const site = new AylluSite(parent, (x, z) => slope(x, z) + 4, 4, {
      phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
      initial: 'cave',
    });
    const phases = site.group.children.map((g) => g.name);
    expect(phases).toEqual(['ayllu_hero', 'ayllu:cave', 'ayllu:inticancha', 'ayllu:fundada']);
    site.setPhase('cave');
    expect(site.group.children.filter((g) => g.visible)).toHaveLength(2);
    expect(site.group.getObjectByName('ayllu_hero_cave_fallback')?.visible).toBe(true);
    expect(site.group.getObjectByName('ayllu_hero_huaca_fallback')?.visible).toBe(false);
    site.setPhase('fundada');
    expect(site.group.children.filter((g) => g.visible)).toHaveLength(4);
    expect(site.group.getObjectByName('ayllu_hero_huaca_fallback')?.visible).toBe(true);
    site.dispose();
  });
});
