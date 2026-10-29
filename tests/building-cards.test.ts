import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { BuildingKind } from '../src/core/types';
import { getBuildingCard } from '../src/model/defs/buildingCards';

describe('mission economy building cards', () => {
  it('covers the two playable Caral abstractions', () => {
    expect(getBuildingCard('m1_caral', BuildingKind.FARM)?.name).toContain('Andén');
    expect(getBuildingCard('m1_caral', BuildingKind.MILL)?.name).toContain('Troje');
  });

  it('keeps the cards mission-scoped', () => {
    expect(getBuildingCard('m3_moche_recuay', BuildingKind.FARM)).toBeNull();
    expect(getBuildingCard('m2_chavin', BuildingKind.FARM)?.name).toContain('Andén');
    expect(getBuildingCard('m2_chavin', BuildingKind.MARKET)?.name).toContain('Feria');
    expect(getBuildingCard(null, BuildingKind.FARM)).toBeNull();
  });

  it('uses historical sources and labels the abstractions', () => {
    for (const kind of [BuildingKind.FARM, BuildingKind.MILL, BuildingKind.MARKET]) {
      const card = getBuildingCard('m2_chavin', kind);
      expect(card).not.toBeNull();
      expect(card!.confidence).toBe('abstracción jugable');
      expect(card!.sources.every((source) => source.startsWith('docs/historia/'))).toBe(true);
      for (const source of card!.sources) expect(fs.existsSync(source), source).toBe(true);
    }
  });
});
