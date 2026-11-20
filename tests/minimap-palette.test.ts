import { describe, expect, it } from 'vitest';
import { minimapGroundColor } from '../src/ui/minimapPalette';

function channels(color: string): { r: number; g: number; b: number } {
  const match = color.match(/rgba?\((\d+),(\d+),(\d+)/);
  if (!match) throw new Error(`not a colour: ${color}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

describe('minimap palette', () => {
  it('paints the Atacama ochre instead of the hard-coded green bands', () => {
    const valley = channels(minimapGroundColor('atacama', 4, false, false));
    expect(valley.r).toBeGreaterThan(valley.g);
    expect(valley.g).toBeGreaterThan(valley.b);
    const slope = channels(minimapGroundColor('atacama', 6, false, false));
    expect(slope.r).toBeGreaterThan(slope.g);
  });

  it('keeps a green region green', () => {
    const amazon = channels(minimapGroundColor('amazon', 4, false, false));
    expect(amazon.g).toBeGreaterThan(amazon.r);
    const southCoast = channels(minimapGroundColor('south_coast', 4, false, false));
    expect(southCoast.g).toBeGreaterThan(southCoast.b);
  });

  it('keeps water and beaches readable in every palette', () => {
    const water = channels(minimapGroundColor('atacama', 1, true, false));
    expect(water.b).toBeGreaterThan(water.r);
    const beach = channels(minimapGroundColor('atacama', 3, false, true));
    expect(beach.r).toBeGreaterThan(beach.b);
  });
});
