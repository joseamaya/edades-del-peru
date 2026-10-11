import * as THREE from 'three';
import { EntityRef } from '../core/types';

/** Contador global de ids de entidad. */
let nextId = 1;
export function allocId(): number {
  return nextId++;
}

/** Vista visual compartida: modelo + anillo de selección + barra de vida. */
export class EntityView {
  group: THREE.Group;
  private ring: THREE.Mesh | null = null;
  private healthBar: THREE.Group | null = null;
  private hpBg: THREE.Mesh;
  private hpFill: THREE.Mesh;
  private losRing: THREE.Mesh | null = null;
  private blobShadow: THREE.Mesh | null = null;
  readonly radius: number;

  constructor(model: THREE.Group, radius: number) {
    this.group = model;
    this.radius = radius;
    this.hpBg = new THREE.Mesh();
    this.hpFill = new THREE.Mesh();
    this.addBlobShadow(radius);
  }

  /** Sombra de contacto tipo AoE2 (blob radial suave) bajo la entidad. */
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

  showSelection(show: boolean): void {
    if (!this.ring) {
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(this.radius * 0.82, this.radius * 1.12, 40),
        new THREE.MeshBasicMaterial({ color: 0x33ff88, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.y = 0.06;
      this.ring.renderOrder = 3;
      this.group.add(this.ring);
    }
    this.ring.visible = show;
  }

  /** Anillo de selección con color de jugador. */
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
      this.hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.75, depthWrite: false }),
      );
      this.hpBg.position.y = this.radius * 1.6;
      this.healthBar.add(this.hpBg);
      this.hpFill = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.05, h - 0.05),
        new THREE.MeshBasicMaterial({ color: 0x44cc44, transparent: true, opacity: 0.95, depthWrite: false }),
      );
      this.hpFill.position.y = this.radius * 1.6;
      this.hpFill.position.z = 0.01;
      this.hpFill.renderOrder = 4;
      this.hpBg.renderOrder = 4;
      this.healthBar.add(this.hpFill);
      this.group.add(this.healthBar);
    }
    this.healthBar.visible = show;
    void ownerColor;
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

  showHealthAlways(show: boolean): void {
    if (this.healthBar) this.healthBar.visible = show;
  }

  /** Anillo de radio de visión (debug/efecto). */
  showLosRing(show: boolean, radius: number): void {
    if (!this.losRing) {
      this.losRing = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.96, radius, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
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

  /** Libera los adjuntos (anillos, barra de vida, sombra) creados por la vista. */
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
    this.healthBar?.removeFromParent();
  }

  toRef(id: number, owner: number, kind: string, pos: THREE.Vector3, hp: number, maxHp: number): EntityRef {
    return { id, owner, kind, pos, radius: this.radius, hp, maxHp, selected: false, dead: false };
  }
}
