import type { PlayerCommand } from './replay';
import type { BuildingKind, CombatStance, Order, OrderTarget, UnitKind } from '../core/types';

interface CommandUnit {
  dead: boolean;
  issueOrder(order: Order, clear: boolean): void;
  clearOrders(): void;
  setCombatStance(stance: CombatStance): void;
}

/** The simulation operations a player command can reach. */
export interface CommandHost {
  units: Map<number, CommandUnit>;
  placeBuilding(kind: BuildingKind, x: number, z: number): boolean;
  trainUnit(buildingId: number, unit: UnitKind): boolean;
  researchTech(buildingId: number, tech: string): boolean;
  cancelProduction(buildingId: number, index: number): void;
  ungarrison(buildingId: number): boolean;
  setRallyPoint(buildingId: number, target: OrderTarget): void;
  advanceEra(playerId: number): boolean;
}

/**
 * Single reducer for player intent. Replays feed the same commands through the
 * same entry point, so the reducer must stay free of rendering and input.
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
        return this.host.advanceEra(0);
    }
  }
}
