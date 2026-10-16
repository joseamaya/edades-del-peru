import { describe, it, expect } from 'vitest';
import { Era, UnitKind, BuildingKind, HistoricalPeriod, CivId } from '../src/core/types';
import { UNIT_ARCHETYPES, getUnitStats } from '../src/model/defs/units';
import { BUILDING_DEFS, BUILDING_INFO, getBuildingStats } from '../src/model/defs/buildings';
import { TECHS, techAvailable } from '../src/model/defs/techs';
import { ERA_DEFS } from '../src/model/defs/eras';
import { PERIODS, getPeriod } from '../src/model/defs/periods';
import { CIVS, civsForPeriod } from '../src/model/defs/civs';
import { MISSIONS } from '../src/campaign/defs/campaign';

const ERAS = ERA_DEFS.map((e) => e.id);
const unitKinds = Object.values(UnitKind);
const buildingKinds = Object.values(BuildingKind);
const techIds = new Set(TECHS.map((t) => t.id));

/** Numeric stats of resources are finite and non-negative. */
function expectValidCost(cost: Record<string, number>, label: string): void {
  for (const v of Object.values(cost)) {
    expect(Number.isFinite(v), `${label} cost not finite`).toBe(true);
    expect(v, `${label} negative cost`).toBeGreaterThanOrEqual(0);
  }
}

describe('unit definitions', () => {
  it('has stats for every unit kind and era', () => {
    for (const kind of unitKinds) {
      for (const era of ERAS) {
        const s = getUnitStats(kind, era);
        for (const key of [
          'hp',
          'attack',
          'range',
          'speed',
          'los',
          'attackSpeed',
          'trainTime',
          'population',
        ] as const) {
          expect(Number.isFinite(s[key]), `${kind}@${era}.${key} not finite`).toBe(true);
          expect(s[key], `${kind}@${era}.${key} < 0`).toBeGreaterThanOrEqual(0);
        }
        expectValidCost(s.cost, `${kind}@${era}`);
      }
    }
  });

  it('every archetype resolves a model in every era', () => {
    for (const kind of unitKinds) {
      const models = UNIT_ARCHETYPES[kind].eraModel;
      expect(Object.keys(models).length, `${kind} has no era model`).toBeGreaterThan(0);
    }
  });

  it('tech requirements reference existing units', () => {
    for (const kind of unitKinds) {
      for (const req of UNIT_ARCHETYPES[kind].requiresTech ?? []) {
        expect(techIds.has(req), `${kind} requires unknown tech ${req}`).toBe(true);
      }
    }
  });
});

describe('building definitions', () => {
  it('has stats for every building kind and era', () => {
    for (const kind of buildingKinds) {
      for (const era of ERAS) {
        const s = getBuildingStats(kind, era);
        expect(Number.isFinite(s.hp), `${kind}@${era}.hp not finite`).toBe(true);
        expect(s.hp).toBeGreaterThan(0);
        expect(s.size).toBeGreaterThan(0);
        expectValidCost(s.cost, `${kind}@${era}`);
      }
    }
  });

  it('trainable lists reference existing units', () => {
    const kinds = new Set(unitKinds as string[]);
    for (const kind of buildingKinds) {
      for (const u of BUILDING_DEFS[kind].trainable ?? []) {
        expect(kinds.has(u), `${kind} trains unknown unit ${u}`).toBe(true);
      }
    }
  });

  it('dropsites declare at least one accepted resource', () => {
    for (const kind of buildingKinds) {
      const def = BUILDING_DEFS[kind];
      if (def.isDropsite) expect((def.dropTypes ?? []).length).toBeGreaterThan(0);
    }
  });

  it('every building kind is documented and modelled', () => {
    for (const kind of buildingKinds) {
      const def = BUILDING_DEFS[kind];
      expect(def.id, `${kind} id`).toBe(kind);
      expect(def.name.length, `${kind} name`).toBeGreaterThan(0);
      expect(def.description.length, `${kind} description`).toBeGreaterThan(0);
      expect(Object.keys(def.eraModel).length, `${kind} eraModel`).toBeGreaterThan(0);
      const info = BUILDING_INFO[kind];
      expect(info?.name, `${kind} info name`).toBeTruthy();
      expect(info?.icon, `${kind} info icon`).toBeTruthy();
      expect(info?.category, `${kind} info category`).toBeTruthy();
    }
  });

  it('keeps horses and artillery (stable/factory) out of the pre-Columbian eras', () => {
    // no horses, firearms or engines before 1532 (AGENTS domain invariant)
    expect(BUILDING_DEFS[BuildingKind.STABLE].minEra).toBe(Era.VICEROYALTY);
    expect(BUILDING_DEFS[BuildingKind.FACTORY].minEra).toBe(Era.VICEROYALTY);
  });

  it('keeps the scout (Chasqui) trainable before 1532, at the center', () => {
    expect(BUILDING_DEFS[BuildingKind.CENTER].trainable).toContain(UnitKind.SCOUT);
  });
});

describe('technology definitions', () => {
  it('is bound to an existing building and valid unlockable units', () => {
    const bKinds = new Set(buildingKinds as string[]);
    const uKinds = new Set(unitKinds as string[]);
    for (const t of TECHS) {
      expect(bKinds.has(t.building), `${t.id} uses unknown building ${t.building}`).toBe(true);
      for (const u of t.unlocksUnits ?? []) {
        expect(uKinds.has(u), `${t.id} unlocks unknown unit ${u}`).toBe(true);
      }
      for (const req of t.requirements ?? []) {
        expect(techIds.has(req), `${t.id} requires unknown tech ${req}`).toBe(true);
      }
      expectValidCost(t.cost, `tech ${t.id}`);
    }
  });

  it('scopes techs to their historical periods (no colonial/industrial tech before 1532)', () => {
    const preColumbian = [
      HistoricalPeriod.ARCHAIC,
      HistoricalPeriod.EARLY_HORIZON,
      HistoricalPeriod.EARLY_INTERMEDIATE,
      HistoricalPeriod.MIDDLE_HORIZON,
      HistoricalPeriod.LATE_INTERMEDIATE,
      HistoricalPeriod.LATE_HORIZON,
    ];
    for (const id of [
      'workshops',
      'mass_production',
      'shock_cavalry',
      'siege_engines',
      'siege_mortars',
      'evangelization',
    ]) {
      const tech = TECHS.find((t) => t.id === id)!;
      for (const p of preColumbian) {
        expect(techAvailable(tech, p), `${id} available in pre-Columbian period ${p}`).toBe(false);
      }
    }
  });

  it('keeps culture-specific techs in their own window', () => {
    const byId = new Map(TECHS.map((t) => [t.id, t]));
    // Inca techs are not available to the Spanish/Republic...
    for (const id of ['quipus_watchers', 'amauta_words', 'swift_chasquis']) {
      expect(techAvailable(byId.get(id)!, HistoricalPeriod.VICEROYALTY), `${id} leaked to the Viceroyalty`).toBe(false);
      expect(techAvailable(byId.get(id)!, HistoricalPeriod.REPUBLIC), `${id} leaked to the Republic`).toBe(false);
    }
    // ...but are available to the Inca, and every window is well-formed.
    expect(techAvailable(byId.get('amauta_words')!, HistoricalPeriod.LATE_HORIZON)).toBe(true);
    for (const t of TECHS) {
      if (t.maxPeriod !== undefined) {
        expect(t.maxPeriod, `${t.id} maxPeriod before minPeriod`).toBeGreaterThanOrEqual(t.minPeriod);
      }
    }
  });

  it('offers every tech in at least one period', () => {
    for (const t of TECHS) {
      expect(
        PERIODS.some((p) => techAvailable(t, p.id)),
        `${t.id} is never available`,
      ).toBe(true);
    }
  });
});

describe('periods and civilizations', () => {
  it('maps every period to a valid era and has coetaneous civilizations', () => {
    const eras = new Set(ERAS as number[]);
    for (const p of PERIODS) {
      expect(eras.has(p.level), `period ${p.id} invalid level`).toBe(true);
      expect(civsForPeriod(p.id).length, `period ${p.id} has no civilizations`).toBeGreaterThan(0);
    }
  });

  it('every civilization belongs to valid periods', () => {
    const periods = new Set(PERIODS.map((p) => p.id as number));
    for (const c of CIVS) {
      expect(c.periods.length, `${c.id} has no periods`).toBeGreaterThan(0);
      for (const pid of c.periods) {
        expect(periods.has(pid), `${c.id} unknown period ${pid}`).toBe(true);
      }
    }
  });

  it('includes the coetaneous civilizations documented for P1 and P4', () => {
    const byId = new Map(CIVS.map((c) => [c.id, c]));
    expect(byId.get(CivId.CUPISNIQUE)?.geography).toBe('coast');
    expect(byId.get(CivId.COLLAS_LUPACA)?.geography).toBe('altiplano');
    expect(byId.get(CivId.HUANCA)?.geography).toBe('andes');
    const ids = (p: HistoricalPeriod): CivId[] => civsForPeriod(p).map((c) => c.id);
    expect(ids(HistoricalPeriod.EARLY_HORIZON)).toContain(CivId.CUPISNIQUE);
    expect(ids(HistoricalPeriod.LATE_INTERMEDIATE)).toEqual(
      expect.arrayContaining([CivId.COLLAS_LUPACA, CivId.HUANCA]),
    );
  });
});

describe('campaign definitions', () => {
  it('starting era matches the period tech level', () => {
    for (const mis of MISSIONS) {
      expect(mis.startingEra, `${mis.id} startingEra != period level`).toBe(getPeriod(mis.period).level);
    }
  });

  it('every mission has narrative text, objectives and a sane map', () => {
    for (const mis of MISSIONS) {
      expect(mis.history.length, `${mis.id} empty history`).toBeGreaterThan(0);
      expect(mis.victory.length, `${mis.id} empty victory`).toBeGreaterThan(0);
      expect(mis.defeat.length, `${mis.id} empty defeat`).toBeGreaterThan(0);
      expect(mis.objectives.length, `${mis.id} has no objectives`).toBeGreaterThan(0);
      expect([128, 160, 192, 256], `${mis.id} odd map size`).toContain(mis.map.size);
      expect(Object.values(Era), `${mis.id} bad era`).toContain(mis.startingEra);
      expect(Object.values(HistoricalPeriod), `${mis.id} bad period`).toContain(mis.period);
    }
  });
});

describe('civilization bonuses', () => {
  it('every civilization declares effects within sane ranges', () => {
    for (const c of CIVS) {
      const e = c.effects ?? {};
      for (const k of ['attack', 'armor', 'speed', 'los', 'range', 'carry', 'training', 'population'] as const) {
        const v = e[k];
        if (v === undefined) continue;
        expect(Number.isFinite(v), `${c.id}.${k} not finite`).toBe(true);
        expect(v, `${c.id}.${k} negative`).toBeGreaterThanOrEqual(0);
      }
      for (const [res, v] of Object.entries(e.gathering ?? {})) {
        expect(['food', 'wood', 'silver', 'stone'], `${c.id} bad resource ${res}`).toContain(res);
        expect(v as number, `${c.id}.gathering.${res} negative`).toBeGreaterThanOrEqual(0);
      }
      expect(c.bonuses.length, `${c.id} has no bonus text`).toBeGreaterThan(0);
    }
  });

  it('every civilization declares real (playable) effects', () => {
    for (const c of CIVS) {
      expect(c.effects && Object.keys(c.effects).length > 0, `${c.id} has no effects`).toBe(true);
    }
  });
});
