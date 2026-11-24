import type { MapType } from '../core/types';

/** Volume of each mixer bus, 0..1. */
export interface VolumeSettings {
  master: number;
  sfx: number;
  music: number;
  ambience: number;
}

export const DEFAULT_VOLUMES: VolumeSettings = { master: 0.9, sfx: 0.8, music: 0.25, ambience: 0.6 };

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** World position of a sound; absent means the sound is not spatialised (UI, music). */
export interface SoundAt {
  x?: number;
  z?: number;
}

/** Where the mix is heard from: camera target, its right axis and the audible radius. */
export interface Listener {
  x: number;
  z: number;
  rightX: number;
  rightZ: number;
  range: number;
}

/** Full volume at the listener, silent at `range`; the curve keeps nearby hits louder than distant ones. */
export function attenuationFor(distance: number, range: number): number {
  if (!(range > 0)) return distance <= 0 ? 1 : 0;
  return clamp01(1 - distance / range) ** 1.5;
}

/** Stereo position of a sound, -1 hard left to 1 hard right, from the camera's right axis. */
export function panFor(dx: number, dz: number, rightX: number, rightZ: number, range: number): number {
  if (!(range > 0)) return 0;
  return clamp01Signed((dx * rightX + dz * rightZ) / range);
}

export type AmbienceKind = 'none' | 'coast' | 'andes' | 'altiplano' | 'jungle';

const SITE_AMBIENCE: ReadonlyArray<[RegExp, AmbienceKind]> = [
  [/caral|aspero|lima|callao|colonial|miraflores|arica|felipe|chimu|moche|paramonga/i, 'coast'],
  [/vilcabamba|jungle|selva/i, 'jungle'],
  [/altiplano|titicaca|tarapaca/i, 'altiplano'],
];

/** Bed ambience for a campaign site; a match without a site falls back to its map type. */
export function ambienceForSite(siteId: string | undefined, map: MapType): AmbienceKind {
  if (siteId) {
    for (const [pattern, kind] of SITE_AMBIENCE) if (pattern.test(siteId)) return kind;
    return 'andes';
  }
  return ambienceForMap(map);
}

export function ambienceForMap(map: MapType): AmbienceKind {
  switch (map) {
    case 'coast':
      return 'coast';
    case 'andes':
      return 'andes';
    case 'altiplano':
      return 'altiplano';
    case 'jungle':
      return 'jungle';
  }
}

export type MusicIntensity = 'calm' | 'tension' | 'combat';

export interface MusicLayerGains {
  drone: number;
  melody: number;
  percussion: number;
}

/** Target gain of each music layer; the engine crossfades to these values. */
export function musicLayerGains(intensity: MusicIntensity): MusicLayerGains {
  switch (intensity) {
    case 'tension':
      return { drone: 0.8, melody: 0.45, percussion: 0.3 };
    case 'combat':
      return { drone: 0.55, melody: 0.25, percussion: 0.85 };
    default:
      return { drone: 1, melody: 0.85, percussion: 0 };
  }
}

/** Music intensity from the seconds since the last combat hit and the last warning alert. */
export function intensityFor(secondsSinceCombat: number, secondsSinceAlert: number): MusicIntensity {
  if (secondsSinceCombat <= 3) return 'combat';
  if (secondsSinceCombat <= 8 || secondsSinceAlert <= 6) return 'tension';
  return 'calm';
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clamp01Signed(value: number): number {
  return Math.min(1, Math.max(-1, value));
}
