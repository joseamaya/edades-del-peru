import { describe, expect, it } from 'vitest';
import {
  POST_COLONIAL_CULTURES,
  POST_COLONIAL_SPECS,
  postColonialRoleForVariant,
  postColonialWeaponFor,
} from '../src/model/defs/postColonialCharacters';

describe('post-colonial weapons', () => {
  it('gives the melee line a blade, not the firearm the ranged role volleys with', () => {
    for (const culture of POST_COLONIAL_CULTURES) {
      const spec = POST_COLONIAL_SPECS[culture];
      const role = postColonialRoleForVariant(`${culture}_soldier_m`);
      expect(role, culture).toBe('soldier');
      expect(postColonialWeaponFor(role!, spec.weapon, false), culture).toBe('sabre');
      expect(postColonialWeaponFor('ranged', spec.weapon, false), culture).toBe(spec.weapon);
    }
  });

  it('leaves the 1780 rebels the pike and keeps their firearm for the ranged role', () => {
    expect(postColonialWeaponFor('soldier', 'musket', true)).toBe('pike');
    expect(postColonialWeaponFor('ranged', 'musket', true)).toBe('musket');
  });

  it('never hands a civilian a weapon', () => {
    const armed = new Set(['soldier', 'ranged']);
    for (const culture of POST_COLONIAL_CULTURES) {
      for (const role of ['worker', 'scout', 'missionary'] as const) {
        expect(armed.has(role), `${culture}_${role}`).toBe(false);
      }
    }
  });
});
