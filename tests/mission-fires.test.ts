import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';

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
