import { describe, expect, it } from 'vitest';
import { Unit, type UnitContext } from '../src/entities/Unit';
import { ResourceNode } from '../src/entities/ResourceNode';
import { Building } from '../src/entities/Building';
import { BuildingKind, Era, OrderKind, UnitKind } from '../src/core/types';

interface Harness {
  unit: Unit;
  nodes: Map<number, ResourceNode>;
  delivered: Array<{ amount: number; resource: string }>;
}

/** A worker on flat, fully walkable ground with only the entities a gather order needs. */
function harness(opts: { nodes: ResourceNode[]; buildings?: Building[]; x?: number; z?: number }): Harness {
  const nodes = new Map(opts.nodes.map((node) => [node.id, node]));
  const buildings = new Map((opts.buildings ?? []).map((building) => [building.id, building]));
  const delivered: Array<{ amount: number; resource: string }> = [];
  const ctx = {
    getHeight: () => 0,
    findPath: () => [],
    findApproachPath: () => [],
    reachableToNode: () => true,
    isWalkable: () => true,
    nearestWalkable: () => null,
    unitsNear: () => [],
    enemiesNear: () => [],
    entitiesById: new Map(),
    resourceNodes: nodes,
    buildings,
    resolveDamage: () => {},
    spawnProjectile: () => {},
    particles: null,
    players: [],
    getPlayer: () => ({}) as never,
    event: () => {},
    gather: (_nodeId: number, _unitId: number, amount: number, resource: string) => {
      if (amount > 0) delivered.push({ amount, resource });
    },
    tradeIncome: () => {},
    worldSize: 128,
    period: 0,
    unitSpawn: () => false,
    techComplete: () => {},
  } as unknown as UnitContext;

  const unit = new Unit(UnitKind.WORKER, 0, Era.FORMATIVE, {} as never);
  unit.setContext(ctx);
  unit.pos.set(opts.x ?? 10, 0, opts.z ?? 10);
  unit.snapToGround();
  return { unit, nodes, delivered };
}

function step(unit: Unit, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.05) unit.update(0.05, t);
}

describe('worker gather transitions', () => {
  it('does not fall back to a fishing ground when a fisher is ordered to a depleted tree', () => {
    const fishing = new ResourceNode('fishing', 10, 10, 100);
    const tree = new ResourceNode('tree', 14, 10, 0);
    const { unit, nodes } = harness({ nodes: [fishing, tree], x: 11, z: 10 });

    unit.issueOrder({ kind: OrderKind.GATHER, entityId: fishing.id });
    step(unit, 1.5);
    expect(unit.lastGather?.kind).toBe('fishing');
    expect(unit.gatherCarry.food).toBeGreaterThan(0);

    unit.issueOrder({ kind: OrderKind.GATHER, entityId: tree.id });
    step(unit, 1);

    const order = unit.orderQueue.find((queued) => queued.kind === OrderKind.GATHER);
    if (order) expect(nodes.get(order.entityId!)?.resource).toBe('wood');
    expect(unit.lastGather?.kind).not.toBe('fishing');
    expect(unit.gatherCarry.food).toBeGreaterThan(0);
  });

  it('chops wood when a fisher is ordered to a live tree', () => {
    const fishing = new ResourceNode('fishing', 10, 10, 100);
    const tree = new ResourceNode('tree', 12.5, 10, 100);
    const { unit } = harness({ nodes: [fishing, tree], x: 11, z: 10 });

    unit.issueOrder({ kind: OrderKind.GATHER, entityId: fishing.id });
    step(unit, 1.5);
    expect(unit.lastGather?.kind).toBe('fishing');
    expect(unit.gatherCarry.food).toBeGreaterThan(0);

    unit.issueOrder({ kind: OrderKind.GATHER, entityId: tree.id });
    step(unit, 3);

    expect(unit.lastGather?.kind).toBe('tree');
    expect(unit.gatherCarry.food).toBeGreaterThan(0);
    expect(unit.gatherCarry.wood).toBeGreaterThan(0);
  });

  it('delivers a full load instead of stalling when a new gather order arrives', () => {
    const tree = new ResourceNode('tree', 14, 10, 100);
    const center = new Building(BuildingKind.CENTER, 0, Era.FORMATIVE);
    center.pos.set(11, 0, 11.5);
    center.constructionComplete = true;
    const { unit, delivered } = harness({ nodes: [tree], buildings: [center], x: 11, z: 10 });
    const carried = unit.carryCapacity;
    unit.gatherCarry.food = carried;

    unit.issueOrder({ kind: OrderKind.GATHER, entityId: tree.id });
    step(unit, 3);

    expect(delivered).toContainEqual({ amount: carried, resource: 'food' });
    expect(unit.gatherCarry.food).toBe(0);
    expect(unit.orderQueue[0]?.kind).toBe(OrderKind.GATHER);
  });
});
