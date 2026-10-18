import * as THREE from 'three';
import {
  Era,
  UnitKind,
  Resources,
  ZERO_RESOURCES,
  Team,
  GameEvents,
  HistoricalPeriod,
  CombatStance,
} from '../core/types';
import { getUnitStats, getUnitModel, UnitStats, DamageClass } from '../model/defs/units';
import { buildModel, BuildContext, disposeModel } from '../model/ProceduralModel';
import { EntityView } from '../entities/EntityView';
import { allocId } from '../entities/EntityView';
import { Order, OrderKind, OrderTarget } from '../core/types';
import { angleTo, distance2D, clamp, lerp } from '../util/math';
import type { UnitSave } from '../game/saveTypes';

/** Context that Game provides to units (avoids circular dependencies). */
export interface UnitContext {
  getHeight(x: number, z: number): number;
  findPath(sx: number, sz: number, tx: number, tz: number): { x: number; z: number }[];
  /** Terrain navigability (water/steep/obstacles); guards the pathless fallback. */
  isWalkable(x: number, z: number): boolean;
  unitsNear(x: number, z: number, radius: number): Unit[];
  enemiesNear(x: number, z: number, radius: number, owner: number): Unit[];
  entitiesById: Map<number, any>;
  resourceNodes: Map<number, any>;
  buildings: Map<number, any>;
  resolveDamage(attackerId: number, targetId: number, damage: number, fromEntity: any, damageType: DamageClass): void;
  spawnProjectile(opts: {
    from: THREE.Vector3;
    target: THREE.Vector3;
    speed: number;
    damage: number;
    kind: string;
    owner: number;
    area?: number;
    arc?: number;
    trail?: string;
    targetId?: number;
    damageType?: DamageClass;
  }): void;
  particles: any;
  players: { id: number; team: Team }[];
  getPlayer(playerId: number): { id: number; team: Team };
  event<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
  gather(nodeId: number, unitId: number, amount: number, resource: string): void;
  worldSize: number;
  /** The match's historical period (for the chronology guard on training). */
  period: HistoricalPeriod;
  unitSpawn(buildingId: number, unit: any, rally: OrderTarget, hasRally: boolean): boolean;
  techComplete(playerId: number, techId: string): void;
}

const MOVE_STOP_DIST = 0.6;
/** Distance at which a plain move/attack-move order counts as arrived. */
const MOVE_ARRIVAL_DIST = 1.2;
const SEPARATION = 1.4;
/** Look-ahead (world units) validated before a pathless direct approach. */
const DIRECT_LOOKAHEAD = 3;
/** Seconds without a route before a stuck move/gather order gives up. */
const NO_ROUTE_GIVEUP = 1.5;

/** Color of the worker's load bundle according to the carried resource. */
const CARRY_COLORS: Record<keyof Resources, number> = {
  food: 0xc8a04a,
  wood: 0x8a6a3a,
  silver: 0x9aa2aa,
  stone: 0x4ac6d8,
};

export class Unit {
  id = allocId();
  owner: number;
  kind: UnitKind;
  era: Era;
  stats: UnitStats;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = Math.random() * Math.PI * 2;
  targetYaw = this.yaw;
  view: EntityView;
  hp: number;
  maxHp: number;
  dead = false;
  selected = false;
  radius = 0.42;
  /** Mission tag (for objectives/triggers). */
  tag?: string;

  orderQueue: Order[] = [];
  private path: { x: number; z: number }[] = [];
  private pathIdx = 0;
  private repathTimer = 0;
  /** Seconds spent with a live order but no route and no clear direct step. */
  private noRouteTimer = 0;
  private noRouteNotified = false;

  targetEntityId: number | null = null;
  attackCooldown = 0;
  gatherCarry: Resources = { ...ZERO_RESOURCES };
  carryCapacity = 10;
  private gatherTimer = 0;
  private currentResource: keyof Resources | null = null;
  private animationTime = Math.random() * 10;
  private walkCycle = 0;
  private workAnim = 0;
  private footstepTimer = 0;
  convertProgress = 0;
  garrisonedIn: number | null = null;
  isConstructing: number | null = null;
  rallyPoint: OrderTarget | null = null;
  combatStance: CombatStance = 'agresivo';
  buildEfficiency = 1;
  gatherMultiplier = 1;
  attackMultiplier = 1;
  armorMultiplier = 1;

  private gunPivot: THREE.Group | null = null;
  private turretPivot: THREE.Group | null = null;
  private legL: THREE.Group | null = null;
  private legR: THREE.Group | null = null;
  private armL: THREE.Group | null = null;
  private armR: THREE.Group | null = null;
  private headPivot: THREE.Group | null = null;
  private carryPivot: THREE.Group | null = null;
  private carryMat: THREE.MeshStandardMaterial | null = null;
  private bobY = 0;

  constructor(kind: UnitKind, owner: number, era: Era, ctx: BuildContext) {
    this.kind = kind;
    this.owner = owner;
    this.era = era;
    this.stats = getUnitStats(kind, era);
    this.hp = this.maxHp = this.stats.hp;
    const model = buildModel(getUnitModel(kind, era), ctx);
    this.radius = this.stats.range === 0 ? 0.45 : 0.5;
    if (kind === UnitKind.TANK) this.radius = 0.9;
    if (kind === UnitKind.ARTILLERY || kind === UnitKind.MORTAR || kind === UnitKind.NUCLEAR) this.radius = 0.8;
    this.view = new EntityView(model, this.radius, this);
    this.findPivots(model);
  }

  /** Pivots for animation. */
  findPivots(model: THREE.Group): void {
    this.gunPivot = this.turretPivot = this.legL = this.legR = this.armL = this.armR = this.headPivot = null;
    this.carryPivot = null;
    this.carryMat = null;
    model.traverse((o) => {
      if (o.name === 'pivot:gun') {
        this.gunPivot = o as THREE.Group;
        this.gunBaseZ = this.gunPivot.position.z;
      }
      if (o.name === 'pivot:turret') this.turretPivot = o as THREE.Group;
      if (o.name === 'pivot:legL') this.legL = o as THREE.Group;
      if (o.name === 'pivot:legR') this.legR = o as THREE.Group;
      if (o.name === 'pivot:armL') this.armL = o as THREE.Group;
      if (o.name === 'pivot:armR') this.armR = o as THREE.Group;
      if (o.name === 'pivot:head') this.headPivot = o as THREE.Group;
      if (o.name === 'pivot:carry') {
        this.carryPivot = o as THREE.Group;
        // the bundle is tinted per carried resource, so it needs its own material
        // (baked vertex colours would multiply the tint instead of replacing it)
        for (const child of this.carryPivot.children) {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) continue;
          const m = (mesh.material as THREE.MeshStandardMaterial).clone();
          m.vertexColors = false;
          m.needsUpdate = true;
          mesh.material = m;
          if (!this.carryMat) this.carryMat = m;
        }
      }
    });
  }
  private gunBaseZ = 0;
  private attackingTarget = false;
  private stuckTimer = 0;
  private lastStuckX = 0;
  private lastStuckZ = 0;

  get team(): Team {
    return this.ctx?.players.find((p) => p.id === this.owner)?.team ?? 0;
  }

  ctx!: UnitContext;

  setContext(ctx: UnitContext): void {
    this.ctx = ctx;
  }

  get posX(): number {
    return this.pos.x;
  }
  get posZ(): number {
    return this.pos.z;
  }

  attach(scene: THREE.Scene): void {
    this.view.attachTo(scene);
    this.view.group.position.copy(this.pos);
  }

  /** Bring the position onto the terrain. */
  snapToGround(): void {
    this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z);
    this.view.setPosition(this.pos.x, this.pos.y, this.pos.z);
  }

  /**
   * True when the straight segment from the unit toward (tx, tz), up to
   * `DIRECT_LOOKAHEAD` and stopping `stopRange` short of the target, stays on
   * walkable ground. `stopRange` is the attack/harvest range, so sampling never
   * runs into the target's own blocked cell (a building/resource node). Guards the
   * pathless fallback so a unit never crosses terrain the pathfinder blocks.
   */
  private directAheadClear(tx: number, tz: number, stopRange = 0): boolean {
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const reach = dist - stopRange;
    if (reach <= 0.01) return true;
    const look = Math.min(reach, DIRECT_LOOKAHEAD);
    const steps = Math.max(1, Math.ceil(look / 0.5));
    for (let i = 1; i <= steps; i++) {
      const s = (look * i) / steps;
      if (!this.ctx.isWalkable(this.pos.x + (dx / dist) * s, this.pos.z + (dz / dist) * s)) return false;
    }
    return true;
  }

  /** Warn the player once that an order cannot be routed. */
  private notifyNoRoute(): void {
    if (this.owner !== 0 || this.noRouteNotified) return;
    this.noRouteNotified = true;
    this.ctx.event('alert', { icon: '⚠️', text: 'Sin ruta', x: this.pos.x, z: this.pos.z, warn: true });
  }

  clearOrders(): void {
    this.orderQueue.length = 0;
    this.path.length = 0;
    this.targetEntityId = null;
    this.currentResource = null;
    this.convertProgress = 0;
    this.attackingTarget = false;
    this.noRouteTimer = 0;
    this.noRouteNotified = false;
  }

  issueOrder(order: Order, clear = true): void {
    if (clear) {
      this.clearOrders();
      this.orderQueue.push(order);
    } else {
      this.orderQueue.push(order);
    }
    this.startOrder();
  }

  private startOrder(): void {
    const order = this.orderQueue[0];
    if (!order) return;
    switch (order.kind) {
      case OrderKind.MOVE:
        this.setPath(order.target!.x, order.target!.z);
        break;
      case OrderKind.ATTACK_MOVE:
        this.setPath(order.target!.x, order.target!.z);
        break;
      case OrderKind.GATHER:
        if (order.entityId !== undefined) this.setPathToEntity(order.entityId);
        break;
      case OrderKind.BUILD:
        if (order.entityId !== undefined) this.setPathToEntity(order.entityId);
        break;
      case OrderKind.PATROL:
        order.origin = { x: this.pos.x, z: this.pos.z };
        this.setPath(order.target!.x, order.target!.z);
        break;
      case OrderKind.ATTACK:
        this.targetEntityId = order.entityId ?? null;
        break;
      case OrderKind.CONVERT:
        this.targetEntityId = order.entityId ?? null;
        this.convertProgress = 0;
        break;
      case OrderKind.GARRISON:
        if (order.entityId !== undefined) this.setPathToEntity(order.entityId);
        break;
      case OrderKind.DELIVER:
        if (order.entityId !== undefined) this.setPathToEntity(order.entityId);
        break;
    }
  }

  setPath(tx: number, tz: number): void {
    const pts = this.ctx.findPath(this.pos.x, this.pos.z, tx, tz);
    this.path = pts;
    this.pathIdx = 0;
    if (pts.length > 1) {
      this.advanceToNextWaypoint();
    }
  }

  setPathToEntity(id: number): void {
    const ent = this.ctx.entitiesById.get(id) ?? this.ctx.resourceNodes.get(id) ?? this.ctx.buildings.get(id);
    if (ent) {
      const targetPos = ent.pos ?? ent.view?.group?.position;
      if (targetPos) this.setPath(targetPos.x, targetPos.z);
    }
  }

  private advanceToNextWaypoint(): void {
    if (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      this.targetYaw = angleTo(this.pos.x, this.pos.z, wp.x, wp.z);
    }
  }

  isBusy(): boolean {
    return this.orderQueue.length > 0;
  }

  isGathering(): boolean {
    return this.orderQueue[0]?.kind === OrderKind.GATHER;
  }

  /** Is it running a manual task (gather/build) near the target? */
  private isWorking(): boolean {
    const k = this.orderQueue[0]?.kind;
    return (k === OrderKind.GATHER || k === OrderKind.BUILD) && this.walkCycle <= 0.01;
  }

  takeDamage(dmg: number, _fromId?: number): void {
    if (this.dead) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.ctx) {
      this.ctx.particles?.emit({
        x: this.pos.x,
        y: this.pos.y + 0.5,
        z: this.pos.z,
        count: this.radius > 0.7 ? 18 : 8,
        color: 0x887766,
        kind: 'smoke',
        speed: 1.2,
        life: 1.4,
        size: 2,
      });
      this.ctx.event('unit:died', { id: this.id, owner: this.owner, kind: this.kind });
    }
    if (this.view.group.parent) {
      this.view.group.parent.remove(this.view.group);
    }
  }

  getGatherRate(resource: keyof Resources): number {
    let base = 0.8;
    if (resource === 'food') base = 1.0;
    if (resource === 'wood') base = 0.9;
    if (resource === 'silver') base = 0.7;
    if (resource === 'stone') base = 0.6;
    return base * this.gatherMultiplier;
  }

  update(dt: number, time: number): void {
    this.animationTime += dt;
    if (this.dead) return;
    if (this.garrisonedIn !== null) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.repathTimer -= dt;

    const order = this.orderQueue[0];
    if (order) this.executeOrder(order, dt, time);
    else {
      this.updateIdle(dt);
      this.autoAttack(dt, time);
    }

    // movement
    this.updateMovement(dt);

    // animations
    this.updateAnimation(dt, time);
    this.updateCarry();

    this.view.setPosition(this.pos.x, this.pos.y, this.pos.z);
    this.view.setRotationY(this.yaw);
    // walk/idle bounce applied after fixing the position (not overwritten)
    this.view.group.position.y += this.bobY;
    this.view.updateHealth(this.hp / this.maxHp);
  }

  private updateIdle(dt: number): void {
    void dt;
    this.vel.multiplyScalar(0);
    this.walkCycle = 0;
  }

  /** Auto-attack of idle military units (AoE2 style). */
  private autoAttack(dt: number, time: number): void {
    if (this.combatStance === 'pasivo') return;
    if (this.kind === UnitKind.WORKER || this.kind === UnitKind.SCOUT) return;
    if (this.attackCooldown <= 0) {
      const range = this.stats.range > 0 ? this.stats.range + 1 : this.stats.los + 1;
      const enemy = this.ctx?.enemiesNear ? this.ctx.enemiesNear(this.pos.x, this.pos.z, range, this.owner)[0] : null;
      if (enemy) {
        this.issueOrder({ kind: OrderKind.ATTACK, entityId: enemy.id }, true);
        this.updateAttack(this.orderQueue[0], dt, time);
      }
    }
  }

  private executeOrder(order: Order, dt: number, time: number): void {
    switch (order.kind) {
      case OrderKind.MOVE:
        this.updateMove(order, dt);
        break;
      case OrderKind.ATTACK_MOVE:
        this.updateAttackMove(order, dt, time);
        break;
      case OrderKind.ATTACK:
        this.updateAttack(order, dt, time);
        break;
      case OrderKind.GATHER:
        this.updateGather(order, dt);
        break;
      case OrderKind.BUILD:
        this.updateBuild(order, dt);
        break;
      case OrderKind.CONSTRUCT:
        this.updateConstruct(order, dt);
        break;
      case OrderKind.DELIVER:
        this.updateDeliver(order, dt);
        break;
      case OrderKind.PATROL:
        this.updatePatrol(dt);
        break;
      case OrderKind.GARRISON:
        this.updateGarrison(order, dt);
        break;
      case OrderKind.CONVERT:
        this.updateConvert(order, dt, time);
        break;
      default:
        this.finishOrder();
    }
  }

  /** Drop the current order and start the next one (shift-queue fix). */
  private finishOrder(): void {
    this.orderQueue.shift();
    if (this.orderQueue.length > 0) {
      this.startOrder();
    }
  }

  private isPathDone(): boolean {
    return this.pathIdx >= this.path.length;
  }

  private updateMovement(dt: number): void {
    // stuck detection: if it does not advance with an active path, re-route
    const moved = Math.hypot(this.pos.x - this.lastStuckX, this.pos.z - this.lastStuckZ);
    this.stuckTimer += dt;
    if (moved > 0.4) {
      this.stuckTimer = 0;
      this.lastStuckX = this.pos.x;
      this.lastStuckZ = this.pos.z;
    } else if (this.stuckTimer > 1.2 && this.path.length > 1 && this.orderQueue.length > 0) {
      const o = this.orderQueue[0];
      const target = o.target;
      this.stuckTimer = 0;
      if (target) {
        this.setPath(target.x, target.z);
      } else if (o.entityId !== undefined) {
        this.setPathToEntity(o.entityId);
      }
    }

    if (this.orderQueue.length === 0 || (this.isGathering() && this.pathIdx >= this.path.length)) {
      this.vel.multiplyScalar(Math.pow(0.0001, dt));
    }
    // reach the waypoint
    if (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const dx = wp.x - this.pos.x;
      const dz = wp.z - this.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < MOVE_STOP_DIST) {
        this.pathIdx++;
        if (this.pathIdx < this.path.length) {
          const nw = this.path[this.pathIdx];
          this.targetYaw = angleTo(this.pos.x, this.pos.z, nw.x, nw.z);
        }
      }
    }

    if (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      this.targetYaw = angleTo(this.pos.x, this.pos.z, wp.x, wp.z);
      // speed
      const spd = this.stats.speed;
      this.vel.x = Math.cos(this.targetYaw) * spd;
      this.vel.z = Math.sin(this.targetYaw) * spd;
      this.walkCycle += dt * spd;
      // footstep dust while walking
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.34;
        this.ctx.particles?.emit({
          x: this.pos.x,
          y: this.pos.y + 0.12,
          z: this.pos.z,
          count: 1,
          color: 0xbfae8e,
          kind: 'dust',
          speed: 0.5,
          life: 0.5,
          size: 1.0,
          grow: 1.7,
          spread: 0.5,
        });
      }
    } else {
      this.vel.multiplyScalar(Math.pow(0.02, dt));
      this.walkCycle = lerp(this.walkCycle, 0, dt * 6);
    }

    // separation
    this.applySeparation(dt);

    // integrate
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const size = this.ctx.worldSize;
    this.pos.x = clamp(this.pos.x, 2, size - 2);
    this.pos.z = clamp(this.pos.z, 2, size - 2);
    this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z) + 0.05;

    // smooth rotation
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 10);
  }

  private applySeparation(dt: number): void {
    if (this.walkCycle <= 0.01) return;
    const nearby = this.ctx.unitsNear(this.pos.x, this.pos.z, SEPARATION);
    let fx = 0;
    let fz = 0;
    for (const u of nearby) {
      if (u.id === this.id) continue;
      if (u.garrisonedIn !== null) continue;
      const dx = this.pos.x - u.pos.x;
      const dz = this.pos.z - u.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < SEPARATION && d > 0.001) {
        const f = (SEPARATION - d) / SEPARATION;
        fx += (dx / d) * f;
        fz += (dz / d) * f;
      }
    }
    this.vel.x += fx * 4.5 * dt;
    this.vel.z += fz * 4.5 * dt;
  }

  private updateAnimation(dt: number, time: number): void {
    void dt;
    const walk = this.walkCycle;
    if (this.gunPivot) {
      // subtle recoil over the pivot base position
      const recoil = this.attackCooldown > this.stats.attackSpeed - 0.12 ? -0.15 : 0;
      this.gunPivot.position.z = this.gunBaseZ + recoil;
    }
    if (this.turretPivot) {
      // aim the turret at the target if it exists
      let aimYaw = Math.sin(time * 0.6) * 0.05;
      if (this.targetEntityId !== null) {
        const target =
          this.ctx?.entitiesById?.get(this.targetEntityId) ?? this.ctx?.buildings?.get(this.targetEntityId);
        if (target) {
          aimYaw = angleTo(this.pos.x, this.pos.z, target.pos.x, target.pos.z) - this.yaw;
        }
      }
      this.turretPivot.rotation.y = aimYaw;
    }
    // procedural walk cycle with pivots (arms/legs in counterphase)
    // the phase derives from the distance traveled (stride tied to speed)
    this.bobY = 0;
    if (walk > 0.01) {
      const phase = this.walkCycle * 3.2;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      if (this.legL) this.legL.rotation.x = s * 0.55;
      if (this.legR) this.legR.rotation.x = -s * 0.55;
      if (this.armL) this.armL.rotation.x = -s * 0.42;
      if (this.armR) this.armR.rotation.x = s * 0.42;
      if (this.headPivot) this.headPivot.rotation.x = c * 0.05;
      this.bobY = Math.abs(s) * 0.045;
    } else if (this.isWorking()) {
      // work gesture: strike with the tool (axe/pick)
      this.workAnim += dt;
      const chop = Math.abs(Math.sin(this.workAnim * 5.5));
      if (this.legL) this.legL.rotation.x = 0.12;
      if (this.legR) this.legR.rotation.x = -0.12;
      if (this.armR) this.armR.rotation.x = -0.15 - chop * 0.85;
      if (this.armL) this.armL.rotation.x = -0.25 - chop * 0.15;
      if (this.headPivot) this.headPivot.rotation.x = 0.14 + chop * 0.08;
      this.bobY = -chop * 0.02;
    } else {
      this.workAnim = lerp(this.workAnim, 0, dt * 8);
      const idle = Math.sin(this.animationTime * 1.6);
      if (this.legL) this.legL.rotation.x = idle * 0.03;
      if (this.legR) this.legR.rotation.x = -idle * 0.03;
      // arms fall to a neutral position when standing still
      if (this.armL) this.armL.rotation.x = idle * 0.02;
      if (this.armR) this.armR.rotation.x = idle * 0.02;
      if (this.headPivot) this.headPivot.rotation.x = idle * 0.02;
      this.bobY = idle * 0.014;
    }
    // attack stance: the weapon arm points at the target when not moving
    if (this.armR) {
      if (this.targetEntityId !== null && walk <= 0.01 && this.orderQueue[0]?.kind === OrderKind.ATTACK) {
        const recoil = this.attackCooldown > this.stats.attackSpeed - 0.12 ? -0.25 : 0;
        this.armR.rotation.x = -1.05 + recoil;
      } else if (this.gunPivot && walk <= 0.01 && this.orderQueue[0]?.kind === OrderKind.ATTACK) {
        this.armR.rotation.x = -0.9;
      }
    }
  }

  // --- specific orders ---

  /**
   * Plain move order. It must not complete while the unit is still far from its
   * destination: a path can come back empty (a blocked start cell / an isolated
   * pocket) and the unit would otherwise freeze where it stands. Re-path, and if
   * there is still no route head straight for the target (movement integration is
   * left to `updateMovement`, so it must not move the position here).
   */
  private updateMove(order: Order, dt: number): void {
    const t = order.target;
    if (!this.isPathDone()) {
      this.noRouteTimer = 0;
      return;
    }
    if (!t || distance2D(this.pos.x, this.pos.z, t.x, t.z) <= MOVE_ARRIVAL_DIST) {
      this.finishOrder();
      return;
    }
    if (this.repathTimer <= 0) {
      this.setPath(t.x, t.z);
      this.repathTimer = 0.5;
    }
    if (!this.isPathDone()) {
      this.noRouteTimer = 0;
      return;
    }
    // still no route: only head straight in when the ground ahead is walkable (or
    // the unit is escaping a blocked cell), otherwise wait and give up after a grace
    if (!this.ctx.isWalkable(this.pos.x, this.pos.z) || this.directAheadClear(t.x, t.z)) {
      this.noRouteTimer = 0;
      this.targetYaw = angleTo(this.pos.x, this.pos.z, t.x, t.z);
      const spd = this.stats.speed;
      this.vel.x = Math.cos(this.targetYaw) * spd;
      this.vel.z = Math.sin(this.targetYaw) * spd;
      return;
    }
    this.noRouteTimer += dt;
    if (this.noRouteTimer > NO_ROUTE_GIVEUP) this.notifyNoRoute();
  }

  private updateAttackMove(order: Order, dt: number, time: number): void {
    // look for enemies along the path
    const enemies = this.ctx.unitsNear(this.pos.x, this.pos.z, this.stats.range + 3);
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (e.owner === this.owner) continue;
      if (this.ctx.players.find((p) => p.id === e.owner)?.team === this.team) continue;
      const d = distance2D(this.pos.x, this.pos.z, e.pos.x, e.pos.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best && bestD < this.stats.range + 2) {
      // engage combat without destroying the attack-move order
      this.targetEntityId = best.id;
      this.attackingTarget = true;
      this.updateAttack({ kind: OrderKind.ATTACK, entityId: best.id }, dt, time);
    } else if (this.isPathDone()) {
      this.attackingTarget = false;
      // same no-freeze guarantee as a plain move when the route came back empty
      this.updateMove(order, dt);
    }
  }

  private updateAttack(order: Order, dt: number, time: number): void {
    const target =
      this.targetEntityId !== null
        ? (this.ctx.entitiesById.get(this.targetEntityId) ?? this.ctx.buildings.get(this.targetEntityId))
        : null;
    if (!target || target.dead || (target.hp !== undefined && target.hp <= 0)) {
      this.targetEntityId = null;
      if (this.attackingTarget) {
        // resume the attack-move march toward its original destination
        this.attackingTarget = false;
        const am = this.orderQueue[0];
        if (am && am.kind === OrderKind.ATTACK_MOVE && am.target) {
          this.setPath(am.target.x, am.target.z);
        }
      } else if (order.kind === OrderKind.ATTACK) {
        this.finishOrder();
      }
      return;
    }
    const tpos = target.pos;
    const dx = tpos.x - this.pos.x;
    const dz = tpos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const range = this.stats.range > 0 ? this.stats.range + target.radius : 0.9 + target.radius;

    if (dist > range * 1.15) {
      // chase (with a direct-approach fallback if there is no path)
      if (this.repathTimer <= 0) {
        this.setPath(tpos.x, tpos.z);
        this.repathTimer = 0.8;
      }
      if (this.pathIdx >= this.path.length) {
        // route exhausted but still out of range (a building's goal cell is not
        // walkable, so the path can stop a couple of cells short): head straight in
        // only over walkable ground, else hold and warn
        if (!this.ctx.isWalkable(this.pos.x, this.pos.z) || this.directAheadClear(tpos.x, tpos.z, range)) {
          this.noRouteTimer = 0;
          this.targetYaw = angleTo(this.pos.x, this.pos.z, tpos.x, tpos.z);
          const spd = this.stats.speed;
          this.vel.x = Math.cos(this.targetYaw) * spd;
          this.vel.z = Math.sin(this.targetYaw) * spd;
          return;
        }
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP) this.notifyNoRoute();
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        return;
      }
      this.noRouteTimer = 0;
      this.targetYaw = angleTo(this.pos.x, this.pos.z, tpos.x, tpos.z);
    } else {
      // stop cleanly to shoot/strike
      this.path.length = 0;
      this.pathIdx = 0;
      this.vel.multiplyScalar(Math.pow(0.05, dt));
      this.targetYaw = angleTo(this.pos.x, this.pos.z, tpos.x, tpos.z);
      if (this.stats.range === 0) {
        this.attackTarget(target, time);
      } else if (this.attackCooldown <= 0) {
        this.fireAt(target, time);
        this.attackCooldown = this.stats.attackSpeed;
      }
    }
  }

  private attackTarget(target: any, time: number): void {
    if (this.attackCooldown <= 0) {
      const dmg = this.stats.attack * this.attackMultiplier;
      this.ctx.resolveDamage(this.id, target.id, dmg, this, this.stats.damageType);
      this.attackCooldown = this.stats.attackSpeed;
    }
    void time;
  }

  private fireAt(target: any, time: number): void {
    const pKind = this.stats.projectile;
    const from = new THREE.Vector3(this.pos.x, this.pos.y + 0.8, this.pos.z);
    const to = new THREE.Vector3(target.pos.x, target.pos.y + 0.5, target.pos.z);
    const arc = pKind === 'howitzer_shell' || pKind === 'nuclear' ? 1 : 0;
    const speed =
      pKind === 'bullet' ? 40 : pKind === 'tracer' ? 60 : pKind === 'laser' ? 90 : pKind === 'rail' ? 130 : 28;
    this.ctx.spawnProjectile({
      from,
      target: to,
      speed,
      damage: this.stats.attack * this.attackMultiplier,
      kind: pKind,
      owner: this.owner,
      area: this.stats.area,
      arc,
      trail: pKind === 'tracer' ? 'tracer' : undefined,
      targetId: target.id,
      damageType: this.stats.damageType,
    });
    // muzzle flash at the cannon mouth (weapon pivot + barrel length, rotated with the unit)
    const muzzle = new THREE.Vector3(0.28, 0.9, 0.62).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.ctx.particles?.emit({
      x: this.pos.x + muzzle.x,
      y: this.pos.y + muzzle.y,
      z: this.pos.z + muzzle.z,
      count: 4,
      color: 0xffcc66,
      kind: 'explosion',
      speed: 1.2,
      life: 0.12,
      size: 1.4,
    });
    void time;
  }

  private updateGather(order: Order, dt: number): void {
    // if the load is full, deliver before continuing to harvest
    if (this.carryCount() >= this.carryCapacity) {
      this.deliverOrder();
      return;
    }
    // the target can be a resource node or a farm (building)
    let node: any = this.ctx.resourceNodes.get(order.entityId!);
    if ((!node || node.depleted || node.dead) && this.ctx.buildings.has(order.entityId!)) {
      const bld = this.ctx.buildings.get(order.entityId!);
      if (bld && !bld.dead && bld.constructionComplete && bld.isFarm && bld.foodAmount > 0) {
        node = { pos: bld.pos, amount: bld.foodAmount, resource: 'food', farm: bld };
      }
    }
    if (!node || node.dead) {
      // nonexistent or dead target: deliver the partial load if there is any
      if (this.carryCount() > 0) {
        this.deliverOrder();
      } else {
        this.finishOrder();
      }
      return;
    }
    if (node.amount !== undefined && node.amount <= 0) {
      // depleted target: remove the real node (or mark the farm) and deliver
      if (node.farm) {
        node.farm.foodAmount = 0;
      } else if (typeof node.subtract === 'function') {
        node.subtract(0);
      }
      if (this.carryCount() > 0) {
        this.deliverOrder();
      } else {
        this.finishOrder();
      }
      return;
    }
    const dx = node.pos.x - this.pos.x;
    const dz = node.pos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const harvestRange = 2.8;

    if (dist > harvestRange) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(node.pos.x, node.pos.z);
        this.repathTimer = 0.9;
      }
      if (this.pathIdx >= this.path.length) {
        // no route: only close in over walkable ground, else give up so the worker
        // frees up (it must not cross blocked terrain to reach the node)
        if (
          !this.ctx.isWalkable(this.pos.x, this.pos.z) ||
          this.directAheadClear(node.pos.x, node.pos.z, harvestRange)
        ) {
          this.noRouteTimer = 0;
          this.targetYaw = angleTo(this.pos.x, this.pos.z, node.pos.x, node.pos.z);
          const spd = this.stats.speed;
          this.vel.x = Math.cos(this.targetYaw) * spd;
          this.vel.z = Math.sin(this.targetYaw) * spd;
          this.pos.x += this.vel.x * dt;
          this.pos.z += this.vel.z * dt;
          this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z) + 0.05;
          return;
        }
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP) {
          // free the worker so the AI can reassign it to a reachable node
          this.notifyNoRoute();
          this.finishOrder();
        }
      }
      return;
    }
    this.vel.multiplyScalar(Math.pow(0.05, dt));
    this.targetYaw = angleTo(this.pos.x, this.pos.z, node.pos.x, node.pos.z);

    this.gatherTimer += dt;
    const interval = 1.4;
    if (this.gatherTimer >= interval) {
      this.gatherTimer = 0;
      if (!this.currentResource) this.currentResource = node.resource;
      const rate = this.getGatherRate(node.resource as keyof Resources);
      const amount = Math.min(rate, node.amount, this.carryCapacity - this.carryCount());
      if (amount <= 0) return;
      if (node.farm) {
        node.amount -= amount;
        node.farm.foodAmount = node.amount;
      } else if (typeof node.subtract === 'function') {
        node.subtract(amount);
      } else {
        node.amount -= amount;
      }
      this.gatherCarry[node.resource as keyof Resources] += amount;
      if (node.resource === 'wood') this.ctx.event?.('fx:wood', {});
      else if (node.resource === 'silver' || node.resource === 'stone') this.ctx.event?.('fx:mine', {});
      else this.ctx.event?.('fx:wood', {});
      // gather effect according to the resource
      if (node.resource === 'wood') {
        this.ctx.particles?.emit({
          x: node.pos.x,
          y: node.pos.y + 0.5,
          z: node.pos.z,
          count: 3,
          color: 0x8a6a3a,
          kind: 'spark',
          speed: 0.7,
          life: 0.45,
          size: 0.9,
          spread: 0.6,
        });
      } else if (node.resource === 'silver' || node.resource === 'stone') {
        this.ctx.particles?.emit({
          x: node.pos.x,
          y: node.pos.y + 0.5,
          z: node.pos.z,
          count: 3,
          color: 0xffd27a,
          kind: 'spark',
          speed: 0.9,
          life: 0.35,
          size: 0.8,
          spread: 0.7,
        });
      } else {
        this.ctx.particles?.emit({
          x: node.pos.x,
          y: node.pos.y + 0.5,
          z: node.pos.z,
          count: 2,
          color: 0x9bbf6a,
          kind: 'dust',
          speed: 0.6,
          life: 0.5,
          size: 1.1,
        });
      }
      if (this.carryCount() >= this.carryCapacity) {
        this.deliverOrder();
      }
    }
  }

  private carryCount(): number {
    return this.gatherCarry.food + this.gatherCarry.wood + this.gatherCarry.silver + this.gatherCarry.stone;
  }

  /** Show/hide the load bundle and color it according to the resource. */
  private updateCarry(): void {
    if (!this.carryPivot) return;
    const carrying = this.carryCount() > 0;
    this.carryPivot.visible = carrying;
    if (carrying && this.carryMat) {
      const res = this.currentResource ?? this.dominantResource();
      this.carryMat.color.setHex(CARRY_COLORS[res]);
    }
  }

  private dominantResource(): keyof Resources {
    if (this.gatherCarry.food > 0) return 'food';
    if (this.gatherCarry.wood > 0) return 'wood';
    if (this.gatherCarry.silver > 0) return 'silver';
    return 'stone';
  }

  private deliverOrder(): void {
    const res = this.currentResource;
    if (!res) return;
    const dropsite = this.findDropsite(res);
    if (dropsite) {
      this.orderQueue.unshift({ kind: OrderKind.DELIVER, entityId: dropsite.id });
      this.setPath(dropsite.pos.x, dropsite.pos.z);
      this.currentResource = res;
    }
    // no dropsite: keep the load and stay waiting
  }

  private findDropsite(resource: keyof Resources): any | null {
    let best: any | null = null;
    let bestD = Infinity;
    for (const b of this.ctx.buildings.values()) {
      if (b.owner !== this.owner) continue;
      if (!b.isDropsite || !b.dropTypes?.includes(resource)) continue;
      const d = distance2D(this.pos.x, this.pos.z, b.pos.x, b.pos.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private updateDeliver(order: Order, dt: number): void {
    const dropsite = this.ctx.buildings.get(order.entityId!);
    if (!dropsite || dropsite.dead) {
      // dropsite destroyed: re-find another dropsite for the current load
      const res = this.currentResource ?? 'food';
      const alt = this.findDropsite(res);
      if (alt) {
        order.entityId = alt.id;
        this.setPath(alt.pos.x, alt.pos.z);
        return;
      }
      // no dropsite: keep the load and wait
      this.vel.multiplyScalar(Math.pow(0.05, dt));
      return;
    }
    const dx = dropsite.pos.x - this.pos.x;
    const dz = dropsite.pos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 2.4) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(dropsite.pos.x, dropsite.pos.z);
        this.repathTimer = 0.8;
      }
      if (this.pathIdx >= this.path.length) {
        this.targetYaw = angleTo(this.pos.x, this.pos.z, dropsite.pos.x, dropsite.pos.z);
        const spd = this.stats.speed;
        this.vel.x = Math.cos(this.targetYaw) * spd;
        this.vel.z = Math.sin(this.targetYaw) * spd;
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z) + 0.05;
      }
      return;
    }
    this.vel.multiplyScalar(Math.pow(0.05, dt));
    // delivery
    this.ctx.gather(dropsite.id, this.id, 0, this.currentResource ?? 'food');
    for (const k of ['food', 'wood', 'silver', 'stone'] as const) {
      if (this.gatherCarry[k] > 0) {
        this.ctx.gather(dropsite.id, this.id, this.gatherCarry[k], k);
        this.gatherCarry[k] = 0;
      }
    }
    this.currentResource = null;
    this.finishOrder();
  }

  private updateBuild(order: Order, dt: number): void {
    const bld = this.ctx.buildings.get(order.entityId!);
    if (!bld || bld.dead || bld.constructionComplete) {
      this.finishOrder();
      return;
    }
    const dx = bld.pos.x - this.pos.x;
    const dz = bld.pos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > bld.radius + 1.6) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(bld.pos.x, bld.pos.z);
        this.repathTimer = 0.7;
      }
      if (this.pathIdx >= this.path.length) {
        this.targetYaw = angleTo(this.pos.x, this.pos.z, bld.pos.x, bld.pos.z);
        const spd = this.stats.speed;
        this.vel.x = Math.cos(this.targetYaw) * spd;
        this.vel.z = Math.sin(this.targetYaw) * spd;
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z) + 0.05;
      }
      return;
    }
    this.vel.multiplyScalar(Math.pow(0.05, dt));
    bld.addBuildProgress(this.buildEfficiency * dt);
    this.targetYaw = angleTo(this.pos.x, this.pos.z, bld.pos.x, bld.pos.z);
  }

  private updateConstruct(order: Order, dt: number): void {
    void order;
    void dt;
    this.finishOrder();
  }

  private updateGarrison(order: Order, dt: number): void {
    const bld = this.ctx.buildings.get(order.entityId!);
    if (!bld || bld.dead) {
      this.finishOrder();
      return;
    }
    const dx = bld.pos.x - this.pos.x;
    const dz = bld.pos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bld.radius + 0.4) {
      const capacity = bld.stats?.garrisons ?? 0;
      if (bld.garrisonedIds.length < capacity) {
        bld.garrisonUnit(this.id, this.owner);
        this.garrisonedIn = bld.id;
        this.view.group.visible = false;
        this.finishOrder();
      } else {
        // building full: stay nearby waiting
        this.vel.multiplyScalar(Math.pow(0.05, dt));
      }
    } else {
      if (this.repathTimer <= 0) {
        this.setPath(bld.pos.x, bld.pos.z);
        this.repathTimer = 0.6;
      }
    }
  }

  private updatePatrol(_dt: number): void {
    if (this.pathIdx >= this.path.length) {
      const first = this.orderQueue[0];
      if (first && first.target) {
        // ping-pong between origin and destination
        const next = first.origin ?? { x: this.pos.x, z: this.pos.z };
        this.setPath(next.x, next.z);
        if (first.origin) {
          // we already have the origin: toggle
          const tmp = first.origin;
          first.origin = { ...first.target };
          first.target = { ...tmp };
        }
      }
    }
  }

  private updateConvert(_order: Order, dt: number, time: number): void {
    const target = this.targetEntityId !== null ? this.ctx.entitiesById.get(this.targetEntityId) : null;
    if (!target || target.dead) {
      this.finishOrder();
      return;
    }
    const dist = distance2D(this.pos.x, this.pos.z, target.pos.x, target.pos.z);
    if (dist > this.stats.range) {
      if (this.repathTimer <= 0) {
        this.setPath(target.pos.x, target.pos.z);
        this.repathTimer = 0.6;
      }
      this.convertProgress = 0;
      return;
    }
    this.vel.multiplyScalar(Math.pow(0.05, dt));
    this.targetYaw = angleTo(this.pos.x, this.pos.z, target.pos.x, target.pos.z);
    this.convertProgress += dt / 5;
    this.ctx.particles?.emit({
      x: target.pos.x,
      y: target.pos.y + 1,
      z: target.pos.z,
      count: 1,
      color: 0x66ffaa,
      kind: 'flare',
      speed: 0.2,
      life: 0.8,
      size: 1.4,
    });
    if (this.convertProgress >= 1) {
      // conversion: `team` is derived from `owner`, so reassigning owner is enough
      const from = target.owner;
      target.owner = this.owner;
      target.clearOrders?.();
      this.ctx.event('unit:converted', { id: target.id, from, to: this.owner });
      this.finishOrder();
    }
    void time;
  }

  get maxCarry(): number {
    return this.carryCapacity;
  }

  setCarryCapacity(v: number): void {
    this.carryCapacity = v;
  }

  /** Snapshot the gameplay state (used by save/load). */
  toSave(): UnitSave {
    return {
      id: this.id,
      owner: this.owner,
      kind: this.kind,
      era: this.era,
      pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
      yaw: this.yaw,
      hp: this.hp,
      orders: this.orderQueue.map((o) => ({ ...o })),
      targetEntityId: this.targetEntityId,
      attackCooldown: this.attackCooldown,
      gatherCarry: { ...this.gatherCarry },
      carryCapacity: this.carryCapacity,
      convertProgress: this.convertProgress,
      garrisonedIn: this.garrisonedIn,
      isConstructing: this.isConstructing,
      rallyPoint: this.rallyPoint,
      combatStance: this.combatStance,
      buildEfficiency: this.buildEfficiency,
      gatherMultiplier: this.gatherMultiplier,
      attackMultiplier: this.attackMultiplier,
      armorMultiplier: this.armorMultiplier,
      tag: this.tag,
    };
  }

  applySave(s: UnitSave): void {
    this.id = s.id;
    this.hp = s.hp;
    this.pos.set(s.pos.x, s.pos.y, s.pos.z);
    this.yaw = s.yaw;
    this.targetYaw = s.yaw;
    this.orderQueue = s.orders ?? [];
    this.targetEntityId = s.targetEntityId;
    this.attackCooldown = s.attackCooldown;
    this.gatherCarry = { ...s.gatherCarry };
    this.carryCapacity = s.carryCapacity;
    this.convertProgress = s.convertProgress;
    this.garrisonedIn = s.garrisonedIn;
    this.isConstructing = s.isConstructing;
    this.rallyPoint = s.rallyPoint;
    this.combatStance = s.combatStance ?? 'agresivo';
    this.buildEfficiency = s.buildEfficiency;
    this.gatherMultiplier = s.gatherMultiplier;
    this.attackMultiplier = s.attackMultiplier;
    this.armorMultiplier = s.armorMultiplier;
    if (s.tag) this.tag = s.tag;
    this.view.setPosition(this.pos.x, this.pos.y, this.pos.z);
    this.view.setRotationY(this.yaw);
    this.view.group.visible = this.garrisonedIn === null;
    this.view.updateHealth(this.hp / this.maxHp);
  }

  removeFromScene(): void {
    if (this.view.group.parent) this.view.group.parent.remove(this.view.group);
    this.view.dispose();
    disposeModel(this.view.group);
  }
}
