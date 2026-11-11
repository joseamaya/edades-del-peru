import { describe, expect, it, vi } from 'vitest';
import { Unit } from '../src/entities/Unit';
import { Building } from '../src/entities/Building';
import { BuildingKind, Era, UnitKind } from '../src/core/types';
import { Projectile } from '../src/entities/Projectile';
import { Vec3 } from '../src/sim/Vec3';
import { ResourceNode } from '../src/entities/ResourceNode';

const noBuildContext = {} as never;

describe('headless simulation entities', () => {
  it('creates and updates a unit without a view or DOM', () => {
    const unit = new Unit(UnitKind.WORKER, 0, Era.FORMATIVE, noBuildContext);
    expect(unit.view).toBeNull();
    expect(unit.unitView).toBeNull();
    unit.setContext({
      getHeight: () => 0,
      findPath: () => [],
      findApproachPath: () => [],
      reachableToNode: () => false,
      isWalkable: () => true,
      isWater: () => false,
      nearestWalkable: () => null,
      unitsNear: () => [],
      enemiesNear: () => [],
      entitiesById: new Map(),
      resourceNodes: new Map(),
      buildings: new Map(),
      resolveDamage: () => {},
      spawnProjectile: () => {},
      particles: null,
      players: [],
      getPlayer: () => ({}) as never,
      event: () => {},
      gather: () => {},
      recordHarvest: () => {},
      worldSize: 128,
      period: 0,
      unitSpawn: () => false,
      techComplete: () => {},
    });
    expect(() => unit.update(1 / 60, 0)).not.toThrow();
    unit.takeDamage(unit.maxHp + 1);
    expect(unit.dead).toBe(true);
  });

  it('advances a projectile without a renderer', () => {
    const projectile = new Projectile({
      from: new Vec3(),
      target: new Vec3(1, 0, 0),
      speed: 1,
      damage: 1,
      kind: 'arrow',
      owner: 0,
    });
    projectile.update(2);
    expect(projectile.dead).toBe(true);
  });

  it('depletes a resource node without a view', () => {
    const node = new ResourceNode('tree', 3, 4, 10);
    node.subtract(10);
    expect(node.depleted).toBe(true);
    expect(node.dead).toBe(true);
  });

  it('runs a building production queue without a view', () => {
    const spawn = vi.fn(() => true);
    const building = new Building(BuildingKind.CENTER, 0, Era.FORMATIVE);
    expect(building.view).toBeNull();
    building.ctx = { players: [{ id: 0, bonus: { training: 0 } }], unitSpawn: spawn };
    building.constructionComplete = true;
    building.productionQueue.push({ unit: UnitKind.WORKER, progress: 0 });
    expect(() => building.update(100, 0)).not.toThrow();
    expect(spawn).toHaveBeenCalled();
  });
});
