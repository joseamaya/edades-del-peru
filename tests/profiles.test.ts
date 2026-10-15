import { describe, it, expect } from 'vitest';
import { CIVS } from '../src/model/defs/civs';
import { getPeriod } from '../src/model/defs/periods';
import {
  MAP_PROFILES,
  resolveMapProfile,
  regionDefaultMap,
  regionForCiv,
  profileForMapType,
  type GeographicRegion,
  type HistoricalMapProfile,
} from '../src/model/defs/profiles';
import {
  archProfileFor,
  type WallMaterial,
  type RoofMaterial,
  type FoundationKind,
} from '../src/model/defs/architecture';
import { LANDMARKS, landmarkForCiv, type LandmarkId } from '../src/model/defs/landmarks';
import { CivId, Era, HistoricalPeriod, MapType } from '../src/core/types';

const REGIONS = Object.keys(MAP_PROFILES) as GeographicRegion[];
const MAP_TYPES: MapType[] = ['coast', 'andes', 'altiplano', 'jungle'];
const WALLS: WallMaterial[] = ['adobe', 'fieldstone', 'cut-stone', 'megalithic', 'wood', 'brick', 'concrete', 'metal'];
const ROOFS: RoofMaterial[] = ['thatch', 'flat-stone', 'tile', 'flat-metal', 'dome'];
const FOUNDATIONS: FoundationKind[] = ['platform', 'terrace', 'plinth', 'none'];

describe('historical map profiles', () => {
  it('defines a valid profile for every geographic region', () => {
    for (const region of REGIONS) {
      const p = MAP_PROFILES[region];
      expect(p.region, region).toBe(region);
      expect(MAP_TYPES, `${region} baseMapType`).toContain(regionDefaultMap(region));
      expect(p.provenance, `${region} provenance`).toBeTruthy();
      expect(p.terrain.riverCount).toBeGreaterThanOrEqual(0);
      expect(p.climate.aridity).toBeGreaterThanOrEqual(0);
      expect(p.climate.aridity).toBeLessThanOrEqual(1);
    }
  });

  it('maps every civilization to a region consistent with its geography', () => {
    for (const civ of CIVS) {
      const region = regionForCiv(civ.id);
      expect(regionDefaultMap(region), `${civ.id} region -> map`).toBe(civ.geography);
    }
  });

  it('resolves a valid profile for every civilization in every period it plays in', () => {
    for (const civ of CIVS) {
      for (const period of civ.periods) {
        const mapType = regionDefaultMap(regionForCiv(civ.id));
        const p = resolveMapProfile({ period, civ: civ.id, mapType });
        expect(p.baseMapType, `${civ.id} @ ${period}`).toBe(mapType);
        expect(p.region).toBe(regionForCiv(civ.id));
        expect(MAP_TYPES).toContain(p.baseMapType);
      }
    }
  });

  it('is deterministic: the same input yields the same profile', () => {
    for (const civ of CIVS) {
      const period = civ.periods[0];
      const mapType = regionDefaultMap(regionForCiv(civ.id));
      const a = resolveMapProfile({ period, civ: civ.id, mapType });
      const b = resolveMapProfile({ period, civ: civ.id, mapType });
      expect(a).toEqual(b);
    }
  });

  it('the match map type overrides the terrain family', () => {
    const p = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.CARAL, mapType: 'andes' });
    expect(p.baseMapType).toBe('andes');
    expect(p.region).toBe('central_coast');
  });

  it('falls back to the map type when no region is known', () => {
    const p = profileForMapType('jungle');
    expect(p.region).toBe('amazon');
    expect(p.baseMapType).toBe('jungle');
  });

  it('gives the Caral / Moche / Inca slice clearly different natural identity', () => {
    const me = (civ: CivId): HistoricalMapProfile => {
      const period = CIVS.find((c) => c.id === civ)!.periods[0];
      return resolveMapProfile({ period, civ, mapType: regionDefaultMap(regionForCiv(civ)) });
    };
    const caral = me(CivId.CARAL);
    const moche = me(CivId.MOCHE);
    const inca = me(CivId.INCA);
    expect(caral.region).toBe('central_coast');
    expect(moche.region).toBe('north_coast');
    expect(inca.region).toBe('high_andes');
    expect(new Set([caral.region, moche.region, inca.region]).size).toBe(3);
    // humidity and vegetation rise from the coast to the high Andes
    expect(inca.climate.moisture).toBeGreaterThan(moche.climate.moisture);
    expect(inca.vegetation.density).toBeGreaterThan(moche.vegetation.density);
    expect(inca.terrain.mtnAmp).toBeGreaterThan(caral.terrain.mtnAmp);
  });

  it('attaches the civilization landmark to the resolved profile', () => {
    const p = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.CARAL, mapType: 'coast' });
    expect(p.landmark).toBe('caral_ceremonial');
    const generic = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.PARACAS, mapType: 'coast' });
    expect(generic.landmark).toBeNull();
  });
});

describe('historical architecture profiles', () => {
  it('resolves a valid profile for every civilization in every period it plays in', () => {
    for (const civ of CIVS) {
      for (const period of civ.periods) {
        const p = archProfileFor(civ.id, period);
        expect(WALLS, `${civ.id} @ ${period} wall`).toContain(p.wall);
        expect(ROOFS, `${civ.id} @ ${period} roof`).toContain(p.roof);
        expect(FOUNDATIONS, `${civ.id} @ ${period} foundation`).toContain(p.foundation);
        expect(p.provenance, `${civ.id} provenance`).toBeTruthy();
      }
    }
  });

  it('uses the colonial/republican look only after 1532', () => {
    for (const civ of CIVS) {
      for (const period of civ.periods) {
        const level = getPeriod(period).level;
        const p = archProfileFor(civ.id, period);
        const modern = p.style === 'colonial' || p.style === 'republican';
        expect(modern, `${civ.id} @ ${period} (level ${level})`).toBe(level >= Era.VICEROYALTY);
      }
    }
  });

  it('builds Caral / Moche / Inca with distinct materials and silhouettes', () => {
    const caral = archProfileFor(CivId.CARAL, HistoricalPeriod.ARCHAIC);
    const moche = archProfileFor(CivId.MOCHE, HistoricalPeriod.EARLY_INTERMEDIATE);
    const inca = archProfileFor(CivId.INCA, HistoricalPeriod.LATE_HORIZON);
    expect(new Set([caral, moche, inca].map((p) => `${p.wall}|${p.roof}|${p.foundation}`)).size).toBeGreaterThanOrEqual(
      2,
    );
    expect(new Set([caral, moche, inca].map((p) => p.wall)).size).toBeGreaterThanOrEqual(2);
    expect(caral.wall).toBe('adobe');
    expect(moche.ornament.frieze).toBe(true);
    expect(inca.wall).toBe('cut-stone');
    expect(inca.foundation).toBe('terrace');
    expect(inca.ornament.niches).toBe(true);
  });

  it('an Andean civilization played in the Viceroyalty adopts the colonial look', () => {
    const p = archProfileFor(CivId.INCA, HistoricalPeriod.VICEROYALTY);
    expect(p.style).toBe('colonial');
    expect(p.wall).toBe('brick');
    expect(p.foundation).toBe('plinth');
  });
});

describe('historical landmarks', () => {
  it('documents every landmark with a source and a valid status', () => {
    const ids = Object.keys(LANDMARKS) as LandmarkId[];
    expect(ids.length).toBeGreaterThanOrEqual(3);
    for (const id of ids) {
      const l = LANDMARKS[id];
      expect(l.id).toBe(id);
      expect(l.source, `${id} source`).toBeTruthy();
      expect(REGIONS, `${id} region`).toContain(l.region);
      expect(['documented', 'plausible', 'abstraction']).toContain(l.status);
    }
  });

  it('maps the slice civilizations to their landmark', () => {
    expect(landmarkForCiv(CivId.CARAL)).toBe('caral_ceremonial');
    expect(landmarkForCiv(CivId.MOCHE)).toBe('moche_huaca');
    expect(landmarkForCiv(CivId.INCA)).toBe('inca_ushnu');
    expect(landmarkForCiv(CivId.NAZCA)).toBeNull();
  });
});
