import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { BuildingKind, Era } from '../src/core/types';
import { BUILDING_DEFS, BUILDING_INFO } from '../src/model/defs/buildings';
import { getAuthoredSite } from '../src/model/defs/sites';
import {
  POST_COLONIAL_SPECS,
  postColonialSpecForVariant,
  realistaHatFor,
} from '../src/model/defs/postColonialCharacters';
import type { MissionDef } from '../src/campaign/types';

function mission(id: string): MissionDef {
  const found = MISSIONS.find((m) => m.id === id);
  if (!found) throw new Error(`missing mission ${id}`);
  return found;
}

function name(id: string, kind: BuildingKind): string {
  return mission(id).buildingNames?.[kind] ?? BUILDING_INFO[kind].name;
}

describe('culture and era building labels', () => {
  it('keeps Pucará for the Inca scenarios and uses Fortaleza/Fortín elsewhere', () => {
    expect(BUILDING_DEFS.fortress.name).toBe('Fortaleza');
    for (const id of ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil', 'm_cusco_1536', 'm_vilcabamba']) {
      expect(name(id, BuildingKind.FORTRESS)).toBe('Pucará');
    }
    expect(name('m3_moche_recuay', BuildingKind.FORTRESS)).toBe('Fortaleza');
    expect(name('m_lima', BuildingKind.FORTRESS)).toBe('Fortaleza');
    for (const id of [
      'm_junta_cusco',
      'm_lima_1821',
      'm8_independencia',
      'm_real_felipe',
      'm_tarapaca',
      'm_brena',
      'm9_guerra_pacifico',
    ]) {
      expect(name(id, BuildingKind.FORTRESS)).toBe('Fortín');
    }
    expect(name('m_lima', BuildingKind.FORTRESS)).toBe('Fortaleza');
    expect(name('m_miraflores', BuildingKind.FORTRESS)).toBe('Reducto');
  });

  it('frames the Miraflores line without the Lima Plaza proxy', () => {
    const site = getAuthoredSite('miraflores_site');
    expect(site?.heritageProxies).toEqual([]);
    const layout = mission('m_miraflores').layout;
    expect(layout?.decor).toBeUndefined();
    expect(layout?.site?.focus).toEqual({ x: 112 / 256, z: 190 / 256 });
    expect(layout?.labels?.some((label) => label.text === 'Miraflores')).toBe(true);
  });

  it('gives the 1814-1824 patriots a bicorn and keeps the 1880 kepi', () => {
    expect(POST_COLONIAL_SPECS.patriotas.hat).toBe('bicorn');
    expect(POST_COLONIAL_SPECS.republica.hat).toBe('kepi');
    expect(POST_COLONIAL_SPECS.chile.hat).toBe('kepi');
  });

  it('keeps the morion for 1535–1572 and gives the late realistas the bicorn', () => {
    expect(POST_COLONIAL_SPECS.realistas.hat).toBe('morion');
    expect(realistaHatFor(Era.VICEROYALTY, 'm_lima')).toBe('morion');
    expect(realistaHatFor(Era.VICEROYALTY, 'm_cusco_1536')).toBe('morion');
    expect(realistaHatFor(Era.VICEROYALTY, 'm_vilcabamba')).toBe('morion');
    expect(realistaHatFor(Era.VICEROYALTY, 'm7_tupac_amaru')).toBe('bicorn');
    expect(realistaHatFor(Era.REPUBLIC, 'm_junta_cusco')).toBe('bicorn');
    expect(realistaHatFor(Era.REPUBLIC, 'm_real_felipe')).toBe('bicorn');
    expect(postColonialSpecForVariant('realistas_soldier_m').hat).toBe('morion');
    expect(postColonialSpecForVariant('realistas_bicorn_soldier_m').hat).toBe('bicorn');
    expect(postColonialSpecForVariant('not_a_variant')).toBeNull();
  });

  it('keeps Yachaywasi for the Inca scenarios and names the others by culture/era', () => {
    expect(BUILDING_INFO.institute.name).toBe('Yachaywasi');
    expect(name('m3_moche_recuay', BuildingKind.INSTITUTE)).toBe('Casa de los ancestros');
    expect(name('m5_yahuar_pampa', BuildingKind.INSTITUTE)).toBe('Yachaywasi');
    expect(name('m8_independencia', BuildingKind.INSTITUTE)).toBe('Academia');
    expect(name('m9_guerra_pacifico', BuildingKind.INSTITUTE)).toBe('Academia');
  });
});
