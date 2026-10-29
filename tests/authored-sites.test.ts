import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { AUTHORED_SITES, getAuthoredSite } from '../src/model/defs/sites';

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
    expect(caral.anchor).toEqual({ x: 100, z: 30 });
    expect(caral.heightField?.worldSize).toBe(192);
    expect(caral.heritageProxies.map((p) => p.id)).toContain('caral_pyramid_mayor');
    expect(caral.buildKeepout.length).toBe(4);
    expect(caral.wallCollision.meshPatterns.length).toBeGreaterThan(0);
    expect(caral.terrain.preset).toBe('caral');
    expect(caral.environs?.valley).toBe('caral');
  });

  it('keeps Moche on its authored site and canal layout', () => {
    const moche = getAuthoredSite('moche_site')!;
    expect(moche.scale).toBe(0.25);
    expect(moche.anchor).toEqual({ x: 121, z: 85 });
    expect(moche.heritageProxies.map((p) => p.id)).toEqual(['moche_huaca_sol', 'moche_huaca_luna', 'moche_plaza']);
    expect(moche.blockers.length).toBe(2);
    expect(moche.walkableCorridor?.width).toBe(8);
    const mission = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
    expect(mission.layout?.site?.id).toBe('moche_site');
    expect(mission.layout?.canal?.heritageId).toBe('moche_canal');
  });

  it('does not resolve a missing site id', () => {
    expect(getAuthoredSite(null)).toBeUndefined();
    expect(getAuthoredSite(undefined)).toBeUndefined();
  });

  it('gives the first mission a stable, serializable tutorial definition', () => {
    const tutorial = tutorialForMission('m1_caral');
    expect(tutorial?.steps.map((s) => s.id)).toEqual(['select', 'coast', 'house', 'farm', 'landmark', 'storage']);
    expect(tutorialForMission('m2_chavin')?.steps.map((s) => s.id)).toEqual([
      'select',
      'temple',
      'offer',
      'market',
      'pilgrimage',
    ]);
    expect(tutorialForMission('m3_moche_recuay')?.steps.map((s) => s.id)).toEqual([
      'select',
      'canal',
      'plaza',
      'trade',
    ]);
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
