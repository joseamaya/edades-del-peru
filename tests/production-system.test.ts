import { describe, expect, it, vi } from 'vitest';
import { advanceProduction, type ProductionItem } from '../src/game/systems/ProductionSystem';
import { Era, UnitKind } from '../src/core/types';
import { getUnitStats } from '../src/model/defs/units';

const trainTime = getUnitStats(UnitKind.WORKER, Era.FORMATIVE).trainTime;

describe('advanceProduction', () => {
  it('completes an item after its training time and removes it on spawn', () => {
    const queue: ProductionItem[] = [{ unit: UnitKind.WORKER, progress: 0 }];
    const spawn = vi.fn(() => true);
    advanceProduction(queue, trainTime / 2, { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0 }, spawn);
    expect(queue).toHaveLength(1);
    spawn.mockClear();
    advanceProduction(queue, trainTime, { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0 }, spawn);
    expect(spawn).toHaveBeenCalledWith(UnitKind.WORKER);
    expect(queue).toHaveLength(0);
  });

  it('pauses at progress 1 while the population is full', () => {
    const queue: ProductionItem[] = [{ unit: UnitKind.WORKER, progress: 0 }];
    const spawn = vi.fn(() => false);
    advanceProduction(queue, trainTime * 2, { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0 }, spawn);
    expect(queue[0].progress).toBe(1);
    spawn.mockReturnValue(true);
    advanceProduction(queue, trainTime, { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0 }, spawn);
    expect(queue).toHaveLength(0);
  });

  it('applies the building training multiplier', () => {
    const queue: ProductionItem[] = [{ unit: UnitKind.WORKER, progress: 0 }];
    advanceProduction(queue, trainTime / 2, { era: Era.FORMATIVE, trainMultiplier: 2, trainingBonus: 0 }, () => false);
    expect(queue[0].progress).toBeCloseTo(1);
  });

  it('applies the civilization training bonus', () => {
    const queue: ProductionItem[] = [{ unit: UnitKind.WORKER, progress: 0 }];
    advanceProduction(
      queue,
      trainTime * 2,
      { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0.5 },
      () => false,
    );
    expect(queue[0].progress).toBeCloseTo(1);
  });

  it('leaves completed progress untouched when no spawn callback exists', () => {
    const queue: ProductionItem[] = [{ unit: UnitKind.WORKER, progress: 0 }];
    advanceProduction(queue, trainTime * 1.5, { era: Era.FORMATIVE, trainMultiplier: 1, trainingBonus: 0 });
    expect(queue[0].progress).toBe(1.5);
  });
});
