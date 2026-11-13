import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { AUTHORED_SITES, getAuthoredSite, isLatePeriod } from '../src/model/defs/sites';

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
    for (const id of ['moche_site', 'wari_site'] as const) {
      const site = getAuthoredSite(id)!;
      expect(site.heightField?.worldSize, `${id} heightfield world size`).toBe(192);
      expect(site.heightField?.size, `${id} heightfield sample grid`).toBe(193);
      expect(site.heightField?.heights.length, `${id} heightfield samples`).toBe(193 * 193);
    }
  });

  it('keeps Yahuar Pampa on its authored Chanca site and heightfield', () => {
    const site = getAuthoredSite('chanca_site')!;
    expect(site.scale).toBe(0.7);
    expect(site.anchor).toEqual({ x: 112.4, z: 60.8 });
    expect(site.heightField?.worldSize).toBe(160);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['chanca_pucara']);
    expect(site.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm5_yahuar_pampa')!;
    expect(mission.layout?.site?.id).toBe('chanca_site');
  });

  it('keeps the Chimú mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('chimu_site')!;
    expect(site.scale).toBe(0.7);
    expect(site.anchor).toEqual({ x: 142.8, z: 65 });
    expect(site.heightField?.worldSize).toBe(192);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['chimu_compound']);
    expect(site.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm6_chimu_inca')!;
    expect(mission.layout?.site?.id).toBe('chimu_site');
  });

  it('keeps the colonial mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('colonial_site')!;
    expect(site.scale).toBe(0.65);
    expect(site.anchor).toEqual({ x: 134.8, z: 73 });
    expect(site.heightField?.worldSize).toBe(192);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['colonial_church']);
    expect(site.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm7_tupac_amaru')!;
    expect(mission.layout?.site?.id).toBe('colonial_site');
  });

  it('keeps the independence mission on its authored site and heightfield', () => {
    const site = getAuthoredSite('independence_site')!;
    expect(site.scale).toBe(0.65);
    expect(site.anchor).toEqual({ x: 134.8, z: 71 });
    expect(site.heightField?.worldSize).toBe(192);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['independence_chapel']);
    expect(site.walkableCorridor?.width).toBe(8);
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
    expect(site.phases?.phases).toEqual(['cave', 'huanacaure', 'inticancha']);
    expect(site.phases?.initial).toBe('cave');
    expect(site.openingHeight).toBe(30);
    expect(site.blockers.filter((b) => b.since === 'inticancha')).toHaveLength(6);
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

  it('keeps the Inca civil war on its authored Cusco site and heightfield', () => {
    const site = getAuthoredSite('cusco_inca_site')!;
    expect(site.scale).toBe(0.7);
    expect(site.anchor).toEqual({ x: 124.8, z: 130.6 });
    expect(site.heightField?.worldSize).toBe(192);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['cusco_ushnu']);
    expect(site.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm6b_guerra_civil')!;
    expect(mission.layout?.site?.id).toBe('cusco_inca_site');
  });

  it('keeps the Arica mission on its authored port site and heightfield', () => {
    const site = getAuthoredSite('arica_site')!;
    expect(site.scale).toBe(0.8);
    expect(site.anchor).toEqual({ x: 134.8, z: 73 });
    expect(site.heightField?.worldSize).toBe(192);
    expect(site.heritageProxies.map((p) => p.id)).toEqual(['arica_battery']);
    expect(site.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    expect(mission.layout?.site?.id).toBe('arica_site');
  });

  it('keeps Moche on its authored site and canal layout', () => {
    const moche = getAuthoredSite('moche_site')!;
    expect(moche.scale).toBe(0.25);
    expect(moche.anchor).toEqual({ x: 123, z: 81 });
    expect(moche.heritageProxies.map((p) => p.id)).toEqual(['moche_huaca_sol', 'moche_huaca_luna', 'moche_plaza']);
    expect(moche.blockers.length).toBe(2);
    expect(moche.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    expect(mission.layout?.site?.id).toBe('moche_site');
    expect(mission.layout?.canal?.heritageId).toBe('moche_canal');
  });

  it('keeps Wari on its authored site and network layout', () => {
    const wari = getAuthoredSite('wari_site')!;
    expect(wari.scale).toBe(0.25);
    expect(wari.anchor).toEqual({ x: 107.5, z: 102 });
    expect(wari.heritageProxies.map((p) => p.id)).toEqual([
      'wari_templo_d',
      'wari_plaza',
      'wari_galeria',
      'wari_mural',
    ]);
    expect(wari.blockers.length).toBe(2);
    expect(wari.walkableCorridor?.width).toBe(8);
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
