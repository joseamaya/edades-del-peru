import * as THREE from 'three';
import { EntityView } from '../entities/EntityView';
import type { Building } from '../entities/Building';
import { buildModel, disposeModel, type BuildContext } from '../model/ProceduralModel';
import { getBuildingModel } from '../model/defs/buildings';
import { UnitView } from './UnitView';
import type { Unit } from '../entities/Unit';

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
  if (!old) return;
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
  building.setConstructionOpacity(building.constructionComplete ? 1 : 0.45);
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

/** Create, position and attach a unit view. */
export function attachUnit(scene: THREE.Scene, unit: Unit, ctx: BuildContext): void {
  const view = new UnitView(unit, ctx);
  unit.unitView = view;
  unit.view = view.view;
  view.attach(scene);
}

/** Rebuild a unit view after an era change, preserving its scene parent. */
export function modernizeUnit(unit: Unit, ctx: BuildContext): void {
  const old = unit.unitView;
  const parent = old?.view.group.parent ?? null;
  old?.dispose();
  const view = new UnitView(unit, ctx);
  unit.unitView = view;
  unit.view = view.view;
  if (parent) view.view.attachTo(parent as THREE.Scene);
  view.view.setPosition(unit.pos.x, unit.pos.y, unit.pos.z);
  view.view.setFacing(unit.yaw);
}

/** Remove and free a unit view. */
export function detachUnit(unit: Unit): void {
  unit.unitView?.dispose();
  unit.unitView = null;
  unit.view = null;
}
