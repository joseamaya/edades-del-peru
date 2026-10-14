import { describe, it, expect } from 'vitest';
import { CIVS, ArchStyle, EmblemId } from '../src/model/defs/civs';

const ARCH_STYLES: ArchStyle[] = [
  'coastal-adobe',
  'andean-masonry',
  'altiplano-stone',
  'highland-terraced',
  'colonial',
  'republican',
];
const EMBLEMS: EmblemId[] = [
  'wave',
  'feline',
  'fret',
  'geometric',
  'staff',
  'condor',
  'sun',
  'cross',
  'sunburst',
  'shield',
];

describe('civilization visual identity', () => {
  it('gives every civilization a valid architecture style and emblem', () => {
    for (const civ of CIVS) {
      expect(civ.visual, civ.id).toBeDefined();
      expect(ARCH_STYLES, `${civ.id} arch`).toContain(civ.visual.arch);
      expect(EMBLEMS, `${civ.id} emblem`).toContain(civ.visual.emblem);
    }
  });

  it('splits the pre-Hispanic civilizations across several Andean styles', () => {
    const preHispanic = CIVS.filter((c) => c.periods.some((p) => p <= 5));
    const styles = new Set(preHispanic.map((c) => c.visual.arch));
    expect(styles.size).toBeGreaterThanOrEqual(3);
    for (const c of preHispanic) expect(ARCH_STYLES.indexOf(c.visual.arch)).toBeLessThan(4);
  });

  it('uses the colonial/republican look only for post-1532 civilizations', () => {
    for (const civ of CIVS) {
      const modern = civ.visual.arch === 'colonial' || civ.visual.arch === 'republican';
      const postHispanic = civ.periods.every((p) => p >= 6);
      expect(modern, civ.id).toBe(postHispanic);
    }
  });
});
