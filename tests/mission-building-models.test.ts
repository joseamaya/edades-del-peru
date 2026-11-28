import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { mMiraflores } from '../src/campaign/defs/missions/m_miraflores';
import { BuildingKind, Era } from '../src/core/types';
import { getBuildingModel } from '../src/model/defs/buildings';

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
    expect(MISSIONS.filter((mission) => mission.buildingModels).map((mission) => mission.id)).toEqual(['m_miraflores']);
    expect(getBuildingModel(BuildingKind.BARRACKS, Era.REPUBLIC, mMiraflores.buildingModels)).toEqual(
      getBuildingModel(BuildingKind.BARRACKS, Era.REPUBLIC),
    );
  });
});
