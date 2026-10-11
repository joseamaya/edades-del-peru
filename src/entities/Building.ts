import * as THREE from 'three';
import { Era, BuildingKind, UnitKind, Team, OrderTarget } from '../core/types';
import { getBuildingStats, getBuildingModel, BuildingStats, BUILDING_DEFS } from '../model/defs/buildings';
import { UNIT_ARCHETYPES } from '../model/defs/units';
import { buildModel, BuildContext, disposeModel } from '../model/ProceduralModel';
import { EntityView } from './EntityView';
import { allocId } from './EntityView';
import { getUnitStats } from '../model/defs/units';
import { getTech } from '../model/defs/techs';
import { clamp } from '../util/math';

export class Building {
  id = allocId();
  owner: number;
  kind: BuildingKind;
  era: Era;
  stats: BuildingStats;
  pos = new THREE.Vector3();
  yaw = 0;
  view: EntityView;
  hp: number;
  maxHp: number;
  dead = false;
  selected = false;
  radius: number;

  constructionProgress = 0;
  constructionComplete = false;
  productionQueue: { unit: UnitKind; progress: number }[] = [];
  researchQueue: { tech: string; progress: number; playerId: number }[] = [];
  garrisonedIds: number[] = [];
  rallyPoint: OrderTarget = { x: 0, z: 0 };
  hasRallyPoint = false;
  attackCooldown = 0;
  buildingComplete = false;
  isDropsite = false;
  dropTypes: Array<'food' | 'wood' | 'silver' | 'stone'> = [];
  providesPop = 0;
  isWonder = false;
  wonderTimer = -1;
  trainMultiplier = 1;
  foodAmount = 0;
  isFarm = false;
  /** Mission tag (for objectives/triggers). */
  tag?: string;
  private smokeTimer = Math.random() * 1.5;
  private damageSmokeTimer = 0;
  /** Materials that were opaque, to restore them when construction finishes. */
  private constructionMats: THREE.MeshStandardMaterial[] | null = null;

  ctx: any;
  garrisons = 0;
  constructor(kind: BuildingKind, owner: number, era: Era, ctx: BuildContext) {
    this.kind = kind;
    this.owner = owner;
    this.era = era;
    this.stats = getBuildingStats(kind, era);
    this.radius = this.stats.size;
    this.isDropsite = this.stats.isDropsite;
    this.providesPop = this.stats.providesPop;
    this.isWonder = kind === BuildingKind.WONDER;
    this.dropTypes = BUILDING_DEFS[kind].dropTypes ?? [];
    this.garrisons = this.stats.garrisons ?? 0;
    if (kind === BuildingKind.FARM) {
      this.isFarm = true;
      this.foodAmount = 500 + this.era * 200;
    }
    const model = buildModel(getBuildingModel(kind, era), ctx);
    this.view = new EntityView(model, this.radius * 0.9);
    this.hp = this.maxHp = this.stats.hp;
  }

  get team(): Team {
    return this.ctx?.players?.find((p: any) => p.id === this.owner)?.team ?? 0;
  }

  setContext(ctx: any): void {
    this.ctx = ctx;
  }

  attach(scene: THREE.Scene): void {
    this.view.attachTo(scene);
    this.view.setPosition(this.pos.x, this.pos.y, this.pos.z);
  }

  beginConstruction(): void {
    this.constructionProgress = 0;
    this.constructionComplete = false;
    this.view.group.visible = true;
    // semi-transparent construction
    this.setConstructionOpacity(0.45);
  }

  setConstructionOpacity(opacity: number): void {
    // restore to opaque: return exactly the original state
    if (opacity >= 1) {
      if (this.constructionMats) {
        for (const mat of this.constructionMats) {
          mat.transparent = false;
          mat.opacity = 1;
          mat.needsUpdate = true;
        }
        this.constructionMats = null;
      }
      return;
    }
    // fade only the materials that were opaque (not windows/glass/glow)
    if (!this.constructionMats) this.constructionMats = [];
    this.view.group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const raw of mats) {
        const mat = raw as THREE.MeshStandardMaterial;
        if (!mat || mat.transparent !== false) continue;
        if (this.constructionMats!.includes(mat)) continue;
        this.constructionMats!.push(mat);
        mat.transparent = true;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }

  /** Construction progress by workers. */
  addBuildProgress(amount: number): void {
    if (this.constructionComplete) return;
    this.constructionProgress += amount;
    if (this.constructionProgress >= this.stats.buildTime) {
      this.constructionComplete = true;
      this.setConstructionOpacity(1);
      if (this.owner === 0) {
        this.ctx?.event('alert', { icon: '✅', text: 'Edificio terminado', x: this.pos.x, z: this.pos.z });
      }
    }
  }

  get buildRatio(): number {
    return clamp(this.constructionProgress / this.stats.buildTime, 0, 1);
  }

  takeDamage(dmg: number): void {
    if (this.dead) return;
    this.hp -= dmg;
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.ctx?.particles) {
      this.ctx.particles.emit({
        x: this.pos.x, y: this.pos.y + 2, z: this.pos.z,
        count: 30, color: 0xaa8866, kind: 'explosion', speed: 4, life: 1.5, size: 3,
      });
      this.ctx.particles.emit({
        x: this.pos.x, y: this.pos.y + 2, z: this.pos.z,
        count: 24, color: 0x555555, kind: 'smoke', speed: 1.5, life: 2.5, size: 4,
      });
    }
    if (this.ctx?.event) this.ctx.event('building:died', { id: this.id, owner: this.owner, kind: this.kind });
    if (this.view.group.parent) this.view.group.parent.remove(this.view.group);
  }

  /** Train a unit (queues it). */
  queueUnit(unit: UnitKind): boolean {
    if (!this.constructionComplete) return false;
    const def = BUILDING_DEFS[this.kind];
    if (def.trainable && !def.trainable.includes(unit)) return false;
    const arch = UNIT_ARCHETYPES[unit];
    if (arch.requiresTech) {
      const player = this.ctx?.players?.find((p: any) => p.id === this.owner);
      if (player) {
        for (const t of arch.requiresTech) {
          if (!player.techs.has(t)) return false;
        }
      }
    }
    const stats = getUnitStats(unit, this.era);
    const player = this.ctx?.players?.find((p: any) => p.id === this.owner);
    if (player && player.populationUsed + stats.population > player.populationCap) return false;
    this.productionQueue.push({ unit, progress: 0 });
    return true;
  }

  /** Start researching a technology. */
  queueTech(techId: string): boolean {
    if (!this.constructionComplete) return false;
    const tech = getTech(techId);
    if (!tech) return false;
    if (tech.building !== this.kind) return false;
    this.researchQueue.push({ tech: techId, progress: 0, playerId: this.owner });
    return true;
  }

  garrisonUnit(unitId: number, owner: number): void {
    if (this.garrisonedIds.length >= (this.stats.garrisons || 0)) return;
    if (owner !== this.owner) return;
    this.garrisonedIds.push(unitId);
  }

  ungarrisonAll(): number[] {
    const out = this.garrisonedIds;
    this.garrisonedIds = [];
    return out;
  }

  update(dt: number, time: number): void {
    if (this.dead) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // ambient smoke from factories/smelters/refineries (map life)
    if (this.constructionComplete && (this.kind === BuildingKind.FACTORY || this.kind === BuildingKind.SMELTER || this.kind === BuildingKind.REFINERY || this.kind === BuildingKind.CENTER)) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.35 + Math.random() * 0.3;
        this.ctx?.particles?.emit?.({
          x: this.pos.x + (Math.random() - 0.5) * this.radius * 0.4,
          y: this.pos.y + this.radius * 0.9,
          z: this.pos.z + (Math.random() - 0.5) * this.radius * 0.4,
          count: 1,
          color: 0x9a9a92,
          kind: 'smoke',
          speed: 0.6,
          life: 2.2,
          size: 1.6,
          grow: 0.8,
        });
      }
    }

    // black smoke when the building is damaged (denser at lower health)
    if (this.constructionComplete) {
      const dmgRatio = 1 - this.hp / this.maxHp;
      if (dmgRatio > 0.4) {
        this.damageSmokeTimer -= dt;
        if (this.damageSmokeTimer <= 0) {
          this.damageSmokeTimer = 0.5 - dmgRatio * 0.35;
          for (let i = 0; i < Math.floor(dmgRatio * 3); i++) {
            this.ctx?.particles?.emit?.({
              x: this.pos.x + (Math.random() - 0.5) * this.radius,
              y: this.pos.y + this.radius * 0.7 + Math.random() * this.radius * 0.8,
              z: this.pos.z + (Math.random() - 0.5) * this.radius,
              count: 1,
              color: dmgRatio > 0.7 ? 0x2a2a2a : 0x4a4a4a,
              kind: 'smoke',
              speed: 1.1,
              life: 1.8,
              size: 1.4,
              grow: 1.2,
            });
          }
        }
      }
    }

    // production (with the player's training multiplier)
    const p = this.ctx?.players?.find((x: any) => x.id === this.owner);
    const trainMult = 1 - (p?.bonus?.training ?? 0);
    for (let i = this.productionQueue.length - 1; i >= 0; i--) {
      const item = this.productionQueue[i];
      const stats = getUnitStats(item.unit, this.era);
      item.progress += dt / stats.trainTime * this.trainMultiplier * trainMult;
      if (item.progress >= 1) {
        if (this.ctx?.unitSpawn) {
          const ok = this.ctx.unitSpawn(this.id, item.unit, this.rallyPoint, this.hasRallyPoint);
          if (ok) {
            this.productionQueue.splice(i, 1);
          } else {
            // population full: pause the queue (AoE2 style)
            item.progress = 1;
          }
        }
      }
    }

    // research
    for (let i = this.researchQueue.length - 1; i >= 0; i--) {
      const item = this.researchQueue[i];
      const tech = getTech(item.tech);
      if (!tech) {
        this.researchQueue.splice(i, 1);
        continue;
      }
      item.progress += dt / tech.time;
      if (item.progress >= 1) {
        this.researchQueue.splice(i, 1);
        if (this.ctx?.techComplete) this.ctx.techComplete(item.playerId, item.tech);
      }
    }

    // defensive attack (fortresses)
    if (this.stats.attack && this.constructionComplete) {
      this.autoDefend(time);
    }

    // wonder clock
    if (this.isWonder && this.constructionComplete) {
      this.wonderTimer += dt;
      this.ctx?.event('wonder:time', { owner: this.owner, time: this.wonderTimer });
    }

    this.view.updateHealth(this.hp / this.maxHp);
    this.view.animatePulse(time);
  }

  private autoDefend(time: number): void {
    if (!this.stats.attack) return;
    const range = this.stats.attack.range;
    const enemies = this.ctx?.enemiesNear(this.pos.x, this.pos.z, range + 4, this.owner) ?? [];
    if (enemies.length === 0) return;
    if (this.attackCooldown > 0) return;
    const target = enemies[0];
    this.attackCooldown = this.stats.attack.attackSpeed;
    const from = new THREE.Vector3(this.pos.x, this.pos.y + 3, this.pos.z);
    const to = new THREE.Vector3(target.pos.x, target.pos.y + 0.5, target.pos.z);
    this.ctx?.spawnProjectile?.({ from, target: to, speed: 40, damage: this.stats.attack.attack, kind: 'bullet', owner: this.owner, targetId: target.id });
    this.ctx?.particles?.emit?.({ x: this.pos.x, y: this.pos.y + 3, z: this.pos.z, count: 4, color: 0xffcc66, kind: 'explosion', speed: 1, life: 0.15, size: 1.2 });
    void time;
  }

  /** When advancing era, the building is modernized. */
  modernize(era: Era, ctx: BuildContext): void {
    if (era === this.era) return;
    this.era = era;
    const old = this.view.group;
    const newModel = buildModel(getBuildingModel(this.kind, era), ctx);
    newModel.position.copy(old.position);
    newModel.rotation.copy(old.rotation);
    if (old.parent) {
      old.parent.add(newModel);
      old.parent.remove(old);
    }
    this.view.dispose();
    disposeModel(old);
    this.view = new EntityView(newModel, this.radius * 0.9);
    if (!this.constructionComplete) this.setConstructionOpacity(0.45);
  }

  removeFromScene(): void {
    if (this.view.group.parent) this.view.group.parent.remove(this.view.group);
    this.view.dispose();
    disposeModel(this.view.group);
  }
}
