import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { EDUCATIONAL, PROLOGUE, getEducational } from '../src/campaign/defs/educational';
import { getPeriod } from '../src/model/defs/periods';
import { getCiv } from '../src/model/defs/civs';
import { UnitKind } from '../src/core/types';

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

  it('the coetaneous missions are construction scenarios (no documented war)', () => {
    const peaceful = ['m1_caral', 'm2_chavin', 'm4_wari'];
    for (const id of peaceful) {
      const mis = MISSIONS.find((m) => m.id === id)!;
      expect(mis.enemy.active, `${id} has an active enemy`).toBe(false);
      // no marked rival base (the enemy was removed, not merely disabled)
      expect(mis.mark ?? [], `${id} still marks a rival`).toEqual([]);
      // no starting combat units
      for (const u of mis.start.units ?? []) expect(u.kind, `${id} starts with a combat unit`).toBe(UnitKind.WORKER);
      // no pre-spawned building that a `build` objective would auto-satisfy
      const preBuilt = (mis.start.buildings ?? []).map((b) => b.kind);
      for (const o of mis.objectives) {
        if (o.kind === 'build' && o.buildingKind) expect(preBuilt, `${id}/${o.id}`).not.toContain(o.buildingKind);
      }
      // no scripted combat waves/reinforcements
      for (const t of mis.triggers) {
        for (const fx of t.effects) expect(['wave', 'reinforce'], `${id}/${t.id}`).not.toContain(fx.type);
      }
      // non-combat objectives only, and it teaches building
      for (const o of mis.objectives) expect(['gather', 'build', 'survive'], `${id}/${o.id}`).toContain(o.kind);
      expect(
        mis.objectives.some((o) => o.kind === 'build'),
        `${id} teaches building`,
      ).toBe(true);
    }
  });

  it('uses varied mechanics, not only defend/survive/destroy', () => {
    const kinds = new Set<string>();
    for (const mis of MISSIONS) for (const o of mis.objectives) kinds.add(o.kind);
    // the campaign introduces exploration (reach) and settlement (build)
    expect(kinds.has('reach')).toBe(true);
    expect(kinds.has('build')).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });

  it('a mission roster restriction only lists valid units and keeps workers', () => {
    const kinds = new Set<string>(Object.values(UnitKind));
    for (const mis of MISSIONS) {
      if (!mis.allowedUnits) continue;
      for (const u of mis.allowedUnits) expect(kinds.has(u), `${mis.id} allows unknown unit ${u}`).toBe(true);
      expect(mis.allowedUnits.includes(UnitKind.WORKER), `${mis.id} restriction excludes workers`).toBe(true);
    }
    // the naval mission has no siege train
    const naval = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(naval.allowedUnits).toBeDefined();
    expect(naval.allowedUnits!.includes(UnitKind.ARTILLERY)).toBe(false);
  });

  it('scales the opening economy: a scarcity mission forces expansion', () => {
    const wari = MISSIONS.find((m) => m.id === 'm4_wari')!;
    // a lean start, well below the campaign's richer openers
    expect(wari.startingResources.food).toBeLessThan(500);
    // gathering is a stated goal, not merely implied by the low start
    expect(wari.objectives.some((o) => o.kind === 'gather')).toBe(true);
    // an expansion objective: a provincial center founded at the frontier
    const expand = wari.objectives.find((o) => o.kind === 'build')!;
    expect(expand.pos, 'expansion build has no location').toBeDefined();
    expect(expand.radius ?? 0).toBeGreaterThan(0);
  });

  it('offers a strategic choice: a mission wins through alternative branches', () => {
    const amaru = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    const group = amaru.objectives.filter((o) => o.group === 'victoria');
    expect(group.length).toBeGreaterThanOrEqual(2);
    // a real choice: the branches are different kinds of objective
    expect(new Set(group.map((o) => o.kind)).size).toBeGreaterThanOrEqual(2);
    // and at least one objective stays required (the leader must survive)
    expect(amaru.objectives.some((o) => !o.group)).toBe(true);
  });

  it('every objective group is a real choice (at least two members)', () => {
    const counts = new Map<string, number>();
    for (const mis of MISSIONS) {
      for (const o of mis.objectives) if (o.group) counts.set(o.group, (counts.get(o.group) ?? 0) + 1);
    }
    for (const [g, n] of counts) expect(n, `group ${g} has only ${n} objective(s)`).toBeGreaterThanOrEqual(2);
  });

  it('bonus objectives are optional and never the only goal', () => {
    const withBonus = MISSIONS.filter((m) => m.objectives.some((o) => o.optional));
    expect(withBonus.length, 'no mission has a bonus objective').toBeGreaterThanOrEqual(1);
    for (const mis of MISSIONS) {
      const bonus = mis.objectives.filter((o) => o.optional);
      for (const o of bonus) expect(o.group, `${mis.id}/${o.id} bonus is in a strategic group`).toBeUndefined();
      if (bonus.length) {
        expect(
          mis.objectives.some((o) => !o.optional),
          `${mis.id} has only optional objectives`,
        ).toBe(true);
      }
    }
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
