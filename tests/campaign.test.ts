import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { EDUCATIVO, PROLOGO, getEducativo } from '../src/campaign/defs/educativo';
import { getPeriodo } from '../src/model/defs/periodos';
import { getCiv } from '../src/model/defs/civs';

describe('contenido educativo de la campaña', () => {
  it('el prólogo no está vacío', () => {
    expect(PROLOGO.length).toBeGreaterThan(40);
  });

  it('los ids de misión son únicos', () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada misión tiene contenido educativo con fuentes citadas', () => {
    for (const mis of MISSIONS) {
      const edu = getEducativo(mis.id);
      expect(edu, `falta contenido educativo para ${mis.id}`).toBeDefined();
      expect(edu!.contexto.length).toBeGreaterThan(20);
      expect(edu!.sabiasQue.length).toBeGreaterThan(10);
      expect(edu!.fuentes.length).toBeGreaterThan(0);
      for (const f of edu!.fuentes) expect(f.texto.length).toBeGreaterThan(3);
    }
  });

  it('no hay entradas educativas huérfanas', () => {
    for (const id of Object.keys(EDUCATIVO)) {
      expect(MISSIONS.some((m) => m.id === id), `entrada sin misión: ${id}`).toBe(true);
    }
  });

  it('cada misión referencia un periodo y civilizaciones válidas', () => {
    for (const mis of MISSIONS) {
      expect(getPeriodo(mis.periodo), `periodo inválido en ${mis.id}`).toBeDefined();
      expect(getCiv(mis.civJugador).id).toBe(mis.civJugador);
      expect(getCiv(mis.civEnemigo).id).toBe(mis.civEnemigo);
    }
  });

  it('la primera misión trae el tutorial guiado', () => {
    expect(MISSIONS[0].tutorial).toBe(true);
  });
});
