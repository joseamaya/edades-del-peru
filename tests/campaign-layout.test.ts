import { describe, it, expect } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';

const authoredIds = MISSIONS.filter((m) => m.id !== 'm1_caral').map((m) => m.id);
const BASE_MARGIN = 0.1;
const BASE_MAX = 0.9;

describe('campaign authored geography', () => {
  it('every non-Caral mission has a fixed base and a geographic feature', () => {
    for (const id of authoredIds) {
      const mission = MISSIONS.find((m) => m.id === id)!;
      const layout = mission.layout;
      expect(layout, `${id} has no layout`).toBeDefined();
      expect(layout!.base, `${id} has no authored base`).toBeDefined();
      expect(layout!.base!.x, `${id} base x outside map`).toBeGreaterThan(BASE_MARGIN);
      expect(layout!.base!.x, `${id} base x outside map`).toBeLessThan(BASE_MAX);
      expect(layout!.base!.z, `${id} base z outside map`).toBeGreaterThan(BASE_MARGIN);
      expect(layout!.base!.z, `${id} base z outside map`).toBeLessThan(BASE_MAX);

      const features = [
        layout!.setpiece ? 'setpiece' : null,
        layout!.terrain?.river ? 'river' : null,
        layout!.terrain?.flats?.length ? 'flats' : null,
        layout!.canal ? 'canal' : null,
        layout!.decor ? 'decor' : null,
      ].filter(Boolean);
      expect(features.length, `${id} only has a procedural map`).toBeGreaterThan(0);
      const named = [
        layout!.terrain?.river?.name,
        ...(layout!.terrain?.flats?.map((flat) => flat.name) ?? []),
        layout!.canal?.name,
      ].filter(Boolean);
      expect(named.length, `${id} geography is unnamed`).toBeGreaterThan(0);
    }
  });

  it('pins the documented local features', () => {
    const byId = (id: string) => MISSIONS.find((m) => m.id === id)!;
    expect(byId('m2_chavin').layout?.terrain?.river).toBeDefined();
    expect(byId('m4_wari').layout?.terrain?.flats?.length).toBeGreaterThan(0);
    expect(byId('m6_chimu_inca').layout?.canal).toBeDefined();
    expect(byId('m9_guerra_pacifico').layout?.decor?.model).toBe('chile_apostadero');
    expect(byId('m8_independencia').layout?.terrain?.flats?.length).toBeGreaterThan(0);
  });

  it('keeps Caral on its authored sacred-site model', () => {
    const caral = MISSIONS.find((m) => m.id === 'm1_caral')!;
    expect(caral.layout?.setpiece).toBeUndefined();
    expect(caral.layout?.site?.id).toBe('caral_site');
    expect(caral.layout?.terrain?.river).toBeDefined();
  });
});
