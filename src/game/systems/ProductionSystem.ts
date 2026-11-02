import type { Era, UnitKind } from '../../core/types';
import type { Building } from '../../entities/Building';
import { getUnitStats } from '../../model/defs/units';

export type ProductionItem = Pick<Building, 'productionQueue'>['productionQueue'][number];

export interface ProductionRates {
  era: Era;
  /** Building multiplier applied on top of the civilization bonus. */
  trainMultiplier: number;
  /** Civilization training bonus in the 0–1 range (reduces train time). */
  trainingBonus: number;
}

/**
 * Advance a building's training queue. Completed items stay at progress 1 until
 * `spawn` succeeds, so a full population pauses production instead of losing it.
 */
export function advanceProduction(
  queue: ProductionItem[],
  dt: number,
  rates: ProductionRates,
  spawn?: (unit: UnitKind) => boolean,
): void {
  const speed = rates.trainMultiplier * (1 - rates.trainingBonus);
  for (let i = queue.length - 1; i >= 0; i--) {
    const item = queue[i];
    const stats = getUnitStats(item.unit, rates.era);
    item.progress += (dt / stats.trainTime) * speed;
    if (item.progress < 1) continue;
    if (!spawn) continue;
    if (spawn(item.unit)) queue.splice(i, 1);
    else item.progress = 1;
  }
}
