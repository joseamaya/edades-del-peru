import { describe, it, expect } from 'vitest';
import { HistoricalPeriod } from '../src/core/types';
import { MAP_PROFILES, type GeographicRegion } from '../src/model/defs/profiles';
import { PERIOD_GRADES, NEUTRAL_GRADE, gradeForPeriod, resolveColorGrade } from '../src/model/defs/grades';

const PERIODS = Object.values(HistoricalPeriod).filter((v) => typeof v === 'number') as HistoricalPeriod[];
const REGION = Object.keys(MAP_PROFILES) as GeographicRegion[];
const PERIOD_SAMPLE = HistoricalPeriod.EARLY_INTERMEDIATE;

describe('period color grading', () => {
  it('defines a grade for every historical period', () => {
    for (const p of PERIODS) {
      const g = PERIOD_GRADES[p];
      expect(g, `missing grade for period ${p}`).toBeDefined();
    }
  });

  it('keeps every grade within sane ranges', () => {
    for (const p of PERIODS) {
      const g = gradeForPeriod(p);
      expect(g.saturation, `period ${p} saturation`).toBeGreaterThanOrEqual(0.6);
      expect(g.saturation, `period ${p} saturation`).toBeLessThanOrEqual(1.4);
      expect(g.contrast, `period ${p} contrast`).toBeGreaterThanOrEqual(0.8);
      expect(g.contrast, `period ${p} contrast`).toBeLessThanOrEqual(1.3);
      expect(Math.abs(g.temperature), `period ${p} temperature`).toBeLessThanOrEqual(1);
      for (const c of [...g.lift, ...g.gain]) expect(Number.isFinite(c), `period ${p} channel`).toBe(true);
    }
  });

  it('resolveColorGrade stays in range for every period/region pair', () => {
    for (const p of PERIODS) {
      for (const r of REGION) {
        const g = resolveColorGrade(p, MAP_PROFILES[r]);
        expect(g.saturation, `${p}/${r}`).toBeGreaterThanOrEqual(0.6);
        expect(g.saturation, `${p}/${r}`).toBeLessThanOrEqual(1.4);
        expect(Math.abs(g.temperature), `${p}/${r}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('a hot humid biome reads warmer and less saturated than a cold dry one', () => {
    const amazon = resolveColorGrade(PERIOD_SAMPLE, MAP_PROFILES.amazon);
    const andes = resolveColorGrade(PERIOD_SAMPLE, MAP_PROFILES.high_andes);
    const desert = resolveColorGrade(PERIOD_SAMPLE, MAP_PROFILES.south_coast);
    expect(amazon.temperature).toBeGreaterThan(andes.temperature);
    expect(desert.saturation).toBeGreaterThan(amazon.saturation);
  });

  it('the neutral grade is the identity', () => {
    expect(NEUTRAL_GRADE.saturation).toBe(1);
    expect(NEUTRAL_GRADE.contrast).toBe(1);
    expect(NEUTRAL_GRADE.temperature).toBe(0);
    expect(NEUTRAL_GRADE.lift).toEqual([0, 0, 0]);
    expect(NEUTRAL_GRADE.gain).toEqual([1, 1, 1]);
  });
});
