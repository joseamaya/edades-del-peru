import { describe, expect, it } from 'vitest';
import { CivId, BuildingKind } from '../src/core/types';
import { aiBuildSteps } from '../src/model/defs/aiBuildOrders';

describe('AI build orders', () => {
  it('keeps the economy and the first barracks essential', () => {
    const steps = aiBuildSteps(CivId.MOCHE);
    const essential = steps.filter((s) => s.essential).map((s) => s.building);
    expect(essential).toEqual([BuildingKind.SAWMILL, BuildingKind.MILL, BuildingKind.BARRACKS]);
  });

  it('nudges priorities by civilization without inventing new buildings', () => {
    const moche = aiBuildSteps(CivId.MOCHE);
    const caral = aiBuildSteps(CivId.CARAL);
    const barracks = (steps: ReturnType<typeof aiBuildSteps>): number =>
      steps.find((s) => s.building === BuildingKind.BARRACKS)?.priority ?? 0;
    expect(barracks(moche)).toBeGreaterThan(barracks(caral));
  });

  it('nudges priorities by difficulty', () => {
    const barracks = (difficulty: 'easy' | 'legendary'): number =>
      aiBuildSteps(CivId.MOCHE, difficulty).find((s) => s.building === BuildingKind.BARRACKS)?.priority ?? 0;
    expect(barracks('legendary')).toBeGreaterThan(barracks('easy'));
  });

  it('gates advanced military buildings behind the profile flag', () => {
    const steps = aiBuildSteps(CivId.WARI);
    expect(steps.find((s) => s.building === BuildingKind.ARSENAL)?.requiresAdvancedMilitary).toBe(true);
    expect(steps.find((s) => s.building === BuildingKind.STABLE)?.requiresAdvancedMilitary).toBe(true);
  });
});
