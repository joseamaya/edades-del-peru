import { describe, expect, it } from 'vitest';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import { CUSCO_CITY_BLOCKERS, CUSCO_CITY_LAYOUT, CUSCO_KIT_FOOTPRINTS } from '../src/model/defs/cuscoCity';
import { AUTHORED_SITES } from '../src/model/defs/sites';

describe('layoutBlockers', () => {
  it('turns and scales a footprint with its placement', () => {
    const [b] = layoutBlockers([{ asset: 'hall', x: 10, z: 20, rotY: Math.PI / 2, scale: [2, 1, 1] }], {
      hall: { minX: -5, maxX: 5, minZ: -2, maxZ: 2 },
    });
    // 20 m along the model's X becomes 20 m along the map's Z after a quarter turn.
    expect(b!.x).toBeCloseTo(10);
    expect(b!.z).toBeCloseTo(20);
    expect(b!.w).toBeCloseTo(4);
    expect(b!.d).toBeCloseTo(20);
  });

  it('keeps an off-centre footprint where the model puts it', () => {
    const [b] = layoutBlockers([{ asset: 'terrace', x: 0, z: 0, rotY: 0, scale: [1, 1, 1] }], {
      terrace: { minX: -7, maxX: 7, minZ: -5, maxZ: 10.5 },
    });
    expect(b!.z).toBeCloseTo(2.75);
    expect(b!.d).toBeCloseTo(15.5);
  });

  it('leaves pieces without a footprint walkable', () => {
    expect(layoutBlockers([{ asset: 'floor', x: 0, z: 0, rotY: 0, scale: [1, 1, 1] }], {})).toEqual([]);
  });
});

describe('Cusco city', () => {
  it('blocks every building of the composition and nothing else', () => {
    const solid = CUSCO_CITY_LAYOUT.filter((p) => CUSCO_KIT_FOOTPRINTS[p.asset]);
    expect(solid.length).toBe(CUSCO_CITY_LAYOUT.length - 1);
    expect(CUSCO_CITY_BLOCKERS).toHaveLength(solid.length);
    expect(CUSCO_CITY_LAYOUT.find((p) => !CUSCO_KIT_FOOTPRINTS[p.asset])?.asset).toBe('plaza');
  });

  it('is the site the simulation blocks', () => {
    expect(AUTHORED_SITES.cusco_inca_site.blockers).toBe(CUSCO_CITY_BLOCKERS);
  });
});
