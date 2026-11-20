import { TERRAIN_PALETTES, type TerrainPaletteId } from '../model/defs/terrainPalettes';

const WATER = 'rgba(30,80,120,0.9)';
const BEACH = 'rgba(200,180,130,0.95)';
const FALLBACK = 'rgba(90,120,70,0.95)';

/** `#rrggbb` to `rgba(r,g,b,a)`; the minimap needs an alpha to sit over the cached terrain. */
function rgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Minimap ground colour for a map palette. The old background hard-coded green bands, so a desert
 * mission (Tarapacá) still looked like a jungle on the minimap; the bands now come from the same
 * `TERRAIN_PALETTES` the terrain renders with.
 */
export function minimapGroundColor(
  palette: TerrainPaletteId | undefined,
  height: number,
  isWater: boolean,
  isBeach: boolean,
): string {
  if (isWater) return WATER;
  if (isBeach) return BEACH;
  const bands = palette ? TERRAIN_PALETTES[palette]?.bands : undefined;
  if (!bands) return FALLBACK;
  if (height > 9) return rgba(bands.summit, 0.95);
  if (height > 5) return rgba(bands.loma, 0.95);
  return rgba(bands.valley, 0.95);
}
