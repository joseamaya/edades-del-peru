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
      expect(
        MISSIONS.some((m) => m.id === id),
        `entry without a mission: ${id}`,
      ).toBe(true);
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

  it('uses varied mechanics, not only defend/survive/destroy', () => {
    const kinds = new Set<string>();
    for (const mis of MISSIONS) for (const o of mis.objectives) kinds.add(o.kind);
    // the campaign introduces exploration (reach) and settlement (build)
    expect(kinds.has('reach')).toBe(true);
    expect(kinds.has('build')).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });

  it('every objective and trigger entityTag is declared by a start/mark tag', () => {
    for (const mis of MISSIONS) {
      const declared = new Set<string>();
      for (const u of mis.start.units ?? []) if (u.tag) declared.add(u.tag);
      for (const b of mis.start.buildings ?? []) if (b.tag) declared.add(b.tag);
      for (const m of mis.mark ?? []) declared.add(m.tag);
      for (const o of mis.objectives) {
        if (o.entityTag) {
          expect(declared.has(o.entityTag), `${mis.id} objective ${o.id} references unknown tag ${o.entityTag}`).toBe(
            true,
          );
        }
      }
      for (const t of mis.triggers) {
        const c = t.condition;
        if ((c.type === 'entity_dead' || c.type === 'unit_near') && c.entityTag) {
          expect(declared.has(c.entityTag), `${mis.id} trigger ${t.id} references unknown tag ${c.entityTag}`).toBe(
            true,
          );
        }
      }
    }
  });
});
