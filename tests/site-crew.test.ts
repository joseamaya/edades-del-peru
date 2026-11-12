import { describe, expect, it } from 'vitest';
import {
  CARAL_CAMP_BLOCKERS,
  CARAL_CAMP_LAYOUT,
  CARAL_CAMP_ROUTE,
  CARAL_CAMP_STATIONS,
  CARAL_PHASE_PLAN,
} from '../src/model/defs/caralCity';
import { standsIn } from '../src/model/defs/sitePhases';
import { crewCountForPhase } from '../src/rendering/SiteCrew';

describe('Caral construction camp', () => {
  it('stands from foundation until the city is in use', () => {
    expect(CARAL_CAMP_LAYOUT.length).toBeGreaterThan(0);
    for (const piece of CARAL_CAMP_LAYOUT) {
      expect(piece.since).toBe('foundation');
      expect(piece.until).toBe('in_use');
      expect(standsIn(piece.since, piece.until, 'foundation', CARAL_PHASE_PLAN)).toBe(true);
      expect(standsIn(piece.since, piece.until, 'fill', CARAL_PHASE_PLAN)).toBe(true);
      expect(standsIn(piece.since, piece.until, 'finished', CARAL_PHASE_PLAN)).toBe(true);
      expect(standsIn(piece.since, piece.until, 'in_use', CARAL_PHASE_PLAN)).toBe(false);
      expect(standsIn(piece.since, piece.until, 'sealed', CARAL_PHASE_PLAN)).toBe(false);
    }
  });

  it('blocks the supply piles for exactly that window', () => {
    expect(CARAL_CAMP_BLOCKERS.length).toBe(CARAL_CAMP_LAYOUT.length);
    for (const blocker of CARAL_CAMP_BLOCKERS) {
      expect(blocker.w).toBeGreaterThan(0);
      expect(blocker.d).toBeGreaterThan(0);
      expect(standsIn(blocker.since, blocker.until, 'foundation', CARAL_PHASE_PLAN)).toBe(true);
      expect(standsIn(blocker.since, blocker.until, 'in_use', CARAL_PHASE_PLAN)).toBe(false);
    }
  });

  it('has a crew that shrinks with the works and disappears with the city', () => {
    expect(crewCountForPhase('foundation')).toBe(6);
    expect(crewCountForPhase('fill')).toBe(6);
    expect(crewCountForPhase('finished')).toBe(3);
    expect(crewCountForPhase('in_use')).toBe(0);
    expect(crewCountForPhase('sealed')).toBe(0);
    expect(CARAL_CAMP_ROUTE.length).toBeGreaterThanOrEqual(2);
    expect(CARAL_CAMP_STATIONS.length).toBeGreaterThanOrEqual(2);
  });
});
