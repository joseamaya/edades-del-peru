import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMMANDERS,
  commanderAccent,
  commanderById,
  commanderFor,
  commanderShortName,
  DEFAULT_HERO_ACCENT,
  normalizeCommanderName,
} from '../src/model/defs/commanders';
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

  it('resolves a commander by the tag a scripted unit carries', () => {
    expect(commanderById('pizarro')?.name).toBe('Francisco Pizarro');
    expect(commanderById('ayar_uchu')?.name).toBe('Ayar Uchu');
    expect(commanderById('centro_realista')).toBeUndefined();
    expect(commanderById(undefined)).toBeUndefined();
  });

  it('marks the eight Ayar as heroes with distinct presentation accents', () => {
    const ayars = [
      'manco_capac',
      'ayar_auca',
      'ayar_cachi',
      'ayar_uchu',
      'mama_huaco',
      'mama_ocllo',
      'mama_ipacura',
      'mama_raua',
    ];
    const accents = new Set<string>();
    for (const id of ayars) {
      const commander = commanderById(id)!;
      expect(commander.hero, id).toBe(true);
      expect(commander.accent, id).toMatch(/^#[0-9a-f]{6}$/i);
      accents.add(commander.accent!);
    }
    expect(accents.size).toBe(8);
    const weapons = new Set<string>();
    const headdresses = new Set<string>();
    const patterns = new Set<string>();
    for (const id of ayars) {
      const commander = commanderById(id)!;
      expect(commander.weapon, id).toBeDefined();
      expect(commander.headdress, id).toBeDefined();
      expect(commander.pattern, id).toBeDefined();
      weapons.add(commander.weapon!);
      headdresses.add(commander.headdress!);
      patterns.add(commander.pattern!);
      expect(commander.bulk ?? 1, id).toBeGreaterThanOrEqual(1);
      expect(commander.bulk ?? 1, id).toBeLessThanOrEqual(1.2);
    }
    expect(weapons.size).toBeGreaterThanOrEqual(4);
    expect(headdresses.size).toBeGreaterThanOrEqual(3);
    expect(patterns.size).toBeGreaterThanOrEqual(3);
  });

  it('the late-campaign missions carry portraits', () => {
    for (const id of [
      'm_tambotoco',
      'm5_yahuar_pampa',
      'm6_chimu_inca',
      'm6b_guerra_civil',
      'm_lima',
      'm7_tupac_amaru',
      'm_junta_cusco',
      'm8_independencia',
      'm9_guerra_pacifico',
    ]) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.commanders?.length, id).toBeGreaterThan(0);
    }
  });
});

describe('commander identity', () => {
  it('gives every commander a presentation gender and keeps the eight Ayar real', () => {
    for (const commander of Object.values(COMMANDERS)) {
      expect(['female', 'male'], commander.id).toContain(commander.gender);
    }
    for (const id of ['manco_capac', 'ayar_auca', 'ayar_cachi', 'ayar_uchu'] as const) {
      expect(COMMANDERS[id].gender, id).toBe('male');
    }
    for (const id of ['mama_huaco', 'mama_ocllo', 'mama_ipacura', 'mama_raua'] as const) {
      expect(COMMANDERS[id].gender, id).toBe('female');
    }
    expect(COMMANDERS.micaela_bastidas.gender).toBe('female');
    for (const id of ['mama_huaco', 'mama_ocllo', 'mama_ipacura', 'mama_raua'] as const) {
      expect(COMMANDERS[id].mantle, id).toBe('long');
    }
  });
});

describe('commander presentation names', () => {
  it('shortens the Ayar and the long documented names without losing identity', () => {
    expect(commanderShortName(COMMANDERS.manco_capac)).toBe('Manco');
    expect(commanderShortName(COMMANDERS.mama_ocllo)).toBe('Ocllo');
    expect(commanderShortName(COMMANDERS.mama_ipacura)).toBe('Ipacura');
    expect(commanderShortName(COMMANDERS.tupac_amaru)).toBe('Amaru');
    expect(commanderShortName(COMMANDERS.san_martin)).toBe('Martín');
    expect(commanderShortName(COMMANDERS.grau)).toBe('Grau');
  });

  it('has one accent fallback for every presentation surface', () => {
    expect(commanderAccent(COMMANDERS.manco_capac)).toBe(COMMANDERS.manco_capac.accent);
    expect(commanderAccent({ ...COMMANDERS.grau, accent: undefined })).toBe(DEFAULT_HERO_ACCENT);
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

  it('carries the commander gender and accent so the eight Ayar medallions differ', () => {
    const manco = portraitSvg(COMMANDERS.manco_capac);
    const huaco = portraitSvg(COMMANDERS.mama_huaco);
    expect(manco).toContain('data-gender="male"');
    expect(huaco).toContain('data-gender="female"');
    expect(manco).toContain(COMMANDERS.manco_capac.accent!);
    expect(huaco).toContain(COMMANDERS.mama_huaco.accent!);
    expect(manco).not.toBe(huaco);
  });

  it('labels the image for assistive tech', () => {
    expect(portraitSvg(COMMANDERS.grau)).toContain('role="img"');
    expect(portraitSvg(COMMANDERS.grau)).toContain('aria-label="Retrato estilizado de Miguel Grau"');
  });
});
