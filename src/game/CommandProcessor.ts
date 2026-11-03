import type { PlayerCommand } from './replay';
import type { Unit } from '../entities/Unit';
import type { BuildingKind, OrderTarget, Resources, UnitKind } from '../core/types';

type CommandUnit = Pick<Unit, 'dead' | 'issueOrder' | 'clearOrders' | 'setCombatStance'>;

/** The simulation operations a player command can reach. */
export interface CommandHost {
  units: ReadonlyMap<number, CommandUnit>;
  placeBuilding(kind: BuildingKind, x: number, z: number): boolean;
  trainUnit(buildingId: number, unit: UnitKind): boolean;
  researchTech(buildingId: number, tech: string): boolean;
  cancelProduction(buildingId: number, index: number): void;
  ungarrison(buildingId: number): boolean;
  setRallyPoint(buildingId: number, target: OrderTarget): void;
  advanceEra(): boolean;
  marketTrade(resource: keyof Resources, action: 'buy' | 'sell', amount: number): boolean;
  replantFarm(buildingId: number): boolean;
}

/**
 * Single dispatch point for player intent. Replays feed the same commands
 * through the same entry point, so it must stay free of rendering and input.
 */
export class CommandProcessor {
  constructor(private readonly host: CommandHost) {}

  apply(cmd: PlayerCommand): boolean {
    switch (cmd.kind) {
      case 'order':
        for (const id of cmd.unitIds) {
          const unit = this.host.units.get(id);
          if (unit && !unit.dead) unit.issueOrder(cmd.order, cmd.clear);
        }
        return true;
      case 'stop':
        for (const id of cmd.unitIds) this.host.units.get(id)?.clearOrders();
        return true;
      case 'stance':
        for (const id of cmd.unitIds) {
          const unit = this.host.units.get(id);
          if (unit && !unit.dead) unit.setCombatStance(cmd.stance);
        }
        return true;
      case 'place':
        return this.host.placeBuilding(cmd.building, cmd.x, cmd.z);
      case 'train':
        return this.host.trainUnit(cmd.buildingId, cmd.unit);
      case 'research':
        return this.host.researchTech(cmd.buildingId, cmd.tech);
      case 'cancel':
        this.host.cancelProduction(cmd.buildingId, cmd.index);
        return true;
      case 'ungarrison':
        return this.host.ungarrison(cmd.buildingId);
      case 'rally':
        this.host.setRallyPoint(cmd.buildingId, cmd.target);
        return true;
      case 'advanceEra':
        return this.host.advanceEra();
      case 'market':
        return this.host.marketTrade(cmd.resource, cmd.action, cmd.amount);
      case 'replant':
        return this.host.replantFarm(cmd.buildingId);
    }
  }
}
