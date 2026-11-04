import { describe, expect, it } from 'vitest';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { AUTHORED_SITES } from '../src/model/defs/sites';
import { TERRAIN_PALETTES, terrainBandWeights } from '../src/model/defs/terrainPalettes';

function luminance(hex: string): number {
  const value = parseInt(hex.replace('#', ''), 16);
  return (0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255)) / 255;
}

describe('terrain palettes', () => {
  it('covers every map profile and the authored Caral site', () => {
    for (const profile of Object.values(MAP_PROFILES)) {
      expect(TERRAIN_PALETTES[profile.region], profile.id).toBeDefined();
    }
    expect(TERRAIN_PALETTES[AUTHORED_SITES.caral_site.terrain.palette!]).toBeDefined();
  });

  it('has valid material and band colours with a bounded texture mix', () => {
    for (const palette of Object.values(TERRAIN_PALETTES)) {
      for (const hex of [...Object.values(palette.materials), ...Object.values(palette.bands)]) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(palette.textureMix).toBeGreaterThan(0);
      expect(palette.textureMix).toBeLessThanOrEqual(1);
    }
  });

  it('keeps summit weights on steep high ground', () => {
    const peak = terrainBandWeights(20, 6, 2.2, 15);
    expect(peak.summit).toBeCloseTo(1, 5);
    expect(peak.valley + peak.slope + peak.loma + peak.summit).toBeCloseTo(1, 5);
    const valley = terrainBandWeights(4, 0, 2.2, 15);
    expect(valley.valley).toBeGreaterThan(valley.slope);
    expect(valley.valley + valley.slope + valley.loma + valley.summit).toBeCloseTo(1, 5);
  });

  it('separates the four playable map types in luminance, not only hue', () => {
    const grass = ['central_coast', 'andean_valley', 'altiplano', 'amazon'].map((id) =>
      luminance(TERRAIN_PALETTES[id as keyof typeof TERRAIN_PALETTES].materials.grass),
    );
    expect(new Set(grass.map((value) => value.toFixed(2))).size).toBeGreaterThan(1);
    expect(Math.max(...grass) - Math.min(...grass)).toBeGreaterThan(0.03);
  });
});
