import { MAX_WALKABLE_SLOPE } from '../game/Pathfinding';
import { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode } from '../entities/ResourceNode';
import { CivId, UnitKind, OrderKind } from '../core/types';
import { distance2D } from '../util/math';
import {
  placeStartBuildings,
  placeStartResources,
  placeStartingUnits,
  planStartingUnitSpots,
} from '../sim/WorldBuilder';

/** Opening base, starting units, resources and initial worker assignment. */
export class StartBaseBuilder {
  constructor(private readonly game: any) {}

  spawnStartBase(player: number, x: number, z: number): void {
    const ctx = this.game.makeBuildContext(player);
    // center and starting dwellings, laid out by the terrain-aware planner
    const plan = this.game.settlementPlanFor(player, x, z);
    placeStartBuildings({
      plan,
      createBuilding: (kind, bx, bz) => {
        const b = new Building(kind, player, this.game.players[player].era);
        b.pos.set(bx, this.game.terrain.getHeight(bx, bz), bz);
        this.game.attachBuilding(b);
        b.beginConstruction();
        b.addBuildProgress(9999);
        this.game.addBuilding(b);
        this.game.registerObstacle(b);
      },
    });
    // Caral draws no decal plots around the base: the authored ground paints fertile soil and grass, and
    // the player's chacras are the only fields (flat overlays read as stickers on the terrain).
    const caralGround = this.game.siteDef?.environs?.valley === 'caral';
    this.game.world.addSettlementOverlay(caralGround ? { ...plan, fields: [] } : plan);
    const civ = this.game.players[player].civ;
    if (civ === CivId.CARAL || civ === CivId.CHAVIN) {
      this.game.world.addSettlementDressing(plan, player, civ === CivId.CHAVIN ? 'chavin' : 'caral');
    }
    // nearby resources to start
    this.spawnStartResources(player, x, z);
    // After the opening nodes: the valley groves keep clear of every existing resource.
    if (player === 0 && this.game.siteDef?.environs?.valley === 'caral') this.game.world.addCaralValley(x, z);
    // The Caral opening deploys outside the civic core, on the camera-facing
    // side where the frame reads. Other matches and AI seats keep their ring.
    const startingSpots =
      player === 0 && this.game.siteDef?.environs?.opening === 'caral' ? this.startingUnitSpots(x, z) : undefined;
    placeStartingUnits({
      player,
      x,
      z,
      seed: this.game.settings.mapSeed,
      spots: startingSpots,
      mainComponentSpot: (sx, sz) => this.game.mainComponentSpot(sx, sz),
      createUnit: (kind, sx, sz) => {
        const unit = new Unit(
          kind === 'worker' ? UnitKind.WORKER : UnitKind.SCOUT,
          player,
          this.game.players[player].era,
          ctx,
        );
        unit.pos.set(sx, this.game.terrain.getHeight(sx, sz), sz);
        unit.setContext(this.game.unitContext);
        this.game.applyPlayerBonuses(unit, this.game.players[player]);
        this.game.attachUnit(unit);
        this.game.units.set(unit.id, unit);
        this.game.players[player].populationUsed += unit.stats.population;
      },
    });
    // auto-gathering
    // AI seats start gathering immediately; the human player keeps control of
    // the opening workers so they stay selectable at the base. AI-vs-AI seats
    // get their orders from the AI controller on its first update.
    if (this.game.players[player]?.isAI) this.assignInitialWorkers(player, x, z);
  }

  /**
   * Free deployment spots around a new base, away from every building and
   * resource. The first four sit on the camera-facing arc; the fifth is the scout.
   */
  startingUnitSpots(x: number, z: number): { x: number; z: number }[] {
    return planStartingUnitSpots({
      x,
      z,
      isClear: (px, pz, used) => this.startingUnitSpotClear(px, pz, used),
      fallback: (bx, bz, used) => this.startingUnitFallback(bx, bz, used),
    });
  }

  startingUnitFallback(x: number, z: number, used: { x: number; z: number }[]): { x: number; z: number } {
    const fallback = this.game.findFreeSpot(x, z, 2) ?? this.game.findLandNear(x, z, 24);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 2 + i * 0.8;
      const px = fallback.x + Math.cos(angle) * radius;
      const pz = fallback.z + Math.sin(angle) * radius;
      if (this.startingUnitSpotClear(px, pz, used)) return { x: px, z: pz };
    }
    return fallback;
  }

  startingUnitSpotClear(x: number, z: number, used: { x: number; z: number }[]): boolean {
    if (this.game.terrain.isWater(x, z) || this.game.terrain.isBeach(x, z)) return false;
    if (this.game.terrain.getSlope(x, z) > MAX_WALKABLE_SLOPE) return false;
    for (const b of this.game.buildings.values()) {
      if (b.dead) continue;
      if (distance2D(x, z, b.pos.x, b.pos.z) < b.radius + 0.9) return false;
    }
    for (const n of this.game.resourceNodes.values()) {
      if (n.dead) continue;
      if (distance2D(x, z, n.pos.x, n.pos.z) < n.radius + 0.6) return false;
    }
    return used.every((p) => distance2D(x, z, p.x, p.z) >= 1.1);
  }

  spawnStartResources(player: number, x: number, z: number): void {
    placeStartResources({
      player,
      x,
      z,
      seed: this.game.settings.mapSeed,
      caralOpening: this.game.siteDef?.environs?.opening === 'caral',
      setpieceLower: this.game.setpiecePlan?.lower,
      isReserved: (nx, nz) => this.game.isReserved(nx, nz, false),
      isWalkable: (nx, nz) => this.game.pathfinder.isWalkable(nx, nz),
      existing: () => this.game.resourceNodes.values(),
      add: (kind, amount, nx, nz) => {
        const node = new ResourceNode(kind, nx, nz, amount);
        node.pos.y = this.game.terrain.getHeight(nx, nz);
        this.game.attachResourceNode(
          node,
          this.game.mapProfile.baseMapType,
          this.game.trees,
          this.game.mapProfile.vegetation.variants,
        );
        this.game.resourceNodes.set(node.id, node);
        this.game.registerResourceObstacle(node.id, nx, nz, kind);
      },
    });
  }

  assignInitialWorkers(player: number, x: number, z: number): void {
    const workers = [...this.game.units.values()].filter((u) => u.owner === player && u.kind === UnitKind.WORKER);
    const foods = [...this.game.resourceNodes.values()].filter((n) => n.resource === 'food' && n.kind === 'berry');
    const woods = [...this.game.resourceNodes.values()].filter((n) => n.resource === 'wood');
    const steels = [...this.game.resourceNodes.values()].filter((n) => n.resource === 'silver');
    const stones = [...this.game.resourceNodes.values()].filter((n) => n.resource === 'stone');
    const nearest = (list: ResourceNode[], px: number, pz: number) =>
      list.reduce(
        (best, n) =>
          best ? (distance2D(px, pz, n.pos.x, n.pos.z) < distance2D(px, pz, best.pos.x, best.pos.z) ? n : best) : n,
        null as ResourceNode | null,
      );
    const foodNode = nearest(foods, x, z);
    const woodNode = nearest(woods, x, z);
    const mineralNode = nearest(steels.length ? steels : stones, x, z);
    const plan = [foodNode, woodNode, woodNode, mineralNode];
    workers.forEach((w, i) => {
      const node = plan[i] ?? foodNode;
      if (node) {
        w.issueOrder({ kind: OrderKind.GATHER, entityId: node.id });
      }
    });
  }
}
