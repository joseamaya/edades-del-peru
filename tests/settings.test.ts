import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../src/core/Config';

describe('game settings defaults', () => {
  it('enables the cinematic effects by default', () => {
    expect(DEFAULT_SETTINGS.cinematic).toBe(true);
  });

  it('starts at the high quality preset', () => {
    expect(DEFAULT_SETTINGS.quality).toBe('high');
  });

  it('carries the current schema version', () => {
    expect(DEFAULT_SETTINGS.settingsVersion).toBe(SETTINGS_VERSION);
  });
});
