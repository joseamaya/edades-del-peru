import { describe, it, expect } from 'vitest';
import { CIVS } from '../src/model/defs/civs';
import { getPeriod } from '../src/model/defs/periods';
import {
  MAP_PROFILES,
  resolveMapProfile,
  resolveWorldProfile,
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
const ROOFS: RoofMaterial[] = ['thatch', 'flat-stone', 'tile', 'flat-metal'];
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
      expect(p.climate.temperature).toBeGreaterThanOrEqual(0);
      expect(p.climate.temperature).toBeLessThanOrEqual(1);
      expect(p.terrain.soil, `${region} soil`).toBeTruthy();
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

  it('records the match map type and keeps the region terrain identity', () => {
    const p = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.CARAL, mapType: 'coast' });
    expect(p.baseMapType).toBe('coast');
    expect(p.region).toBe('central_coast');
    expect(p.terrain).toEqual(MAP_PROFILES.central_coast.terrain);
  });

  it('lets the map type override an incompatible civilization region', () => {
    // the Inca fighting on a coastal scenario (m6) must stay a coast, not the high Andes
    const p = resolveMapProfile({ period: HistoricalPeriod.LATE_HORIZON, civ: CivId.INCA, mapType: 'coast' });
    expect(p.region).toBe('central_coast');
    expect(p.baseMapType).toBe('coast');
    expect(p.water.inland).toBe(false);
    // the HUD map selector stays authoritative over the terrain family
    const alt = resolveMapProfile({
      period: HistoricalPeriod.EARLY_INTERMEDIATE,
      civ: CivId.MOCHE,
      mapType: 'altiplano',
    });
    expect(alt.region).toBe('altiplano');
    expect(alt.baseMapType).toBe('altiplano');
  });

  it('falls back to the map type region when no civilization is given', () => {
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
    // cold, humid, vegetated high Andes vs hot, arid coast
    expect(inca.climate.moisture).toBeGreaterThan(moche.climate.moisture);
    expect(inca.climate.temperature).toBeLessThan(moche.climate.temperature);
    expect(inca.vegetation.density).toBeGreaterThan(moche.vegetation.density);
    expect(inca.terrain.mtnAmp).toBeGreaterThan(caral.terrain.mtnAmp);
    expect(inca.terrain.soil).not.toBe(moche.terrain.soil);
  });

  it('attaches the civilization landmark to the resolved profile', () => {
    const p = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.CARAL, mapType: 'coast' });
    expect(p.landmark).toBe('caral_ceremonial');
    const generic = resolveMapProfile({ period: HistoricalPeriod.ARCHAIC, civ: CivId.PARACAS, mapType: 'coast' });
    expect(generic.landmark).toBeNull();
  });

  it('composes the natural map with the civilization architecture', () => {
    const world = resolveWorldProfile({ period: HistoricalPeriod.LATE_HORIZON, civ: CivId.INCA, mapType: 'andes' });
    expect(world.map.region).toBe('high_andes');
    expect(world.map.landmark).toBe('inca_ushnu');
    expect(world.architecture.style).toBe('andean-masonry');
    expect(world.architecture.wall).toBe('cut-stone');
  });
});

describe('historical architecture profiles', () => {
  it('resolves a valid profile for every civilization in every period it plays in', () => {
    for (const civ of CIVS) {
      for (const period of civ.periods) {
        const p = archProfileFor(civ.id, getPeriod(period).level);
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
        const p = archProfileFor(civ.id, level);
        const modern = p.style === 'colonial' || p.style === 'republican';
        expect(modern, `${civ.id} @ ${period} (level ${level})`).toBe(level >= Era.VICEROYALTY);
      }
    }
  });

  it('separates the Caral / Moche / Inca slice by material, ornament and height', () => {
    const caral = archProfileFor(CivId.CARAL, Era.FORMATIVE);
    const moche = archProfileFor(CivId.MOCHE, Era.REGIONAL_STATES);
    const inca = archProfileFor(CivId.INCA, Era.TAHUANTINSUYO);
    // Caral (plain earth platform) vs Moche (painted frieze) differ in ornament, not colour
    expect(caral.ornament.frieze ?? false).toBe(false);
    expect(moche.ornament.frieze).toBe(true);
    // Inca is a different material family (cut stone, terraced)
    expect(inca.wall).toBe('cut-stone');
    expect(inca.foundation).toBe('terrace');
    expect(inca.ornament.niches).toBe(true);
    expect(new Set([caral.wall, moche.wall, inca.wall]).size).toBeGreaterThanOrEqual(2);
    // monumental platforms rise over time: Moche huacas > Caral mounds
    expect(moche.monumentalTiers).toBeGreaterThan(caral.monumentalTiers);
    expect(inca.monumentalTiers).toBeGreaterThan(1);
  });

  it('uses a single-tier base for the post-1532 colonial/republican look', () => {
    expect(archProfileFor(CivId.REALISTAS, Era.VICEROYALTY).monumentalTiers).toBe(1);
    expect(archProfileFor(CivId.REPUBLIC, Era.REPUBLIC).monumentalTiers).toBe(1);
  });

  it('an Andean civilization played in the Viceroyalty adopts the colonial look', () => {
    const p = archProfileFor(CivId.INCA, Era.VICEROYALTY);
    expect(p.style).toBe('colonial');
    expect(p.wall).toBe('brick');
    expect(p.foundation).toBe('plinth');
  });
});

describe('historical landmarks', () => {
  it('documents every landmark with a source and a valid status', () => {
    const ids = Object.keys(LANDMARKS) as LandmarkId[];
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const statuses = new Set<string>();
    for (const id of ids) {
      const l = LANDMARKS[id];
      expect(l.id).toBe(id);
      expect(l.source, `${id} source`).toBeTruthy();
      expect(REGIONS, `${id} region`).toContain(l.region);
      expect(['documented', 'plausible', 'abstraction']).toContain(l.status);
      statuses.add(l.status);
    }
    // uncertainty is marked, not everything is 'documented'
    expect(statuses.has('abstraction') || statuses.has('plausible')).toBe(true);
  });

  it('maps the slice civilizations to their landmark within their period', () => {
    expect(landmarkForCiv(CivId.CARAL, HistoricalPeriod.ARCHAIC)).toBe('caral_ceremonial');
    expect(landmarkForCiv(CivId.MOCHE, HistoricalPeriod.EARLY_INTERMEDIATE)).toBe('moche_huaca');
    expect(landmarkForCiv(CivId.INCA, HistoricalPeriod.LATE_HORIZON)).toBe('inca_ushnu');
    expect(landmarkForCiv(CivId.NAZCA, HistoricalPeriod.EARLY_INTERMEDIATE)).toBeNull();
  });

  it('does not carry an anachronistic landmark outside its period', () => {
    // the Inca lived on into the Viceroyalty, but the ushnu landmark does not
    expect(landmarkForCiv(CivId.INCA, HistoricalPeriod.VICEROYALTY)).toBeNull();
  });
});
