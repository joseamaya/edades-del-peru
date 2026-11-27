import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { UnitKind } from '../src/core/types';
import { postColonialWeaponFor } from '../src/model/defs/postColonialCharacters';
import { REBELDE_SPEC } from '../src/model/defs/rebeldeCharacters';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('objective-bound campaign waves', () => {
  it('makes the Chimú counteroffensive answer the cut canal, not a clock', () => {
    const m6 = mission('m6_chimu_inca');
    expect(m6.triggers.find((t) => t.id === 't_wave_1')!.condition).toEqual({
      type: 'objective',
      objectiveId: 'obj_canal',
      state: 'completed',
    });
  });

  it('garrisons Paramonga with four soldiers and two slingers', () => {
    const m6 = mission('m6_chimu_inca');
    const garrison = m6.triggers.find((t) => t.id === 't_paramonga_guarnicion')!;
    const reinforce = garrison.effects.find((fx) => fx.type === 'reinforce');
    expect(reinforce).toBeDefined();
    if (reinforce?.type !== 'reinforce') return;
    expect(reinforce.units).toEqual([
      { kind: UnitKind.SOLDIER, count: 4 },
      { kind: UnitKind.MUSKETEER, count: 2 },
    ]);
    expect(reinforce.objective).toBe('position');
  });

  it('sends the civil-war relief column when Quipaipan opens', () => {
    const m6b = mission('m6b_guerra_civil');
    expect(m6b.triggers.find((t) => t.id === 't_wave_1')!.condition).toEqual({
      type: 'objective',
      objectiveId: 'obj_quipaipan',
      state: 'activate',
    });
  });

  it('gives Yahuar Pampa the highland vegetation kit instead of broadleaf trees', () => {
    const vegetation = mission('m5_yahuar_pampa').mapOverrides?.vegetation;
    expect(mission('m5_yahuar_pampa').mapOverrides?.vegetationKit).toBe('andes');
    expect(vegetation?.density).toBeCloseTo(0.08);
    expect(vegetation?.groundCoverWeights?.ichu).toBeGreaterThan(1);
    expect(vegetation?.variants?.broad).toBe(0);
    expect(vegetation?.variants?.needle).toBe(0);
    expect(vegetation?.variants?.molle).toBeGreaterThan(0);
  });

  it('gives the rebel line a melee weapon and keeps the musket for the ranged role', () => {
    expect(postColonialWeaponFor('soldier', REBELDE_SPEC.weapon, true)).toBe('none');
    expect(postColonialWeaponFor('ranged', REBELDE_SPEC.weapon, true)).toBe('musket');
    // The other cultures keep their spec until their own melee kit lands.
    expect(postColonialWeaponFor('soldier', 'musket', false)).toBe('musket');
  });
});
