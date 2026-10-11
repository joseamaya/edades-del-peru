import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { EDUCATIONAL, PROLOGUE, getEducational } from '../src/campaign/defs/educativo';
import { getPeriod } from '../src/model/defs/periodos';
import { getCiv } from '../src/model/defs/civs';

describe('contenido educativo de la campaña', () => {
  it('el prólogo no está vacío', () => {
    expect(PROLOGUE.length).toBeGreaterThan(40);
  });

  it('los ids de misión son únicos', () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada misión tiene contenido educativo con fuentes citadas', () => {
    for (const mis of MISSIONS) {
      const edu = getEducational(mis.id);
      expect(edu, `falta contenido educativo para ${mis.id}`).toBeDefined();
      expect(edu!.context.length).toBeGreaterThan(20);
      expect(edu!.didYouKnow.length).toBeGreaterThan(10);
      expect(edu!.sources.length).toBeGreaterThan(0);
      for (const f of edu!.sources) expect(f.text.length).toBeGreaterThan(3);
    }
  });

  it('no hay entradas educativas huérfanas', () => {
    for (const id of Object.keys(EDUCATIONAL)) {
      expect(MISSIONS.some((m) => m.id === id), `entrada sin misión: ${id}`).toBe(true);
    }
  });

  it('cada misión referencia un periodo y civilizaciones válidas', () => {
    for (const mis of MISSIONS) {
      expect(getPeriod(mis.period), `periodo inválido en ${mis.id}`).toBeDefined();
      expect(getCiv(mis.playerCiv).id).toBe(mis.playerCiv);
      expect(getCiv(mis.enemyCiv).id).toBe(mis.enemyCiv);
    }
  });

  it('la primera misión trae el tutorial guiado', () => {
    expect(MISSIONS[0].tutorial).toBe(true);
  });
});
