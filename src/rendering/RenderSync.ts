import * as THREE from 'three';
import { EntityView } from '../entities/EntityView';
import type { Building } from '../entities/Building';
import { buildModel, disposeModel, type BuildContext } from '../model/ProceduralModel';
import { getBuildingModel } from '../model/defs/buildings';

function makeView(building: Building, ctx: BuildContext): EntityView {
  const model = buildModel(getBuildingModel(building.kind, building.era), ctx);
  return new EntityView(model, building.radius * 0.9, building);
}

/** Create and attach the view for a building that lives in the simulation. */
export function attachBuilding(scene: THREE.Scene, building: Building, ctx: BuildContext): void {
  const view = makeView(building, ctx);
  building.setView(view);
  view.attachTo(scene);
  view.setPosition(building.pos.x, building.pos.y, building.pos.z);
  view.setRotationY(building.yaw);
}

/** Replace a building's model when its era advances. */
export function modernizeBuilding(building: Building, ctx: BuildContext): void {
  const old = building.view;
  if (!old) {
    building.setView(makeView(building, ctx));
    return;
  }
  const model = buildModel(getBuildingModel(building.kind, building.era), ctx);
  model.position.copy(old.group.position);
  model.rotation.copy(old.group.rotation);
  if (old.group.parent) {
    old.group.parent.add(model);
    old.group.parent.remove(old.group);
  }
  old.dispose();
  disposeModel(old.group);
  building.setView(new EntityView(model, building.radius * 0.9, building));
}

/** Remove the view and free its model resources. */
export function detachBuilding(building: Building): void {
  const view = building.view;
  if (!view) return;
  if (view.group.parent) view.group.parent.remove(view.group);
  view.dispose();
  disposeModel(view.group);
  building.setView(null);
}
