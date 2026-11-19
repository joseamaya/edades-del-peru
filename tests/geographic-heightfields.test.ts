import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getAuthoredSite } from '../src/model/defs/sites';

const REUSED = [
  'm6b_guerra_civil',
  'm_lima_1821',
  'm_miraflores',
  'm_real_felipe',
  'm_tarapaca',
  'm_vilcabamba',
  'm_brena',
];

describe('geographic phase 1 heightfields', () => {
  it('gives every reused site mission its own heightfield override', () => {
    for (const id of REUSED) {
      const mission = MISSIONS.find((m) => m.id === id)!;
      const site = getAuthoredSite(mission.layout?.site?.id);
      expect(site, id).toBeDefined();
      expect(mission.layout?.site?.heightField, id).toBeDefined();
      expect(mission.layout?.site?.heightField).not.toBe(site!.heightField);
    }
  });

  it('keeps the overrides at the authored field sizes', () => {
    const sizes = new Map<string, number>();
    for (const id of REUSED) {
      const mission = MISSIONS.find((m) => m.id === id)!;
      const field = mission.layout!.site!.heightField!;
      expect(field.worldSize, id).toBe(256);
      sizes.set(id, field.size);
    }
    expect(sizes.get('m6b_guerra_civil')).toBe(257);
    expect(sizes.get('m_tarapaca')).toBe(257);
    expect(sizes.get('m_vilcabamba')).toBe(257);
    expect(sizes.get('m_brena')).toBe(257);
    expect(sizes.get('m_lima_1821')).toBe(129);
    expect(sizes.get('m_miraflores')).toBe(129);
    expect(sizes.get('m_real_felipe')).toBe(129);
  });
});
