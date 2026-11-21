import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { splitSpeaker } from '../src/campaign/dialogueLine';
import type { MissionDef } from '../src/campaign/types';
import { commanderFor } from '../src/model/defs/commanders';

type Dialogue = Extract<MissionDef['triggers'][number]['effects'][number], { type: 'dialogue' }>;

function dialogueLines(): Array<{ mission: string; line: Dialogue }> {
  return MISSIONS.flatMap((mission) =>
    mission.triggers
      .flatMap((t) => t.effects)
      .filter((e): e is Dialogue => e.type === 'dialogue')
      .map((line) => ({ mission: mission.id, line })),
  );
}

describe('dialogue speakers', () => {
  it('resolves full names, ids and the short forms the missions use', () => {
    expect(commanderFor('Andrés A. Cáceres')?.id).toBe('caceres');
    expect(commanderFor('Cáceres')?.id).toBe('caceres');
    expect(commanderFor('Francisco Pizarro')?.id).toBe('pizarro');
    expect(commanderFor('Pizarro')?.id).toBe('pizarro');
    expect(commanderFor('San Martín')?.id).toBe('san_martin');
    expect(commanderFor('Salom')?.id).toBe('salom');
    expect(commanderFor('Pumacahua')?.id).toBe('pumacahua');
    // The mission writes the id, lower case: it used to show the raw id with no portrait.
    expect(commanderFor('bolognesi')?.name).toBe('Francisco Bolognesi');
    expect(commanderFor('quizquiz')?.name).toBe('Quizquiz');
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
    const missing = dialogueLines()
      .filter(({ line }) => line.speaker && !CHORUS.has(line.speaker))
      .filter(({ line }) => !commanderFor(line.speaker!))
      .map(({ mission, line }) => `${mission}: ${line.speaker}`);
    expect(missing).toEqual([]);
  });

  it('does not leave an inline speaker prefix unresolved in a mission line', () => {
    // A line may start with prose that contains a colon; only prefixes that look like a proper name are
    // suspicious. Every one of those must resolve, or the text is shown with its prefix still attached.
    const suspects = dialogueLines()
      .filter(({ line }) => !line.speaker)
      .map(({ mission, line }) => ({ mission, match: line.text.match(/^\s*([A-ZÁÉÍÓÚÑ][^:\n]{2,40}):\s/) }))
      .filter((entry) => entry.match && !commanderFor(entry.match[1]!.trim()))
      .map((entry) => `${entry.mission}: ${entry.match![1]!.trim()}`);
    expect(suspects).toEqual([]);
  });
});
