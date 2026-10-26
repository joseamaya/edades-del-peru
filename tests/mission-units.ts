import { UnitKind } from '../src/core/types';
import { MISSIONS } from '../src/campaign/defs/campaign';

/** Every unit kind that a mission spawns (starting army + scripted waves/reinforcements). */
export function missionUnits(mission: (typeof MISSIONS)[number]): UnitKind[] {
  const kinds: UnitKind[] = [];
  for (const u of mission.start.units ?? []) kinds.push(u.kind);
  for (const trigger of mission.triggers) {
    for (const fx of trigger.effects) {
      if (fx.type === 'wave' || fx.type === 'reinforce') {
        for (const u of fx.units) kinds.push(u.kind);
      }
    }
  }
  return kinds;
}
