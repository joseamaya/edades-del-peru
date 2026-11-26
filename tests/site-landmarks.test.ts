import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { CivId, Era } from '../src/core/types';
import { archProfileFor, isColonialAndeanProfile, usesAndeanArchitecture } from '../src/model/defs/architecture';
import { getAuthoredSite } from '../src/model/defs/sites';
import { blockersCover } from './site-blockers';
import { CUSCO_SITE_POINT, CUSCO_SITE_SACSAY } from '../src/campaign/defs/cuscoSite';
import { CUSCO_CITY_LAYOUT } from '../src/model/defs/cuscoCity';

function mission(id: string) {
  const found = MISSIONS.find((m) => m.id === id);
  if (!found) throw new Error(`missing mission ${id}`);
  return found;
}

describe('mission site landmarks', () => {
  it('draws Cusco from the architecture kit for both missions on the site, not from code', () => {
    // Quipaipán and Cusco 1536 share one authored site and one composition (cuscoCity.ts): showing the grey
    // ushnu GLB in one campaign and the finished city in the other was the inconsistency this pins shut.
    for (const id of ['m_cusco_1536', 'm6b_guerra_civil']) {
      expect(mission(id).layout?.site?.id, id).toBe('cusco_inca_site');
      expect(mission(id).layout?.site?.hideModel, id).toBe(true);
    }
    expect(getAuthoredSite('cusco_inca_site')?.hideModel).toBeUndefined();
    // The kit is anchored on the site points the missions use.
    const ushnu = CUSCO_CITY_LAYOUT.find((p) => p.asset === 'ushnu')!;
    expect(ushnu.x).toBeCloseTo(CUSCO_SITE_POINT.x, 6);
    expect(ushnu.z).toBeCloseTo(CUSCO_SITE_POINT.z, 6);
    const sacsay = CUSCO_CITY_LAYOUT.find((p) => p.asset === 'sacsay_round')!;
    expect(sacsay.x).toBeCloseTo(CUSCO_SITE_SACSAY.x, 6);
    expect(sacsay.z).toBeCloseTo(CUSCO_SITE_SACSAY.z, 6);
  });

  it('draws the Republican sites from the kit and hides the borrowed GLBs', () => {
    // Arica, Real Felipe and Tarapacá no longer use mission-scoped procedural landmarks: the Republican
    // kit draws their compositions from one shared layout-and-blocker source.
    for (const siteId of ['arica_site', 'real_felipe_site', 'tarapaca_site'] as const) {
      const site = getAuthoredSite(siteId)!;
      expect(site.hideModel, siteId).toBe(true);
      expect(site.style, siteId).toBe('republic');
      expect(site.simulationCollision, siteId).toBe(true);
    }
    // Vilcabamba draws its refuge from the highland kit's domestic pieces.
    const vilcabamba = getAuthoredSite('vilcabamba_site')!;
    expect(vilcabamba.hideModel).toBe(true);
    expect(vilcabamba.style).toBe('wari');
    expect(vilcabamba.simulationCollision).toBe(true);
  });

  it('draws the Independence sites from the kit and hides the borrowed GLB', () => {
    for (const siteId of ['independence_site', 'brena_site'] as const) {
      const site = getAuthoredSite(siteId)!;
      expect(site.hideModel, siteId).toBe(true);
      expect(site.style, siteId).toBe('independence');
      expect(site.simulationCollision, siteId).toBe(true);
    }
  });

  it('draws the colonial sites from the kit and hides the bundled GLB', () => {
    for (const id of ['lima_site', 'miraflores_site', 'cusco_junta_site', 'colonial_site'] as const) {
      const site = getAuthoredSite(id)!;
      expect(site.hideModel, id).toBe(true);
      expect(site.style, id).toBe('colonial');
      expect(site.simulationCollision, id).toBe(true);
    }
  });

  it('puts the Tarapacá site and its camera on the village, not the Arica terrace', () => {
    const site = getAuthoredSite('tarapaca_site')!;
    expect(site.origin).toEqual({ x: 96, z: 168 });
    expect(site.anchor).toEqual({ x: 96, z: 168 });
    const layout = mission('m_tarapaca').layout!;
    expect(layout.site?.focus).toEqual({ x: 96 / 256, z: 168 / 256 });
    expect(layout.site?.y).toBeCloseTo(6.942, 3);
  });

  it('registers the Real Felipe walls with the sally gates open', () => {
    const site = getAuthoredSite('real_felipe_site')!;
    const blockers = site.blockers;
    // Four curtains per side pair, four bastions, the magazine and the well.
    expect(blockers).toHaveLength(14);
    expect(
      blockers.some((blocker) => blocker.w > 12 && blocker.d > 12),
      'a bastion',
    ).toBe(true);
    const anchor = site.anchor;
    expect(blockersCover(blockers, anchor.x, anchor.z - 12), 'north curtain').toBe(true);
    expect(blockersCover(blockers, anchor.x + 12, anchor.z), 'east curtain').toBe(true);
    expect(blockersCover(blockers, anchor.x - 12, anchor.z - 12), 'north-west bastion').toBe(true);
    expect(blockersCover(blockers, anchor.x, anchor.z + 12), 'south sally gate').toBe(false);
    expect(blockersCover(blockers, anchor.x - 12, anchor.z), 'west sally gate').toBe(false);
    // The courtyard stays open for the sortie.
    expect(blockersCover(blockers, anchor.x, anchor.z), 'courtyard').toBe(false);
  });

  it('keeps the Republican aprons and plaza floors walkable', () => {
    const arica = getAuthoredSite('arica_site')!;
    expect(arica.blockers).toHaveLength(2);
    const tarapaca = getAuthoredSite('tarapaca_site')!;
    expect(blockersCover(tarapaca.blockers, 96, 168), 'the village plaza').toBe(false);
    expect(blockersCover(tarapaca.blockers, 106, 168), 'the east street').toBe(false);
    expect(blockersCover(tarapaca.blockers, 98, 155), 'a village house').toBe(true);
    expect(blockersCover(tarapaca.blockers, 160, 123), 'the crest parapet').toBe(true);
    expect(blockersCover(tarapaca.blockers, 198, 158), 'the Pachica corral').toBe(true);
  });
});

describe('colonial-andean architecture', () => {
  it('keeps fieldstone, thatch and terraces for the Inca under Viceroyalty rule', () => {
    const profile = archProfileFor(CivId.INCA, Era.VICEROYALTY);
    expect(isColonialAndeanProfile(profile)).toBe(true);
    expect(profile.wall).toBe('fieldstone');
    expect(profile.roof).toBe('thatch');
    expect(profile.foundation).toBe('terrace');
    expect(usesAndeanArchitecture(profile, Era.VICEROYALTY, 'andean-masonry')).toBe(true);
  });

  it('keeps the Spanish colonial kit and does not leak into the Republic', () => {
    const realistas = archProfileFor(CivId.REALISTAS, Era.VICEROYALTY);
    expect(isColonialAndeanProfile(realistas)).toBe(false);
    expect(usesAndeanArchitecture(realistas, Era.VICEROYALTY, 'colonial')).toBe(false);
    expect(archProfileFor(CivId.INCA, Era.REPUBLIC).style).toBe('republican');
    expect(usesAndeanArchitecture(archProfileFor(CivId.INCA, Era.REPUBLIC), Era.REPUBLIC, 'andean-masonry')).toBe(
      false,
    );
  });
});
