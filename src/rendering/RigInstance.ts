import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { RIG_CLIP_STATES, type RigClipState } from '../model/defs/modelAssets';
import type { LoadedModelAsset } from './ModelAssets';

/**
 * One animated instance of a shared rigged asset. The clone owns its skeleton
 * and mixer; geometry, materials, textures and clips stay shared with the
 * asset cache, so `dispose()` must never dispose them.
 */
export class RigInstance {
  readonly root = new THREE.Group();
  private readonly asset: LoadedModelAsset;
  private readonly model: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<RigClipState, THREE.AnimationAction>();
  private current: RigClipState | null = null;
  private disposed = false;

  constructor(asset: LoadedModelAsset) {
    this.asset = asset;
    asset.refs++;

    this.model = cloneSkeleton(asset.scene);
    this.model.scale.setScalar(asset.definition.scale);
    this.model.rotation.y += asset.definition.yawOffset;
    this.root.name = `rig:${asset.id}`;
    this.root.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const state of RIG_CLIP_STATES) {
      const name = asset.definition.clips[state];
      const clip = name ? asset.clipNames.get(name) : undefined;
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (state === 'death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(state, action);
    }

    this.play('idle', 0);
    this.mixer.update(0);
  }

  get currentState(): RigClipState | null {
    return this.current;
  }

  get time(): number {
    return this.mixer.time;
  }

  /** Crossfade to a gameplay state; missing states fall back to `idle`. */
  play(state: RigClipState, fade = 0.2): void {
    if (this.disposed) return;
    const actual = this.actions.has(state) ? state : 'idle';
    const next = this.actions.get(actual);
    if (!next || this.current === actual) return;

    const previous = this.current ? this.actions.get(this.current) : undefined;
    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    if (fade > 0) {
      next.fadeIn(fade).play();
      previous?.fadeOut(fade);
    } else {
      previous?.stop();
      next.play();
    }
    this.current = actual;
  }

  update(dt: number): void {
    if (this.disposed) return;
    this.mixer.update(dt);
  }

  /** Release the instance's skeleton/mixer; shared resources stay cached. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.actions.clear();
    this.root.removeFromParent();
    this.root.clear();
    this.asset.refs = Math.max(0, this.asset.refs - 1);
  }
}
