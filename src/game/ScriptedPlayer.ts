import { BuildingKind, OrderKind, Resources, UnitKind } from '../core/types';
import { getBuildingStats } from '../model/defs/buildings';
import { distance2D } from '../util/math';
import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import type { Building } from '../entities/Building';

const WORKER_TARGET = 12;
const ARMY_TARGET = 16;
const MAX_BARRACKS = 2;
const MAX_HOUSES = 8;

/**
 * A deterministic, non-cheating "competent player" bot, used as a benchmark: it
 * drives player 0 through the same `PlayerCommand` API a human uses (gather,
 * build a barracks, train soldiers, attack the enemy base). No god-mode, no
 * direct state edits, no RNG — so a difficulty that is harder for a human is
 * harder for it, unlike an AI-vs-AI mirror.
 *
 * It is intentionally simple (a greedy build order), not a strong player.
 */
export class ScriptedPlayer {
  private readonly game: Game;
  private readonly playerId: number;
  private timer = 0;
  private attackTimer = 0;

  constructor(game: Game, playerId = 0) {
    this.game = game;
    this.playerId = playerId;
  }

  /** Call once per fixed step. */
  update(dt: number): void {
    this.timer += dt;
    if (this.timer < 0.5) return;
    this.timer = 0;
    this.gather();
    this.build();
    this.train();
    this.attack();
  }

  private era() {
    return this.game.players[this.playerId].era;
  }

  private units(kind?: UnitKind): Unit[] {
    const out: Unit[] = [];
    for (const u of this.game.units.values()) {
      if (u.owner !== this.playerId || u.dead) continue;
      if (kind && u.kind !== kind) continue;
      out.push(u);
    }
    return out;
  }

  private buildings(kind?: BuildingKind): Building[] {
    const out: Building[] = [];
    for (const b of this.game.buildings.values()) {
      if (b.owner !== this.playerId || b.dead) continue;
      if (kind && b.kind !== kind) continue;
      out.push(b);
    }
    return out;
  }

  private soldiers(): Unit[] {
    return this.units().filter((u) => u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT);
  }

  private center(): Building | null {
    return this.buildings(BuildingKind.CENTER)[0] ?? null;
  }

  private canAfford(cost: Partial<Resources>): boolean {
    const r = this.game.players[this.playerId].resources;
    for (const [k, v] of Object.entries(cost)) {
      if (r[k as keyof Resources] < (v as number)) return false;
    }
    return true;
  }

  private order(order: Unit['orderQueue'][number], unitIds: number[]): void {
    this.game.executeCommand({ kind: 'order', unitIds, order, clear: true });
  }

  /** Keep idle workers gathering, spread across resource types. */
  private gather(): void {
    const workers = this.units(UnitKind.WORKER);
    const counts: Record<string, number> = { food: 0, wood: 0, silver: 0, stone: 0 };
    for (const w of workers) {
      const id = w.orderQueue[0]?.entityId;
      const n = id !== undefined ? this.game.resourceNodes.get(id) : undefined;
      if (n) counts[n.resource] = (counts[n.resource] ?? 0) + 1;
    }
    for (const w of workers) {
      if (w.isBusy()) continue;
      // staff the resource we have the fewest workers on
      let res: keyof typeof counts = 'food';
      let best = Infinity;
      for (const r of ['food', 'wood', 'silver', 'stone'] as const) {
        if (counts[r] < best) {
          best = counts[r];
          res = r;
        }
      }
      const node = this.nearestNode(w, res);
      if (node) {
        this.order({ kind: OrderKind.GATHER, entityId: node.id }, [w.id]);
        counts[res]++;
      }
    }
  }

  private nearestNode(w: Unit, resource: string): { id: number } | null {
    let best: { id: number } | null = null;
    let bestD = Infinity;
    for (const n of this.game.resourceNodes.values()) {
      if (n.dead || n.depleted || n.resource !== resource) continue;
      const d = distance2D(w.pos.x, w.pos.z, n.pos.x, n.pos.z);
      if (d < bestD) {
        bestD = d;
        best = { id: n.id };
      }
    }
    return best;
  }

  private build(): void {
    const center = this.center();
    if (!center) return;
    const p = this.game.players[this.playerId];
    const needHouse = p.populationUsed >= p.populationCap - 6 && this.buildings(BuildingKind.HOUSE).length < MAX_HOUSES;
    const barracks = this.buildings(BuildingKind.BARRACKS);
    const needBarracks =
      barracks.filter((b) => b.constructionComplete).length < MAX_BARRACKS && barracks.length < MAX_BARRACKS;
    const kind = needHouse ? BuildingKind.HOUSE : needBarracks ? BuildingKind.BARRACKS : null;
    if (kind && this.canAfford(getBuildingStats(kind, this.era()).cost)) {
      this.placeAndBuild(kind, center);
    }
  }

  private placeAndBuild(kind: BuildingKind, center: Building): void {
    const stats = getBuildingStats(kind, this.era());
    const spot = this.game.findFreeSpot(center.pos.x, center.pos.z, stats.size);
    if (!spot) return;
    const before = this.buildings(kind).length;
    if (!this.game.executeCommand({ kind: 'place', building: kind, x: spot.x, z: spot.z })) return;
    const built = this.buildings(kind);
    if (built.length === before) return;
    const b = built[built.length - 1];
    const builders = this.units(UnitKind.WORKER)
      .sort((a, c) => distance2D(a.pos.x, a.pos.z, b.pos.x, b.pos.z) - distance2D(c.pos.x, c.pos.z, b.pos.x, b.pos.z))
      .slice(0, 2);
    for (const w of builders) this.order({ kind: OrderKind.BUILD, entityId: b.id }, [w.id]);
  }

  private train(): void {
    const p = this.game.players[this.playerId];
    const center = this.center();
    if (
      center?.constructionComplete &&
      this.units(UnitKind.WORKER).length < WORKER_TARGET &&
      p.populationUsed < p.populationCap &&
      center.productionQueue.length < 2
    ) {
      this.game.executeCommand({ kind: 'train', buildingId: center.id, unit: UnitKind.WORKER });
    }
    const barracks = this.buildings(BuildingKind.BARRACKS);
    for (const b of barracks) {
      if (!b.constructionComplete) continue;
      if (this.soldiers().length >= ARMY_TARGET) break;
      if (b.productionQueue.length < 2) {
        this.game.executeCommand({ kind: 'train', buildingId: b.id, unit: UnitKind.SOLDIER });
      }
    }
  }

  /** Once the army is big enough, send any idle soldier at the enemy base. */
  private attack(): void {
    const soldiers = this.soldiers();
    if (soldiers.length < ARMY_TARGET) return;
    // re-target periodically so soldiers stuck on an unreachable building retry
    this.attackTimer += 0.5;
    const retarget = this.attackTimer >= 4;
    if (retarget) this.attackTimer = 0;
    const group = retarget ? soldiers : soldiers.filter((s) => s.orderQueue.length === 0);
    if (group.length === 0) return;
    for (const s of group) {
      let target: Building | null = null;
      let bestD = Infinity;
      for (const b of this.game.buildings.values()) {
        if (b.owner === this.playerId || b.dead) continue;
        // the center first (concentrate the army), then the nearest
        const d = b.kind === BuildingKind.CENTER ? -1 : distance2D(s.pos.x, s.pos.z, b.pos.x, b.pos.z);
        if (d < bestD) {
          bestD = d;
          target = b;
        }
      }
      if (target) this.order({ kind: OrderKind.ATTACK, entityId: target.id }, [s.id]);
    }
  }
}
