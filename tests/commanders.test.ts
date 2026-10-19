import { describe, it, expect } from 'vitest';
import { COMMANDERS, commanderFor, normalizeCommanderName } from '../src/model/defs/commanders';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getCiv } from '../src/model/defs/civs';

describe('campaign commanders', () => {
  it('has well-formed definitions', () => {
    for (const [id, c] of Object.entries(COMMANDERS)) {
      expect(c.id, id).toBe(id);
      expect(c.name.length, id).toBeGreaterThan(2);
      expect(c.role.length, id).toBeGreaterThan(2);
      expect(getCiv(c.civ).id, id).toBe(c.civ);
      expect(['documented', 'abstraction'], id).toContain(c.status);
    }
  });

  it('every mission commander exists', () => {
    for (const mis of MISSIONS) {
      for (const id of mis.commanders ?? []) {
        expect(COMMANDERS[id], `${mis.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it('resolves names accent- and case-insensitively', () => {
    expect(commanderFor('Miguel Grau')?.id).toBe('grau');
    expect(commanderFor('TUPAC AMARU II')?.id).toBe('tupac_amaru');
    expect(commanderFor('José de San Martín')?.id).toBe('san_martin');
    expect(commanderFor('Micaela Bastidas')?.id).toBe('micaela_bastidas');
    expect(commanderFor('general patriota')).toBeUndefined();
    expect(normalizeCommanderName('  Túpac   Yupanqui ')).toBe('tupac yupanqui');
  });

  it('the late-campaign missions carry portraits', () => {
    for (const id of ['m5_yahuar_pampa', 'm6_chimu_inca', 'm7_tupac_amaru', 'm8_independencia', 'm9_guerra_pacifico']) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.commanders?.length, id).toBeGreaterThan(0);
    }
  });
});
