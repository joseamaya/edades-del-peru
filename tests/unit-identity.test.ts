import { describe, it, expect } from 'vitest';
import { Era, HistoricalPeriod, UnitKind } from '../src/core/types';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { getPeriod } from '../src/model/defs/periods';
import {
  getUnitModel,
  isFirearmWeapon,
  unitDisplayIcon,
  unitDisplayName,
  unitMinPeriod,
  unitRangedWeapon,
} from '../src/model/defs/units';
import { missionUnits } from './mission-units';

const preColumbian = MISSIONS.filter((m) => m.period < HistoricalPeriod.VICEROYALTY);
const firearmEra = MISSIONS.filter((m) => m.period >= HistoricalPeriod.VICEROYALTY);
const GUNPOWDER_NAMES = /Arcabucero|Mosquetero|Fusilero|Tirador de Élite/;
const PRE_FIREARM_MODELS = ['arquebusier', 'musketeer_line', 'line_infantry', 'veteran_rifleman', 'advanced_rifleman'];

describe('ranged unit identity', () => {
  it('separates sling, bow, arquebus and rifle by era', () => {
    expect(unitDisplayName(UnitKind.MUSKETEER, undefined, Era.FORMATIVE)).toBe('Hondero');
    expect(unitRangedWeapon(UnitKind.MUSKETEER, Era.FORMATIVE)).toBe('sling');
    expect(getUnitModel(UnitKind.MUSKETEER, Era.FORMATIVE).type).toBe('musketeer');

    expect(unitDisplayName(UnitKind.RIFLEMAN, undefined, Era.TAHUANTINSUYO)).toBe('Arquero');
    expect(unitRangedWeapon(UnitKind.RIFLEMAN, Era.TAHUANTINSUYO)).toBe('bow');
    expect(getUnitModel(UnitKind.RIFLEMAN, Era.TAHUANTINSUYO).type).toBe('rifleman');

    expect(unitDisplayName(UnitKind.MUSKETEER, undefined, Era.VICEROYALTY)).toBe('Arcabucero');
    expect(unitRangedWeapon(UnitKind.MUSKETEER, Era.VICEROYALTY)).toBe('arquebus');
    expect(getUnitModel(UnitKind.MUSKETEER, Era.VICEROYALTY).type).toBe('arquebusier');

    expect(unitDisplayName(UnitKind.RIFLEMAN, undefined, Era.VICEROYALTY)).toBe('Mosquetero');
    expect(unitRangedWeapon(UnitKind.RIFLEMAN, Era.VICEROYALTY)).toBe('musket');
    expect(getUnitModel(UnitKind.RIFLEMAN, Era.VICEROYALTY).type).toBe('musketeer_line');

    expect(unitDisplayName(UnitKind.MUSKETEER, undefined, Era.REPUBLIC)).toBe('Fusilero');
    expect(unitRangedWeapon(UnitKind.MUSKETEER, Era.REPUBLIC)).toBe('rifle');
    expect(getUnitModel(UnitKind.MUSKETEER, Era.REPUBLIC).type).toBe('line_infantry');

    expect(unitDisplayName(UnitKind.RIFLEMAN, undefined, Era.REPUBLIC)).toBe('Tirador de Élite');
    expect(unitRangedWeapon(UnitKind.RIFLEMAN, Era.REPUBLIC)).toBe('rifle');
    expect(getUnitModel(UnitKind.RIFLEMAN, Era.REPUBLIC).type).toBe('advanced_rifleman');

    expect(unitDisplayIcon(UnitKind.MUSKETEER, Era.FORMATIVE)).toBe('🏹');
    expect(unitDisplayIcon(UnitKind.MUSKETEER, Era.REPUBLIC)).toBe('🔫');
    expect(unitDisplayIcon(UnitKind.RIFLEMAN, Era.REPUBLIC)).toBe('🎯');
  });

  it('no pre-1532 mission shows a gunpowder weapon or model', () => {
    for (const mission of preColumbian) {
      const era = getPeriod(mission.period).level;
      for (const kind of missionUnits(mission)) {
        const weapon = unitRangedWeapon(kind, era);
        expect(isFirearmWeapon(weapon), `${mission.id} shows ${kind} with ${weapon}`).toBe(false);
        const model = getUnitModel(kind, era).type;
        expect(PRE_FIREARM_MODELS, `${mission.id} renders ${kind} as ${model} before 1532`).not.toContain(model);
        expect(unitDisplayName(kind, undefined, era), `${mission.id} names ${kind} with gunpowder`).not.toMatch(
          GUNPOWDER_NAMES,
        );
      }
    }
  });

  it('m7, m8 and m9 use firearm identities coherent with 1780–1883', () => {
    for (const mission of firearmEra) {
      const era = getPeriod(mission.period).level;
      for (const kind of [UnitKind.MUSKETEER, UnitKind.RIFLEMAN, UnitKind.SNIPER]) {
        expect(isFirearmWeapon(unitRangedWeapon(kind, era)), `${mission.id} ${kind} should be a firearm`).toBe(true);
      }
    }
    expect(unitDisplayName(UnitKind.RIFLEMAN, undefined, getPeriod(HistoricalPeriod.VICEROYALTY).level)).toBe(
      'Mosquetero',
    );
    expect(unitDisplayName(UnitKind.MUSKETEER, undefined, getPeriod(HistoricalPeriod.REPUBLIC).level)).toBe('Fusilero');

    for (const mission of firearmEra) {
      const era = getPeriod(mission.period).level;
      for (const kind of missionUnits(mission)) {
        if (kind !== UnitKind.MUSKETEER && kind !== UnitKind.RIFLEMAN) continue;
        expect(unitDisplayName(kind, undefined, era), `${mission.id} shows a pre-firearm name for ${kind}`).toMatch(
          GUNPOWDER_NAMES,
        );
      }
    }
  });

  it('m7 excludes the arquebusier and m9 never shows a Hondero', () => {
    const m7 = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    expect(m7.allowedUnits).not.toContain(UnitKind.MUSKETEER);
    for (const kind of missionUnits(m7)) {
      expect(['arquebusier', 'musketeer'], `m7 renders ${kind} with an early-colonial model`).not.toContain(
        getUnitModel(kind, getPeriod(m7.period).level).type,
      );
    }

    const mission = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    const era = getPeriod(mission.period).level;
    expect(mission.allowedUnits).not.toContain(UnitKind.MUSKETEER);
    const kinds = new Set([...missionUnits(mission), ...(mission.allowedUnits ?? [])]);
    for (const kind of kinds) {
      expect(unitDisplayName(kind, undefined, era), `${mission.id} shows ${kind} as Hondero`).not.toBe('Hondero');
      expect(['musketeer', 'rifleman'], `${mission.id} renders ${kind} with a pre-firearm model`).not.toContain(
        getUnitModel(kind, era).type,
      );
      expect(unitMinPeriod(kind)).toBeLessThanOrEqual(mission.period);
    }
  });
});
