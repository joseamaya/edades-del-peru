import type { Game } from '../core/Game';
import type { ResourceNode } from '../entities/ResourceNode';
import { UnitKind, OrderKind, Resources } from '../core/types';
import { distance2D } from '../util/math';

/**
 * Worker assignment to resources. Centralizes the logic that used to be
 * duplicated between the player (auto-assignment) and the AI.
 */
export class Economy {
  constructor(private game: Game) {}

  /** Scarcest resource according to already-assigned workers and current resources. */
  neededResource(owner: number): keyof Resources {
    const p = this.game.players[owner];
    const counts: Record<string, number> = { food: 0, wood: 0, silver: 0, stone: 0 };
    for (const w of this.game.units.values()) {
      if (w.owner !== owner || w.kind !== UnitKind.WORKER || !w.isGathering()) continue;
      const node = w.orderQueue[0]?.entityId ? this.game.resourceNodes.get(w.orderQueue[0].entityId) : null;
      if (node) counts[node.resource]++;
    }
    const ratios: Record<string, number> = {
      food: p.resources.food < 300 ? 2 : 1,
      wood: p.resources.wood < 250 ? 2 : 1,
      silver: p.resources.silver < 200 ? 2 : 1,
      stone: p.resources.stone < 120 ? 2 : 1,
    };
    let best: keyof Resources = 'food';
    let bestScore = Infinity;
    for (const k of ['food', 'wood', 'silver', 'stone'] as const) {
      if (!this.playerHasDropsite(owner, k)) continue;
      const score = counts[k] / ratios[k];
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best;
  }

  /** True if the player has a drop-off that accepts that resource. */
  playerHasDropsite(player: number, resource: keyof Resources): boolean {
    for (const b of this.game.buildings.values()) {
      if (b.owner !== player) continue;
      if (!b.isDropsite || !b.dropTypes?.includes(resource)) continue;
      return true;
    }
    return false;
  }

  /** Closest non-depleted resource node to a point. */
  findNearestNode(resource: keyof Resources, x: number, z: number): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bestD = Infinity;
    for (const n of this.game.resourceNodes.values()) {
      if (n.dead || n.depleted || n.resource !== resource) continue;
      const d = distance2D(x, z, n.pos.x, n.pos.z);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** Assign an idle worker to the most needed resource (if a node exists). */
  assignWorker(unitId: number): void {
    const u = this.game.units.get(unitId);
    if (!u) return;
    const resource = this.neededResource(u.owner);
    const node = this.findNearestNode(resource, u.pos.x, u.pos.z);
    if (node) u.issueOrder({ kind: OrderKind.GATHER, entityId: node.id });
  }
}
