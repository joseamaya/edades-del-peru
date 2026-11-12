import * as THREE from 'three';
import { acquireRig, loadModelAsset } from './ModelAssets';
import type { RigInstance } from './RigInstance';
import { CARAL_WORKER_ASSET_ID, type RigVariant } from '../model/defs/modelAssets';
import type { CaralMayorPhase } from '../model/defs/caralPhases';

/** Workers on the Caral construction site in each phase (the camp is gone once the city is in use). */
export function crewCountForPhase(phase: CaralMayorPhase): number {
  if (phase === 'foundation' || phase === 'fill') return 6;
  if (phase === 'finished') return 3;
  return 0;
}

/** Metres per second; a walking carrier, not a marching unit. */
const CARRY_SPEED = 1.05;
const VISIBLE_DISTANCE = 90;
const MAX_DT = 0.1;

interface Actor {
  rig: RigInstance;
  mode: 'carry' | 'work';
  /** 0..1 along the route for carriers. */
  progress: number;
  dir: 1 | -1;
  /** Seconds left at a route end before turning back. */
  dwell: number;
  station: { x: number; z: number; yaw: number };
}

/**
 * Presentation-only construction crew: carriers shuttle shicra bags from the camp heap to the Mayor's
 * west retaining wall and two workers kneel/build at the heap and the wall. They are rigs in the scene,
 * not `Unit`s: they never enter `game.units`, the pathfinder or the selection surface, and they do not
 * climb (no ramp or scaffold is attested, so the figures stay at ground level).
 */
export class SiteCrew {
  readonly group = new THREE.Group();
  private actors: Actor[] = [];
  private phase: CaralMayorPhase = 'foundation';
  private loaded = false;
  private disposed = false;
  private readonly center = new THREE.Vector2();
  private readonly length: number;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly route: readonly { x: number; z: number }[],
    private readonly stations: readonly { x: number; z: number; yaw: number }[],
  ) {
    this.group.name = 'site-crew';
    this.scene.add(this.group);
    this.center.set((route[0]!.x + route[route.length - 1]!.x) / 2, (route[0]!.z + route[route.length - 1]!.z) / 2);
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += Math.hypot(route[i]!.x - route[i - 1]!.x, route[i]!.z - route[i - 1]!.z);
    }
    this.length = Math.max(0.01, total);
  }

  get count(): number {
    return this.actors.length;
  }

  get currentPhase(): CaralMayorPhase {
    return this.phase;
  }

  /** Load the worker rig once; the camp stays empty if the asset is unavailable. */
  async load(): Promise<boolean> {
    const asset = await loadModelAsset(CARAL_WORKER_ASSET_ID);
    if (!asset || this.disposed) return false;
    this.loaded = true;
    this.syncActors();
    return this.actors.length > 0 || crewCountForPhase(this.phase) === 0;
  }

  setPhase(phase: CaralMayorPhase): void {
    this.phase = phase;
    if (this.loaded) this.syncActors();
  }

  update(dt: number, focus?: { x: number; z: number }): void {
    if (this.disposed || !this.loaded) return;
    const far = focus ? Math.hypot(this.center.x - focus.x, this.center.y - focus.z) > VISIBLE_DISTANCE : false;
    this.group.visible = this.phase !== 'in_use' && this.phase !== 'sealed' && !far && this.actors.length > 0;
    if (!this.group.visible) return;
    const step = Math.min(Math.max(0, dt), MAX_DT);
    for (const actor of this.actors) {
      actor.rig.update(step);
      if (actor.mode === 'work') continue;
      if (actor.dwell > 0) {
        actor.dwell -= step;
        if (actor.dwell <= 0) {
          actor.dir = actor.dir === 1 ? -1 : 1;
          actor.rig.play('walk_carry');
        }
        continue;
      }
      actor.progress += ((CARRY_SPEED * step) / this.length) * actor.dir;
      if (actor.progress >= 1) {
        actor.progress = 1;
        actor.dwell = 1.6;
        actor.rig.play('build');
      } else if (actor.progress <= 0) {
        actor.progress = 0;
        actor.dwell = 1.2;
        actor.rig.play('build');
      }
      this.placeCarrier(actor);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loaded = false;
    this.group.visible = false;
    for (const actor of this.actors) actor.rig.dispose();
    this.actors = [];
    this.group.removeFromParent();
  }

  /**
   * Rebuild the crew when the phase changes. A phase transition is rare (foundation -> fill -> finished
   * -> in_use), and rebuilding keeps the carriers/workers split correct when the camp shrinks and grows
   * again after a save.
   */
  private syncActors(): void {
    if (this.disposed) return;
    const target = crewCountForPhase(this.phase);
    if (this.actors.length === target) {
      if (!target) this.group.visible = false;
      return;
    }
    for (const actor of this.actors) actor.rig.dispose();
    this.actors = [];
    if (!target) {
      this.group.visible = false;
      return;
    }
    // Four carriers and two kneeling workers at the full camp; two carriers and one worker when reduced.
    const workers = target >= 6 ? 2 : target >= 3 ? 1 : 0;
    const carriers = target - workers;
    for (let index = 0; index < target; index++) {
      const variant: RigVariant = index % 2 === 0 ? 'caral_worker_m' : 'caral_worker_f';
      const rig = acquireRig(CARAL_WORKER_ASSET_ID, variant);
      if (!rig) break;
      this.group.add(rig.root);
      const mode: Actor['mode'] = index < carriers ? 'carry' : 'work';
      const station = this.stations[(index - carriers) % this.stations.length] ?? {
        x: this.route[0]!.x,
        z: this.route[0]!.z,
        yaw: 0,
      };
      const actor: Actor = {
        rig,
        mode,
        progress: mode === 'carry' ? (index % Math.max(1, carriers)) / Math.max(1, carriers) : 0,
        dir: index % 2 === 0 ? 1 : -1,
        dwell: 0,
        station,
      };
      this.actors.push(actor);
      rig.setCarrying(mode === 'carry');
      if (mode === 'carry') {
        rig.play('walk_carry');
        this.placeCarrier(actor);
      } else {
        rig.play('build');
        rig.root.position.set(station.x, this.heightAt(station.x, station.z), station.z);
        rig.root.rotation.y = station.yaw;
      }
    }
    if (!this.actors.length) this.group.visible = false;
  }

  private placeCarrier(actor: Actor): void {
    const x = this.route[0]!.x + (this.route[1]!.x - this.route[0]!.x) * actor.progress;
    const z = this.route[0]!.z + (this.route[1]!.z - this.route[0]!.z) * actor.progress;
    const yaw = Math.atan2(this.route[1]!.x - this.route[0]!.x, this.route[1]!.z - this.route[0]!.z);
    actor.rig.root.position.set(x, this.heightAt(x, z), z);
    actor.rig.root.rotation.y = actor.dir === 1 ? yaw : yaw + Math.PI;
  }
}
