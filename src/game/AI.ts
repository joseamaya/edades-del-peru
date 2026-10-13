import { Era, UnitKind, BuildingKind, OrderKind, Resources, RESOURCE_KEYS } from '../core/types';
import { DIFFICULTY_MULT } from '../core/Config';
import { TECHS } from '../model/defs/techs';
import { distance2D } from '../util/math';
import { RNG } from '../util/rng';
import { BUILDING_DEFS, getBuildingStats } from '../model/defs/buildings';
import { UNIT_ARCHETYPES } from '../model/defs/units';
import { getUnitStats } from '../model/defs/units';
import { unitMinPeriod } from '../model/defs/units';
import { ERA_DEFS } from '../model/defs/eras';
import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import type { ResourceNode } from '../entities/ResourceNode';
import { CATEGORIES, UNIT_CATEGORY, armyWeightsFor, UnitCategory } from './aiComposition';
import { AIProfile, Difficulty, attackThreshold, armyTarget, profileFor, workerTarget } from './aiProfiles';

/**
 * Opponent AI: macroeconomy (assigns workers), combat micro (focus fire,
 * retreat), base defense, scouting, building construction, era advancement and
 * attack waves. It only uses the same systems as the player (`issueOrder`,
 * `combatStance`, `Economy`), so difficulty changes decision quality and
 * reaction time — never a hidden resource/production advantage.
 */

/** An enemy within this radius of any AI building or worker is a base threat. */
const DEFEND_RADIUS = 26;
/** Only defenders within this radius of the threat answer the call. */
const DEFEND_RESPONSE = 32;
/** Do not bother retreating when already this close to the base. */
const RETREAT_MIN_DIST = 18;
/** Scouting fallback destination (map fraction) when no enemy building is known. */
const EXPLORE_FALLBACK = { x: 0.8, z: 0.2 } as const;
/** Radius within which an idle soldier will press a nearby enemy building. */
const PRESS_BUILDING_RADIUS = 18;
/** Radius within which a raiding soldier looks for an enemy worker. */
const RAID_RADIUS = 24;

export class AI {
  private game: Game;
  private playerId: number;
  private rng: RNG;
  private mult: { aggression: number; reaction: number };
  private profile: AIProfile;
  private attackTimer = 60;
  private economyTimer = 0;
  private buildingTimer = 0;
  private researchTimer = 4;
  private combatTimer = 0;
  private defenseTimer = 0;
  private scoutTimer = 3;
  private announced = new Set<string>();

  constructor(game: Game, playerId: number, difficulty?: Difficulty) {
    this.game = game;
    this.playerId = playerId;
    const diff = difficulty ?? game.settings.difficulty ?? 'normal';
    this.mult = DIFFICULTY_MULT[diff] ?? DIFFICULTY_MULT.normal;
    this.profile = profileFor(diff);
    this.rng = new RNG(game.settings.mapSeed + playerId * 77);
  }

  update(dt: number, t: number): void {
    void t;
    if (this.game.players[this.playerId].alive === false) return;
    this.economyTimer += dt;
    this.buildingTimer += dt;
    this.attackTimer -= dt;
    this.defenseTimer -= dt;
    this.scoutTimer -= dt;

    if (this.economyTimer > 0.6) {
      this.economyTimer = 0;
      this.manageWorkers();
    }
    if (this.buildingTimer > 1.2) {
      this.buildingTimer = 0;
      this.buildQueues();
    }
    if (this.scoutTimer <= 0) {
      this.scoutTimer = 6;
      this.explore();
    }
    if (this.attackTimer <= 0) {
      this.attackTimer = this.rng.range(30, 60) / Math.max(0.4, this.mult.aggression);
      this.launchAttack();
    }
    // reaction time is a difficulty knob: lower = faster response
    this.combatTimer -= dt;
    if (this.combatTimer <= 0) {
      this.combatTimer = 0.3 * this.mult.reaction;
      this.microCombat();
    }
    if (this.defenseTimer <= 0) {
      this.defenseTimer = 0.4 * this.mult.reaction;
      this.defendEconomy();
    }
    this.advanceEraCheck();
    this.researchTimer -= dt;
    if (this.researchTimer <= 0) {
      this.researchTimer = 8;
      this.researchCheck();
    }
  }

  private get p() {
    return this.game.players[this.playerId];
  }

  private myUnits(): Unit[] {
    return [...this.game.units.values()].filter((u) => u.owner === this.playerId && !u.dead);
  }

  private myBuildings(): Building[] {
    return [...this.game.buildings.values()].filter((b) => b.owner === this.playerId && !b.dead);
  }

  private center(): Building | null {
    return this.myBuildings().find((b) => b.kind === BuildingKind.CENTER) ?? null;
  }

  private manageWorkers(): void {
    const workers = this.myUnits().filter((u) => u.kind === UnitKind.WORKER);
    const busy = workers.filter(
      (w) => w.orderQueue[0]?.kind === OrderKind.GATHER || w.orderQueue[0]?.kind === OrderKind.BUILD,
    );
    const idle = workers.filter((w) => !w.isBusy());
    const center = this.center();
    const desired = workerTarget(this.profile, this.p.era);
    if (center && workers.length < desired && center.constructionComplete) {
      if (this.canAfford({ food: 50, wood: 20 })) {
        const queued = center.productionQueue.length;
        if (queued === 0) {
          if (this.game.spendResource(this.playerId, { food: 50, wood: 20, silver: 0, stone: 0 })) {
            center.queueUnit(UnitKind.WORKER);
          }
        }
      }
    }
    // assign idle workers to resources
    for (const w of idle) {
      const node = this.chooseResourceNode(w);
      if (node) w.issueOrder({ kind: OrderKind.GATHER, entityId: node.id });
    }
    void busy;
  }

  private canAfford(cost: Partial<Resources>): boolean {
    const p = this.p;
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < (cost[k] ?? 0)) return false;
    }
    return true;
  }

  /** Afford the cost while keeping `reserve` of each resource untouched. */
  private canAffordWithReserve(cost: Partial<Resources>, reserve: number): boolean {
    const p = this.p;
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < (cost[k] ?? 0) + reserve) return false;
    }
    return true;
  }

  private chooseResourceNode(w: Unit): ResourceNode | null {
    const nodes = [...this.game.resourceNodes.values()].filter((n) => !n.dead && !n.depleted);
    const p = this.p;
    // the player's complete farms count as food nodes
    for (const b of this.myBuildings()) {
      if (b.isFarm && b.constructionComplete && b.foodAmount > 0) {
        nodes.push({ id: b.id, pos: b.pos, amount: b.foodAmount, resource: 'food', farm: b } as any);
      }
    }
    // decide the most needed resource
    let bestRes: keyof Resources = 'food';
    let bestScore = Infinity;
    const workers = this.myUnits().filter((u) => u.kind === UnitKind.WORKER);
    const counts: Record<string, number> = { food: 0, wood: 0, silver: 0, stone: 0 };
    for (const u of workers) {
      const id = u.orderQueue[0]?.entityId;
      if (!id) continue;
      const n = this.game.resourceNodes.get(id);
      if (n) {
        counts[n.resource]++;
        continue;
      }
      // workers on a completed farm gather food (not a resource node, but still food income)
      const b = this.game.buildings.get(id);
      if (b?.isFarm && b.constructionComplete && b.foodAmount > 0) counts.food++;
    }
    const priority: Partial<Record<keyof Resources, number>> = {
      food: p.resources.food < 350 ? 1.4 : 0.8,
      wood: p.resources.wood < 300 ? 1.4 : 0.9,
      silver: p.resources.silver < 250 ? 1.3 : 1.0,
      stone: p.era >= Era.TAHUANTINSUYO && p.resources.stone < 200 ? 1.3 : 0.5,
    };
    for (const k of RESOURCE_KEYS) {
      const score = counts[k] / (priority[k] ?? 0.8);
      if (score < bestScore) {
        bestScore = score;
        bestRes = k;
      }
    }
    let best: ResourceNode | null = null;
    let bestD = Infinity;
    for (const n of nodes) {
      if (n.resource !== bestRes) continue;
      const d = distance2D(w.pos.x, w.pos.z, n.pos.x, n.pos.z);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private buildQueues(): void {
    const p = this.p;
    const myB = this.myBuildings();
    const center = this.center();
    if (!center) return;
    const has = (k: BuildingKind) => myB.some((b) => b.kind === k && b.constructionComplete);
    const countOf = (k: BuildingKind) => myB.filter((b) => b.kind === k).length;
    // only invest in non-essential buildings once a core army exists, so the
    // economy turns into military strength instead of building sprawl
    const soldiers = this.myUnits().filter((u) => u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT).length;
    const secure = soldiers >= this.profile.armyBase;

    const buildPlan: { kind: BuildingKind; cost: Resources; priority: number }[] = [];
    const woodCost = (k: BuildingKind) => getBuildingStats(k, p.era).cost;

    // economy income first (dropsites), then pop, military and the rest
    if (!has(BuildingKind.SAWMILL))
      buildPlan.push({ kind: BuildingKind.SAWMILL, cost: woodCost(BuildingKind.SAWMILL), priority: 96 });
    if (!has(BuildingKind.MILL))
      buildPlan.push({ kind: BuildingKind.MILL, cost: woodCost(BuildingKind.MILL), priority: 94 });
    if (!has(BuildingKind.BARRACKS))
      buildPlan.push({ kind: BuildingKind.BARRACKS, cost: woodCost(BuildingKind.BARRACKS), priority: 88 });
    if (countOf(BuildingKind.HOUSE) < 3 + p.era) {
      buildPlan.push({ kind: BuildingKind.HOUSE, cost: woodCost(BuildingKind.HOUSE), priority: 85 });
    }
    if (!has(BuildingKind.SMELTER))
      buildPlan.push({ kind: BuildingKind.SMELTER, cost: woodCost(BuildingKind.SMELTER), priority: 80 });
    if (p.era >= Era.TAHUANTINSUYO && !has(BuildingKind.REFINERY))
      buildPlan.push({ kind: BuildingKind.REFINERY, cost: woodCost(BuildingKind.REFINERY), priority: 70 });
    if (this.profile.advancedMilitary && !has(BuildingKind.ARSENAL))
      buildPlan.push({ kind: BuildingKind.ARSENAL, cost: woodCost(BuildingKind.ARSENAL), priority: 68 });
    if (this.profile.advancedMilitary && p.era >= Era.REGIONAL_STATES && !has(BuildingKind.STABLE))
      buildPlan.push({ kind: BuildingKind.STABLE, cost: woodCost(BuildingKind.STABLE), priority: 62 });
    if (p.era >= Era.REGIONAL_STATES && countOf(BuildingKind.FARM) < 4)
      buildPlan.push({ kind: BuildingKind.FARM, cost: woodCost(BuildingKind.FARM), priority: 50 });
    if (secure && p.era >= Era.REGIONAL_STATES && !has(BuildingKind.INSTITUTE))
      buildPlan.push({ kind: BuildingKind.INSTITUTE, cost: woodCost(BuildingKind.INSTITUTE), priority: 46 });
    if (secure && p.era >= Era.REGIONAL_STATES && !has(BuildingKind.FACTORY))
      buildPlan.push({ kind: BuildingKind.FACTORY, cost: woodCost(BuildingKind.FACTORY), priority: 44 });
    if (secure && p.era >= Era.REGIONAL_STATES && !has(BuildingKind.FORTRESS))
      buildPlan.push({ kind: BuildingKind.FORTRESS, cost: woodCost(BuildingKind.FORTRESS), priority: 42 });
    if (p.era >= Era.CONTEMPORARY && !has(BuildingKind.WONDER) && this.game.settings.victoryMode === 'wonder') {
      buildPlan.push({ kind: BuildingKind.WONDER, cost: woodCost(BuildingKind.WONDER), priority: 30 });
    }

    // keep incomplete builds staffed, then start a new one if under the cap
    const underConstruction = myB.filter((b) => !b.constructionComplete);
    this.staffConstruction(underConstruction);
    buildPlan.sort((a, b) => b.priority - a.priority || b.cost.wood - a.cost.wood);
    if (underConstruction.length < this.profile.maxConcurrentBuilds) {
      for (const plan of buildPlan) {
        if (this.canAfford(plan.cost)) {
          const spot = this.findBuildSpot(plan.kind);
          if (spot) {
            this.placeAI(plan.kind, spot.x, spot.z);
            break;
          }
        }
      }
    }

    // military production per era
    this.trainMilitary();
  }

  private findBuildSpot(kind: BuildingKind): { x: number; z: number } | null {
    const center = this.center();
    if (!center) return null;
    const stats = getBuildingStats(kind, this.p.era);
    // widen the ring beyond the starting resources so the base can keep growing
    for (let i = 0; i < 60; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(stats.size + 3, 24);
      const x = center.pos.x + Math.cos(ang) * r;
      const z = center.pos.z + Math.sin(ang) * r;
      if (this.game.canPlace(x, z, stats.size)) return { x, z };
    }
    return null;
  }

  private placeAI(kind: BuildingKind, x: number, z: number): void {
    const p = this.p;
    const stats = getBuildingStats(kind, p.era);
    if (!this.game.spendResource(this.playerId, stats.cost)) return;
    const ctx = this.game.makeBuildContext(this.playerId);
    const b = new Building(kind, this.playerId, p.era, ctx);
    b.pos.set(x, this.game.terrain.getHeight(x, z), z);
    b.attach(this.game.scene);
    b.beginConstruction();
    this.game.buildings.set(b.id, b);
    const handle = { x, z, radius: stats.size * 0.6 };
    this.game.obstacleHandles.set(b.id, handle);
    this.game.pathfinder.addObstacle(handle);
    // assign workers (prioritizing gatherers if needed)
    const gatherers = this.myUnits().filter(
      (u) => u.kind === UnitKind.WORKER && u.orderQueue[0]?.kind === OrderKind.GATHER,
    );
    const idlers = this.myUnits().filter((u) => u.kind === UnitKind.WORKER && !u.isBusy());
    const builders = [...idlers, ...gatherers].slice(0, 3);
    for (const w of builders) {
      w.issueOrder({ kind: OrderKind.BUILD, entityId: b.id }, true);
    }
  }

  /** Assign a small crew to any incomplete building that lost its builders. */
  private staffConstruction(incomplete: Building[]): void {
    for (const b of incomplete) {
      const staffed = this.myUnits().some(
        (u) =>
          u.kind === UnitKind.WORKER && u.orderQueue[0]?.kind === OrderKind.BUILD && u.orderQueue[0].entityId === b.id,
      );
      if (staffed) continue;
      const crew = this.myUnits()
        .filter((u) => u.kind === UnitKind.WORKER && (!u.isBusy() || u.orderQueue[0]?.kind === OrderKind.GATHER))
        .sort((a, c) => distance2D(a.pos.x, a.pos.z, b.pos.x, b.pos.z) - distance2D(c.pos.x, c.pos.z, b.pos.x, b.pos.z))
        .slice(0, 2);
      for (const w of crew) w.issueOrder({ kind: OrderKind.BUILD, entityId: b.id }, true);
    }
  }

  private trainMilitary(): void {
    const p = this.p;
    const military = this.myUnits().filter((u) => u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT);
    const target = armyTarget(this.profile, p.era);
    if (military.length >= target) return;

    // units trainable right now: owned building + researched tech + affordable
    const candidates: { unit: UnitKind; bld: Building; category: UnitCategory }[] = [];
    for (const bld of this.myBuildings()) {
      if (!bld.constructionComplete) continue;
      for (const u of BUILDING_DEFS[bld.kind].trainable ?? []) {
        const category = UNIT_CATEGORY[u];
        if (!category) continue;
        const arch = UNIT_ARCHETYPES[u];
        if (arch.requiresTech && !arch.requiresTech.every((t) => p.techs.has(t))) continue;
        if (unitMinPeriod(u) > this.game.settings.period) continue;
        if (!this.canAfford(getUnitStats(u, p.era).cost)) continue;
        candidates.push({ unit: u, bld, category });
      }
    }
    if (candidates.length === 0) return;

    // fill the biggest gap between the desired mix and the current army
    const weights = this.armyWeights();
    const totalWeight = CATEGORIES.reduce((s, k) => s + weights[k], 0) || 1;
    const current: Record<UnitCategory, number> = { melee: 0, ranged: 0, cavalry: 0, siege: 0 };
    for (const u of military) {
      const c = UNIT_CATEGORY[u.kind];
      if (c) current[c]++;
    }

    let best: { unit: UnitKind; bld: Building } | null = null;
    let bestDeficit = -Infinity;
    for (const c of candidates) {
      const deficit = (weights[c.category] / totalWeight) * target - current[c.category];
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        best = { unit: c.unit, bld: c.bld };
      }
    }
    if (!best || best.bld.productionQueue.length >= 2) return;
    const stats = getUnitStats(best.unit, p.era);
    if (this.game.spendResource(this.playerId, stats.cost)) {
      if (!best.bld.queueUnit(best.unit)) this.game.addResource(this.playerId, stats.cost);
    }
  }

  /** Desired army mix for the era, nudged to counter the enemy's composition. */
  private armyWeights(): Record<UnitCategory, number> {
    const team = this.p.team;
    const enemy = { melee: 0, ranged: 0, cavalry: 0 };
    for (const u of this.game.units.values()) {
      if (u.dead || u.owner === this.playerId || this.game.players[u.owner]?.team === team) continue;
      const c = UNIT_CATEGORY[u.kind];
      if (c === 'melee') enemy.melee++;
      else if (c === 'ranged') enemy.ranged++;
      else if (c === 'cavalry') enemy.cavalry++;
    }
    return armyWeightsFor(this.p.era, enemy);
  }

  private researchCheck(): void {
    const p = this.p;
    for (const tech of TECHS) {
      if (tech.minEra > p.era || p.techs.has(tech.id)) continue;
      if (tech.requirements && !tech.requirements.every((r) => p.techs.has(r))) continue;
      const bld = this.myBuildings().find((b) => b.kind === tech.building && b.constructionComplete);
      if (!bld || bld.researchQueue.length > 0) continue;
      if (this.canAffordWithReserve(tech.cost, this.profile.techReserve)) {
        if (this.game.spendResource(this.playerId, tech.cost)) {
          bld.queueTech(tech.id);
        }
        break;
      }
    }
  }

  private advanceEraCheck(): void {
    // Period-locked matches: the AI neither modernizes nor advances era.
    if (this.game.settings.period !== undefined) return;
    const p = this.p;
    if (p.era >= Era.CONTEMPORARY) return;
    const def = ERA_DEFS[p.era];
    const check = this.game.canAdvanceEra(this.playerId);
    if (check.ok && this.canAfford(def.advanceCost ?? {})) {
      this.game.advanceEra(this.playerId);
    }
  }

  private microCombat(): void {
    const base = this.center();
    const soldiers = this.myUnits().filter((u) => u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT);
    for (const s of soldiers) {
      if (base && s.hp / s.maxHp < this.profile.retreatHp) {
        const distHome = distance2D(s.pos.x, s.pos.z, base.pos.x, base.pos.z);
        if (distHome > RETREAT_MIN_DIST && s.orderQueue[0]?.kind !== OrderKind.MOVE) {
          s.issueOrder({ kind: OrderKind.MOVE, target: { x: base.pos.x, z: base.pos.z } }, true);
        }
        continue;
      }
      if (s.orderQueue[0]?.kind !== OrderKind.ATTACK) {
        const enemy = this.findEnemyInRange(s);
        if (enemy) {
          if (this.mult.aggression > 0.6) s.issueOrder({ kind: OrderKind.ATTACK, entityId: enemy.id }, true);
        } else {
          // no unit in range: raid an enemy worker if aggressive enough, else press a building
          const raid = this.profile.raidEconomy ? this.findEnemyWorkerInRange(s, RAID_RADIUS) : null;
          if (raid) {
            s.issueOrder({ kind: OrderKind.ATTACK, entityId: raid.id }, true);
          } else {
            const b = this.findEnemyBuildingInRange(s, PRESS_BUILDING_RADIUS);
            if (b) s.issueOrder({ kind: OrderKind.ATTACK, entityId: b.id }, true);
          }
        }
      }
    }
  }

  /** Recall idle military to answer an enemy threatening the base or its workers. */
  private defendEconomy(): void {
    const threat = this.findThreat();
    if (!threat) return;
    const tx = threat.pos.x;
    const tz = threat.pos.z;
    for (const u of this.myUnits()) {
      if (u.kind === UnitKind.WORKER || u.kind === UnitKind.SCOUT) continue;
      const order = u.orderQueue[0]?.kind;
      if (order === OrderKind.ATTACK || order === OrderKind.ATTACK_MOVE) continue;
      if (distance2D(u.pos.x, u.pos.z, tx, tz) > DEFEND_RESPONSE) continue;
      u.issueOrder({ kind: OrderKind.ATTACK, entityId: threat.id }, true);
    }
  }

  /** Nearest enemy unit within DEFEND_RADIUS of any AI building or worker. */
  private findThreat(): Unit | null {
    const anchors: { x: number; z: number }[] = [];
    for (const b of this.myBuildings()) anchors.push({ x: b.pos.x, z: b.pos.z });
    for (const u of this.myUnits()) if (u.kind === UnitKind.WORKER) anchors.push({ x: u.pos.x, z: u.pos.z });
    if (anchors.length === 0) return null;
    let best: Unit | null = null;
    let bestD = Infinity;
    const team = this.p.team;
    for (const e of this.game.units.values()) {
      if (e.dead || e.owner === this.playerId) continue;
      if (this.game.players[e.owner]?.team === team) continue;
      for (const a of anchors) {
        const d = distance2D(e.pos.x, e.pos.z, a.x, a.z);
        if (d < DEFEND_RADIUS && d < bestD) {
          bestD = d;
          best = e;
        }
      }
    }
    return best;
  }

  /** Keep idle scouts patrolling toward the enemy base to reveal the map. */
  private explore(): void {
    const enemy = this.findEnemyCenter();
    const size = this.game.settings.mapSize;
    const target = enemy
      ? { x: enemy.pos.x, z: enemy.pos.z }
      : { x: size * EXPLORE_FALLBACK.x, z: size * EXPLORE_FALLBACK.z };
    for (const u of this.myUnits()) {
      if (u.kind !== UnitKind.SCOUT || u.isBusy()) continue;
      u.issueOrder({ kind: OrderKind.PATROL, target }, true);
    }
  }

  /** A living building owned by another team. */
  private isEnemyBuilding(b: Building): boolean {
    return !b.dead && b.owner !== this.playerId && this.game.players[b.owner]?.team !== this.p.team;
  }

  /** Nearest enemy building within `radius` of the unit (to press the attack). */
  private findEnemyBuildingInRange(s: Unit, radius: number): Building | null {
    let best: Building | null = null;
    let bestD = radius;
    for (const b of this.game.buildings.values()) {
      if (!this.isEnemyBuilding(b)) continue;
      const d = distance2D(s.pos.x, s.pos.z, b.pos.x, b.pos.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private findEnemyInRange(s: Unit): Unit | null {
    let best: Unit | null = null;
    let bestD = Infinity;
    const range = s.stats.range > 0 ? s.stats.range * 1.2 : 8;
    const nearby = this.game.enemiesNear(s.pos.x, s.pos.z, range, this.playerId);
    for (const u of nearby) {
      const d = distance2D(s.pos.x, s.pos.z, u.pos.x, u.pos.z);
      if (d < range && d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  /** Nearest enemy worker within `radius` of the unit (raiding). */
  private findEnemyWorkerInRange(s: Unit, radius: number): Unit | null {
    let best: Unit | null = null;
    let bestD = radius;
    const team = this.p.team;
    for (const u of this.game.units.values()) {
      if (u.dead || u.kind !== UnitKind.WORKER) continue;
      if (u.owner === this.playerId || this.game.players[u.owner]?.team === team) continue;
      const d = distance2D(s.pos.x, s.pos.z, u.pos.x, u.pos.z);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private findEnemyCenter(): Building | null {
    let best: Building | null = null;
    let bestD = Infinity;
    const center = this.center();
    const bx = center?.pos.x ?? this.game.settings.mapSize / 2;
    const bz = center?.pos.z ?? this.game.settings.mapSize / 2;
    for (const b of this.game.buildings.values()) {
      if (!this.isEnemyBuilding(b)) continue;
      const d = distance2D(bx, bz, b.pos.x, b.pos.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private launchAttack(): void {
    const soldiers = this.myUnits().filter((u) => u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT);
    const threshold = attackThreshold(this.profile, this.p.era);
    if (soldiers.length < threshold) return;
    const target = this.findAttackTarget();
    if (!target) return;
    for (const s of soldiers) {
      // attack the building itself so conquest actually progresses
      s.issueOrder({ kind: OrderKind.ATTACK, entityId: target.id }, true);
    }
    if (!this.announced.has('attack')) {
      this.announced.add('attack');
      this.game.hud.showToast('¡El enemigo ataca tu base!', 'danger');
    }
  }

  /** Enemy building to focus: the center first, else the nearest one to our base. */
  private findAttackTarget(): Building | null {
    const base = this.center();
    const bx = base?.pos.x ?? this.game.settings.mapSize / 2;
    const bz = base?.pos.z ?? this.game.settings.mapSize / 2;
    let center: Building | null = null;
    let nearest: Building | null = null;
    let nearestD = Infinity;
    for (const b of this.game.buildings.values()) {
      if (!this.isEnemyBuilding(b)) continue;
      if (b.kind === BuildingKind.CENTER) center = b;
      const d = distance2D(bx, bz, b.pos.x, b.pos.z);
      if (d < nearestD) {
        nearestD = d;
        nearest = b;
      }
    }
    return center ?? nearest;
  }
}
