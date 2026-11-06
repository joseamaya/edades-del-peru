import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { CIVS, getCiv } from '../src/model/defs/civs';
import { getPeriod } from '../src/model/defs/periods';
import { TECHS, techAvailable } from '../src/model/defs/techs';
import {
  UNIT_ARCHETYPES,
  getUnitStats,
  isFirearmWeapon,
  unitAvailableToCiv,
  unitClassFor,
  unitDisplayName,
  unitMinPeriod,
  unitRangedWeapon,
  unitTrainableInPeriod,
} from '../src/model/defs/units';
import { unitModelAsset } from '../src/model/defs/modelAssets';
import { UNIQUE_UNIT_GAPS } from '../src/model/defs/unique';

const uniqueUnits = Object.values(UNIT_ARCHETYPES).filter((unit) => unit.category === 'unique');
const uniqueTechs = TECHS.filter((tech) => tech.unique === true);
const CHAPTER_I = [CivId.CARAL, CivId.CHAVIN, CivId.PARACAS, CivId.MOCHE, CivId.RECUAY, CivId.WARI, CivId.TIAHUANACO];

function expectSource(source: string | undefined): void {
  expect(source, 'unique content needs a source').toBeTruthy();
  expect(fs.existsSync(path.resolve(source!)), `${source} does not exist`).toBe(true);
}

describe('unique units', () => {
  it('covers the implemented civs with a unique unit and a unique technology', () => {
    for (const civ of [CivId.MOCHE, CivId.INCA]) {
      expect(
        uniqueUnits.some((unit) => unit.civs?.includes(civ)),
        `${civ} has no unique unit`,
      ).toBe(true);
      expect(
        uniqueTechs.some((tech) => tech.civs?.includes(civ)),
        `${civ} has no unique tech`,
      ).toBe(true);
    }
  });

  it('cites a real dossier and reuses a base kind', () => {
    for (const unit of uniqueUnits) {
      expectSource(unit.source);
      expect(unit.civs?.length, `${unit.id} has no civ`).toBeGreaterThan(0);
      expect(unit.baseKind, `${unit.id} has no base kind`).toBeTruthy();
      expect(unit.minPeriod, `${unit.id} has no minPeriod`).toBeGreaterThanOrEqual(unitMinPeriod(unit.baseKind!));
      for (const civ of unit.civs!)
        expect(
          CIVS.some((c) => c.id === civ),
          `${unit.id} bad civ ${civ}`,
        ).toBe(true);
    }
  });

  it('respects chronology and the civ period window', () => {
    for (const unit of uniqueUnits) {
      const civ = getCiv(unit.civs![0]);
      expect(
        civ.periods.some((period) => period >= unit.minPeriod!),
        `${unit.id} outside its civ periods`,
      ).toBe(true);
      if (unit.minPeriod! < HistoricalPeriod.VICEROYALTY) {
        for (const era of [Era.FORMATIVE, Era.REGIONAL_STATES, Era.TAHUANTINSUYO]) {
          expect(isFirearmWeapon(unitRangedWeapon(unit.id, era)), `${unit.id} firearm before 1532`).toBe(false);
        }
      }
      expect(unitTrainableInPeriod(unit.id, unit.minPeriod!, unit.civs![0])).toBe(true);
      const previous = unit.minPeriod! - 1;
      if (previous >= HistoricalPeriod.ARCHAIC) {
        expect(unitTrainableInPeriod(unit.id, previous, unit.civs![0]), `${unit.id} trainable before minPeriod`).toBe(
          false,
        );
      }
      const otherCiv = CIVS.find((c) => !unit.civs!.includes(c.id))!.id;
      expect(unitTrainableInPeriod(unit.id, unit.minPeriod!, otherCiv)).toBe(false);
      expect(unitAvailableToCiv(unit.id, otherCiv)).toBe(false);
      if (unit.minPeriod! < HistoricalPeriod.VICEROYALTY) {
        expect(['cavalry', 'siege']).not.toContain(unitClassFor(unit.id));
      }
    }
  });

  it('has distinct stats and resolves the base rig', () => {
    for (const unit of uniqueUnits) {
      const era = getPeriod(unit.minPeriod!).level;
      const own = getUnitStats(unit.id, era);
      const base = getUnitStats(unit.baseKind!, era);
      expect(Number.isFinite(own.hp) && own.hp > 0).toBe(true);
      expect(own.hp !== base.hp || own.attack !== base.attack || own.cost.food !== base.cost.food).toBe(true);
      expect(unitDisplayName(unit.id, unit.civs![0], era)).toBe(unit.name);
      expect(unitModelAsset(unit.id, era, unit.civs![0])).not.toBeNull();
    }
    expect(unitModelAsset(UnitKind.MOCHE_WARRIOR, Era.REGIONAL_STATES, CivId.MOCHE, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'moche_soldier_f',
    });
    expect(unitModelAsset(UnitKind.RECUAY_WARRIOR, Era.REGIONAL_STATES, CivId.RECUAY, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'recuay_soldier_f',
    });
    expect(unitModelAsset(UnitKind.WARI_GUARDIAN, Era.TAHUANTINSUYO, CivId.WARI, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'wari_soldier_f',
    });
    expect(unitModelAsset(UnitKind.INCA_WARRIOR, Era.TAHUANTINSUYO, CivId.INCA, 2)).toEqual({
      asset: 'caral_worker',
      variant: 'inca_soldier_f',
    });
  });
});

describe('unique technologies', () => {
  it('cites a real dossier and stays inside its civ window', () => {
    for (const tech of uniqueTechs) {
      expectSource(tech.source);
      expect(tech.civs?.length, `${tech.id} has no civ`).toBeGreaterThan(0);
      expect(tech.maxPeriod === undefined || tech.maxPeriod >= tech.minPeriod).toBe(true);
      expect(techAvailable(tech, tech.minPeriod, tech.civs![0]), `${tech.id} not available to its civ`).toBe(true);
      const otherCiv = CIVS.find((c) => !tech.civs!.includes(c.id))!.id;
      expect(techAvailable(tech, tech.minPeriod, otherCiv), `${tech.id} leaked to ${otherCiv}`).toBe(false);
    }
  });
});
