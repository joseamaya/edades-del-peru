import { describe, expect, it } from 'vitest';
import {
  cropGeometry,
  fieldBorderGeometry,
  fieldGeometry,
  roadGeometry,
  SETTLEMENT_OFFSET,
} from '../src/rendering/SettlementOverlay';

/** A sloped "terrain": height grows with x and z. */
const height = (x: number, z: number): number => 0.2 * x + 0.1 * z;

function assertOnTerrain(geo: { getAttribute: (n: string) => any }, offset = SETTLEMENT_OFFSET): void {
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    expect(y).toBeCloseTo(height(x, z) + offset, 4);
  }
}

describe('settlement overlay geometry', () => {
  it('drapes a road ribbon over the terrain', () => {
    const geo = roadGeometry({ from: { x: 0, z: 0 }, to: { x: 10, z: -8 } }, height);
    expect(geo).not.toBeNull();
    assertOnTerrain(geo!);
    // sub-sampled: one cross-section per ~2-unit step
    expect(geo!.getAttribute('position').count).toBeGreaterThan(4);
  });

  it('makes a field conform to the terrain on every vertex', () => {
    const geo = fieldGeometry({ x: 10, z: -8, yaw: 0.4, size: 5 }, height);
    assertOnTerrain(geo);
    // subdivided into a grid, not four flat corners
    expect(geo.getAttribute('position').count).toBeGreaterThan(4);
  });

  it('edging drapes over the field footprint and stays low', () => {
    const edges = fieldBorderGeometry({ x: 10, z: -8, yaw: 0.4, size: 5 }, height);
    expect(edges).toHaveLength(4);
    for (const geo of edges) {
      expect(geo.getAttribute('position').count).toBeGreaterThan(0);
      assertOnTerrain(geo, SETTLEMENT_OFFSET + 0.02);
    }
  });

  it('lays young-crop rows that follow the field terrain', () => {
    const rows = cropGeometry({ x: 10, z: -8, yaw: 0.4, size: 5 }, height);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const geo of rows) assertOnTerrain(geo, SETTLEMENT_OFFSET + 0.04);
  });
});
