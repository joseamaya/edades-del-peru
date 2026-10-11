import { Era, UnitKind, BuildingKind, OrderKind, Resources, RESOURCE_KEYS } from '../core/types';
import { DIFFICULTY_MULT } from '../core/Config';
import { TECHS } from '../model/defs/techs';
import { distance2D } from '../util/math';
import { RNG } from '../util/rng';
import { BUILDING_DEFS, getBuildingStats } from '../model/defs/buildings';
import { UNIT_ARCHETYPES } from '../model/defs/units';
import { getUnitStats } from '../model/defs/units';
import { ERA_DEFS } from '../model/defs/eras';
import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import type { ResourceNode } from '../entities/ResourceNode';

/**
 * IA oponente: macroeconomía (asigna obreros), micro de combate (focus fire,
 * retirada), construcción de edificios, avance de era y oleadas de ataque.
 */
export class AI {
  private game: Game;
  private playerId: number;
  private rng: RNG;
  private mult: { econ: number; agresion: number; reaction: number };
  private attackTimer = 60;
  private defendTimer = 0;
  private economyTimer = 0;
  private buildingTimer = 0;
  private researchTimer = 4;
  private combatTimer = 0;
  private announced = new Set<string>();

  constructor(game: Game, playerId: number) {
    this.game = game;
    this.playerId = playerId;
    const diff = (game.settings.difficulty ?? 'normal') as keyof typeof DIFFICULTY_MULT;
    this.mult = DIFFICULTY_MULT[diff] ?? DIFFICULTY_MULT.normal;
    this.rng = new RNG(game.settings.mapSeed + playerId * 77);
  }

  update(dt: number, t: number): void {
    void t;
    if (this.game.players[this.playerId].alive === false) return;
    this.economyTimer += dt;
    this.buildingTimer += dt;
    this.attackTimer -= dt;
    this.defendTimer -= dt;

    if (this.economyTimer > 0.6) {
      this.economyTimer = 0;
      this.manageWorkers();
    }
    if (this.buildingTimer > 1.2) {
      this.buildingTimer = 0;
      this.buildQueues();
    }
    if (this.attackTimer <= 0) {
      this.attackTimer = this.rng.range(50, 95) / Math.max(0.4, this.mult.agresion);
      this.launchAttack();
    }
    this.combatTimer -= dt;
    if (this.combatTimer <= 0) {
      this.combatTimer = 0.3;
      this.microCombat(dt);
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
    return this.myBuildings().find((b) => b.kind === BuildingKind.CENTRO) ?? null;
  }

  private manageWorkers(): void {
    const workers = this.myUnits().filter((u) => u.kind === UnitKind.OBRERO);
    const busy = workers.filter((w) => w.orderQueue[0]?.kind === OrderKind.GATHER || w.orderQueue[0]?.kind === OrderKind.BUILD);
    const idle = workers.filter((w) => !w.isBusy());
    // entrenar obreros si falta mano de obra
    const center = this.center();
    const desired = Math.min(6 + this.p.era * 2, 14);
    if (center && workers.length < desired && center.constructionComplete) {
      if (this.canAfford({ comida: 50, madera: 20 })) {
        const queued = center.productionQueue.length;
        if (queued === 0) {
          if (this.game.spendResource(this.playerId, { comida: 50, madera: 20, acero: 0, energia: 0 })) {
            center.queueUnit(UnitKind.OBRERO);
          }
        }
      }
    }
    // asignar ociosos a recursos
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

  private chooseResourceNode(w: Unit): ResourceNode | null {
    const nodes = [...this.game.resourceNodes.values()].filter((n) => !n.dead && !n.depleted);
    const p = this.p;
    // las granjas propias completas cuentan como nodos de comida
    for (const b of this.myBuildings()) {
      if (b.isFarm && b.constructionComplete && b.foodAmount > 0) {
        nodes.push({ id: b.id, pos: b.pos, amount: b.foodAmount, resource: 'comida', farm: b } as any);
      }
    }
    // decide recurso más necesario
    let bestRes: keyof Resources = 'comida';
    let bestScore = Infinity;
    const workers = this.myUnits().filter((u) => u.kind === UnitKind.OBRERO);
    const counts: Record<string, number> = { comida: 0, madera: 0, acero: 0, energia: 0 };
    for (const u of workers) {
      const n = u.orderQueue[0]?.entityId ? this.game.resourceNodes.get(u.orderQueue[0].entityId) : null;
      if (n) counts[n.resource]++;
    }
    const priority: Partial<Record<keyof Resources, number>> = {
      comida: p.resources.comida < 350 ? 1.4 : 0.8,
      madera: p.resources.madera < 300 ? 1.4 : 0.9,
      acero: p.resources.acero < 250 ? 1.3 : 1.0,
      energia: p.era >= Era.TAHUANTINSUYO && p.resources.energia < 200 ? 1.3 : 0.5,
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

    const buildPlan: { kind: BuildingKind; cost: Resources; priority: number }[] = [];
    const woodCost = (k: BuildingKind) => getBuildingStats(k, p.era).costo;

    if (countOf(BuildingKind.VIVIENDA) < 3 + p.era) {
      buildPlan.push({ kind: BuildingKind.VIVIENDA, cost: woodCost(BuildingKind.VIVIENDA), priority: 100 });
    }
    if (!has(BuildingKind.MOLINO)) buildPlan.push({ kind: BuildingKind.MOLINO, cost: woodCost(BuildingKind.MOLINO), priority: 90 });
    if (!has(BuildingKind.SERRERIA)) buildPlan.push({ kind: BuildingKind.SERRERIA, cost: woodCost(BuildingKind.SERRERIA), priority: 85 });
    if (!has(BuildingKind.FUNDICION)) buildPlan.push({ kind: BuildingKind.FUNDICION, cost: woodCost(BuildingKind.FUNDICION), priority: 80 });
    if (p.era >= Era.TAHUANTINSUYO && !has(BuildingKind.REFINERIA)) buildPlan.push({ kind: BuildingKind.REFINERIA, cost: woodCost(BuildingKind.REFINERIA), priority: 70 });
    if (!has(BuildingKind.CUARTEL)) buildPlan.push({ kind: BuildingKind.CUARTEL, cost: woodCost(BuildingKind.CUARTEL), priority: 75 });
    if (!has(BuildingKind.POLVORIN)) buildPlan.push({ kind: BuildingKind.POLVORIN, cost: woodCost(BuildingKind.POLVORIN), priority: 65 });
    if (p.era >= Era.ESTADOS_REGIONALES && !has(BuildingKind.GARAJE)) buildPlan.push({ kind: BuildingKind.GARAJE, cost: woodCost(BuildingKind.GARAJE), priority: 60 });
    if (p.era >= Era.ESTADOS_REGIONALES && !has(BuildingKind.FABRICA)) buildPlan.push({ kind: BuildingKind.FABRICA, cost: woodCost(BuildingKind.FABRICA), priority: 50 });
    if (p.era >= Era.ESTADOS_REGIONALES && !has(BuildingKind.INSTITUTO)) buildPlan.push({ kind: BuildingKind.INSTITUTO, cost: woodCost(BuildingKind.INSTITUTO), priority: 55 });
    if (p.era >= Era.ESTADOS_REGIONALES && !has(BuildingKind.FORTALEZA)) buildPlan.push({ kind: BuildingKind.FORTALEZA, cost: woodCost(BuildingKind.FORTALEZA), priority: 45 });
    if (p.era >= Era.ESTADOS_REGIONALES && countOf(BuildingKind.GRANJA) < 4) buildPlan.push({ kind: BuildingKind.GRANJA, cost: woodCost(BuildingKind.GRANJA), priority: 40 });
    if (p.era >= Era.CONTEMPORANEO && !has(BuildingKind.MARAVILLA) && this.game.settings.victoryMode === 'maravilla') {
      buildPlan.push({ kind: BuildingKind.MARAVILLA, cost: woodCost(BuildingKind.MARAVILLA), priority: 30 });
    }

    // construye el más prioritario que pueda pagar
    buildPlan.sort((a, b) => b.priority - a.priority || b.cost.madera - a.cost.madera);
    const constructing = myB.some((b) => !b.constructionComplete);
    if (!constructing) {
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

    // producción militar según era
    this.trainMilitary();
  }

  private findBuildSpot(kind: BuildingKind): { x: number; z: number } | null {
    const center = this.center();
    if (!center) return null;
    const stats = getBuildingStats(kind, this.p.era);
    for (let i = 0; i < 40; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(stats.tamano + 3, 12);
      const x = center.pos.x + Math.cos(ang) * r;
      const z = center.pos.z + Math.sin(ang) * r;
      if (this.game.canPlace(x, z, stats.tamano)) return { x, z };
    }
    return null;
  }

  private placeAI(kind: BuildingKind, x: number, z: number): void {
    const p = this.p;
    const stats = getBuildingStats(kind, p.era);
    if (!this.game.spendResource(this.playerId, stats.costo)) return;
    const ctx = this.game.makeBuildContext(this.playerId);
    const b = new Building(kind, this.playerId, p.era, ctx);
    b.pos.set(x, this.game.terrain.getHeight(x, z), z);
    b.attach(this.game.scene);
    b.beginConstruction();
    this.game.buildings.set(b.id, b);
    const handle = { x, z, radius: stats.tamano * 0.6 };
    this.game.obstacleHandles.set(b.id, handle);
    this.game.pathfinder.addObstacle(handle);
    // asignar obreros (priorizando a los que recolectan si hace falta)
    const gatherers = this.myUnits().filter((u) => u.kind === UnitKind.OBRERO && u.orderQueue[0]?.kind === OrderKind.GATHER);
    const idlers = this.myUnits().filter((u) => u.kind === UnitKind.OBRERO && !u.isBusy());
    const builders = [...idlers, ...gatherers].slice(0, 3);
    for (const w of builders) {
      w.issueOrder({ kind: OrderKind.BUILD, entityId: b.id }, true);
    }
  }

  private trainMilitary(): void {
    const p = this.p;
    const myB = this.myBuildings();
    const barracks = myB.find((b) => b.kind === BuildingKind.CUARTEL && b.constructionComplete);
    const range = myB.find((b) => b.kind === BuildingKind.POLVORIN && b.constructionComplete);
    const stable = myB.find((b) => b.kind === BuildingKind.GARAJE && b.constructionComplete);
    const factory = myB.find((b) => b.kind === BuildingKind.FABRICA && b.constructionComplete);

    const militaryCount = this.myUnits().filter((u) => u.kind !== UnitKind.OBRERO && u.kind !== UnitKind.EXPLORADOR).length;
    const target = 6 + p.era * 5;

    const want: UnitKind[] = [];
    if (barracks && this.canAfford(getUnitStats(UnitKind.SOLDADO, p.era).costo)) want.push(UnitKind.SOLDADO);
    if (range && p.era >= Era.ESTADOS_REGIONALES && this.canAfford(getUnitStats(UnitKind.FUSILERO, p.era).costo)) want.push(UnitKind.FUSILERO);
    if (range && this.canAfford(getUnitStats(UnitKind.MOSQUETERO, p.era).costo)) want.push(UnitKind.MOSQUETERO);
    if (stable && p.era >= Era.TAHUANTINSUYO && this.canAfford(getUnitStats(UnitKind.CABALLERIA, p.era).costo)) want.push(UnitKind.CABALLERIA);
    if (factory && p.era >= Era.VIRREINATO && this.canAfford(getUnitStats(UnitKind.ARTILLERIA, p.era).costo)) want.push(UnitKind.ARTILLERIA);

    if (militaryCount < target && want.length > 0) {
      const bld = barracks ?? range ?? stable ?? factory;
      if (bld && bld.productionQueue.length < 2) {
        // solo unidades entrenables en este edificio y con techs investigadas
        const def = BUILDING_DEFS[bld.kind];
        const trainable = want.filter((u) => {
          if (!def.trainable?.includes(u)) return false;
          const arch = UNIT_ARCHETYPES[u];
          return !arch.requiresTech || arch.requiresTech.every((t) => p.techs.has(t));
        });
        if (trainable.length === 0) return;
        const unit = this.rng.pick(trainable);
        const stats = getUnitStats(unit, p.era);
        if (this.canAfford(stats.costo)) {
          if (this.game.spendResource(this.playerId, stats.costo)) {
            if (!bld.queueUnit(unit)) {
              this.game.addResource(this.playerId, stats.costo);
            }
          }
        }
      }
    }
  }

  private researchCheck(): void {
    const p = this.p;
    for (const tech of TECHS) {
      if (tech.eraMinima > p.era || p.techs.has(tech.id)) continue;
      if (tech.requisitos && !tech.requisitos.every((r) => p.techs.has(r))) continue;
      const bld = this.myBuildings().find((b) => b.kind === tech.edificio && b.constructionComplete);
      if (!bld || bld.researchQueue.length > 0) continue;
      if (this.canAfford(tech.costo)) {
        if (this.game.spendResource(this.playerId, tech.costo)) {
          bld.queueTech(tech.id);
        }
        break;
      }
    }
  }

  private advanceEraCheck(): void {
    // Partidas bloqueadas por periodo: la IA no moderniza ni avanza de era.
    if (this.game.settings.periodo !== undefined) return;
    const p = this.p;
    if (p.era >= Era.CONTEMPORANEO) return;
    const def = ERA_DEFS[p.era];
    const check = this.game.canAdvanceEra(this.playerId);
    if (check.ok && this.canAfford(def.advanceCost ?? {})) {
      this.game.advanceEra(this.playerId);
    }
  }

  private microCombat(dt: number): void {
    // focus fire: atacar al objetivo con menor vida dentro de rango
    const soldiers = this.myUnits().filter((u) => u.kind !== UnitKind.OBRERO && u.kind !== UnitKind.EXPLORADOR);
    for (const s of soldiers) {
      if (s.orderQueue[0]?.kind !== OrderKind.ATTACK) {
        const enemy = this.findEnemyInRange(s);
        if (enemy && this.mult.agresion > 0.6) {
          s.issueOrder({ kind: OrderKind.ATTACK, entityId: enemy.id }, true);
        }
      }
    }
    void dt;
  }

  private findEnemyInRange(s: Unit): Unit | null {
    let best: Unit | null = null;
    let bestD = Infinity;
    const range = s.stats.rango > 0 ? s.stats.rango * 1.2 : 8;
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

  private findEnemyCenter(): Building | null {
    let best: Building | null = null;
    let bestD = Infinity;
    const center = this.center();
    const bx = center?.pos.x ?? this.game.settings.mapSize / 2;
    const bz = center?.pos.z ?? this.game.settings.mapSize / 2;
    for (const b of this.game.buildings.values()) {
      if (b.owner === this.playerId || b.dead) continue;
      const d = distance2D(bx, bz, b.pos.x, b.pos.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private launchAttack(): void {
    const soldiers = this.myUnits().filter((u) => u.kind !== UnitKind.OBRERO && u.kind !== UnitKind.EXPLORADOR);
    const threshold = 4 + this.p.era * 2;
    if (soldiers.length < threshold) return;
    const target = this.findEnemyCenter();
    if (!target) return;
    const tx = target.pos.x;
    const tz = target.pos.z;
    const attackGroup = soldiers.slice(0, Math.min(soldiers.length, 8 + this.p.era * 3));
    for (const s of attackGroup) {
      s.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: tx, z: tz } }, true);
    }
    if (!this.announced.has('attack')) {
      this.announced.add('attack');
      this.game.hud.showToast('¡El enemigo ataca tu base!', 'danger');
    }
  }
}
