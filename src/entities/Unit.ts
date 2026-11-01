import * as THREE from 'three';
import {
  Era,
  UnitKind,
  Resources,
  ZERO_RESOURCES,
  Team,
  GameEvents,
  PlayerState,
  HistoricalPeriod,
  CombatStance,
  AlertReason,
} from '../core/types';
import { getUnitStats, getUnitModel, UnitStats, DamageClass, UnitClass } from '../model/defs/units';
import {
  WALK_CLIP_RATE_MAX,
  WALK_CLIP_RATE_MIN,
  WALK_CLIP_REFERENCE_SPEED,
  rigClipStateFor,
  unitModelAsset,
} from '../model/defs/modelAssets';
import { buildModel, BuildContext, disposeModel } from '../model/ProceduralModel';
import { acquireRig } from '../rendering/ModelAssets';
import type { RigInstance } from '../rendering/RigInstance';
import { EntityView } from '../entities/EntityView';
import { allocId } from '../entities/EntityView';
import { Order, OrderKind, OrderTarget } from '../core/types';
import { angleDelta, angleTo, distance2D, clamp, facingRotation, lerp } from '../util/math';
import { genderForId, type PersonGender } from '../model/defs/people';
import type { UnitSave } from '../game/saveTypes';

/** Reach of a melee attack from the edge of the target footprint. */
export const MELEE_ATTACK_RANGE = 0.9;
/** Extra reach against a building so a blocked edge cell does not make it untouchable. */
const BUILDING_ATTACK_PAD = 0.5;

/** Structural view of a resource node, enough for gather retargeting. */
interface GatherNodeRef {
  id: number;
  pos: { x: number; z: number };
  resource: keyof Resources;
  amount?: number;
  dead?: boolean;
  depleted?: boolean;
}

/** Context that Game provides to units (avoids circular dependencies). */
export interface UnitContext {
  getHeight(x: number, z: number): number;
  findPath(sx: number, sz: number, tx: number, tz: number): { x: number; z: number }[];
  /** Path to a stand point within `standRadius` of a blocked target (resource/farm). */
  findApproachPath(sx: number, sz: number, tx: number, tz: number, standRadius: number): { x: number; z: number }[];
  /** Cheap reachability test using the same stand-point criteria as `findApproachPath`. */
  reachableToNode(sx: number, sz: number, tx: number, tz: number, standRadius: number): boolean;
  /** Terrain navigability (water/steep/obstacles); guards the pathless fallback. */
  isWalkable(x: number, z: number): boolean;
  /** Nearest walkable point used to resolve a unit embedded in a solid footprint. */
  nearestWalkable(x: number, z: number): { x: number; z: number } | null;
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
    attackerKind?: UnitKind;
    bonusVs?: Partial<Record<UnitClass, number>>;
  }): void;
  particles: any;
  players: PlayerState[];
  getPlayer(playerId: number): PlayerState;
  event<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
  gather(nodeId: number, unitId: number, amount: number, resource: string): void;
  worldSize: number;
  /** The match's historical period (for the chronology guard on training). */
  period: HistoricalPeriod;
  unitSpawn(buildingId: number, unit: any, rally: OrderTarget, hasRally: boolean): boolean;
  techComplete(playerId: number, techId: string): void;
}

const MOVE_STOP_DIST = 0.6;
/** Distance from a resource node at which a worker can harvest it. */
export const HARVEST_RANGE = 2.8;
/** Stand point inside a walkable cell: close enough that the final 0.6 stop still harvests. */
export const HARVEST_STAND_RANGE = HARVEST_RANGE - MOVE_STOP_DIST;
/** Distance at which a plain move/attack-move order counts as arrived. */
const MOVE_ARRIVAL_DIST = 1.2;
const SEPARATION = 1.4;
/** Look-ahead (world units) validated before a pathless direct approach. */
const DIRECT_LOOKAHEAD = 3;
/** Seconds without a route before a stuck move/combat order gives up. */
const NO_ROUTE_GIVEUP = 1.5;
/** Gather orders get a longer grace: a blocked stand point can free up as other workers leave. */
const NO_ROUTE_GIVEUP_ECONOMY = 4.5;
/** Consecutive failed re-routes before a stuck economy order is dropped. */
const STUCK_GIVEUP_RETRIES = 3;
/** Seconds with a full load and no dropsite before warning the player. */
const NO_DROPSITE_GIVEUP = 2.5;
/** Minimum defensive leash around the stance origin. */
const LEASH_MIN_RADIUS = 6;
/** Distance from the leash origin at which a defensive unit stops returning. */
const LEASH_RETURN_DIST = 1.5;
/** Re-path cadence while walking back to the defensive anchor. */
const LEASH_REPATH = 0.6;
/** Extra build reach so large buildings remain constructible from their approach cell. */
const BUILD_REACH_PAD = 3;

/** Economy orders a worker may abandon when it cannot make progress. */
const isEconomyOrder = (kind: OrderKind): boolean => kind === OrderKind.GATHER || kind === OrderKind.BUILD;

/** Color of the worker's load bundle according to the carried resource. */
const CARRY_COLORS: Record<keyof Resources, number> = {
  food: 0xc8a04a,
  wood: 0x8a6a3a,
  silver: 0x9aa2aa,
  stone: 0x4ac6d8,
};

export class Unit {
  id: number;
  owner: number;
  kind: UnitKind;
  era: Era;
  readonly gender: PersonGender;
  stats: UnitStats;
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  targetYaw = 0;
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
  private noDropsiteTimer = 0;
  /** One block alert per order; reset when the order changes. */
  private blockedNotified = false;
  /** One-shot fallback: the regular path/direct approach could not reach a node. */
  private approachTried = false;
  private attackApproachTried = false;
  private buildApproachTried = false;

  targetEntityId: number | null = null;
  attackCooldown = 0;
  gatherCarry: Resources = { ...ZERO_RESOURCES };
  carryCapacity = 10;
  private gatherTimer = 0;
  private currentResource: keyof Resources | null = null;
  private animationTime = 0;
  private walkCycle = 0;
  private workAnim = 0;
  private footstepTimer = 0;
  /** Set by `directStep` for this tick: integrate the direct approach in `updateMovement`. */
  private directApproach = false;
  convertProgress = 0;
  garrisonedIn: number | null = null;
  isConstructing: number | null = null;
  rallyPoint: OrderTarget | null = null;
  combatStance: CombatStance = 'agresivo';
  /** Anchor a defensive unit returns to after a short pursuit. */
  leashOrigin: { x: number; z: number } | null = null;
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
  /** Rigged presentation; null keeps the procedural model (progressive migration). */
  rig: RigInstance | null = null;

  constructor(kind: UnitKind, owner: number, era: Era, ctx: BuildContext, id?: number) {
    this.id = id ?? allocId();
    this.kind = kind;
    this.owner = owner;
    this.era = era;
    this.gender = genderForId(this.id);
    // Deterministic spawn facing: no Math.random here, so saves/replays and
    // AI-vs-AI runs keep the same yaw. The golden angle gives visual variety.
    this.yaw = (this.id * 2.399963229728653) % (Math.PI * 2);
    this.targetYaw = this.yaw;
    this.animationTime = (this.id * 1.61803398875) % 10;
    this.stats = getUnitStats(kind, era);
    this.hp = this.maxHp = this.stats.hp;
    const modelChoice = unitModelAsset(kind, era, ctx.civ.id, this.id);
    this.rig = modelChoice ? acquireRig(modelChoice.asset, modelChoice.variant) : null;
    const model = this.rig ? this.rig.root : buildModel({ ...getUnitModel(kind, era), gender: this.gender }, ctx);
    this.radius = this.stats.range === 0 ? 0.45 : 0.5;
    if (kind === UnitKind.TANK) this.radius = 0.9;
    if (kind === UnitKind.ARTILLERY || kind === UnitKind.MORTAR || kind === UnitKind.NUCLEAR) this.radius = 0.8;
    this.view = new EntityView(model, this.radius, this, this.rig ? 'radius' : 'model');
    if (!this.rig) this.findPivots(model);
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
  /** Consecutive re-routes while stuck; a worker yields its order past the limit. */
  private stuckRetries = 0;

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

  /** Warn the player once per order that it cannot make progress. */
  private notifyBlocked(reason: AlertReason): void {
    if (this.owner !== 0 || this.dead || this.blockedNotified) return;
    this.blockedNotified = true;
    const order = this.orderQueue[0];
    const worker = this.kind === UnitKind.WORKER;
    const subject = worker ? 'Un obrero' : 'Una unidad';
    let text: string;
    if (reason === 'stuck') {
      text = `${subject} no puede avanzar`;
    } else if (reason === 'no-dropsite') {
      text = `${subject} no tiene dónde entregar la carga`;
    } else if (order?.kind === OrderKind.GATHER && order.entityId !== undefined) {
      const node = this.ctx.resourceNodes.get(order.entityId);
      const resource: Record<string, string> = {
        food: 'los alimentos',
        wood: 'la madera',
        silver: 'la plata',
        stone: 'la piedra',
      };
      text = `${subject} no encuentra camino a ${resource[node?.resource] ?? 'ese recurso'}`;
    } else if (order?.kind === OrderKind.BUILD) {
      text = `${subject} no encuentra camino a la obra`;
    } else {
      text = `${subject} no encuentra camino a su destino`;
    }
    this.ctx.event('alert', {
      icon: '⚠️',
      text,
      x: this.pos.x,
      z: this.pos.z,
      warn: true,
      unitId: this.id,
      reason,
      order: order?.kind,
    });
  }

  /** Compatibility wrapper for the original no-route call sites. */
  private notifyNoRoute(): void {
    this.notifyBlocked('no-route');
  }

  /**
   * Head straight for (tx, tz) when the ground ahead is walkable (or the unit is
   * escaping a blocked cell). Returns false when the direct approach is blocked, so
   * the caller can re-path and, after a grace, warn. Movement integration (and the
   * blocked-cell collision) is left to `updateMovement`.
   */
  private directStep(tx: number, tz: number, stopRange = 0): boolean {
    if (!this.ctx.isWalkable(this.pos.x, this.pos.z)) {
      const exit = this.ctx.nearestWalkable(this.pos.x, this.pos.z);
      if (!exit) return false;
      tx = exit.x;
      tz = exit.z;
    } else if (!this.directAheadClear(tx, tz, stopRange)) {
      return false;
    }
    this.noRouteTimer = 0;
    this.targetYaw = angleTo(this.pos.x, this.pos.z, tx, tz);
    const spd = this.stats.speed;
    this.vel.x = Math.cos(this.targetYaw) * spd;
    this.vel.z = Math.sin(this.targetYaw) * spd;
    this.directApproach = true;
    return true;
  }

  /**
   * True when moving from the current position to (tx, tz) never samples a
   * blocked cell. Escape is allowed when the unit already stands on a blocked
   * cell (e.g. an obstacle was placed under it), otherwise the segment is
   * sampled at ~0.5-unit intervals so a thin barrier cannot be tunnelled.
   */
  private stepAllowed(tx: number, tz: number): boolean {
    // A unit embedded in a solid footprint may only move toward the nearest
    // walkable cell; normal movement never enters a blocked cell below.
    if (!this.ctx.isWalkable(this.pos.x, this.pos.z)) {
      const exit = this.ctx.nearestWalkable(this.pos.x, this.pos.z);
      if (!exit) return false;
      const before = Math.hypot(exit.x - this.pos.x, exit.z - this.pos.z);
      const after = Math.hypot(exit.x - tx, exit.z - tz);
      return after < before - 1e-4;
    }
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-4) return true;
    const steps = Math.max(1, Math.ceil(dist / 0.5));
    for (let i = 1; i <= steps; i++) {
      const s = (dist * i) / steps;
      if (!this.ctx.isWalkable(this.pos.x + (dx / dist) * s, this.pos.z + (dz / dist) * s)) return false;
    }
    return true;
  }

  /** Integrate `vel` without ever entering blocked terrain (slides along walls). */
  private integrateSafely(dt: number): void {
    const size = this.ctx.worldSize;
    const nx = clamp(this.pos.x + this.vel.x * dt, 2, size - 2);
    const nz = clamp(this.pos.z + this.vel.z * dt, 2, size - 2);
    if (this.stepAllowed(nx, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (this.stepAllowed(nx, this.pos.z)) {
      this.pos.x = nx;
      this.vel.z = 0;
    } else if (this.stepAllowed(this.pos.x, nz)) {
      this.pos.z = nz;
      this.vel.x = 0;
    } else {
      this.vel.x = 0;
      this.vel.z = 0;
    }
    this.pos.y = this.ctx.getHeight(this.pos.x, this.pos.z) + 0.05;
  }

  clearOrders(): void {
    this.orderQueue.length = 0;
    this.path.length = 0;
    this.targetEntityId = null;
    this.currentResource = null;
    this.convertProgress = 0;
    this.attackingTarget = false;
    this.noDropsiteTimer = 0;
    this.blockedNotified = false;
    this.resetApproachState();
    if (this.combatStance === 'defensivo') this.leashOrigin = { x: this.pos.x, z: this.pos.z };
  }

  /** One-shot fallbacks belong to a single order attempt, never to the next trip. */
  private resetApproachState(): void {
    this.noRouteTimer = 0;
    this.directApproach = false;
    this.approachTried = false;
    this.attackApproachTried = false;
    this.buildApproachTried = false;
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
    this.stuckRetries = 0;
    this.blockedNotified = false;
    this.noDropsiteTimer = 0;
    this.resetApproachState();
    switch (order.kind) {
      case OrderKind.MOVE:
        if (this.combatStance === 'defensivo' && order.target) this.leashOrigin = { ...order.target };
        this.setPath(order.target!.x, order.target!.z);
        break;
      case OrderKind.ATTACK_MOVE:
        if (this.combatStance === 'defensivo' && order.target) this.leashOrigin = { ...order.target };
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

  /** Head for a stand point when the regular path ended outside harvesting range. */
  private followApproachPath(pts: { x: number; z: number }[]): void {
    this.path = pts;
    this.pathIdx = 0;
    this.repathTimer = 0.9;
    this.noRouteTimer = 0;
    if (pts.length > 1) this.advanceToNextWaypoint();
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

  /** True when an attack order has been unable to reach its target for a while. */
  isAttackBlocked(): boolean {
    if (this.orderQueue[0]?.kind !== OrderKind.ATTACK) return false;
    const target =
      this.targetEntityId !== null
        ? (this.ctx.entitiesById.get(this.targetEntityId) ?? this.ctx.buildings.get(this.targetEntityId))
        : null;
    if (!target) return true;
    if (this.noRouteTimer > NO_ROUTE_GIVEUP) return true;
    const range =
      (this.stats.range > 0 ? this.stats.range : MELEE_ATTACK_RANGE) +
      target.radius +
      (this.ctx.buildings.get(target.id) ? BUILDING_ATTACK_PAD : 0);
    return (
      this.attackApproachTried &&
      this.path.length === 0 &&
      distance2D(this.pos.x, this.pos.z, target.pos.x, target.pos.z) > range
    );
  }

  setCombatStance(stance: CombatStance): void {
    this.combatStance = stance;
    if (stance === 'defensivo') this.leashOrigin = { x: this.pos.x, z: this.pos.z };
  }

  private leashRadius(): number {
    return Math.max(this.stats.range, LEASH_MIN_RADIUS);
  }

  private withinLeash(x: number, z: number): boolean {
    const origin = this.leashOrigin;
    return !!origin && distance2D(origin.x, origin.z, x, z) <= this.leashRadius();
  }

  /** Walk back to the stance anchor when there is nothing left to defend. */
  private returnToLeash(): void {
    const origin = this.leashOrigin;
    if (!origin) return;
    if (distance2D(this.pos.x, this.pos.z, origin.x, origin.z) <= LEASH_RETURN_DIST) {
      this.path.length = 0;
      this.pathIdx = 0;
      return;
    }
    if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
      this.setPath(origin.x, origin.z);
      this.repathTimer = LEASH_REPATH;
    }
  }

  /** Nearest enemy inside the defensive leash and the unit's acquisition range. */
  private defensiveTarget(): Unit | null {
    const origin = this.leashOrigin ?? { x: this.pos.x, z: this.pos.z };
    const acquire = this.stats.range > 0 ? this.stats.range + 1 : this.stats.los + 1;
    const candidates = this.ctx?.enemiesNear?.(origin.x, origin.z, this.leashRadius(), this.owner) ?? [];
    return (
      candidates
        .filter((u) => distance2D(this.pos.x, this.pos.z, u.pos.x, u.pos.z) <= acquire)
        .sort(
          (a, b) =>
            distance2D(this.pos.x, this.pos.z, a.pos.x, a.pos.z) - distance2D(this.pos.x, this.pos.z, b.pos.x, b.pos.z),
        )[0] ?? null
    );
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
    // the model stays in the scene: `Game` plays a short topple effect and disposes it
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
    this.view.setFacing(this.yaw);
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
    if (this.combatStance === 'defensivo') {
      const enemy = this.defensiveTarget();
      if (!enemy) {
        this.returnToLeash();
        return;
      }
      if (this.attackCooldown <= 0) {
        this.issueOrder({ kind: OrderKind.ATTACK, entityId: enemy.id }, false);
        this.updateAttack(this.orderQueue[0], dt, time);
      }
      return;
    }
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
      this.stuckRetries = 0;
      this.lastStuckX = this.pos.x;
      this.lastStuckZ = this.pos.z;
    } else if (this.stuckTimer > 1.2 && this.path.length > 1 && this.orderQueue.length > 0) {
      const o = this.orderQueue[0];
      const target = o.target;
      this.stuckTimer = 0;
      // stop re-pathing forever: drop the order so the AI (or the player) can
      // reassign the worker, and clear the stale path so it is truly idle
      if (isEconomyOrder(o.kind) && ++this.stuckRetries >= STUCK_GIVEUP_RETRIES) {
        this.notifyBlocked('stuck');
        this.path.length = 0;
        this.pathIdx = 0;
        this.finishOrder();
      } else if (target) {
        this.setPath(target.x, target.z);
      } else if (o.entityId !== undefined) {
        this.setPathToEntity(o.entityId);
      }
    }

    const direct = this.directApproach;
    this.directApproach = false;

    if (direct) {
      // `directStep` already set the velocity/targetYaw; just animate the walk.
      this.walkCycle += dt * this.stats.speed;
      this.emitFootstep(dt);
    } else {
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
        this.emitFootstep(dt);
      } else {
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        this.walkCycle = lerp(this.walkCycle, 0, dt * 6);
      }
    }

    // separation
    this.applySeparation(dt);

    // separation must not make a unit faster than its own speed
    const cap = this.stats.speed * 1.25;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > cap) {
      const k = cap / speed;
      this.vel.x *= k;
      this.vel.z *= k;
    }

    // integrate without entering blocked terrain (slides along walls; escape allowed)
    this.integrateSafely(dt);

    // smooth rotation
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 10);
  }

  /** Walking dust (shared by path and direct-approach movement). */
  private emitFootstep(dt: number): void {
    this.footstepTimer -= dt;
    if (this.footstepTimer > 0) return;
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
    if (this.rig) {
      this.updateRig(dt);
      return;
    }
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
          const targetYaw = angleTo(this.pos.x, this.pos.z, target.pos.x, target.pos.z);
          aimYaw = angleDelta(facingRotation(this.yaw), facingRotation(targetYaw));
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

  /** Clip state from the unit's real order/movement; root motion never moves the unit. */
  private updateRig(dt: number): void {
    const rig = this.rig;
    if (!rig) return;
    const order = this.orderQueue[0]?.kind;
    const working = this.isWorking();
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const state = rigClipStateFor({
      moving: speed > 0.15,
      gathering: working && order === OrderKind.GATHER,
      building: working && order === OrderKind.BUILD,
      attacking: this.attackingTarget || (order === OrderKind.ATTACK && this.targetEntityId !== null),
      carrying: this.carryCount() > 0,
    });
    rig.play(state);
    rig.setPlaybackRate(
      state === 'walk' || state === 'walk_carry'
        ? clamp(speed / WALK_CLIP_REFERENCE_SPEED, WALK_CLIP_RATE_MIN, WALK_CLIP_RATE_MAX)
        : 1,
    );
    rig.update(dt);
    this.bobY = 0;
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
    // still no route: only head straight in over walkable ground, else wait and warn
    if (this.directStep(t.x, t.z)) return;
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
    if (this.combatStance === 'defensivo' && !this.withinLeash(target.pos.x, target.pos.z)) {
      const am = this.orderQueue[0];
      if (am?.kind === OrderKind.ATTACK_MOVE && am.target) {
        // an out-of-leash target must not cancel the attack-move march
        this.attackingTarget = false;
        this.targetEntityId = null;
        this.setPath(am.target.x, am.target.z);
      } else {
        this.finishOrder();
        this.returnToLeash();
      }
      return;
    }
    const tpos = target.pos;
    const dx = tpos.x - this.pos.x;
    const dz = tpos.z - this.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const building = this.ctx.buildings.get(target.id);
    const range =
      (this.stats.range > 0 ? this.stats.range : MELEE_ATTACK_RANGE) +
      target.radius +
      (building ? BUILDING_ATTACK_PAD : 0);

    if (dist > range * 1.15) {
      // chase (with a direct-approach fallback if there is no path)
      if (this.repathTimer <= 0 && !building) {
        this.setPath(tpos.x, tpos.z);
        this.repathTimer = 0.8;
      }
      if (this.pathIdx >= this.path.length) {
        // route exhausted but still out of range (a building's goal cell is not
        // walkable, so the path can stop a couple of cells short): head straight in
        // only over walkable ground, else hold and warn
        if (building && this.repathTimer <= 0) {
          // A building centre is blocked; do not let directStep press against
          // the wall forever. Retry a stand point outside the footprint.
          this.repathTimer = 0.8;
          const pts = this.buildingApproach(tpos.x, tpos.z, target.radius, range);
          if (pts.length > 0) {
            this.path = pts;
            this.pathIdx = 0;
            this.noRouteTimer = 0;
            if (pts.length > 1) this.advanceToNextWaypoint();
            return;
          }
        }
        if (this.directStep(tpos.x, tpos.z, range)) return;
        if (!building && !this.attackApproachTried) {
          this.attackApproachTried = true;
          const pts = this.ctx.findApproachPath(this.pos.x, this.pos.z, tpos.x, tpos.z, range);
          if (pts.length > 0) {
            this.path = pts;
            this.pathIdx = 0;
            this.repathTimer = 0.8;
            this.noRouteTimer = 0;
            if (pts.length > 1) this.advanceToNextWaypoint();
            return;
          }
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

  /** Path to a walkable point just outside a building footprint. */
  private buildingApproach(tx: number, tz: number, radius: number, stopRange: number): { x: number; z: number }[] {
    const stand = Math.max(radius + MELEE_ATTACK_RANGE, stopRange - 0.1);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const px = tx + Math.cos(angle) * stand;
      const pz = tz + Math.sin(angle) * stand;
      if (!this.ctx.isWalkable(px, pz)) continue;
      const pts = this.ctx.findPath(this.pos.x, this.pos.z, px, pz);
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        if (Math.hypot(last.x - px, last.z - pz) > 0.05) pts.push({ x: px, z: pz });
        return pts;
      }
      // Same-cell stand point: pathfind returns [] even though the unit only
      // needs to step a few tenths into attack range.
      if (Math.hypot(px - this.pos.x, pz - this.pos.z) > 0.1) return [{ x: px, z: pz }];
    }
    return [];
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
    const arc =
      pKind === 'howitzer_shell' || pKind === 'nuclear'
        ? 1
        : pKind === 'arrow'
          ? 0.25
          : pKind === 'sling_stone'
            ? 0.4
            : 0;
    const speed =
      pKind === 'bullet' ? 40 : pKind === 'tracer' ? 60 : pKind === 'arrow' ? 34 : pKind === 'sling_stone' ? 26 : 28;
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
      attackerKind: this.kind,
      bonusVs: this.stats.bonusVs,
    });
    // muzzle flash at the cannon mouth (weapon pivot + barrel length, rotated with the unit)
    const muzzle = new THREE.Vector3(0.28, 0.9, 0.62).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      facingRotation(this.yaw),
    );
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
      const current = this.orderQueue[0];
      this.deliverOrder();
      if (this.orderQueue[0] === current) {
        this.noDropsiteTimer += dt;
        if (this.noDropsiteTimer > NO_DROPSITE_GIVEUP) this.notifyBlocked('no-dropsite');
      } else {
        this.noDropsiteTimer = 0;
      }
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
    const harvestRange = node.farm ? (node.farm.radius ?? 1.5) + 1.4 : HARVEST_RANGE;

    if (dist > harvestRange) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(node.pos.x, node.pos.z);
        this.repathTimer = 0.9;
      }
      if (this.pathIdx >= this.path.length) {
        // no route: only close in over a validated direct segment
        if (this.directStep(node.pos.x, node.pos.z, harvestRange)) return;
        // Last resort for nodes whose blocked footprint pushed the A* endpoint
        // outside harvest range: path to a stand point inside range instead.
        if (!this.approachTried) {
          this.approachTried = true;
          const standRadius = node.farm ? Math.max(0.5, harvestRange - MOVE_STOP_DIST) : HARVEST_STAND_RANGE;
          const pts = this.ctx.findApproachPath(this.pos.x, this.pos.z, node.pos.x, node.pos.z, standRadius);
          if (pts.length > 0) {
            this.followApproachPath(pts);
            return;
          }
        }
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP_ECONOMY) {
          if (this.tryAlternativeGatherNode(order)) return;
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

  /**
   * A node whose free stand points are taken (or blocked by other props) should not
   * cost the whole gather order: switch to the nearest reachable node of the same
   * resource, as AoE does. Only runs after the route grace expires, so the extra
   * approach searches are rare.
   */
  private tryAlternativeGatherNode(order: Order): boolean {
    const current = this.ctx.resourceNodes.get(order.entityId!) as GatherNodeRef | undefined;
    if (!current) return false;
    const candidates: GatherNodeRef[] = [];
    for (const node of this.ctx.resourceNodes.values() as Iterable<GatherNodeRef>) {
      if (node.id === current.id || node.dead || node.depleted) continue;
      if (node.resource !== current.resource) continue;
      if (node.amount !== undefined && node.amount <= 0) continue;
      candidates.push(node);
    }
    const distTo = (node: GatherNodeRef): number => distance2D(this.pos.x, this.pos.z, node.pos.x, node.pos.z);
    candidates.sort((a, b) => distTo(a) - distTo(b));
    for (const node of candidates) {
      if (!this.ctx.reachableToNode(this.pos.x, this.pos.z, node.pos.x, node.pos.z, HARVEST_STAND_RANGE)) continue;
      if (distTo(node) <= HARVEST_RANGE) {
        order.entityId = node.id;
        this.path.length = 0;
        this.pathIdx = 0;
        this.approachTried = false;
        this.noRouteTimer = 0;
        return true;
      }
      const pts = this.ctx.findApproachPath(this.pos.x, this.pos.z, node.pos.x, node.pos.z, HARVEST_STAND_RANGE);
      if (pts.length === 0) continue;
      order.entityId = node.id;
      this.approachTried = false;
      this.followApproachPath(pts);
      return true;
    }
    return false;
  }

  private carryCount(): number {
    return this.gatherCarry.food + this.gatherCarry.wood + this.gatherCarry.silver + this.gatherCarry.stone;
  }

  /** Show/hide the load bundle and color it according to the resource. */
  private updateCarry(): void {
    const carrying = this.carryCount() > 0;
    const res = this.currentResource ?? this.dominantResource();
    this.rig?.setCarrying(carrying, CARRY_COLORS[res]);
    if (!this.carryPivot) return;
    this.carryPivot.visible = carrying;
    if (carrying && this.carryMat) this.carryMat.color.setHex(CARRY_COLORS[res]);
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
      this.noDropsiteTimer = 0;
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
    // approach radius scales with the building: a large dropsite (e.g. the center)
    // is reachable from further out, and the fixed 2.4 range used to force units
    // into its blocked footprint
    const deliverRange = (dropsite.radius ?? 1) + 1.4;
    if (dist > deliverRange) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(dropsite.pos.x, dropsite.pos.z);
        this.repathTimer = 0.8;
      }
      if (this.pathIdx >= this.path.length) {
        if (this.directStep(dropsite.pos.x, dropsite.pos.z, deliverRange)) return;
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP) this.notifyNoRoute();
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
    if (dist > bld.radius + BUILD_REACH_PAD) {
      if (this.pathIdx >= this.path.length && this.repathTimer <= 0) {
        this.setPath(bld.pos.x, bld.pos.z);
        this.repathTimer = 0.7;
      }
      if (this.pathIdx >= this.path.length) {
        if (this.directStep(bld.pos.x, bld.pos.z, bld.radius + BUILD_REACH_PAD)) return;
        if (!this.buildApproachTried) {
          this.buildApproachTried = true;
          const pts = this.buildingApproach(bld.pos.x, bld.pos.z, bld.radius, bld.radius + BUILD_REACH_PAD);
          if (pts.length > 0) {
            this.path = pts;
            this.pathIdx = 0;
            this.repathTimer = 0.7;
            this.noRouteTimer = 0;
            if (pts.length > 1) this.advanceToNextWaypoint();
            return;
          }
        }
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP) this.notifyNoRoute();
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
      if (this.pathIdx >= this.path.length) {
        if (this.directStep(bld.pos.x, bld.pos.z, bld.radius + 0.4)) return;
        this.vel.multiplyScalar(Math.pow(0.02, dt));
        this.noRouteTimer += dt;
        if (this.noRouteTimer > NO_ROUTE_GIVEUP) this.notifyNoRoute();
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
      leashOrigin: this.leashOrigin ? { ...this.leashOrigin } : null,
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
    this.leashOrigin = s.leashOrigin
      ? { ...s.leashOrigin }
      : this.combatStance === 'defensivo'
        ? { x: s.pos.x, z: s.pos.z }
        : null;
    this.buildEfficiency = s.buildEfficiency;
    this.gatherMultiplier = s.gatherMultiplier;
    this.attackMultiplier = s.attackMultiplier;
    this.armorMultiplier = s.armorMultiplier;
    if (s.tag) this.tag = s.tag;
    this.view.setPosition(this.pos.x, this.pos.y, this.pos.z);
    this.view.setFacing(this.yaw);
    this.view.group.visible = this.garrisonedIn === null;
    this.view.updateHealth(this.hp / this.maxHp);
  }

  removeFromScene(): void {
    if (this.view.group.parent) this.view.group.parent.remove(this.view.group);
    this.view.dispose();
    if (this.rig) {
      this.rig.dispose();
      this.rig = null;
    } else {
      disposeModel(this.view.group);
    }
  }
}
