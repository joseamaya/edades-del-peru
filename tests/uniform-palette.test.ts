import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HUMAN_SKIN } from '../src/model/defs/people';
import { POST_COLONIAL_SPECS } from '../src/model/defs/postColonialCharacters';
import { REBELDE_PALETTE } from '../src/model/defs/rebeldeCharacters';
import { EARLY_SPANISH_COAT } from '../src/rendering/uniformAttire';

/** Euclidean distance in linear RGB, 0..√3. */
function distance(a: number | string, b: number | string): number {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b);
}

describe('uniform palette', () => {
  // A coat close to the shared skin reads as a bare torso; that was the 1536 buff and the m7 red-brown.
  const MIN_DISTANCE_FROM_SKIN = 0.06;

  it('keeps every coat and jerkin apart from the skin tone', () => {
    const coats: [string, number][] = [
      ['early spanish', EARLY_SPANISH_COAT],
      ['rebeldes', REBELDE_PALETTE.coat],
      ...Object.entries(POST_COLONIAL_SPECS).map(([culture, spec]) => [culture, spec.coat] as [string, number]),
    ];
    for (const [name, coat] of coats) {
      expect(distance(coat, HUMAN_SKIN), name).toBeGreaterThan(MIN_DISTANCE_FROM_SKIN);
    }
  });

  it('flags the colours that read as skin', () => {
    expect(distance(0x6a3a2a, HUMAN_SKIN)).toBeLessThan(MIN_DISTANCE_FROM_SKIN);
  });
});
