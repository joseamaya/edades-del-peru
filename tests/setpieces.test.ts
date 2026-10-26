import { describe, expect, it } from 'vitest';
import { inCaralCity, planCaralCity } from '../src/model/defs/setpieces';

const SIZE = 128;
const UPPER = { x: 0.5 * SIZE, z: 0.31 * SIZE };
const LOWER = { x: 0.5 * SIZE, z: 0.76 * SIZE };

function plan() {
  return planCaralCity({ size: SIZE, upper: UPPER, lower: LOWER });
}

describe('Caral sacred-city plan', () => {
  it('is deterministic for the same anchors', () => {
    expect(plan()).toEqual(plan());
  });

  it('keeps the documented Upper-Half pyramid hierarchy', () => {
    const p = plan();
    expect(p.mainPyramid.name).toBe('greater');
    const upper = p.placements.filter((x) => x.kind === 'pyramid');
    const names = new Set(upper.map((x) => x.name));
    for (const name of ['central', 'quarry', 'lesser', 'gallery', 'huanca']) {
      expect(names.has(name), name).toBe(true);
    }
    const others = upper.filter(
      (x) => x.name !== 'amphitheatre' && x.name !== 'round_altar' && x.name !== 'bench_temple',
    );
    expect(p.mainPyramid.width).toBeGreaterThan(Math.max(...others.map((x) => x.width)));
  });

  it('includes the Central Plaza, Plaza de la Huanca and the monolith', () => {
    const p = plan();
    const names = new Set(p.placements.map((x) => x.name));
    expect(names.has('central_plaza')).toBe(true);
    expect(names.has('plaza_de_la_huanca')).toBe(true);
    expect(p.placements.some((x) => x.kind === 'monolith' && x.name === 'la_huanca')).toBe(true);
    expect(p.placements.filter((x) => x.kind === 'plaza').length).toBe(5);
  });

  it('includes the Lower-Half Amphitheatre Temple and its large sunken plaza', () => {
    const p = plan();
    expect(p.placements.some((x) => x.kind === 'temple' && x.name === 'amphitheatre')).toBe(true);
    expect(p.placements.some((x) => x.kind === 'temple' && x.name === 'round_altar')).toBe(true);
    expect(p.placements.some((x) => x.kind === 'temple' && x.name === 'bench_temple')).toBe(true);
    const plaza = p.placements.find((x) => x.kind === 'sunken_plaza' && x.name === 'amphitheatre_plaza');
    expect(plaza?.radius).toBeGreaterThan(4);
    // The Amphitheatre is linked to the largest sunken plaza in the city.
    expect(plaza?.radius).toBeGreaterThan(p.mainPyramid.width * 0.46);
  });

  it('marks the modular anchor and every procedural placement the Blender kit replaces', () => {
    const p = plan();
    const amph = p.placements.find((x) => x.modularAnchor);
    expect(amph?.name).toBe('amphitheatre');
    expect(
      p.placements
        .filter((x) => x.modularReplaced)
        .map((x) => x.name)
        .sort(),
    ).toEqual(['amphitheatre', 'bench_temple', 'central', 'gallery', 'huanca', 'lesser', 'quarry', 'round_altar']);
  });

  it('keeps the two halves apart and inside the map', () => {
    const p = plan();
    expect(p.upper.z).toBeLessThan(p.lower.z);
    expect(p.lower.z - p.upper.z).toBeGreaterThan(40);
    for (const placement of p.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.x).toBeLessThanOrEqual(SIZE);
      expect(placement.z).toBeGreaterThanOrEqual(0);
      expect(placement.z).toBeLessThanOrEqual(SIZE);
    }
  });

  it('reserves both city footprints for resource/prop exclusion', () => {
    const p = plan();
    expect(inCaralCity(p, p.upper.x, p.upper.z)).toBe(true);
    expect(inCaralCity(p, p.lower.x, p.lower.z)).toBe(true);
    expect(inCaralCity(p, 2, 2)).toBe(false);
  });
});
