import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { CUSCO_CITY_FIRES, CUSCO_CITY_LAYOUT } from '../src/model/defs/cuscoCity';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('documented mission fires', () => {
  it('lights the Cusco roofs when Sacsayhuamán falls', () => {
    const fires = mission('m_cusco_1536').fires ?? [];
    expect(fires.length).toBeGreaterThan(0);
    expect(fires.every((fire) => fire.objectiveId === 'a1_sacsay')).toBe(true);
  });

  it('burns the Vilcabamba refuge during the evacuation', () => {
    const fires = mission('m_vilcabamba').fires ?? [];
    expect(fires.length).toBeGreaterThan(0);
    expect(fires.every((fire) => fire.objectiveId === 'a2_evacua')).toBe(true);
  });
});

describe('Cusco fire placement', () => {
  it('burns on buildings the kit actually places, not on empty ground', () => {
    const placed = new Set(CUSCO_CITY_LAYOUT.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`));
    for (const fire of CUSCO_CITY_FIRES) {
      expect(placed.has(`${fire.pos.dx.toFixed(2)},${fire.pos.dz.toFixed(2)}`)).toBe(true);
      expect(fire.height).toBeGreaterThanOrEqual(4);
    }
  });

  it('is the list the mission lights', () => {
    expect(mission('m_cusco_1536').fires?.map((fire) => fire.pos)).toEqual(CUSCO_CITY_FIRES.map((fire) => fire.pos));
  });
});
