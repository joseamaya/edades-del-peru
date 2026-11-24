import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VOLUMES,
  listenerFor,
  ambienceForMap,
  ambienceForSite,
  attenuationFor,
  clampVolume,
  intensityFor,
  musicLayerGains,
  panFor,
} from '../src/audio/mix';

describe('mixer volumes', () => {
  it('clamps every bus to the 0..1 range', () => {
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume(0.45)).toBeCloseTo(0.45);
    expect(clampVolume(Number.NaN)).toBe(0);
  });

  it('ships usable defaults for the four buses', () => {
    for (const value of Object.values(DEFAULT_VOLUMES)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('world sound placement', () => {
  it('plays a sound at the camera target at full volume and fades it to silence at the range', () => {
    expect(attenuationFor(0, 40)).toBe(1);
    expect(attenuationFor(40, 40)).toBe(0);
    expect(attenuationFor(80, 40)).toBe(0);
    expect(attenuationFor(10, 40)).toBeGreaterThan(attenuationFor(30, 40));
  });

  it('pans a sound to the side it sits on, relative to the camera right axis', () => {
    expect(panFor(10, 0, 1, 0, 40)).toBeCloseTo(0.25);
    expect(panFor(-10, 0, 1, 0, 40)).toBeCloseTo(-0.25);
    expect(panFor(0, 10, 0, 1, 40)).toBeCloseTo(0.25);
    expect(panFor(80, 0, 1, 0, 40)).toBe(1);
    expect(panFor(-80, 0, 1, 0, 40)).toBe(-1);
  });

  it('builds the listener frame from the camera yaw and zoom', () => {
    const listener = listenerFor({ x: 12, z: -4 }, 0, 20);
    expect(listener.x).toBe(12);
    expect(listener.z).toBe(-4);
    expect(listener.rightX).toBeCloseTo(1);
    expect(listener.rightZ).toBeCloseTo(0);
    expect(listener.range).toBe(18);
    expect(listenerFor({ x: 0, z: 0 }, Math.PI / 2, 100).rightX).toBeCloseTo(0);
    expect(listenerFor({ x: 0, z: 0 }, Math.PI / 2, 100).rightZ).toBeCloseTo(-1);
  });

  it('treats a degenerate range as a point source', () => {
    expect(attenuationFor(0, 0)).toBe(1);
    expect(attenuationFor(1, 0)).toBe(0);
    expect(panFor(10, 0, 1, 0, 0)).toBe(0);
  });
});

describe('ambience per scene', () => {
  it('maps every skirmish map type', () => {
    expect(ambienceForMap('coast')).toBe('coast');
    expect(ambienceForMap('andes')).toBe('andes');
    expect(ambienceForMap('altiplano')).toBe('altiplano');
    expect(ambienceForMap('jungle')).toBe('jungle');
  });

  it('maps campaign sites to their bed and falls back to the Andes', () => {
    expect(ambienceForSite('caral_site', 'jungle')).toBe('coast');
    expect(ambienceForSite('chavin_site', 'coast')).toBe('andes');
    expect(ambienceForSite('tarapaca_site', 'coast')).toBe('altiplano');
    expect(ambienceForSite('vilcabamba_site', 'coast')).toBe('jungle');
    expect(ambienceForSite('cusco_junta_site', 'coast')).toBe('andes');
    expect(ambienceForSite('miraflores_site', 'jungle')).toBe('coast');
    expect(ambienceForSite('real_felipe_site', 'jungle')).toBe('coast');
    expect(ambienceForSite(undefined, 'jungle')).toBe('jungle');
  });
});

describe('music intensity', () => {
  it('moves from calm to tension to combat and back', () => {
    expect(intensityFor(0, 0)).toBe('combat');
    expect(intensityFor(5, 30)).toBe('tension');
    expect(intensityFor(30, 4)).toBe('tension');
    expect(intensityFor(30, 30)).toBe('calm');
  });

  it('keeps the percussion out of the calm layer and loudest in combat', () => {
    expect(musicLayerGains('calm').percussion).toBe(0);
    expect(musicLayerGains('tension').percussion).toBeGreaterThan(0);
    expect(musicLayerGains('combat').percussion).toBeGreaterThan(musicLayerGains('tension').percussion);
    expect(musicLayerGains('combat').drone).toBeLessThan(musicLayerGains('calm').drone);
  });
});
