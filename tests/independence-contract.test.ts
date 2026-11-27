import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('independence campaign contract', () => {
  it('shows San Martín from the start and strengthens the Callao column', () => {
    const lima = mission('m_lima_1821');
    const sanMartin = lima.objectives.find((o) => o.id === 'a2_san_martin')!;
    expect(sanMartin.hidden).toBeUndefined();
    expect(sanMartin.requires).toBeUndefined();
    const sitio = lima.triggers.find((tr) => tr.id === 't_plaza');
    const wave = sitio?.effects.find((fx) => fx.type === 'wave');
    expect(wave?.type).toBe('wave');
    if (wave?.type !== 'wave') return;
    expect(wave.units.reduce((sum, unit) => sum + unit.count, 0)).toBeGreaterThanOrEqual(10);
  });

  it('gives the Junta a cabildo card and a fuller Umachiri column', () => {
    const junta = mission('m_junta_cusco');
    const cabildo = junta.objectives.find((o) => o.id === 'a1_cabildo')!;
    expect(cabildo.kind).toBe('inspect');
    expect(cabildo.heritageIds).toEqual(['cusco_cabildo_1814']);
    const umachiri = junta.triggers.find((tr) => tr.id === 't_umachiri')!;
    const wave = umachiri.effects.find((fx) => fx.type === 'wave');
    if (wave?.type !== 'wave') throw new Error('missing Umachiri wave');
    expect(wave.units.reduce((sum, unit) => sum + unit.count, 0)).toBeGreaterThanOrEqual(10);
  });

  it('pays the Cusco and Vilcabamba optional goals', () => {
    for (const [id, objectiveId, triggerId] of [
      ['m_cusco_1536', 'a2_suministros', 't_suministros'],
      ['m_vilcabamba', 'a2_senderos', 't_senderos'],
    ] as const) {
      const trigger = mission(id).triggers.find((tr) => tr.id === triggerId)!;
      expect(trigger.condition).toEqual({ type: 'objective', objectiveId, state: 'completed' });
      expect(trigger.effects.some((fx) => fx.type === 'resources')).toBe(true);
    }
  });

  it('gives the Vilcabamba Act II card its own image', () => {
    const vilcabamba = mission('m_vilcabamba');
    const act = vilcabamba.triggers.find((tr) => tr.id === 't_huayna')!;
    const card = act.effects.find((fx) => fx.type === 'act');
    if (card?.type !== 'act') throw new Error('missing Act II card');
    expect(card.image).toBe('media/vilcabamba/cine-selva.webp');
  });
});
