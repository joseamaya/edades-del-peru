import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { COMMANDERS } from '../src/model/defs/commanders';
import { UnitKind } from '../src/core/types';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('republic campaign contract', () => {
  it('marks Bolognesi and Cáceres as field commanders with an accent', () => {
    expect(COMMANDERS.bolognesi.fieldCommander).toBe(true);
    expect(COMMANDERS.bolognesi.accent).toBeTruthy();
    expect(COMMANDERS.caceres.fieldCommander).toBe(true);
    expect(COMMANDERS.caceres.accent).toBeTruthy();
  });

  it('puts the Junín label on the pampa and gives the charge six riders', () => {
    const m8 = mission('m8_independencia');
    const label = m8.layout!.labels!.find((entry) => entry.text === 'Junín')!;
    // The camp is at 0.35; the hold is 32 m east of it.
    expect(label.x).toBeGreaterThan(0.42);
    const charge = m8.triggers.find((tr) => tr.id === 't_wave_1')!;
    const wave = charge.effects.find((fx) => fx.type === 'wave');
    if (wave?.type !== 'wave') throw new Error('missing Junín charge');
    expect(wave.units).toEqual([
      { kind: UnitKind.REALISTA_DRAGON, count: 4 },
      { kind: UnitKind.CAVALRY, count: 2 },
    ]);
    const junin = m8.triggers.find((tr) => tr.id === 't_junin')!;
    expect(junin.effects.some((fx) => fx.type === 'withdraw')).toBe(true);
  });

  it('tightens the Real Felipe siege and adds a second sortie', () => {
    const felipe = mission('m_real_felipe');
    expect(felipe.startingResources.food).toBe(800);
    const capitulation = felipe.objectives.find((o) => o.id === 'a4_capitulacion')!;
    expect(capitulation.consume?.perSecond).toBe(5);
    const sorties = felipe.triggers.find((tr) => tr.id === 't_salidas_oleadas')!;
    expect(sorties.repeat).toBe(true);
    expect(sorties.maxFires).toBe(2);
  });

  it('gives Miraflores a second wave and a cavalry pursuit', () => {
    const miraflores = mission('m_miraflores');
    const act = miraflores.triggers.find((tr) => tr.id === 't_reductos')!;
    const waves = act.effects.filter((fx) => fx.type === 'wave');
    expect(waves.length).toBe(2);
    const retreat = miraflores.triggers.find((tr) => tr.id === 't_linea')!;
    const pursuit = retreat.effects.find((fx) => fx.type === 'wave');
    if (pursuit?.type !== 'wave') throw new Error('missing Miraflores pursuit');
    expect(pursuit.units).toEqual([{ kind: UnitKind.CAVALRY, count: 4 }]);
  });
});
