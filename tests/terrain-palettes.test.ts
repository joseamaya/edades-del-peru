import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { AUTHORED_SITES } from '../src/model/defs/sites';
import { TERRAIN_PALETTES } from '../src/model/defs/terrainPalettes';

function luminance(hex: string): number {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
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

  it('separates the four playable map types in luminance, not only hue', () => {
    const grass = ['central_coast', 'andean_valley', 'altiplano', 'amazon'].map((id) =>
      luminance(TERRAIN_PALETTES[id as keyof typeof TERRAIN_PALETTES].materials.grass),
    );
    expect(new Set(grass.map((value) => value.toFixed(2))).size).toBeGreaterThan(1);
    expect(Math.max(...grass) - Math.min(...grass)).toBeGreaterThan(0.03);
  });
});
