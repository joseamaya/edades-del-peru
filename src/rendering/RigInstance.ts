import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { RIG_CLIP_STATES, RIG_VARIANT_CLIPS, type RigClipState, type RigVariant } from '../model/defs/modelAssets';
import type { LoadedModelAsset } from './ModelAssets';
import { applyRigVariant, type RigVariantHandle } from './rigVariants';

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
  private variant: RigVariantHandle | null = null;
  private disposed = false;

  constructor(asset: LoadedModelAsset, variant?: RigVariant) {
    this.asset = asset;
    asset.refs++;

    this.model = cloneSkeleton(asset.scene);
    this.model.scale.setScalar(asset.definition.scale);
    this.model.rotation.y += asset.definition.yawOffset;
    // Normalise the bind-pose feet to y=0 when the asset is terrain-bound; a
    // small clearance keeps walk clips from dipping below the ground.
    if (asset.definition.ground) {
      this.model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(this.model);
      if (Number.isFinite(bounds.min.y)) this.model.position.y -= bounds.min.y;
      this.model.position.y += asset.definition.groundClearance ?? 0;
    }
    this.root.name = `rig:${asset.id}`;
    this.root.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const state of RIG_CLIP_STATES) {
      const override = variant ? RIG_VARIANT_CLIPS[variant]?.[state] : undefined;
      const name = override === null ? undefined : (override ?? asset.definition.clips[state]);
      const clip = name ? asset.clipNames.get(name) : undefined;
      if (!clip) continue;
      this.actions.set(state, this.mixer.clipAction(clip));
    }

    this.play('idle', 0);
    this.mixer.update(0);
    if (variant) {
      this.model.updateMatrixWorld(true);
      this.variant = applyRigVariant(this, variant);
    }
  }

  get currentState(): RigClipState | null {
    return this.current;
  }

  /** Clip actually playing, useful for tests and diagnostics. */
  get currentClipName(): string | null {
    return this.current ? (this.actions.get(this.current)?.getClip().name ?? null) : null;
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
    this.variant?.setTask?.(actual);
  }

  /** Adjust the current clip's playback rate (walk speed matching). */
  setPlaybackRate(rate: number): void {
    if (this.disposed || !this.current) return;
    const action = this.actions.get(this.current);
    if (action) action.setEffectiveTimeScale(Math.max(0.1, rate));
  }

  /** Show/hide variant attachments (carried resources) without touching gameplay. */
  setCarrying(carrying: boolean, color?: number): void {
    this.variant?.setCarrying?.(carrying, color);
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
    this.variant?.dispose();
    this.variant = null;
    this.root.removeFromParent();
    this.root.clear();
    this.asset.release();
  }
}
