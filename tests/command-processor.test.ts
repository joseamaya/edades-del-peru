import { describe, expect, it, vi } from 'vitest';
import { CommandProcessor, type CommandHost } from '../src/game/CommandProcessor';
import { OrderKind, UnitKind, BuildingKind } from '../src/core/types';

function fakeHost() {
  const unit = {
    dead: false,
    issueOrder: vi.fn(),
    clearOrders: vi.fn(),
    setCombatStance: vi.fn(),
  };
  const host: CommandHost = {
    units: new Map([[7, unit]]),
    placeBuilding: vi.fn(() => true),
    trainUnit: vi.fn(() => true),
    researchTech: vi.fn(() => false),
    cancelProduction: vi.fn(),
    ungarrison: vi.fn(() => true),
    setRallyPoint: vi.fn(),
    advanceEra: vi.fn(() => false),
  };
  return { host, unit, processor: new CommandProcessor(host) };
}

describe('CommandProcessor', () => {
  it('issues orders only to live units', () => {
    const { host, unit, processor } = fakeHost();
    const order = { kind: OrderKind.MOVE, target: { x: 4, z: 5 } } as const;
    expect(processor.apply({ kind: 'order', unitIds: [7, 99], order, clear: true })).toBe(true);
    expect(unit.issueOrder).toHaveBeenCalledWith(order, true);
    host.units.get(7)!.dead = true;
    unit.issueOrder.mockClear();
    processor.apply({ kind: 'order', unitIds: [7], order, clear: false });
    expect(unit.issueOrder).not.toHaveBeenCalled();
  });

  it('delegates stop, stance and rally commands', () => {
    const { host, unit, processor } = fakeHost();
    processor.apply({ kind: 'stop', unitIds: [7] });
    processor.apply({ kind: 'stance', unitIds: [7], stance: 'defensivo' });
    processor.apply({ kind: 'rally', buildingId: 3, target: { x: 1, z: 2 } });
    expect(unit.clearOrders).toHaveBeenCalledOnce();
    expect(unit.setCombatStance).toHaveBeenCalledWith('defensivo');
    expect(host.setRallyPoint).toHaveBeenCalledWith(3, { x: 1, z: 2 });
  });

  it('returns the host result for production, placement and era commands', () => {
    const { host, processor } = fakeHost();
    expect(processor.apply({ kind: 'place', building: BuildingKind.HOUSE, x: 2, z: 3 })).toBe(true);
    expect(processor.apply({ kind: 'train', buildingId: 1, unit: UnitKind.WORKER })).toBe(true);
    expect(processor.apply({ kind: 'research', buildingId: 1, tech: 'loom' })).toBe(false);
    expect(processor.apply({ kind: 'ungarrison', buildingId: 1 })).toBe(true);
    expect(processor.apply({ kind: 'advanceEra' })).toBe(false);
    processor.apply({ kind: 'cancel', buildingId: 1, index: 0 });
    expect(host.cancelProduction).toHaveBeenCalledWith(1, 0);
  });
});
