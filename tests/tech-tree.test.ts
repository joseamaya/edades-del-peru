import { describe, expect, it } from 'vitest';
import { techTreeData } from '../src/ui/TechTree';
import { BUILDING_DEFS } from '../src/model/defs/buildings';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { seatStartsWithBase } from '../src/campaign/types';
import { UNIT_ARCHETYPES } from '../src/model/defs/units';
import { TECHS } from '../src/model/defs/techs';
import { PERIODS } from '../src/model/defs/periods';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../src/core/types';

describe('tech tree', () => {
  it('is generated from the defs without losing any unlock', () => {
    const tree = techTreeData();
    for (const def of Object.values(BUILDING_DEFS)) {
      expect(tree[def.minEra].buildings.some((node) => node.id === def.id)).toBe(true);
    }
    for (const def of Object.values(UNIT_ARCHETYPES)) {
      for (const era of Object.keys(def.eraModel).map(Number)) {
        expect(tree[era].units.some((node) => node.id === def.id)).toBe(true);
      }
    }
    for (const tech of TECHS) {
      const era = PERIODS.find((period) => period.id === tech.minPeriod)?.level ?? 0;
      expect(tree[era].techs.some((node) => node.id === tech.id)).toBe(true);
    }
  });

  it('honours a mission technology allowlist', () => {
    const tree = techTreeData({
      civ: CivId.CHAVIN,
      period: HistoricalPeriod.EARLY_HORIZON,
      era: Era.REGIONAL_STATES,
      canBuild: () => true,
      canTrain: () => true,
      canResearch: (id) => id === 'chavin_pilgrimage',
    });
    expect(tree[0]?.techs.map((node) => node.id)).toEqual(['chavin_pilgrimage']);
  });

  it('uses mission-scoped unit labels', () => {
    const tree = techTreeData({
      civ: CivId.REPUBLIC,
      period: HistoricalPeriod.REPUBLIC,
      era: Era.REPUBLIC,
      canBuild: () => true,
      canTrain: () => true,
      unitName: (kind) => (kind === UnitKind.REPUBLICA_DEFENSOR ? 'Defensor de Tarapacá' : 'unidad'),
    });
    const node = tree[0]?.units.find((unit) => unit.id === UnitKind.REPUBLICA_DEFENSOR);
    expect(node?.name).toBe('Defensor de Tarapacá');
  });

  it('filters a real mission tree to buildable producers and usable techs', () => {
    const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;
    const match = (id: string) => {
      const m = mission(id);
      return {
        civ: m.playerCiv,
        period: m.period,
        era: m.startingEra,
        canBuild: (kind: BuildingKind) =>
          kind === BuildingKind.CENTER
            ? seatStartsWithBase(m.start, 0)
            : (m.allowedBuildings ? m.allowedBuildings.includes(kind) : true) &&
              m.startingEra >= BUILDING_DEFS[kind].minEra,
        canTrain: (kind: UnitKind) => (m.allowedUnits ? m.allowedUnits.includes(kind) : true),
        canResearch: (id: string) => (m.allowedTechs ? m.allowedTechs.includes(id) : true),
      };
    };

    const cusco = techTreeData(match('m_cusco_1536'))[0]!;
    const cuscoUnits = cusco.units.map((unit) => unit.id);
    expect(cuscoUnits).toEqual(expect.arrayContaining([UnitKind.INCA_WARRIOR, UnitKind.INCA_SLINGER]));
    expect(cuscoUnits).not.toContain(UnitKind.RIFLEMAN);
    const cuscoTechs = cusco.techs.map((tech) => tech.id);
    expect(cuscoTechs).toEqual(expect.arrayContaining(['andean_loom', 'quipus_watchers']));
    for (const id of ['shock_cavalry', 'siege_engines', 'evangelization']) {
      expect(cuscoTechs, `cusco ${id}`).not.toContain(id);
    }

    const junin = techTreeData(match('m8_independencia'))[0]!;
    for (const kind of [BuildingKind.BARRACKS, BuildingKind.ARSENAL, BuildingKind.FACTORY, BuildingKind.INSTITUTE]) {
      expect(
        junin.buildings.map((b) => b.id),
        `m8 ${kind}`,
      ).not.toContain(kind);
    }
    expect(junin.units.map((unit) => unit.id)).toContain(UnitKind.CAVALRY);
    expect(junin.techs.map((tech) => tech.id)).toEqual(expect.arrayContaining(['irrigation_canal', 'shock_cavalry']));
    expect(junin.techs.map((tech) => tech.id)).not.toContain('rifle_drill');

    const tarapaca = techTreeData(match('m_tarapaca'))[0]!;
    expect(tarapaca.buildings).toEqual([]);
    expect(tarapaca.units).toEqual([]);
    expect(tarapaca.techs).toEqual([]);

    const arica = techTreeData(match('m9_guerra_pacifico'))[0]!;
    expect(arica.techs.map((tech) => tech.id)).toEqual(
      expect.arrayContaining(['rifle_drill', 'hunters', 'republica_puerto']),
    );
    expect(arica.techs.map((tech) => tech.id)).not.toContain('bow_and_bolas');
    expect(arica.techs.map((tech) => tech.id)).not.toContain('siege_engines');
  });

  it('has one column per era and unique ids inside each column', () => {
    const tree = techTreeData();
    expect(tree).toHaveLength(6);
    for (const era of tree) {
      for (const nodes of [era.buildings, era.units, era.techs]) {
        expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
      }
    }
  });
});
