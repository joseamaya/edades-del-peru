import { describe, it, expect } from 'vitest';
import { validateSave } from '../src/game/SaveGame';
import { SAVE_VERSION } from '../src/game/saveTypes';

describe('validateSave', () => {
  it('rejects malformed data and unknown versions', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave('nope')).toBeNull();
    expect(validateSave({ version: SAVE_VERSION + 1 })).toBeNull();
    expect(validateSave({ version: SAVE_VERSION, settings: {} })).toBeNull();
  });

  it('accepts a minimal valid save of the current version', () => {
    const data = {
      version: SAVE_VERSION,
      settings: {},
      rngState: 0,
      camera: { x: 0, z: 0, zoom: 100, yaw: 0 },
      fog: '',
      players: [],
      units: [],
      buildings: [],
      resourceNodes: [],
    };
    expect(validateSave(data)).toBe(data);
  });
});
