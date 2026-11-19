import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { AUTHORED_SITES, getAuthoredSite, isLatePeriod } from '../src/model/defs/sites';
import { sampleAuthoredGround } from '../src/model/defs/authoredTerrain';
import { MOCHE_COMPOSITION_SCALE } from '../src/model/defs/mocheSite';
import { WARI_COMPOSITION_SCALE } from '../src/model/defs/wariSite';
import { CHANCA_COMPOSITION_SCALE } from '../src/model/defs/chancaSite';
import { CHIMU_COMPOSITION_SCALE } from '../src/model/defs/chimuSite';
import { CUSCO_INCA_COMPOSITION_SCALE } from '../src/model/defs/cuscoIncaSite';
import { INDEPENDENCE_COMPOSITION_SCALE } from '../src/model/defs/independenceSite';

describe('authored campaign sites', () => {
  it('resolves every site referenced by a mission layout', () => {
    for (const mission of MISSIONS) {
      const id = mission.layout?.site?.id;
      if (!id) continue;
      expect(getAuthoredSite(id), `${mission.id} references an unknown site`).toBeDefined();
    }
  });

  it('keeps Caral on its source-backed transform, terrain and collision data', () => {
    const caral = getAuthoredSite('caral_site')!;
    expect(caral.scale).toBe(0.25);
    // The city sits on the east of the 256 m Supe transect (former 192 m layout shifted 64 m east).
    expect(caral.anchor).toEqual({ x: 164, z: 30 });
    expect(caral.heightField?.worldSize).toBe(256);
    expect(caral.heightField?.ground?.size).toBe(128);
    expect(caral.heritageProxies.map((p) => p.id)).toContain('caral_pyramid_mayor');
    expect(caral.buildKeepout.length).toBe(4);
    // The city in use (architecture kit) blocks through its own house footprints, not the hidden ruins.
    expect(caral.wallCollision.meshPatterns).toEqual([]);
    expect(caral.terrain.palette).toBe('caral');
    expect(caral.environs?.valley).toBe('caral');
  });

  it('gives the Chavín, Moche and Wari sites their own authored heightfields', () => {
    const chavin = getAuthoredSite('chavin_site')!;
    expect(chavin.heightField?.worldSize, 'chavin_site heightfield world size').toBe(256);
    expect(chavin.heightField?.size, 'chavin_site heightfield sample grid').toBe(257);
    expect(chavin.heightField?.ground?.size, 'chavin_site painted ground grid').toBe(128);
    const moche = getAuthoredSite('moche_site')!;
    expect(moche.heightField?.worldSize, 'moche_site heightfield world size').toBe(256);
    expect(moche.heightField?.size, 'moche_site heightfield sample grid').toBe(257);
    expect(moche.heightField?.ground?.size, 'moche_site painted ground grid').toBe(128);
    expect(moche.heightField?.heights.length, 'moche_site heightfield samples').toBe(257 * 257);
    const wari = getAuthoredSite('wari_site')!;
    expect(wari.heightField?.worldSize, 'wari_site heightfield world size').toBe(256);
    expect(wari.heightField?.size, 'wari_site heightfield sample grid').toBe(257);
    expect(wari.heightField?.ground?.size, 'wari_site painted ground grid').toBe(128);
    expect(wari.heightField?.heights.length, 'wari_site heightfield samples').toBe(257 * 257);
  });

  it('keeps Yahuar Pampa on its authored Chanca site and heightfield', () => {
    const site = getAuthoredSite('chanca_site')!;
    expect(site.scale).toBeCloseTo(0.7 * CHANCA_COMPOSITION_SCALE, 3);
    expect(site.anchor.x).toBeCloseTo(112.4 * CHANCA_COMPOSITION_SCALE, 3);
    expect(site.anchor.z).toBeCloseTo(60.8 * CHANCA_COMPOSITION_SCALE, 3);
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.ground?.weights.length).toBe(128 * 128 * 4);
    const painted = sampleAuthoredGround(site.heightField!, site.anchor.x, site.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the pucará terrace is painted dirt').toBeGreaterThan(0.2);
    const pampa = sampleAuthoredGround(site.heightField!, 40, 140)!;
    expect(pampa[0], 'the pampa is painted grass').toBeGreaterThan(0.2);
    const ridge = sampleAuthoredGround(site.heightField!, 12, 20)!;
    expect(ridge[3], 'the Andean ridges are painted rock').toBeGreaterThan(0.35);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['chanca_pucara']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(17.6, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(12.8, 3);
    const mission = MISSIONS.find((m) => m.id === 'm5_yahuar_pampa')!;
    expect(mission.layout?.site?.id).toBe('chanca_site');
  });

  it('keeps the Chimú mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('chimu_site')!;
    expect(site.scale).toBeCloseTo(0.7 * CHIMU_COMPOSITION_SCALE, 3);
    expect(site.anchor.x).toBeCloseTo(142.8 * CHIMU_COMPOSITION_SCALE, 3);
    expect(site.anchor.z).toBeCloseTo(65 * CHIMU_COMPOSITION_SCALE, 3);
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.ground?.weights.length).toBe(128 * 128 * 4);
    const painted = sampleAuthoredGround(site.heightField!, site.anchor.x, site.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the Chan Chan terrace is painted dirt').toBeGreaterThan(0.2);
    const beach = sampleAuthoredGround(site.heightField!, 10, 128)!;
    expect(beach[2], 'the Pacific shore is painted sand').toBeGreaterThan(0.6);
    const valley = sampleAuthoredGround(site.heightField!, 80, 60)!;
    expect(valley[0], 'the irrigated valley is painted grass').toBeGreaterThan(0.2);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['chimu_compound']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(14.667, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const mission = MISSIONS.find((m) => m.id === 'm6_chimu_inca')!;
    expect(mission.layout?.site?.id).toBe('chimu_site');
  });

  it('keeps the colonial mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('colonial_site')!;
    expect(site.scale).toBeCloseTo(0.8667, 3);
    expect(site.anchor.x).toBeCloseTo(179.733, 3);
    expect(site.anchor.z).toBeCloseTo(97.333, 3);
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.ground?.weights.length).toBe(128 * 128 * 4);
    const painted = sampleAuthoredGround(site.heightField!, site.anchor.x, site.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the Cusco plaza is painted dirt').toBeGreaterThan(0.2);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['colonial_church']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(12, 3);
    expect(site.heritageProxies[0]?.d).toBeCloseTo(12, 3);
    expect(site.heritageProxies[0]?.h).toBeCloseTo(8, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const mission = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    expect(mission.layout?.site?.id).toBe('colonial_site');
  });

  it('keeps the independence mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('independence_site')!;
    expect(site.scale).toBeCloseTo(0.65 * INDEPENDENCE_COMPOSITION_SCALE, 3);
    expect(site.anchor.x).toBeCloseTo(134.8 * INDEPENDENCE_COMPOSITION_SCALE, 3);
    expect(site.anchor.z).toBeCloseTo(71 * INDEPENDENCE_COMPOSITION_SCALE, 3);
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.ground?.weights.length).toBe(128 * 128 * 4);
    const painted = sampleAuthoredGround(site.heightField!, site.anchor.x, site.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the Ayacucho terrace is painted dirt').toBeGreaterThan(0.2);
    const pampa = sampleAuthoredGround(site.heightField!, 80, 60)!;
    expect(pampa[0], 'the high pampa is painted grass').toBeGreaterThan(0.2);
    const ridge = sampleAuthoredGround(site.heightField!, 12, 20)!;
    expect(ridge[3], 'the Andean ridges are painted rock').toBeGreaterThan(0.35);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['independence_chapel']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(12, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const mission = MISSIONS.find((m) => m.id === 'm8_independencia')!;
    expect(mission.layout?.site?.id).toBe('independence_site');
  });

  it('keeps Lima on its own 256 m coast transect and the Plaza Mayor', () => {
    const site = getAuthoredSite('lima_site')!;
    expect(site.scale).toBe(0.65);
    expect(site.anchor).toEqual({ x: 90, z: 150 });
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.size).toBe(129);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['lima_plaza']);
    expect(site.style).toBe('colonial');
    expect(site.phases?.phases).toEqual(['traza', 'ciudad']);
    expect(site.phases?.initial).toBe('traza');
    expect(site.modelSince).toBe('ciudad');
    expect(site.blockers.filter((b) => b.since === 'ciudad').length).toBeGreaterThan(10);
    const mission = MISSIONS.find((m) => m.id === 'm_lima')!;
    expect(mission.layout?.site?.id).toBe('lima_site');
  });

  it('keeps Tambotoco on its own 256 m transect and the Huanacaure huaca', () => {
    const site = getAuthoredSite('tambotoco_site')!;
    expect(site.scale).toBe(0.7);
    expect(site.anchor).toEqual({ x: 120, z: 106 });
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.size).toBe(129);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.river?.halfWidth).toBe(3.5);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['tambotoco_huanacaure']);
    expect(site.walkableCorridor?.width).toBe(8);
    expect(site.modelName).toBe('ayllu_site');
    expect(site.phases?.phases).toEqual(['cave', 'huanacaure', 'inticancha', 'fundada']);
    expect(site.phases?.initial).toBe('cave');
    expect(site.openingHeight).toBe(30);
    expect(site.blockers.filter((b) => b.since === 'fundada')).toHaveLength(6);
    const mission = MISSIONS.find((m) => m.id === 'm_tambotoco')!;
    expect(mission.layout?.site?.id).toBe('tambotoco_site');
  });

  it('keeps La Junta del Cusco on its own 256 m transect and the colonial cabildo', () => {
    const site = getAuthoredSite('cusco_junta_site')!;
    expect(site.scale).toBe(0.65);
    expect(site.anchor).toEqual({ x: 72, z: 58 });
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.size).toBe(257);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heightField?.river?.halfWidth).toBe(4.5);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['colonial_church']);
    expect(site.walkableCorridor?.width).toBe(8);
    expect(site.style).toBe('colonial');
    const mission = MISSIONS.find((m) => m.id === 'm_junta_cusco')!;
    expect(mission.layout?.site?.id).toBe('cusco_junta_site');
  });

  it('keeps the Inca civil war on its authored Cusco site and mission heightfield', () => {
    const site = getAuthoredSite('cusco_inca_site')!;
    expect(site.scale).toBeCloseTo(0.7 * CUSCO_INCA_COMPOSITION_SCALE, 3);
    expect(site.anchor.x).toBeCloseTo(124.8 * CUSCO_INCA_COMPOSITION_SCALE, 3);
    expect(site.anchor.z).toBeCloseTo(130.6 * CUSCO_INCA_COMPOSITION_SCALE, 3);
    // Both missions on this site supply their own field: the site itself no longer carries one.
    expect(site.heightField).toBeUndefined();
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['cusco_ushnu']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(17.333, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(10.667, 3);

    const quipaipan = MISSIONS.find((m) => m.id === 'm6b_guerra_civil')!;
    expect(quipaipan.layout?.site?.id).toBe('cusco_inca_site');
    const pampaField = quipaipan.layout!.site!.heightField!;
    expect(pampaField.worldSize).toBe(256);
    expect(pampaField.ground?.size).toBe(128);
    expect(pampaField.ground?.weights.length).toBe(128 * 128 * 4);
    const pampa = sampleAuthoredGround(pampaField, 80, 150)!;
    expect(pampa.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(pampa[0], 'the Quipaipan pampa is painted grass').toBeGreaterThan(0.2);
    const ridge = sampleAuthoredGround(pampaField, 232, 244)!;
    expect(ridge[3], 'the Andean ridges are painted rock').toBeGreaterThan(0.35);

    const cusco = MISSIONS.find((m) => m.id === 'm_cusco_1536')!;
    const cityField = cusco.layout!.site!.heightField!;
    expect(cityField.ground?.size).toBe(128);
    const plaza = sampleAuthoredGround(cityField, site.anchor.x, site.anchor.z)!;
    expect(plaza[1], 'the Cusco basin is painted dirt').toBeGreaterThan(0.5);
    const sacsay = sampleAuthoredGround(cityField, 158, 141)!;
    expect(sacsay[3], 'Sacsayhuamán is painted rock').toBeGreaterThan(0.35);
  });

  it('keeps the Arica mission on its authored port site and heightfield', () => {
    const site = getAuthoredSite('arica_site')!;
    expect(site.scale).toBeCloseTo(1.0667, 3);
    expect(site.anchor.x).toBeCloseTo(179.733, 3);
    expect(site.anchor.z).toBeCloseTo(97.333, 3);
    expect(site.heightField?.worldSize).toBe(256);
    expect(site.heightField?.ground?.size).toBe(128);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['arica_battery']);
    expect(site.heritageProxies[0]?.w).toBeCloseTo(17.333, 3);
    expect(site.heritageProxies[0]?.d).toBeCloseTo(12, 3);
    expect(site.heritageProxies[0]?.h).toBeCloseTo(4, 3);
    expect(site.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const mission = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(mission.layout?.site?.id).toBe('arica_site');
  });

  it('keeps Moche on its authored site and canal layout', () => {
    const moche = getAuthoredSite('moche_site')!;
    expect(moche.scale).toBeCloseTo(0.25 * MOCHE_COMPOSITION_SCALE, 3);
    expect(moche.anchor.x).toBeCloseTo(123 * MOCHE_COMPOSITION_SCALE, 3);
    expect(moche.anchor.z).toBeCloseTo(81 * MOCHE_COMPOSITION_SCALE, 3);
    expect(moche.heightField?.ground?.weights.length).toBe(128 * 128 * 4);
    const painted = sampleAuthoredGround(moche.heightField!, moche.anchor.x, moche.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the huacas terrace is painted dirt').toBeGreaterThan(0.2);
    const beach = sampleAuthoredGround(moche.heightField!, 10, 128)!;
    expect(beach[2], 'the Pacific shore is painted sand').toBeGreaterThan(0.6);
    const valley = sampleAuthoredGround(moche.heightField!, 80, 100)!;
    expect(valley[0], 'the irrigated valley is painted grass').toBeGreaterThan(0.25);
    expect(moche.heritageProxies.map((p) => p.id)).toEqual(['moche_huaca_sol', 'moche_huaca_luna', 'moche_plaza']);
    expect(moche.heritageProxies[0]?.w).toBeCloseTo(30.667, 3);
    expect(moche.blockers.length).toBe(2);
    expect(moche.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const mission = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    expect(mission.layout?.site?.id).toBe('moche_site');
    expect(mission.layout?.canal?.heritageId).toBe('moche_canal');
  });

  it('keeps Wari on its authored site and network layout', () => {
    const wari = getAuthoredSite('wari_site')!;
    expect(wari.scale).toBeCloseTo(0.25 * WARI_COMPOSITION_SCALE, 3);
    expect(wari.anchor.x).toBeCloseTo(107.5 * WARI_COMPOSITION_SCALE, 3);
    expect(wari.anchor.z).toBeCloseTo(102 * WARI_COMPOSITION_SCALE, 3);
    expect(wari.heritageProxies.map((p) => p.id)).toEqual([
      'wari_templo_d',
      'wari_plaza',
      'wari_galeria',
      'wari_mural',
    ]);
    expect(wari.heritageProxies[0]?.w).toBeCloseTo(20, 3);
    expect(wari.blockers.length).toBe(2);
    expect(wari.walkableCorridor?.width).toBeCloseTo(10.667, 3);
    const painted = sampleAuthoredGround(wari.heightField!, wari.anchor.x, wari.anchor.z)!;
    expect(painted.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 2);
    expect(painted[1], 'the Wari complex is painted dirt').toBeGreaterThan(0.2);
    const basin = sampleAuthoredGround(wari.heightField!, 80, 90)!;
    expect(basin[0], 'the Ayacucho basin is painted grass').toBeGreaterThan(0.2);
    const ridge = sampleAuthoredGround(wari.heightField!, 12, 12)!;
    expect(ridge[3], 'the highland ridges are painted rock').toBeGreaterThan(0.3);
    const mission = MISSIONS.find((m) => m.id === 'm4_wari')!;
    expect(mission.layout?.site?.id).toBe('wari_site');
    expect(mission.objectives.find((o) => o.id === 'obj_red')?.kind).toBe('network');
  });

  it('does not resolve a missing site id', () => {
    expect(getAuthoredSite(null)).toBeUndefined();
    expect(getAuthoredSite(undefined)).toBeUndefined();
  });

  it('gives the first mission a stable, serializable tutorial definition', () => {
    const tutorial = tutorialForMission('m1_caral');
    expect(tutorial?.steps.map((s) => s.id)).toEqual([
      'select',
      'coast',
      'house',
      'valley',
      'farm',
      'canal',
      'storage',
      'nets',
      'pyramid',
      'works',
    ]);
    expect(tutorialForMission('m2_chavin')?.steps.map((s) => s.id)).toEqual([
      'select',
      'site',
      'offer',
      'farm',
      'old_temple',
      'pilgrimage',
      'feria',
      'new_temple',
      'record',
    ]);
    expect(tutorialForMission('m3_moche_recuay')?.steps.map((s) => s.id)).toEqual([
      'select',
      'canal',
      'plaza',
      'trade',
    ]);
    expect(tutorialForMission('m4_wari')?.steps.map((s) => s.id)).toEqual(['select', 'farm', 'network', 'frontier']);
  });

  it('marks only the Caral drought as the site late period', () => {
    expect(isLatePeriod('caral_site', { drought: 1 })).toBe(true);
    expect(isLatePeriod('caral_site', { drought: 0.1 })).toBe(true);
    expect(isLatePeriod('caral_site', { wet_season: 1 })).toBe(false);
    expect(isLatePeriod('caral_site', {})).toBe(false);
    expect(isLatePeriod('chavin_site', { drought: 1 })).toBe(false);
    expect(isLatePeriod(undefined, { drought: 1 })).toBe(false);
  });

  it('registers sites with unique ids and sensible defaults', () => {
    for (const [id, site] of Object.entries(AUTHORED_SITES)) {
      expect(site.id).toBe(id);
      expect(site.label.trim().length).toBeGreaterThan(0);
      expect(site.scale).toBeGreaterThan(0);
      expect(site.cameraHeight).toBeGreaterThan(0);
      expect(site.pathCellSize).toBeGreaterThan(0);
    }
  });
});
