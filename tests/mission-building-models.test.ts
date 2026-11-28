import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { mMiraflores } from '../src/campaign/defs/missions/m_miraflores';
import { BuildingKind, Era } from '../src/core/types';
import { getBuildingGhostModel, getBuildingModel } from '../src/model/defs/buildings';
import { headlessMission } from './headless';

describe('mission-scoped building models', () => {
  it('draws the Miraflores fortress as an earthwork redoubt', () => {
    expect(getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC, mMiraflores.buildingModels)).toEqual({
      type: 'redoubt_1881',
      scale: 1.06,
    });
  });

  it('keeps the stone fortress in every match without an override', () => {
    const stone = { type: 'fortress_imperial', scale: 1.06 };
    expect(getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC)).toEqual(stone);
    expect(getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC, undefined)).toEqual(stone);
    expect(getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC, {})).toEqual(stone);
  });

  it('scopes the override to the mission and the building kind', () => {
    const tarapaca = MISSIONS.find((mission) => mission.id === 'm_tarapaca');
    expect(tarapaca).toBeDefined();
    expect(getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC, tarapaca?.buildingModels)).toEqual(
      getBuildingModel(BuildingKind.FORTRESS, Era.REPUBLIC),
    );
    expect(getBuildingModel(BuildingKind.BARRACKS, Era.REPUBLIC, mMiraflores.buildingModels)).toEqual(
      getBuildingModel(BuildingKind.BARRACKS, Era.REPUBLIC),
    );
  });

  it('shows the override in the placement ghost and the era model elsewhere', () => {
    expect(getBuildingGhostModel(BuildingKind.FORTRESS, mMiraflores.buildingModels)).toEqual({
      type: 'redoubt_1881',
      scale: 1.06,
    });
    expect(getBuildingGhostModel(BuildingKind.FORTRESS)).toEqual({ type: 'fortress_imperial', scale: 1 });
  });

  it('wires the override into the match build context', () => {
    const game = headlessMission('m_miraflores');
    try {
      expect(game.makeBuildContext(0).buildingModels?.[BuildingKind.FORTRESS]).toEqual({
        type: 'redoubt_1881',
        scale: 1.06,
      });
    } finally {
      game.destroy();
    }
  });
});
