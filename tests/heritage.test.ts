import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { HERITAGE_BUILDINGS, getHeritageBuilding } from '../src/model/defs/heritage';

describe('Caral heritage buildings', () => {
  it('registers every modular Caral structure with a stable id', () => {
    const ids = Object.keys(HERITAGE_BUILDINGS);
    expect(ids).toEqual([
      'caral_pyramid_mayor',
      'caral_pyramid_central',
      'caral_pyramid_quarry',
      'caral_pyramid_lesser',
      'caral_pyramid_gallery',
      'caral_pyramid_huanca',
      'caral_canal',
      'caral_anfiteatro',
    ]);
    for (const id of ids) {
      expect(HERITAGE_BUILDINGS[id as keyof typeof HERITAGE_BUILDINGS].id).toBe(id);
    }
  });

  it('keeps every citation resolvable in the repository', () => {
    for (const record of Object.values(HERITAGE_BUILDINGS)) {
      expect(record.sources.length).toBeGreaterThan(0);
      for (const source of record.sources) {
        expect(source.startsWith('docs/historia/'), source).toBe(true);
        expect(fs.existsSync(source), source).toBe(true);
      }
    }
  });

  it('distinguishes the documented hero structures from plausible readings', () => {
    expect(HERITAGE_BUILDINGS.caral_pyramid_mayor.confidence).toContain('documentado');
    expect(HERITAGE_BUILDINGS.caral_anfiteatro.confidence).toContain('documentado');
    expect(HERITAGE_BUILDINGS.caral_pyramid_central.confidence).toBe('plausible');
  });

  it('returns null for an unknown id', () => {
    expect(getHeritageBuilding('unknown')).toBeNull();
    expect(getHeritageBuilding(null)).toBeNull();
  });
});
