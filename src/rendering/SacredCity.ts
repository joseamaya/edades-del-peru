import type * as THREE from 'three';
import { buildCaralCityModel, type BuildContext } from '../model/ProceduralModel';
import type { CaralCityPlan } from '../model/defs/setpieces';
import type { Terrain } from './Terrain';

/**
 * Visual-only renderer for the Caral scene plan. The geometry is built and
 * merged by `buildCaralCityModel`, so the whole city costs one draw per shared
 * material instead of one per room. It carries no entities, obstacles or game
 * state; the Great Pyramid remains the map landmark.
 */
export class SacredCity {
  readonly group: THREE.Group;
  /** Upper bound of the city's draw calls (one mesh per shared material). */
  readonly featureBudget: number;

  constructor(ctx: BuildContext, plan: CaralCityPlan, terrain: Terrain) {
    this.group = buildCaralCityModel(ctx, plan, (x, z) => terrain.getHeight(x, z));
    this.featureBudget = this.group.children.length;
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
