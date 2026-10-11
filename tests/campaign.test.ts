import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { EDUCATIONAL, PROLOGUE, getEducational } from '../src/campaign/defs/educational';
import { getPeriod } from '../src/model/defs/periods';
import { getCiv } from '../src/model/defs/civs';

describe('campaign educational content', () => {
  it('the prologue is not empty', () => {
    expect(PROLOGUE.length).toBeGreaterThan(40);
  });

  it('mission ids are unique', () => {
    const ids = MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every mission has educational content with cited sources', () => {
    for (const mis of MISSIONS) {
      const edu = getEducational(mis.id);
      expect(edu, `missing educational content for ${mis.id}`).toBeDefined();
      expect(edu!.context.length).toBeGreaterThan(20);
      expect(edu!.didYouKnow.length).toBeGreaterThan(10);
      expect(edu!.sources.length).toBeGreaterThan(0);
      for (const f of edu!.sources) expect(f.text.length).toBeGreaterThan(3);
    }
  });

  it('there are no orphan educational entries', () => {
    for (const id of Object.keys(EDUCATIONAL)) {
      expect(MISSIONS.some((m) => m.id === id), `entry without a mission: ${id}`).toBe(true);
    }
  });

  it('every mission references a valid period and civilizations', () => {
    for (const mis of MISSIONS) {
      expect(getPeriod(mis.period), `invalid period in ${mis.id}`).toBeDefined();
      expect(getCiv(mis.playerCiv).id).toBe(mis.playerCiv);
      expect(getCiv(mis.enemyCiv).id).toBe(mis.enemyCiv);
    }
  });

  it('the first mission brings the guided tutorial', () => {
    expect(MISSIONS[0].tutorial).toBe(true);
  });
});
