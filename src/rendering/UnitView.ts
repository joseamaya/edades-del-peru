import * as THREE from 'three';
import { EntityView } from '../entities/EntityView';
import { acquireRig } from './ModelAssets';
import type { RigInstance } from './RigInstance';
import { buildModel, disposeModel, type BuildContext } from '../model/ProceduralModel';
import { getUnitModel } from '../model/defs/units';
import {
  unitModelAsset,
  rigClipStateFor,
  WALK_CLIP_REFERENCE_SPEED,
  WALK_CLIP_RATE_MIN,
  WALK_CLIP_RATE_MAX,
} from '../model/defs/modelAssets';
import type { Unit } from '../entities/Unit';
import { FishingNetFx } from './FishingNetFx';
import { clamp } from '../util/math';
import type { Resources } from '../core/types';

const CARRY_COLORS: Record<keyof Resources, number> = {
  food: 0xc8a04a,
  wood: 0x8a6a3a,
  silver: 0x9aa2aa,
  stone: 0x4ac6d8,
};

/** Presentation for one simulated unit: model/rig, pivots, carry bundle and bob. */
export class UnitView {
  readonly view: EntityView;
  rig: RigInstance | null = null;
  private gunPivot: THREE.Group | null = null;
  private turretPivot: THREE.Group | null = null;
  private legL: THREE.Group | null = null;
  private legR: THREE.Group | null = null;
  private armL: THREE.Group | null = null;
  private armR: THREE.Group | null = null;
  private headPivot: THREE.Group | null = null;
  private carryPivot: THREE.Group | null = null;
  private carryMat: THREE.MeshStandardMaterial | null = null;
  private gunBaseZ = 0;
  private workAnim = 0;
  private bobY = 0;
  private scene: THREE.Scene | null = null;
  private net: FishingNetFx | null = null;

  constructor(
    private readonly unit: Unit,
    ctx: BuildContext,
  ) {
    const choice = unitModelAsset(unit.kind, unit.era, ctx.civ.id, unit.id);
    this.rig = choice ? acquireRig(choice.asset, choice.variant) : null;
    const model = this.rig
      ? this.rig.root
      : buildModel({ ...getUnitModel(unit.kind, unit.era), gender: unit.gender }, ctx);
    this.view = new EntityView(model, unit.radius, unit, this.rig ? 'radius' : 'model');
    if (!this.rig) this.findPivots(model);
  }

  attach(scene: THREE.Scene): void {
    this.scene = scene;
    this.view.attachTo(scene);
    this.view.setPosition(this.unit.pos.x, this.unit.pos.y, this.unit.pos.z);
  }

  private findPivots(model: THREE.Group): void {
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

  sync(dt: number, time: number): void {
    const u = this.unit;
    this.animate(dt, time);
    this.carry();
    this.view.setPosition(u.pos.x, u.pos.y, u.pos.z);
    this.view.setFacing(u.yaw);
    this.view.group.position.y += this.bobY;
    this.view.updateHealth(u.hp / u.maxHp);
  }

  private animate(dt: number, time: number): void {
    const u = this.unit;
    if (this.rig) {
      const order = u.orderQueue[0]?.kind;
      const working = u.isWorkingNow();
      const speed = Math.hypot(u.vel.x, u.vel.z);
      const state = rigClipStateFor({
        moving: speed > 0.15,
        gathering: working && order === 'gather',
        building: working && order === 'build',
        attacking: u.isAttackingTarget() || (order === 'attack' && u.targetEntityId !== null),
        carrying: u.carryCountNow() > 0,
      });
      this.rig.play(state);
      this.animateFishing(state === 'gather', time);
      this.rig.setPlaybackRate(
        state === 'walk' || state === 'walk_carry'
          ? clamp(speed / WALK_CLIP_REFERENCE_SPEED, WALK_CLIP_RATE_MIN, WALK_CLIP_RATE_MAX)
          : 1,
      );
      this.rig.update(dt);
      this.bobY = 0;
      return;
    }
    const walk = u.walkCycle;
    if (this.gunPivot) {
      const recoil = u.attackCooldown > u.stats.attackSpeed - 0.12 ? -0.15 : 0;
      this.gunPivot.position.z = this.gunBaseZ + recoil;
    }
    if (this.turretPivot) {
      let aimYaw = Math.sin(time * 0.6) * 0.05;
      if (u.targetEntityId !== null) {
        const target = u.ctx?.entitiesById?.get(u.targetEntityId) ?? u.ctx?.buildings?.get(u.targetEntityId);
        if (target) aimYaw = u.aimYawAt(target.pos.x, target.pos.z);
      }
      this.turretPivot.rotation.y = aimYaw;
    }
    this.bobY = 0;
    if (walk > 0.01) {
      const phase = walk * 3.2;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      if (this.legL) this.legL.rotation.x = s * 0.55;
      if (this.legR) this.legR.rotation.x = -s * 0.55;
      if (this.armL) this.armL.rotation.x = -s * 0.42;
      if (this.armR) this.armR.rotation.x = s * 0.42;
      if (this.headPivot) this.headPivot.rotation.x = c * 0.05;
      this.bobY = Math.abs(s) * 0.045;
    } else if (u.isWorkingNow()) {
      this.workAnim += dt;
      const chop = Math.abs(Math.sin(this.workAnim * 5.5));
      if (this.legL) this.legL.rotation.x = 0.12;
      if (this.legR) this.legR.rotation.x = -0.12;
      if (this.armR) this.armR.rotation.x = -0.15 - chop * 0.85;
      if (this.armL) this.armL.rotation.x = -0.25 - chop * 0.15;
      if (this.headPivot) this.headPivot.rotation.x = 0.14 + chop * 0.08;
      this.bobY = -chop * 0.02;
    } else {
      this.workAnim = this.workAnim + (0 - this.workAnim) * Math.min(1, dt * 8);
      const idle = Math.sin(time * 1.6 + ((u.id * 1.61803398875) % 10));
      if (this.legL) this.legL.rotation.x = idle * 0.03;
      if (this.legR) this.legR.rotation.x = -idle * 0.03;
      if (this.armL) this.armL.rotation.x = idle * 0.02;
      if (this.armR) this.armR.rotation.x = idle * 0.02;
      if (this.headPivot) this.headPivot.rotation.x = idle * 0.02;
      this.bobY = idle * 0.014;
    }
    if (this.armR) {
      if (u.targetEntityId !== null && walk <= 0.01 && u.orderQueue[0]?.kind === 'attack') {
        const recoil = u.attackCooldown > u.stats.attackSpeed - 0.12 ? -0.25 : 0;
        this.armR.rotation.x = -1.05 + recoil;
      } else if (this.gunPivot && walk <= 0.01 && u.orderQueue[0]?.kind === 'attack') {
        this.armR.rotation.x = -0.9;
      }
    }
  }

  /** A fisher casts a cotton net over the fishing ground and drags it back (presentation only). */
  private animateFishing(gathering: boolean, time: number): void {
    const u = this.unit;
    const ground = gathering && u.lastGather?.kind === 'fishing' ? u.lastGather : null;
    this.rig?.setGatherKind(ground ? 'fishing' : (u.lastGather?.kind ?? null));
    if (!ground || !this.scene) {
      this.net?.hide();
      return;
    }
    this.net ??= new FishingNetFx(this.scene);
    this.rig?.setNetInHand(this.net.update(time, u.id, u.pos, ground));
  }

  private carry(): void {
    const u = this.unit;
    const carrying = u.carryCountNow() > 0;
    const res = u.carriedResource();
    this.rig?.setCarrying(carrying, CARRY_COLORS[res]);
    if (!this.carryPivot) return;
    this.carryPivot.visible = carrying;
    if (carrying && this.carryMat) this.carryMat.color.setHex(CARRY_COLORS[res]);
  }

  dispose(): void {
    this.net?.dispose();
    this.net = null;
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
