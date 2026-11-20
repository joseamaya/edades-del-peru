import { describe, expect, it } from 'vitest';
import { UnitKind } from '../src/core/types';
import { mTarapaca } from '../src/campaign/defs/missions/m_tarapaca';
import { getAuthoredSite } from '../src/model/defs/sites';

const distance = (a: { dx: number; dz: number }, b: { dx: number; dz: number }): number =>
  Math.hypot(a.dx - b.dx, a.dz - b.dz);

describe('Tarapacá battle contract', () => {
  it('is a one-day battle: no generic base, economy or opening crew on either side', () => {
    expect(mTarapaca.start.playerBase).toBe(false);
    expect(mTarapaca.start.enemyBase).toBe(false);
    expect(mTarapaca.start.openingUnits).toBe(false);
    expect(mTarapaca.enemy.economy).toBe(false);
    expect(mTarapaca.enemy.attacks).toBe(false);
    expect(mTarapaca.allowedBuildings).toEqual([]);
    expect(mTarapaca.startingResources).toEqual({ food: 0, wood: 0, silver: 0, stone: 0 });
    expect(mTarapaca.start.units?.some((u) => u.kind === UnitKind.WORKER)).toBe(false);
  });

  it('keeps the named roster and the historical labels', () => {
    const roster = (mTarapaca.start.units ?? []).reduce((sum, u) => sum + (u.count ?? 1), 0);
    expect(roster).toBeGreaterThanOrEqual(12);
    expect(mTarapaca.start.units?.some((u) => u.tag === 'caceres')).toBe(true);
    expect(mTarapaca.unitNames?.[UnitKind.REPUBLICA_DEFENSOR]).toBe('Defensor de Tarapacá');
    expect(mTarapaca.commanderNotes?.buendia).toContain('no en el campo');
    const act = mTarapaca.triggers.find((t) => t.id === 't_pueblo')?.effects.find((e) => e.type === 'act');
    expect(act?.type).toBe('act');
    if (act?.type === 'act') expect(act.text).not.toContain('antes de que lleguen');
  });

  it('marches every enemy column in from outside the objective', () => {
    const waves = mTarapaca.triggers
      .flatMap((t) => t.effects)
      .filter((e): e is Extract<typeof e, { type: 'wave' }> => e.type === 'wave');
    expect(waves).toHaveLength(3);
    for (const wave of waves) {
      expect(wave.spawn, 'every wave has an explicit spawn origin').toBeDefined();
      expect(distance(wave.spawn!, wave.pos), 'a wave does not spawn on its objective').toBeGreaterThan(30);
      expect(wave.target, 'every enemy wave marches to a target').toBeDefined();
    }
    const opening = mTarapaca.triggers.find((t) => t.id === 't_apertura');
    expect(opening?.condition).toEqual({ type: 'time', seconds: 3 });
  });

  it('makes Pachica a real march and puts Arica to the north', () => {
    const pachica = mTarapaca.objectives.find((o) => o.id === 'a2_pachica')!;
    const village = mTarapaca.objectives.find((o) => o.id === 'a1_pueblo')!;
    expect(distance(pachica.pos!, village.pos!)).toBeGreaterThan((pachica.radius ?? 0) + 40);
    const aArica = mTarapaca.objectives.find((o) => o.id === 'a3_retirada')!;
    expect(aArica.pos!.dz).toBeLessThan(village.pos!.dz - 60);
  });

  it('gives the heights a landmark and the ground an Atacama palette', () => {
    const site = getAuthoredSite('tarapaca_site')!;
    expect(site.terrain.palette).toBe('atacama');
    expect(mTarapaca.layout?.siteLandmarks?.map((l) => l.kind)).toContain('tarapaca-heights');
    expect(mTarapaca.layout?.terrain?.flats?.map((f) => f.name)).not.toContain('Alturas');
  });
});
