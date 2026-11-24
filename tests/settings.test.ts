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

  it('enables edge scrolling by default', () => {
    expect(DEFAULT_SETTINGS.edgeScroll).toBe(true);
  });

  it('carries a volume for every mixer bus within 0..1', () => {
    for (const bus of ['masterVolume', 'sfxVolume', 'musicVolume', 'ambienceVolume'] as const) {
      expect(DEFAULT_SETTINGS[bus]).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_SETTINGS[bus]).toBeLessThanOrEqual(1);
    }
  });

  it('bumps the settings schema for the volume buses', () => {
    expect(SETTINGS_VERSION).toBe(3);
  });
});
