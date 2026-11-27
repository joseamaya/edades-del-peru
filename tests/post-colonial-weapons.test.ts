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
      expect(postColonialWeaponFor(role!, spec.weapon, false), culture).toBe('sword');
      expect(postColonialWeaponFor('ranged', spec.weapon, false), culture).toBe(spec.weapon);
    }
  });

  it('leaves the 1780 rebels the spear and keeps their firearm for the ranged role', () => {
    expect(postColonialWeaponFor('soldier', 'musket', true)).toBe('spear');
    expect(postColonialWeaponFor('ranged', 'musket', true)).toBe('musket');
  });

  it('resolves every culture role from its variant, so the dresser never falls back by accident', () => {
    for (const culture of POST_COLONIAL_CULTURES) {
      for (const role of ['soldier', 'ranged', 'worker', 'scout', 'missionary'] as const) {
        expect(postColonialRoleForVariant(`${culture}_${role}_f`), `${culture}_${role}`).toBe(role);
      }
    }
  });
});
