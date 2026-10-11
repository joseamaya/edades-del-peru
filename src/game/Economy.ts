import type { Game } from '../core/Game';
import type { ResourceNode } from '../entities/ResourceNode';
import { UnitKind, OrderKind, Resources } from '../core/types';
import { distance2D } from '../util/math';

/**
 * Asignación de obreros a recursos. Centraliza la lógica que antes estaba
 * duplicada entre el jugador (auto-asignación) y la IA.
 */
export class Economy {
  constructor(private game: Game) {}

  /** Recurso más escaso según los obreros ya asignados y los recursos actuales. */
  neededResource(owner: number): keyof Resources {
    const p = this.game.players[owner];
    const counts: Record<string, number> = { comida: 0, madera: 0, acero: 0, energia: 0 };
    for (const w of this.game.units.values()) {
      if (w.owner !== owner || w.kind !== UnitKind.OBRERO || !w.isGathering()) continue;
      const node = w.orderQueue[0]?.entityId ? this.game.resourceNodes.get(w.orderQueue[0].entityId) : null;
      if (node) counts[node.resource]++;
    }
    const ratios: Record<string, number> = {
      comida: p.resources.comida < 300 ? 2 : 1,
      madera: p.resources.madera < 250 ? 2 : 1,
      acero: p.resources.acero < 200 ? 2 : 1,
      energia: p.resources.energia < 120 ? 2 : 1,
    };
    let best: keyof Resources = 'comida';
    let bestScore = Infinity;
    for (const k of ['comida', 'madera', 'acero', 'energia'] as const) {
      if (!this.playerHasDropsite(owner, k)) continue;
      const score = counts[k] / ratios[k];
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best;
  }

  /** True si el jugador tiene un depósito que acepta ese recurso. */
  playerHasDropsite(player: number, resource: keyof Resources): boolean {
    for (const b of this.game.buildings.values()) {
      if (b.owner !== player) continue;
      if (!b.isDropsite || !b.dropTypes?.includes(resource)) continue;
      return true;
    }
    return false;
  }

  /** Nodo de recurso no agotado más cercano a un punto. */
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

  /** Asigna un obrero ocioso al recurso más necesario (si hay nodo). */
  assignWorker(unitId: number): void {
    const u = this.game.units.get(unitId);
    if (!u) return;
    const resource = this.neededResource(u.owner);
    const node = this.findNearestNode(resource, u.pos.x, u.pos.z);
    if (node) u.issueOrder({ kind: OrderKind.GATHER, entityId: node.id });
  }
}
