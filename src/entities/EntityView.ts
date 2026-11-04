import * as THREE from 'three';
export { allocId, reserveIds } from '../sim/ids';
import { EntityRef } from '../core/types';
import { facingRotation } from '../util/math';
import type { Unit } from './Unit';
import type { Building } from './Building';
import { damageStageFor, type DamageStage } from '../model/defs/damage';

/** How far above a unit's model the health bar floats. */
const HEALTH_BAR_LIFT = 1.2;
const _tmpQuat = new THREE.Quaternion();

/** Shared visual view: model + selection ring + health bar. */
export class EntityView {
  group: THREE.Group;
  private ring: THREE.Mesh | null = null;
  private healthBar: THREE.Group | null = null;
  private hpBg: THREE.Mesh;
  private hpFill: THREE.Mesh;
  private losRing: THREE.Mesh | null = null;
  private blobShadow: THREE.Mesh | null = null;
  private damageStage: DamageStage = 0;
  private rubble: THREE.Group | null = null;
  private readonly originalColors = new Map<THREE.Material, THREE.Color>();
  readonly radius: number;
  /** Invisible box standing in for the whole model in raycasts (one test per entity). */
  readonly pickProxy: THREE.Mesh;
  private static readonly pickMaterial = new THREE.MeshBasicMaterial();

  constructor(model: THREE.Group, radius: number, owner: Unit | Building, pickBounds: 'model' | 'radius' = 'model') {
    this.group = model;
    this.radius = radius;
    this.hpBg = new THREE.Mesh();
    this.hpFill = new THREE.Mesh();
    this.pickProxy = this.buildPickProxy(model, radius, pickBounds);
    this.pickProxy.userData.owner = owner;
    this.group.add(this.pickProxy);
    this.pickProxy.updateWorldMatrix(true, false);
    this.addBlobShadow(radius);
  }

  private buildPickProxy(model: THREE.Group, radius: number, pickBounds: 'model' | 'radius'): THREE.Mesh {
    model.updateWorldMatrix(true, true);
    const box = pickBounds === 'model' ? new THREE.Box3().setFromObject(model) : new THREE.Box3();
    const size = new THREE.Vector3(radius * 2, radius * 2.4, radius * 2);
    const center = new THREE.Vector3(0, radius * 1.2, 0);
    if (!box.isEmpty()) {
      // the bounds are world-space; bring them into the model's frame so the child proxy is not offset twice
      box.applyMatrix4(new THREE.Matrix4().copy(model.matrixWorld).invert());
      box.getSize(size);
      box.getCenter(center);
    }
    const geometry = new THREE.BoxGeometry(Math.max(size.x, 0.2), Math.max(size.y, 0.2), Math.max(size.z, 0.2));
    geometry.translate(center.x, center.y, center.z);
    const mesh = new THREE.Mesh(geometry, EntityView.pickMaterial);
    mesh.visible = false;
    return mesh;
  }

  /** AoE2-style contact shadow (soft radial blob) under the entity. */
  private addBlobShadow(radius: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    mesh.renderOrder = 1;
    this.blobShadow = mesh;
    this.group.add(mesh);
  }

  setBlobScale(scale: number): void {
    if (this.blobShadow) this.blobShadow.scale.set(scale, scale, 1);
  }

  attachTo(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setRotationY(yaw: number): void {
    this.group.rotation.y = yaw;
  }

  /** Face a unit's movement yaw; models are modelled facing +Z. */
  setFacing(yaw: number): void {
    this.group.rotation.y = facingRotation(yaw);
  }

  showSelection(show: boolean): void {
    if (!this.ring) {
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(this.radius * 0.82, this.radius * 1.12, 40),
        new THREE.MeshBasicMaterial({
          color: 0x33ff88,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.y = 0.06;
      this.ring.renderOrder = 3;
      this.group.add(this.ring);
    }
    this.ring.visible = show;
  }

  /** Selection ring with the player color. */
  showSelectionColor(show: boolean, color: THREE.Color, altitude = 0.06): void {
    if (!this.ring) {
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(this.radius * 0.84, this.radius * 1.14, 48),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.renderOrder = 3;
      this.group.add(this.ring);
    }
    this.ring.position.y = altitude;
    (this.ring.material as THREE.MeshBasicMaterial).color.copy(color);
    this.ring.visible = show;
  }

  setRingColor(color: THREE.Color): void {
    if (this.ring) {
      (this.ring.material as THREE.MeshBasicMaterial).color.copy(color);
    }
  }

  showHealthBar(show: boolean, ownerColor: THREE.Color): void {
    if (!this.healthBar) {
      this.healthBar = new THREE.Group();
      const w = this.radius * 1.5;
      const h = 0.16;
      const y = this.radius * 1.6 + HEALTH_BAR_LIFT;
      this.hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.75, depthWrite: false }),
      );
      this.hpBg.position.y = y;
      this.healthBar.add(this.hpBg);
      this.hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.05, h - 0.05),
        new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.95, depthWrite: false }),
      );
      this.hpFill.position.y = y;
      this.hpFill.position.z = 0.01;
      this.hpFill.renderOrder = 4;
      this.hpBg.renderOrder = 4;
      this.healthBar.add(this.hpFill);
      this.group.add(this.healthBar);
    }
    // team cue: darken the owner colour for the bar frame
    (this.hpBg.material as THREE.MeshBasicMaterial).color.copy(ownerColor).multiplyScalar(0.35);
    this.healthBar.visible = show;
  }

  updateHealth(ratio: number): void {
    if (!this.healthBar) return;
    const w = this.radius * 1.5 - 0.05;
    this.hpFill.scale.x = Math.max(0, ratio);
    this.hpFill.position.x = -(w / 2) + (this.hpFill.scale.x * w) / 2;
    const g = Math.max(0.25, Math.min(1, ratio * 1.6));
    const r = 1 - Math.min(1, ratio * 1.1);
    (this.hpFill.material as THREE.MeshBasicMaterial).color.setRGB(r, g, 0.15);
  }

  /** Orient the health bar toward the camera (units rotate with yaw, so without
   *  this the bar turns edge-on and disappears). */
  faceHealthBar(cameraQuaternion: THREE.Quaternion): void {
    if (!this.healthBar) return;
    const world = this.group.getWorldQuaternion(_tmpQuat).invert();
    this.healthBar.quaternion.copy(world).multiply(cameraQuaternion);
  }

  /** Building damage read: healthy -> scorched -> critical (leaning + rubble). */
  get currentDamageStage(): DamageStage {
    return this.damageStage;
  }

  /** Remove selection/health UI before the model becomes a corpse. */
  hideCombatUi(): void {
    if (this.ring) this.ring.visible = false;
    if (this.healthBar) this.healthBar.visible = false;
    if (this.losRing) this.losRing.visible = false;
  }

  setDamageRatio(hpRatio: number): void {
    const stage = damageStageFor(hpRatio);
    if (stage === this.damageStage) return;
    this.damageStage = stage;
    const tint = stage === 2 ? 0.55 : stage === 1 ? 0.8 : 1;
    const skip = new Set<THREE.Object3D>();
    for (const object of [
      this.pickProxy,
      this.hpBg,
      this.hpFill,
      this.ring,
      this.losRing,
      this.blobShadow,
      this.rubble,
    ]) {
      if (object) skip.add(object);
    }
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || skip.has(mesh)) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const mat = material as THREE.MeshStandardMaterial;
        if (!mat?.color) continue;
        let original = this.originalColors.get(mat);
        if (!original) {
          original = mat.color.clone();
          this.originalColors.set(mat, original);
        }
        mat.color.copy(original).multiplyScalar(tint);
      }
    });
    this.group.rotation.z = stage === 2 ? 0.035 : 0;
    if (stage === 2 && !this.rubble) this.rubble = this.buildRubble();
    if (this.rubble) this.rubble.visible = stage === 2;
  }

  private buildRubble(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'damage-rubble';
    const material = new THREE.MeshStandardMaterial({ color: 0x5c5246, roughness: 1, metalness: 0 });
    for (let i = 0; i < 4; i++) {
      const size = 0.12 + (i % 2) * 0.08;
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.6, size * 1.2), material);
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      chunk.position.set(Math.cos(angle) * this.radius * 0.55, size * 0.3, Math.sin(angle) * this.radius * 0.55);
      chunk.rotation.set(0.2 * i, angle, 0.1 * i);
      group.add(chunk);
    }
    this.group.add(group);
    return group;
  }

  /** Vision-radius ring (debug/effect). */
  showLosRing(show: boolean, radius: number): void {
    if (!this.losRing) {
      this.losRing = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.96, radius, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      this.losRing.rotation.x = -Math.PI / 2;
      this.losRing.position.y = 0.03;
      this.group.add(this.losRing);
    }
    this.losRing.visible = show;
  }

  animatePulse(time: number): void {
    if (this.ring && this.ring.visible) {
      const s = 1 + Math.sin(time * 4) * 0.06;
      this.ring.scale.set(s, 1, s);
    }
  }

  /** Free the attachments (rings, health bar, shadow) created by the view. */
  dispose(): void {
    const blobMat = this.blobShadow?.material as THREE.MeshBasicMaterial | undefined;
    blobMat?.map?.dispose();
    const kill = (m: THREE.Mesh | null): void => {
      if (!m) return;
      m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat && 'dispose' in mat) (mat as THREE.Material).dispose();
      m.removeFromParent();
    };
    kill(this.blobShadow);
    kill(this.ring);
    kill(this.losRing);
    kill(this.hpBg);
    kill(this.hpFill);
    if (this.rubble) {
      this.rubble.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat && 'dispose' in mat) (mat as THREE.Material).dispose();
      });
      this.rubble.removeFromParent();
      this.rubble = null;
    }
    this.originalColors.clear();
    this.pickProxy.geometry.dispose();
    this.pickProxy.removeFromParent();
    this.healthBar?.removeFromParent();
  }

  toRef(id: number, owner: number, kind: string, pos: THREE.Vector3, hp: number, maxHp: number): EntityRef {
    return { id, owner, kind, pos, radius: this.radius, hp, maxHp, selected: false, dead: false };
  }
}
