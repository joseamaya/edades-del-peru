import type { GameSettings } from './Config';
import { kitLod0RadiusFor } from '../rendering/TreeInstances';
import { saveToStorage, serializeGame } from '../game/SaveGame';
import * as THREE from 'three';
import { bus } from './EventBus';
import { cloudDensity } from '../rendering/Sky';
import { Unit, UnitContext } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode } from '../entities/ResourceNode';
import { Projectile } from '../entities/Projectile';
import { ProjectileView, updateProjectilePools } from '../rendering/ProjectileView';
import { EntityView, reserveIds } from '../entities/EntityView';
import { detachBuilding, detachUnit, modernizeUnit } from '../rendering/RenderSync';
import { elevationDamageMultiplier, ArmorProfile } from '../game/combat';
import { Resources, PlayerState, UnitKind, BuildingKind, OrderKind, OrderTarget, RESOURCE_KEYS } from '../core/types';
import { distance2D } from '../util/math';
import { CANAL_DRY_DROUGHT, CANAL_WET_FLOW, canalIrrigationAt } from '../model/defs/canal';
import { getUnitStats, DamageClass, unitClassFor } from '../model/defs/units';
import { getTech } from '../model/defs/techs';
import { saveReplay } from '../game/replay';
import type { DiscoverySite } from '../game/Discoveries';
import { applyMarketSave, tickMarket, type MarketState } from '../game/market';
import type { MissionDef } from '../campaign/types';
import { applyPopulation } from '../game/systems/PopulationSystem';
import { resolveConquest } from '../game/systems/VictorySystem';
import { areaDamage, resolveAttackDamage, selectAreaTargets, selectNearestTarget } from '../game/systems/CombatSystem';
import type { SaveData } from '../game/saveTypes';
import type { RigInstance } from '../rendering/RigInstance';
import { SHADOW_MAP_SIZE, viewFootprint } from '../rendering/shadowFrame';

export interface DeathFx {
  view: EntityView;
  t: number;
  dur: number;
  topple: number;
  sink: number;
  baseY: number;
  radius: number;
  building: boolean;
  emitTimer: number;
  /** Seconds the fallen model stays in the scene before cleanup (units). */
  corpseDur?: number;
  /** Optional rig mixer so a dedicated Death clip keeps advancing during the topple. */
  rig?: RigInstance;
  cleanup: () => void;
}

/** Simulation/render loop, save mission and combat plumbing. Transitional host. */
export class RuntimeController {
  constructor(private readonly game: any) {}

  applyMissionSetup(mis: MissionDef): void {
    const p = this.game.players[0];
    p.resources = { ...mis.startingResources };
    const c = this.game.playerCenter(0);
    for (const e of mis.start.buildings ?? []) {
      this.game.spawnScriptedBuilding(e.kind, 0, c.x + e.dx, c.z + e.dz, e.tag);
    }
    for (const u of mis.start.units ?? []) {
      for (let i = 0; i < (u.count ?? 1); i++) {
        const jx = this.game.rng.range(-1.5, 1.5);
        const jz = this.game.rng.range(-1.5, 1.5);
        this.game.spawnScriptedUnit(u.kind, 0, c.x + u.dx + jx, c.z + u.dz + jz, u.tag);
      }
    }
    this.game.world.frameAuthoredSite(c.x, c.z);
  }

  /** Re-apply the authored-site opening framing after the briefing closes. */
  missionEnd(win: boolean): void {
    if (this.game.gameEnded) return;
    this.game.gameEnded = true;
    const mis = this.game.mission?.def;
    if (mis) {
      if (win) this.game.hud.saveCampaignProgress(mis.id);
      this.game.hud.showVictory(win, mis.victory, mis.defeat);
    } else {
      this.game.hud.showVictory(win);
    }
    this.game.loop.stop();
    this.game.audio.uiClick?.();
  }

  authoredCanalAt(x: number, z: number): number {
    const spec = this.game.missionLayout?.canal;
    if (!spec?.irrigation) return 0;
    const path = this.game.canalPath;
    if (path && path.length >= 2) {
      if (!this.game.canalOpen) return 0;
      if ((this.game.environment.drought ?? 0) >= CANAL_DRY_DROUGHT) return 0;
      return canalIrrigationAt(path, x, z);
    }
    if (!this.game.canalOpen || !this.game.canalSite) return 0;
    const yaw = spec.yaw ?? 0;
    const dx = x - this.game.canalSite.x;
    const dz = z - this.game.canalSite.z;
    const along = dx * Math.cos(yaw) + dz * Math.sin(yaw);
    const across = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    if (Math.abs(along) > (spec.length ?? 24) / 2) return 0;
    return Math.max(0, 1 - Math.abs(across) / 2.5);
  }

  updateCanalVisual(): void {
    if (!this.game.canalWater) return;
    const material = this.game.canalWater.material as THREE.MeshStandardMaterial;
    const authored = !!this.game.canalPath;
    const drought = this.game.environment.drought ?? 0;
    const wet = this.game.environment.wet_season ?? 0;
    const flowing = authored
      ? drought < CANAL_DRY_DROUGHT && (this.game.canalOpen || wet > CANAL_WET_FLOW)
      : this.game.canalOpen;
    material.opacity = flowing ? 0.82 : authored ? 0.32 : 0.38;
    material.color.setHex(flowing ? 0x2f6f7a : 0x5c4a33);
    material.transparent = true;
    material.needsUpdate = true;
    if (this.game.canalGate) {
      if (authored) this.game.canalGate.visible = !flowing;
      else this.game.canalGate.position.y = this.game.canalOpen ? 1.55 : 0.8;
    }
  }

  /** Train a unit in a completed building of player 0. */
  applySnapshot(data: SaveData): void {
    this.game.rng.setState(data.rngState);
    this.game.canalOpen = data.canalOpen ?? this.game.canalOpen;
    if (data.sitePhase) {
      this.game.setSitePhase(data.sitePhase);
      this.game.sitePhaseRestored = true;
    }
    if (data.environment) this.game.restoreEnvironment(data.environment);

    for (const ps of data.players) {
      const p = this.game.players[ps.id];
      if (!p) continue;
      p.resources = { ...ps.resources };
      p.populationUsed = ps.populationUsed;
      p.era = ps.era;
      p.ageBuildings = ps.ageBuildings;
      p.techs = new Set(ps.techs);
      p.alive = ps.alive;
      p.kills = ps.kills;
      p.totalLost = ps.totalLost;
      p.wonderActive = ps.wonderActive;
      p.stats = { ...ps.stats };
      p.bonus = { ...ps.bonus, gathering: { ...ps.bonus.gathering } };
    }

    this.game.matchStats.applySave(data.matchStats);
    this.game.restoreHarvested(data.harvested);

    this.game.markets.forEach((market: MarketState, index: number) => applyMarketSave(market, data.markets?.[index]));
    let maxId = 0;
    for (const u of data.units) maxId = Math.max(maxId, u.id);
    for (const b of data.buildings) maxId = Math.max(maxId, b.id);
    for (const n of data.resourceNodes) maxId = Math.max(maxId, n.id);
    reserveIds(maxId);

    for (const ns of data.resourceNodes) {
      const node = new ResourceNode(ns.kind, ns.x, ns.z, ns.amount);
      node.pos.y = ns.kind === 'fishing' ? 0 : this.game.terrain.getHeight(ns.x, ns.z);
      this.game.attachResourceNode(
        node,
        this.game.mapProfile.baseMapType,
        this.game.trees,
        this.game.mapProfile.vegetation.variants,
      );
      node.applySave(ns);
      this.game.resourceNodes.set(node.id, node);
      this.game.registerResourceObstacle(node.id, ns.x, ns.z, ns.kind);
    }

    for (const bs of data.buildings) {
      const b = new Building(bs.kind, bs.owner, bs.era);
      this.game.attachBuilding(b);
      b.applySave(bs);
      this.game.addBuilding(b);
      this.game.registerObstacle(b);
    }

    for (const us of data.units) {
      const u = new Unit(us.kind, us.owner, us.era, this.game.makeBuildContext(us.owner), us.id);
      u.setContext(this.game.unitContext);
      this.applyPlayerBonuses(u, this.game.players[us.owner]);
      this.game.attachUnit(u);
      u.applySave(us);
      this.game.units.set(u.id, u);
    }

    this.game.camera.moveTo(data.camera.x, data.camera.z, true);
    this.game.camera.setHeight(data.camera.zoom);
    this.game.camera.setYaw(data.camera.yaw);
    this.game.fow.restore(data.fog);
    this.game.audio.setEra(this.game.players[0].era);

    // the settlement overlay is derived (not saved): rebuild it from each base's
    // restored center, exactly as on a fresh spawn
    for (const b of this.game.buildings.values()) {
      if (b.kind === BuildingKind.CENTER) {
        this.game.world.addSettlementOverlay(this.game.settlementPlanFor(b.owner, b.pos.x, b.pos.z));
      }
    }
    this.game.world.spawnMissionRoads();

    if (data.mission && this.game.mission) {
      this.game.mission.applySave(data.mission);
      // a save taken before the briefing: show it again so the mission can start
      if (!data.mission.started) this.game.mission.start();
    }
    if (data.tutorial && this.game.tutorial) this.game.tutorial.applySave(data.tutorial);
    // The dry grove is visual state rebuilt from the drought, never saved: nodes exist only now.
    if ((this.game.environment.drought ?? 0) >= 0.6) this.game.dryRiparianGrove();
    // A save taken before the gate was gated cannot leave it running ahead of its objective.
    const canalLock = this.game.missionLayout?.canal?.lockedUntilObjective;
    if (canalLock) {
      const lockState = this.game.mission?.getObjectiveState(canalLock) ?? 'pendiente';
      if (lockState !== 'activo' && lockState !== 'completed') {
        this.game.canalOpen = false;
        this.updateCanalVisual();
      }
    }
    if (this.game.canalSite) {
      this.updateCanalVisual();
      const savedById = new Map(data.buildings.map((saved) => [saved.id, saved]));
      for (const b of this.game.buildings.values()) {
        if (!b.isFarm) continue;
        const saved = savedById.get(b.id);
        if (saved?.terrainYield === undefined) {
          b.terrainYield = this.game.farmYieldAt(b.pos.x, b.pos.z);
        } else {
          b.applyTerrainYield(this.game.farmYieldAt(b.pos.x, b.pos.z));
        }
      }
    }
  }

  /** Show the victory/defeat screen. */
  ctxFor(): UnitContext {
    return {
      getHeight: (x: number, z: number) => this.game.terrain.getHeight(x, z),
      findPath: (sx, sz, tx, tz, owner) => this.game.pathfinder.pathfind(sx, sz, tx, tz, owner),
      findApproachPath: (sx, sz, tx, tz, standRadius: number, owner?: number, opts?) =>
        this.game.pathfinder.findApproachPath(sx, sz, tx, tz, standRadius, owner, opts),
      reachableToNode: (sx, sz, tx, tz, standRadius: number, owner?: number, opts?) =>
        this.game.pathfinder.reachableToNode(sx, sz, tx, tz, standRadius, owner, opts),
      isWalkable: (x, z, owner) => this.game.pathfinder.isWalkable(x, z, owner),
      nearestWalkable: (x, z, fromX?, fromZ?) => {
        const component =
          fromX === undefined || fromZ === undefined ? 0 : this.game.pathfinder.componentAt(fromX, fromZ);
        return (
          this.game.pathfinder.nearestWalkablePoint(x, z, 0, component || undefined) ??
          this.game.pathfinder.nearestWalkablePoint(x, z)
        );
      },
      unitsNear: (x, z, radius) => this.unitsNear(x, z, radius),
      entitiesById: this.game.units,
      resourceNodes: this.game.resourceNodes,
      buildings: this.game.buildings,
      resolveDamage: (a, t, d, from, type) => this.resolveDamage(a, t, d, from, type),
      spawnProjectile: (o) => this.spawnProjectile(o),
      particles: this.game.particles,
      players: this.game.players,
      getPlayer: (id) => this.game.players[id],
      event: (name, payload) => bus.emit(name, payload),
      gather: (dropId, unitId, amount, resource) => this.deliverGather(dropId, unitId, amount, resource),
      recordHarvest: (owner, kind, amount) => this.game.recordHarvest(owner, kind, amount),
      tradeIncome: (owner, amount) => this.tradeIncome(owner, amount),
      worldSize: this.game.settings.mapSize,
      period: this.game.settings.period,
      unitSpawn: this.game.unitSpawn,
      techComplete: this.game.techComplete,
      enemiesNear: (x, z, radius, owner) => this.game.enemiesNear(x, z, radius, owner),
    };
  }

  unitsNear(x: number, z: number, radius: number): Unit[] {
    const out: Unit[] = [];
    const r2 = radius;
    const c = this.game.spatialCell;
    const x0 = Math.floor((x - r2) / c);
    const x1 = Math.floor((x + r2) / c);
    const z0 = Math.floor((z - r2) / c);
    const z1 = Math.floor((z + r2) / c);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.game.spatial.get(cz * 1000 + cx);
        if (!bucket) continue;
        for (const u of bucket) {
          if (u.dead) continue;
          if (distance2D(x, z, u.pos.x, u.pos.z) < r2 + u.radius) out.push(u);
        }
      }
    }
    return out;
  }

  rebuildSpatial(): void {
    this.game.spatial.clear();
    const c = this.game.spatialCell;
    for (const u of this.game.units.values()) {
      if (u.dead) continue;
      const key = Math.floor(u.pos.z / c) * 1000 + Math.floor(u.pos.x / c);
      let bucket = this.game.spatial.get(key);
      if (!bucket) {
        bucket = [];
        this.game.spatial.set(key, bucket);
      }
      bucket.push(u);
    }
  }

  deliverGather(dropId: number, unitId: number, amount: number, resource: string): void {
    void unitId;
    const drop = this.game.buildings.get(dropId);
    if (!drop) return;
    if (amount > 0) {
      const p = this.game.players[drop.owner];
      this.game.matchStats.recordGather(drop.owner, resource as keyof Resources, amount);
      p.resources[resource as keyof Resources] += amount;
      bus.emit('resources:changed', { player: drop.owner, resources: { ...p.resources } });
    }
  }

  tradeIncome(owner: number, amount: number): void {
    if (!(amount > 0)) return;
    const p = this.game.players[owner];
    if (!p) return;
    p.resources.silver += amount;
    bus.emit('resources:changed', { player: owner, resources: { ...p.resources } });
  }

  resolveDamage(
    attackerId: number,
    targetId: number,
    damage: number,
    from: any,
    damageType: DamageClass = 'heavy',
  ): void {
    const target = this.game.units.get(targetId) ?? this.game.buildings.get(targetId);
    if (!target || target.dead) return;
    let armor: ArmorProfile;
    let armorMult = 1;
    if (target instanceof Unit) {
      armor = { light: target.stats.lightArmor, heavy: target.stats.heavyArmor };
      armorMult = target.armorMultiplier;
    } else {
      const a = (target as Building).stats.armor;
      armor = { light: a, heavy: a, building: a };
    }
    const targetClass = target instanceof Unit ? unitClassFor(target.kind) : 'building';
    const attackerClass =
      from instanceof Unit ? unitClassFor(from.kind) : from?.attackerKind ? unitClassFor(from.attackerKind) : null;
    const bonusVs = from instanceof Unit ? from.stats.bonusVs : from?.bonusVs;
    const classBonus = attackerClass && bonusVs ? (bonusVs[targetClass] ?? 0) : 0;
    const elevated = target instanceof Unit && from?.pos ? elevationDamageMultiplier(from.pos.y, target.pos.y) : 1;
    const final = resolveAttackDamage({
      damage,
      damageType,
      armor,
      armorMultiplier: armorMult,
      classBonus,
      elevation: elevated,
    });
    target.takeDamage(final, attackerId);
    const dmgH = target instanceof Unit ? 2.2 : 2.6;
    this.game.hud?.addDamageNumber(
      target.pos.x,
      target.pos.y + dmgH,
      target.pos.z,
      final,
      final >= 40 ? 'big' : 'normal',
    );
    // impact per hit (blood on units, dust/sparks on structures)
    if (target instanceof Unit) {
      this.game.particles.emit({
        x: target.pos.x,
        y: target.pos.y + 0.9,
        z: target.pos.z,
        count: 4,
        color: 0x7a1010,
        kind: 'dust',
        speed: 1.5,
        life: 0.4,
        size: 0.7,
        grow: 0.3,
        gravity: 10,
        spread: 1.6,
      });
    } else {
      this.game.particles.emit({
        x: target.pos.x,
        y: target.pos.y + 1.3,
        z: target.pos.z,
        count: 5,
        color: 0xcbb086,
        kind: 'dust',
        speed: 1.2,
        life: 0.45,
        size: 0.9,
        grow: 1.0,
        gravity: 6,
        spread: 1.4,
      });
      if (this.game.fxRng.float() < 0.5)
        this.game.particles.emit({
          x: target.pos.x,
          y: target.pos.y + 1.4,
          z: target.pos.z,
          count: 2,
          color: 0xffaa55,
          kind: 'spark',
          speed: 2,
          life: 0.25,
          size: 0.9,
          gravity: 8,
          spread: 1.5,
        });
    }
    if (target.owner === 0) this.notifyUnderAttack(target);
    const owner = from?.owner ?? -1;
    if (owner === 0) {
      this.game.lastBattleEvent = targetId;
    }
    if (target.dead && owner !== -1) {
      const attackerPlayer = this.game.players[owner];
      if (attackerPlayer) {
        attackerPlayer.kills++;
        attackerPlayer.stats.destroyed++;
      }
      bus.emit('fx:death', {});
    }
  }

  notifyUnderAttack(target: Unit | Building): void {
    const now = performance.now();
    if (target instanceof Building) {
      if (now - this.game.lastBaseAlert > 4000) {
        this.game.lastBaseAlert = now;
        bus.emit('alert', {
          icon: '🚨',
          text: `¡${this.game.buildingName(target.kind)} bajo ataque!`,
          x: target.pos.x,
          z: target.pos.z,
          warn: true,
        });
      }
    } else if (target.hp / target.maxHp < 0.5 && now - this.game.lastUnitAlert > 3000) {
      this.game.lastUnitAlert = now;
      bus.emit('alert', { icon: '⚠️', text: 'Unidad bajo ataque', x: target.pos.x, z: target.pos.z, warn: true });
    }
  }

  spawnProjectile(o: any): void {
    if (o.kind === 'howitzer_shell' || o.kind === 'nuclear') bus.emit('fx:artillery', {});
    else if (o.kind === 'arrow') bus.emit('fx:bow', {});
    else if (o.kind === 'sling_stone') bus.emit('fx:sling', {});
    else bus.emit('fx:shot', {});
    const p = new Projectile({
      ...o,
      getTargetPos: () => {
        const t = this.game.units.get(o.targetId) ?? this.game.buildings.get(o.targetId);
        return t && !t.dead ? t.pos : null;
      },
      onHit: (targetId: number | undefined) => {
        this.applyProjectileDamage(o, targetId);
      },
    });
    this.game.projectiles.push(p);
    if (!this.game.headless) this.game.projectileViews.set(p.id, new ProjectileView(this.game.scene, p));
  }

  applyProjectileDamage(o: any, targetId: number | undefined): void {
    const impact = o.target as THREE.Vector3;
    const damageType: DamageClass = o.damageType ?? 'heavy';
    const from = { owner: o.owner, attackerKind: o.attackerKind, bonusVs: o.bonusVs };
    if (o.area && o.area > 0) {
      const ground = new THREE.Vector3(impact.x, this.game.terrain.getHeight(impact.x, impact.z), impact.z);
      const targets = selectAreaTargets<Unit | Building>(
        impact,
        o.area,
        this.game.units.values(),
        this.game.buildings.values(),
        o.owner,
        (owner) => this.game.players[owner]?.team,
      );
      for (const { target, distance } of targets) {
        this.resolveDamage(
          o.owner,
          target.id,
          areaDamage(o.damage, distance, o.area),
          { ...from, pos: ground },
          damageType,
        );
      }
      // explosion smoke
      this.game.particles.emit({
        x: impact.x,
        y: impact.y + 1,
        z: impact.z,
        count: 14,
        color: 0x997755,
        kind: 'smoke',
        speed: 2,
        life: 1.8,
        size: 3,
      });
      this.game.camera.addShake(0.5);
      bus.emit('fx:explosion', {});
    } else if (targetId !== undefined) {
      const target = this.game.units.get(targetId) ?? this.game.buildings.get(targetId);
      if (target && !target.dead) {
        this.resolveDamage(o.owner, targetId, o.damage, from, damageType);
      }
    } else {
      // no targetId: damage the enemy closest to the impact point
      const best = selectNearestTarget<Unit | Building>(
        impact,
        this.game.units.values(),
        this.game.buildings.values(),
        o.owner,
        (owner) => this.game.players[owner]?.team,
        3,
      );
      if (best) this.resolveDamage(o.owner, best.id, o.damage, from, damageType);
    }
  }

  /** Nearest walkable point in the main landmass, searching the whole map. */
  mainComponentPoint(x: number, z: number): { x: number; z: number } | null {
    const main = this.game.pathfinder.mainComponent();
    return this.game.pathfinder.nearestWalkablePoint(x, z, this.game.pathfinder.grid.cols, main);
  }

  /**
   * A walkable point in the main landmass. Spawns that would land in a pocket
   * enclosed by trees, houses or props are moved to the nearest main-component cell.
   */
  mainComponentSpot(x: number, z: number): { x: number; z: number } {
    const main = this.game.pathfinder.mainComponent();
    if (this.game.pathfinder.componentAt(x, z) === main) return { x, z };
    return this.mainComponentPoint(x, z) ?? { x, z };
  }

  /** Spawn around a building on the rally's landmass (or the main one), avoiding isolated pockets. */
  spawnPointAround(b: Building, component = this.game.pathfinder.mainComponent()): { x: number; z: number } {
    const startAngle = this.game.rng.float() * Math.PI * 2;
    const baseR = b.radius + 0.5;
    for (let i = 0; i < 12; i++) {
      const angle = startAngle + (i / 12) * Math.PI * 2;
      for (const pad of [0, 1.2, 2.4]) {
        const x = b.pos.x + Math.cos(angle) * (baseR + pad);
        const z = b.pos.z + Math.sin(angle) * (baseR + pad);
        if (this.game.pathfinder.componentAt(x, z) === component) return { x, z };
      }
    }
    return (
      this.game.pathfinder.nearestWalkablePoint(b.pos.x, b.pos.z, this.game.pathfinder.grid.cols, component) ?? {
        x: b.pos.x + baseR,
        z: b.pos.z,
      }
    );
  }

  // --- spawn from buildings ---

  unitSpawn = (buildingId: number, unit: UnitKind, rally: OrderTarget, hasRally: boolean): boolean => {
    const b = this.game.buildings.get(buildingId);
    if (!b) return false;
    const player = b.owner;
    const p = this.game.players[player];
    const stats = getUnitStats(unit, p.era);
    if (p.populationUsed + stats.population > p.populationCap) {
      return false;
    }
    const ctx = this.game.makeBuildContext(player);
    const u = new Unit(unit, player, p.era, ctx);
    const rallyComponent = hasRally && rally ? this.game.pathfinder.componentAt(rally.x, rally.z) : 0;
    const { x: px, z: pz } = this.spawnPointAround(b, rallyComponent || undefined);
    u.pos.set(px, this.game.terrain.getHeight(px, pz), pz);
    u.setContext(this.game.unitContext);
    this.applyPlayerBonuses(u, p);
    this.game.attachUnit(u);
    this.game.units.set(u.id, u);
    p.populationUsed += stats.population;
    p.stats.created++;
    if (hasRally) {
      u.issueOrder({ kind: OrderKind.MOVE, target: rally });
    }
    // worker auto-gathering
    if (unit === UnitKind.WORKER && !hasRally) {
      this.game.economy.assignWorker(u.id);
    }
    return true;
  };

  techComplete = (playerId: number, techId: string): void => {
    const p = this.game.players[playerId];
    p.techs.add(techId);
    const tech = getTech(techId);
    if (tech) {
      if (tech.effect.attackMult) {
        p.bonus.attack += tech.effect.attackMult;
        this.applyAttackBonus(playerId, tech.effect.attackMult);
      }
      if (tech.effect.armorMult) {
        p.bonus.armor += tech.effect.armorMult;
        this.applyArmorBonus(playerId, tech.effect.armorMult);
      }
      if (tech.effect.gatheringMult) {
        for (const k of RESOURCE_KEYS) {
          const v = tech.effect.gatheringMult[k];
          if (v) {
            p.bonus.gathering[k] = (p.bonus.gathering[k] ?? 0) + v;
            this.applyGatherBonus(playerId, k, v);
          }
        }
      }
      if (tech.effect.capacityBonus) {
        p.bonus.carry += tech.effect.capacityBonus;
        for (const u of this.game.units.values()) {
          if (u.owner === playerId && u.kind === UnitKind.WORKER)
            u.setCarryCapacity(u.maxCarry + tech.effect.capacityBonus);
        }
      }
      if (tech.effect.losBonus) {
        p.bonus.los += tech.effect.losBonus;
        for (const u of this.game.units.values()) {
          if (u.owner === playerId) u.stats.los += tech.effect.losBonus;
        }
      }
      if (tech.effect.rangeBonus) {
        p.bonus.range += tech.effect.rangeBonus;
        for (const u of this.game.units.values()) {
          if (u.owner === playerId && u.stats.range > 0) u.stats.range += tech.effect.rangeBonus;
        }
      }
      if (tech.effect.speedBonus) {
        p.bonus.speed += tech.effect.speedBonus;
        for (const u of this.game.units.values()) {
          if (u.owner === playerId) u.stats.speed += tech.effect.speedBonus;
        }
      }
      if (tech.effect.priceDiscount) {
        p.bonus.training += tech.effect.priceDiscount;
      }
    }
    this.game.hud.showToast(`Tecnología completada: ${tech?.name ?? techId}`, 'info');
  };

  /** Apply the player's bonuses to a freshly built unit (stats straight from `getUnitStats`), once. */
  applyPlayerBonuses(u: Unit, p: PlayerState): void {
    u.attackMultiplier += p.bonus.attack;
    u.armorMultiplier += p.bonus.armor;
    for (const k of RESOURCE_KEYS) {
      const v = p.bonus.gathering[k];
      if (v) u.gatherMultiplier += v;
    }
    if (p.bonus.carry) u.setCarryCapacity(u.maxCarry + p.bonus.carry);
    u.stats.los += p.bonus.los;
    if (u.stats.range > 0) u.stats.range += p.bonus.range;
    u.stats.speed = u.stats.speed * this.game.unitSpeedScale + p.bonus.speed;
  }

  applyAttackBonus(playerId: number, mult: number): void {
    for (const u of this.game.units.values()) {
      if (u.owner === playerId) u.attackMultiplier += mult;
    }
  }
  applyArmorBonus(playerId: number, mult: number): void {
    for (const u of this.game.units.values()) {
      if (u.owner === playerId) u.armorMultiplier += mult;
    }
  }
  applyGatherBonus(playerId: number, _res: keyof Resources, mult: number): void {
    for (const u of this.game.units.values()) {
      if (u.owner === playerId && u.kind === UnitKind.WORKER) u.gatherMultiplier += mult;
    }
  }

  // --- era advancement ---

  modernizeUnits(player: number): void {
    const p = this.game.players[player];
    const ctx = this.game.makeBuildContext(player);
    for (const u of this.game.units.values()) {
      if (u.owner !== player) continue;
      u.stats = getUnitStats(u.kind, p.era);
      u.maxHp = u.stats.hp;
      if (u.hp > u.maxHp) u.hp = u.maxHp;
      modernizeUnit(u, ctx);
      // reset multipliers before re-applying (avoids double counting)
      u.attackMultiplier = 1;
      u.armorMultiplier = 1;
      u.gatherMultiplier = 1;
      u.setCarryCapacity(10);
      this.applyPlayerBonuses(u, p);
    }
  }

  // --- fog of war ---

  updateFow(dt: number): void {
    const fogOn = this.game.settings.fogOfWar;
    if (!fogOn) return;
    for (const u of this.game.units.values()) {
      if (u.owner !== 0 || u.dead) continue;
      this.game.fow.reveal(u.pos.x, u.pos.z, u.stats.los + 2);
    }
    for (const b of this.game.buildings.values()) {
      if (b.owner !== 0 || b.dead) continue;
      this.game.fow.reveal(b.pos.x, b.pos.z, b.stats.los + 2);
    }
    this.game.discoveries?.update(dt, this.game.fow, fogOn, this.game.isCinematicActive(), (site: DiscoverySite) => {
      this.game.hud?.showDiscovery(site.name, site.x, site.z);
    });
    // hide enemy entities that are not visible
    for (const u of this.game.units.values()) {
      if (u.owner === 0) continue;
      const vis = this.game.fow.isVisible(u.pos.x, u.pos.z) || !this.game.settings.fogOfWar;
      if (u.view) u.view.group.visible = vis;
    }
    for (const b of this.game.buildings.values()) {
      if (b.owner === 0) continue;
      const vis = this.game.fow.isVisible(b.pos.x, b.pos.z) || !this.game.settings.fogOfWar;
      if (b.view) b.view.group.visible = vis;
    }
    this.game.fowTexture.upload();
    this.game.fow.decay();
  }

  /** Hide distant and unexplored resource nodes (LOD). */
  applyLod(): void {
    const t = this.game.camera.getTarget();
    const lod = this.game.camera.getZoom() * 1.2 + 40;
    const lod2 = lod * lod;
    const fog = this.game.settings.fogOfWar;
    for (const n of this.game.resourceNodes.values()) {
      const dx = n.pos.x - t.x;
      const dz = n.pos.z - t.z;
      const near = dx * dx + dz * dz <= lod2;
      n.setVisibleEx(near && (!fog || this.game.fow.isExplored(n.pos.x, n.pos.z)));
    }
  }

  /** Enable/disable fog of war and reflect the change on the terrain. */
  setFogOfWar(on: boolean): void {
    this.game.settings.fogOfWar = on;
    this.game.fow.setEnabled(on);
    this.game.terrain.setFow(this.game.fowTexture.texture, on);
    this.game.fowUniforms.fowEnabled.value = on ? 1 : 0;
    if (!on) {
      for (const u of this.game.units.values()) if (u.view) u.view.group.visible = true;
      for (const b of this.game.buildings.values()) if (b.view) b.view.group.visible = true;
      for (const n of this.game.resourceNodes.values()) n.setVisibleEx(true);
    }
  }

  // --- population ---

  /** Kept as a method so the perf probes can time the population pass. */
  updatePopulation(): void {
    applyPopulation(
      this.game.units.values(),
      this.game.buildings.values(),
      this.game.players,
      this.game.settings.populationCap,
    );
  }

  // --- victory ---

  checkVictory(): void {
    if (this.game.gameEnded) return;
    // in campaign, victory/defeat is decided by the mission
    if (this.game.mission) return;
    const result = resolveConquest(this.game.players, (id) => this.game.hasBuildings(id));
    if (!result) return;
    const defeated = this.game.players.find((p: { id: number }) => p.id === result.defeated);
    if (!defeated) return;
    defeated.alive = false;
    bus.emit('player:defeat', { player: defeated.id });
    if (result.winner !== null) this.endGame(result.winner);
  }

  /** True if the player still owns at least one standing building. */
  endGame(winner: number): void {
    if (this.game.gameEnded) return;
    this.game.gameEnded = true;
    this.finishRecording();
    bus.emit('game:end', { winner });
  }

  /** Persist the recorded replay (called when the match ends). */
  finishRecording(): void {
    if (!this.game.recorder) return;
    this.game.lastReplay = this.game.recorder.toReplay();
    saveReplay(this.game.lastReplay);
    this.game.recorder = null;
  }

  /** Save the current recording without clearing it (e.g. leaving a match early). */
  saveRecording(): void {
    if (!this.game.recorder) return;
    this.game.lastReplay = this.game.recorder.toReplay();
    saveReplay(this.game.lastReplay);
  }

  /** Fit the sun's shadow frustum to the current view (src/rendering/shadowFrame.ts). */
  frameShadows(): void {
    const target = this.game.camera.getTarget();
    this.game.sky.setShadowFrame(
      viewFootprint(this.game.camera.camera, this.game.terrain.getHeight(target.x, target.z)),
    );
  }

  // --- main update ---
  update(dt: number, time: number): boolean {
    const t = time;
    const realTime = performance.now() / 1000;
    if (this.game.paused) {
      if (!this.game.headless) this.game.hud.update(dt, realTime);
      return false;
    }
    this.game.matchStats.update(dt, this.game.players, this.game.units.values(), this.game.buildings.values());
    for (const market of this.game.markets) tickMarket(market, dt);
    if (this.game.headless) return this.updateHeadless(dt, time);
    this.game.qualityGovernor.update(dt);
    if (this.game.replay) {
      for (const cmd of this.game.replay.commandsFor(this.game.stepCount)) this.game.executeCommand(cmd, false);
    }
    const d = dt;

    this.game.sky.update(realTime);
    this.game.water.setSunDir(this.game.sky.sunDir);
    this.game.water.setDayFactor(this.game.sky.getDayFactor());
    this.game.water.update(realTime);
    this.game.terrain.setSunLight(this.game.sky.sunDir, this.game.sky.getSunColor());
    const hemi = this.game.sky.getHemi();
    this.game.terrain.setHemisphere(hemi.color, hemi.groundColor, hemi.intensity);
    this.game.terrain.update(realTime);
    this.game.groundCover?.setLighting(
      this.game.sky.sunDir,
      this.game.sky.getSunColor(),
      hemi.color,
      hemi.groundColor,
      hemi.intensity,
    );
    this.game.groundCover?.update(realTime);
    // cloud shadows: dim the sun according to cloud density near the sun
    const cs = cloudDensity(this.game.sky.sunDir.x * 900 + realTime * 3, this.game.sky.sunDir.z * 900) * 0.22;
    this.game.terrain.setCloudShadow(1 - cs);
    this.game.particles.update(d);
    this.game.debris.update(d);
    this.game.markers.update(d);
    this.game.trees.update(d, this.game.camera.getTarget());
    this.game.wildlife.update(d);

    // a blocking menu/modal suppresses camera panning (edge/keyboard/drag)
    this.game.camera.setUiCaptured(this.game.hud.hasBlockingOverlay());
    // edge scrolling is off while the pointer is over a HUD panel or control
    this.game.camera.setPointerOverUi(this.game.isPointerOverUi());
    this.game.camera.update(d, realTime);
    // Fit the shadow frustum and the terrain LOD to where the camera is this frame, not the last one.
    this.frameShadows();
    this.game.terrain.updateLod(this.game.camera.camera.position);
    this.game.caralCity?.update(this.game.camera.camera.position);
    this.game.chavinCity?.update(this.game.camera.camera.position);
    this.rebuildSpatial();

    this.game.updateEnvironment(d);
    this.game.updateCityLife(d);
    // units
    for (const u of this.game.units.values()) {
      if (u.dead) continue;
      u.ctx = this.game.unitContext;
      // show a health bar for selected or damaged units (all owners): makes fights
      // and wounded enemies readable without hovering
      u.view?.showHealthBar(u.selected || u.hp < u.maxHp, this.game.players[u.owner].color);
      u.update(d, t);
      u.unitView?.sync(d, t);
      u.view?.faceHealthBar(this.game.camera.camera.quaternion);
    }
    // buildings
    for (const b of this.game.buildings.values()) {
      if (b.dead) continue;
      b.ctx = this.game.unitContext;
      b.update(d, t);
    }
    // resources
    for (const n of this.game.resourceNodes.values()) {
      if (n.dead) continue;
      n.update(realTime);
    }
    // projectiles
    for (const p of this.game.projectiles) {
      p.update(d);
      this.game.projectileViews.get(p.id)?.sync(d);
      if (p.dead) this.game.projectileViews.delete(p.id);
    }
    this.game.projectiles = this.game.projectiles.filter((p: { dead: boolean }) => !p.dead);
    updateProjectilePools(d);

    this.updateFow(d);
    this.game.mapLabels?.update(this.game.camera, this.game.fow, this.game.settings.fogOfWar);
    this.applyLod();
    this.updatePopulation();

    // campaign mission: evaluate BEFORE cleaning up dead so that
    // objectives detect freshly destroyed entities (destroy/protect)
    this.game.mission?.update(d, t);
    this.game.tutorial?.update(d);

    // clean up dead
    this.cleanupDead(d);

    // Alert of attack on the player base
    this.game.alertTimer -= d;
    if (this.game.alertTimer <= 0) {
      this.game.alertTimer = 3;
      this.checkBaseThreat();
    }

    // AI
    for (const ai of this.game.ais) ai.update(d, t);

    this.checkVictory();

    this.game.hud.update(d, realTime);
    this.game.stepCount++;
    return true;
  }

  updateHeadless(dt: number, time: number): boolean {
    this.rebuildSpatial();
    if (this.game.replay) {
      for (const cmd of this.game.replay.commandsFor(this.game.stepCount)) this.game.executeCommand(cmd, false);
    }
    for (const u of this.game.units.values()) {
      if (u.dead) continue;
      u.ctx = this.game.unitContext;
      u.update(dt, time);
    }
    for (const b of this.game.buildings.values()) {
      if (b.dead) continue;
      b.ctx = this.game.unitContext;
      b.update(dt, time);
    }
    for (const p of this.game.projectiles as Array<{ update(dt: number): void }>) p.update(dt);
    this.game.projectiles = this.game.projectiles.filter((p: { dead: boolean }) => !p.dead);
    applyPopulation(
      this.game.units.values(),
      this.game.buildings.values(),
      this.game.players,
      this.game.settings.populationCap,
    );
    this.game.mission?.update(dt, time);
    this.game.tutorial?.update(dt);
    this.cleanupDead(dt);
    for (const ai of this.game.ais) ai.update(dt, time);
    this.checkVictory();
    this.game.stepCount++;
    return true;
  }

  cleanupDead(dt: number): void {
    for (const [id, u] of this.game.units) {
      if (u.dead) {
        if (u.view) this.spawnDeathFx(u.view, 'unit', u.radius, () => detachUnit(u), u.rig);
        this.game.units.delete(id);
      }
    }
    for (const [id, b] of this.game.buildings) {
      if (b.dead) {
        const h = this.game.obstacleHandles.get(b.id);
        if (h) {
          if (h.gate) this.game.pathfinder.removeGate(h as { x: number; z: number; radius: number; owners: number[] });
          else this.game.pathfinder.removeObstacle(h);
          this.game.obstacleHandles.delete(b.id);
        }
        if (b.view) this.spawnDeathFx(b.view, 'building', b.radius, () => detachBuilding(b));
        this.game.terrain.clearWear(b.pos.x, b.pos.z, b.radius * 1.6);
        this.game.buildings.delete(id);
      }
    }
    for (const [id, n] of this.game.resourceNodes) {
      if (n.dead) {
        const h = this.game.obstacleHandles.get(n.id);
        if (h) {
          this.game.pathfinder.removeObstacle(h);
          this.game.obstacleHandles.delete(n.id);
        }
        this.game.resourceNodes.delete(id);
      }
    }
    this.updateDeathFx(dt);
  }

  /** Register a topple/collapse animation for a just-removed entity's model. */
  spawnDeathFx(
    view: EntityView,
    kind: 'unit' | 'building',
    radius: number,
    cleanup: () => void,
    rig?: RigInstance | null,
  ): void {
    const building = kind === 'building';
    if (building) {
      this.game.debris.spawn(
        view.group.position.x,
        view.group.position.y + 0.6,
        view.group.position.z,
        14,
        radius,
        view.group.position.y,
      );
    }
    this.game.deathFx.push({
      view,
      t: 0,
      dur: building ? 1.1 : 0.6,
      topple: building ? 0.12 : rig?.hasDeathClip() ? Math.PI * 0.25 : Math.PI * 0.5,
      sink: building ? radius * 0.55 : 0.06,
      baseY: view.group.position.y,
      radius,
      building,
      emitTimer: 0,
      rig: rig ?? undefined,
      corpseDur: building ? undefined : 30,
      cleanup,
    });
  }

  updateDeathFx(dt: number): void {
    if (!this.game.deathFx.length) return;
    const alive: DeathFx[] = [];
    for (const fx of this.game.deathFx) {
      fx.rig?.update(dt);
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.dur);
      const e = k * k; // ease-in: the fall accelerates
      fx.view.group.rotation.x = fx.topple * e;
      fx.view.group.position.y = fx.baseY - fx.sink * e;
      if (fx.building) {
        const s = 1 - 0.18 * e;
        fx.view.group.scale.set(s, Math.max(0.12, 1 - e), s);
      }
      if (fx.building && k < 1) {
        fx.emitTimer -= dt;
        if (fx.emitTimer <= 0) {
          fx.emitTimer = 0.12;
          const px = fx.view.group.position.x;
          const pz = fx.view.group.position.z;
          this.game.particles.emit({
            x: px,
            y: fx.baseY + 1,
            z: pz,
            count: 2,
            color: 0x8a7a66,
            kind: 'dust',
            speed: 1.0,
            life: 1.4,
            size: 2.6,
            spread: Math.max(1, fx.radius),
            gravity: 0.5,
          });
          this.game.particles.emit({
            x: px,
            y: fx.baseY + 0.8,
            z: pz,
            count: 2,
            color: 0xff7a20,
            kind: 'fire',
            speed: 1.1,
            life: 0.7,
            size: 2.4,
            spread: Math.max(0.6, fx.radius * 0.7),
          });
        }
      }
      if (fx.t >= (fx.corpseDur ?? fx.dur)) {
        fx.cleanup();
      } else {
        alive.push(fx);
      }
    }
    this.game.deathFx = alive;
  }

  checkBaseThreat(): void {
    const center = [...this.game.buildings.values()].find(
      (b) => b.owner === 0 && b.kind === BuildingKind.CENTER && !b.dead,
    );
    if (!center) {
      this.game.alerted = false;
      return;
    }
    let threat = false;
    for (const u of this.game.units.values()) {
      if (u.owner === 0 || u.dead) continue;
      if (this.game.players[u.owner]?.team === this.game.players[0]?.team) continue;
      if (distance2D(u.pos.x, u.pos.z, center.pos.x, center.pos.z) < 22) {
        threat = true;
        break;
      }
    }
    if (threat && !this.game.alerted) {
      this.game.alerted = true;
      this.game.audio.alarm();
      bus.emit('alert', {
        icon: '🚨',
        text: '¡Tu base está bajo ataque!',
        x: center.pos.x,
        z: center.pos.z,
        warn: true,
      });
      this.game.camera.focusOn(center.pos.x, center.pos.z);
    } else if (!threat && this.game.alerted) {
      this.game.alerted = false;
    }
  }

  // --- render ---

  render(): void {
    if ((window as any).__directRender) {
      this.game.renderer.render(this.game.scene, this.game.camera.camera);
      return;
    }
    this.renderWaterRefraction();
    this.game.postfx.render(0.016);
  }

  /**
   * Screen-space refraction source: render the scene with the water hidden into
   * the water's target, so its shader can sample the (distorted) seabed. Only
   * when the cinematic effects are on — it costs an extra scene pass.
   */
  renderWaterRefraction(): void {
    // extra full-scene pass: off in classic mode and once the preset drops to low
    if (!this.syncWaterRefraction()) return;
    const prev = this.game.renderer.getRenderTarget();
    this.game.water.mesh.visible = false;
    this.game.renderer.setRenderTarget(this.game.water.refractionRT);
    this.game.renderer.render(this.game.scene, this.game.camera.camera);
    this.game.renderer.setRenderTarget(prev);
    this.game.water.mesh.visible = true;
  }

  /** Apply the refraction gate to the water material; returns whether it is on. */
  syncWaterRefraction(): boolean {
    const on = this.game.shouldRenderWaterRefraction();
    this.game.water.setRefraction(on);
    return on;
  }

  onResize(): void {
    const ratio = this.game.pixelRatioOverride ?? Math.min(window.devicePixelRatio, 2);
    this.game.renderer.setPixelRatio(ratio);
    this.game.camera.resize(window.innerWidth, window.innerHeight);
    this.game.postfx.setSize(window.innerWidth, window.innerHeight);
    this.game.renderer.setSize(window.innerWidth, window.innerHeight);
    this.syncWaterRefractionSize();
  }

  syncWaterRefractionSize(): void {
    if (!this.game.water) return;
    const db = this.game.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.game.water.setSize(db.x, db.y);
  }

  setQuality(q: GameSettings['quality']): void {
    this.game.settings.quality = q;
    this.game.qualityGovernor.setUserQuality(q);
  }

  /** Apply a preset to the renderer without touching the saved settings (governor). */
  applyQualityPreset(q: GameSettings['quality']): void {
    this.game.postfx.setQuality(q);
    this.game.terrain?.setLowDetail(q === 'low');
    this.game.sky?.setShadowMapSize(SHADOW_MAP_SIZE[q]);
    this.game.groundCover?.setEnabled(q !== 'low' && !this.game.usesSoftwareRenderer);
    // The governor can apply a preset before the world (and its trees) exists.
    if (this.game.trees)
      this.game.trees.kitLod0Radius = kitLod0RadiusFor(q === 'low' || this.game.usesSoftwareRenderer);
  }

  /** Force a render scale (`null` restores the default) and apply it immediately. */
  setPixelRatioOverride(ratio: number | null): void {
    this.game.pixelRatioOverride = ratio;
    this.game.onResize();
  }

  /** The quality preset the adaptive governor currently applies (debug overlay). */
  getAppliedQuality(): GameSettings['quality'] {
    return this.game.qualityGovernor.applied;
  }

  /** Whether the water refraction pass runs this frame. */
  shouldRenderWaterRefraction(): boolean {
    return this.game.postfx.cinematicEnabled && this.getAppliedQuality() !== 'low';
  }

  /**
   * Apply the region's atmosphere (`HistoricalMapProfile.atmosphere`): the sky
   * tint/haze/sun-warmth plus the terrain/water aerial perspective. `scene.fog`
   * stays null; the effect is distance-bounded and buildings are not dimmed.
   */
  resetGame(): void {
    try {
      localStorage.setItem('peru-settings', JSON.stringify(this.game.settings));
    } catch {
      /* noop */
    }
    // A fresh match must not inherit menu/load/replay state from the previous screen.
    const url = new URL(location.href);
    url.searchParams.set('play', '1');
    url.searchParams.delete('menu');
    url.searchParams.delete('load');
    url.searchParams.delete('replay');
    if (this.game.settings.missionId) url.searchParams.set('mission', this.game.settings.missionId);
    else url.searchParams.delete('mission');
    location.href = url.toString();
  }

  /** Serialize the current match into the single save slot. Returns false if unavailable or the match is over. */
  saveMatch(): boolean {
    if (this.game.gameEnded) return false;
    return saveToStorage(serializeGame(this.game));
  }

  /** Reload the page into the saved match. */
  loadMatch(): void {
    const url = new URL(location.href);
    url.searchParams.set('load', '1');
    url.searchParams.delete('mission');
    url.searchParams.delete('menu');
    location.href = url.toString();
  }

  /** Reload the page into a recorded replay. */
  loadReplayMatch(): void {
    const url = new URL(location.href);
    url.searchParams.set('replay', '1');
    url.searchParams.delete('load');
    url.searchParams.delete('mission');
    url.searchParams.delete('menu');
    location.href = url.toString();
  }

  /**
   * Apply a player command, recording it for the replay when enabled. This is the
   * single entry point for player intent, so a replay only has to feed the same
   * commands back at the same steps.
   */
}
