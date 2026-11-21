import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { splitSpeaker } from '../src/campaign/dialogueLine';
import { commanderFor } from '../src/model/defs/commanders';

describe('dialogue speakers', () => {
  it('resolves full names, ids and the short forms the missions use', () => {
    expect(commanderFor('Andrés A. Cáceres')?.id).toBe('caceres');
    expect(commanderFor('Cáceres')?.id).toBe('caceres');
    expect(commanderFor('caceres')?.id).toBe('caceres');
    expect(commanderFor('Francisco Pizarro')?.id).toBe('pizarro');
    expect(commanderFor('Pizarro')?.id).toBe('pizarro');
    expect(commanderFor('San Martín')?.id).toBe('san_martin');
    expect(commanderFor('Salom')?.id).toBe('salom');
    expect(commanderFor('Pumacahua')?.id).toBe('pumacahua');
    // The mission writes the id, lower case: it used to show the raw id with no portrait.
    expect(commanderFor('bolognesi')?.name).toBe('Francisco Bolognesi');
  });

  it('does not read a colon in prose as a speaker', () => {
    const prose = 'El algodón del valle baja a la costa; con él, Áspero teje sus redes.';
    expect(splitSpeaker(prose)).toBeNull();
    expect(splitSpeaker('La ciudad está en uso; se abren las tiendas de la feria.')).toBeNull();
  });

  it('splits a real speaker and keeps the whole line', () => {
    const line = splitSpeaker('Cáceres: —Sostened la línea.');
    expect(line?.commander.id).toBe('caceres');
    expect(line?.text).toBe('—Sostened la línea.');
  });

  it('resolves every explicit speaker declared by a mission', () => {
    // Tambotoco narrates as a chorus, not a person: it is the only authored label without a portrait.
    const CHORUS = new Set(['Memoria de los Ayar']);
    const missing: string[] = [];
    for (const mission of MISSIONS) {
      for (const effect of mission.triggers.flatMap((t) => t.effects)) {
        if (effect.type !== 'dialogue' || !effect.speaker) continue;
        if (CHORUS.has(effect.speaker)) continue;
        if (!commanderFor(effect.speaker)) missing.push(`${mission.id}: ${effect.speaker}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('does not leave an inline speaker prefix unresolved in a mission line', () => {
    // A line may start with prose that contains a colon; only prefixes that look like a proper name are
    // suspicious. Every one of those must resolve, or the text is shown with its prefix still attached.
    const suspects = new Set<string>();
    for (const mission of MISSIONS) {
      for (const effect of mission.triggers.flatMap((t) => t.effects)) {
        if (effect.type !== 'dialogue' || effect.speaker) continue;
        const match = effect.text.match(/^\s*([A-ZÁÉÍÓÚÑ][^:\n]{2,40}):\s/);
        if (match && !commanderFor(match[1]!.trim())) suspects.add(`${mission.id}: ${match[1]!.trim()}`);
      }
    }
    expect([...suspects]).toEqual([]);
  });
});
