import { describe, expect, it } from 'vitest';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import { CUSCO_CITY_BLOCKERS, CUSCO_CITY_LAYOUT, CUSCO_KIT_FOOTPRINTS } from '../src/model/defs/cuscoCity';
import { COLONIAL_KIT_FOOTPRINTS, colonialCityBlockers, colonialLayoutAt } from '../src/model/defs/colonialCity';
import { AUTHORED_SITES, LIMA_SITE_ORIGIN } from '../src/model/defs/sites';

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

describe('authored-site collision', () => {
  it('opts every authored site with blockers into headless collision', () => {
    for (const [id, site] of Object.entries(AUTHORED_SITES)) {
      if (site.blockers.length === 0) continue;
      expect(site.simulationCollision, id).toBe(true);
    }
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

describe('colonial city', () => {
  const anchor = LIMA_SITE_ORIGIN;

  it('blocks every building and leaves the plaza floor open', () => {
    const layout = colonialLayoutAt(anchor);
    const solid = layout.filter((p) => COLONIAL_KIT_FOOTPRINTS[p.asset]);
    const blockers = colonialCityBlockers(anchor);
    expect(blockers).toHaveLength(solid.length);
    expect(layout.filter((p) => !COLONIAL_KIT_FOOTPRINTS[p.asset]).map((p) => p.asset)).toEqual(['plaza']);
  });

  it('is the collision the four colonial sites use, from their own layout', () => {
    expect(AUTHORED_SITES.lima_site.blockers).toEqual(colonialCityBlockers(anchor, 'ciudad'));
    expect(AUTHORED_SITES.miraflores_site.blockers).toEqual(colonialCityBlockers(anchor, 'ciudad'));
    expect(AUTHORED_SITES.cusco_junta_site.blockers).toEqual(
      colonialCityBlockers(AUTHORED_SITES.cusco_junta_site.anchor, 'ciudad'),
    );
    expect(AUTHORED_SITES.colonial_site.blockers).toEqual(colonialCityBlockers(AUTHORED_SITES.colonial_site.anchor));
    // The cathedral closes the north side; the plaza centre holds the fountain, not a building.
    const blockers = colonialCityBlockers(anchor);
    expect(blockers.some((b) => b.z < anchor.z - 10)).toBe(true);
    const fountain = blockers.find((b) => Math.abs(b.x - anchor.x) < 0.01 && Math.abs(b.z - anchor.z) < 0.01);
    expect(fountain?.w).toBeCloseTo(3.6, 5);
  });
});
