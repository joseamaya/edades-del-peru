import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COMMANDERS, commanderFor, normalizeCommanderName } from '../src/model/defs/commanders';
import { portraitSvg } from '../src/ui/Portrait';
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

  it('cites existing dossiers in docs/historia/', () => {
    for (const c of Object.values(COMMANDERS)) {
      if (!c.source) continue;
      expect(fs.existsSync(path.resolve(c.source)), `${c.id} -> ${c.source}`).toBe(true);
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

describe('portrait renderer', () => {
  it('uses unique svg ids per instance (no clipPath collisions)', () => {
    const cmd = COMMANDERS.grau;
    const a = portraitSvg(cmd);
    const b = portraitSvg(cmd);
    const idOf = (s: string): string => s.match(/clipPath id="([^"]+)"/)![1];
    expect(idOf(a)).not.toBe(idOf(b));
  });

  it('escapes text interpolated into the SVG', () => {
    const evil = { ...COMMANDERS.grau, name: 'A <b>&"x' };
    const svg = portraitSvg(evil);
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;b&gt;');
    expect(svg).toContain('&amp;');
  });

  it('labels the image for assistive tech', () => {
    expect(portraitSvg(COMMANDERS.grau)).toContain('role="img"');
    expect(portraitSvg(COMMANDERS.grau)).toContain('aria-label="Retrato estilizado de Miguel Grau"');
  });
});
