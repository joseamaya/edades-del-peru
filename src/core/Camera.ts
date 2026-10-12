import * as THREE from 'three';
import { clamp, damp } from '../util/math';
import { isTypingTarget } from '../util/dom';

export interface CameraTarget {
  x: number;
  z: number;
}

/**
 * RTS camera: orbits a ground point with zoom, Q/E rotation,
 * WASD/edge-scroll/middle-drag panning, and smoothed follow.
 */
export class RTSCamera {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3(0, 0, 0);
  private desiredTarget = new THREE.Vector3(0, 0, 0);
  private zoom = 34;
  private desiredZoom = 34;
  private yaw = Math.PI / 4;
  private pitch = 0.9;
  private shake = 0;
  private followId: number | null = null;
  private followResolver: ((id: number) => CameraTarget | null | undefined) | null = null;
  private edgeScroll = true;
  private rotationEnabled = false;

  private keys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private dragging = false;
  private dragLast = new THREE.Vector2();

  readonly minZoom = 28;
  readonly maxZoom = 210;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 6000);
    this.camera.position.set(120, 160, 120);
    this.attach();
  }

  private attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  /** Resolve the entity to follow by id (units or buildings). */
  setFollowResolver(fn: (id: number) => CameraTarget | null | undefined): void {
    this.followResolver = fn;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if ((k === 'q' || k === 'e') && this.rotationEnabled) {
      const dir = k === 'q' ? 1 : -1;
      this.yaw += dir * 0.045;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.desiredZoom = clamp(this.desiredZoom + e.deltaY * 0.22, this.minZoom, this.maxZoom);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 1) {
      this.dragging = true;
      this.dragLast.set(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.dragging) {
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      this.dragLast.set(e.clientX, e.clientY);
      this.panBy(dx, dy);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 1) this.dragging = false;
  };

  private panBy(screenDx: number, screenDy: number): void {
    const yawCos = Math.cos(-this.yaw);
    const yawSin = Math.sin(-this.yaw);
    const world = (this.zoom / this.camera.aspect) * 0.0016;
    const dx = screenDx * world;
    const dy = screenDy * world;
    this.desiredTarget.x += yawCos * dx - yawSin * dy;
    this.desiredTarget.z += -yawSin * dx - yawCos * dy;
  }

  /** Pan from external input (e.g. right-button drag). */
  panScreen(screenDx: number, screenDy: number): void {
    this.panBy(screenDx, screenDy);
  }

  getTarget(): CameraTarget {
    return { x: this.desiredTarget.x, z: this.desiredTarget.z };
  }

  /** Move the camera to a map point. */
  moveTo(x: number, z: number, immediate = false): void {
    this.desiredTarget.x = x;
    this.desiredTarget.z = z;
    if (immediate) {
      this.target.copy(this.desiredTarget);
    }
  }

  focusOn(x: number, z: number): void {
    this.moveTo(x, z);
    if (this.followId !== null) this.followId = null;
  }

  follow(id: number | null): void {
    this.followId = id;
  }

  isFollowing(id: number): boolean {
    return this.followId === id;
  }

  addShake(amount: number): void {
    this.shake = Math.min(this.shake + amount, 1.6);
  }

  setHeight(h: number): void {
    this.desiredZoom = clamp(h, this.minZoom, this.maxZoom);
  }

  /** Enable camera rotation (Q/E). Off by default (fixed camera, SC2 style). */
  setRotationEnabled(on: boolean): void {
    this.rotationEnabled = on;
  }

  private edgePan(dt: number): void {
    if (!this.edgeScroll || this.dragging) return;
    if (!this.hasMousePos) return;
    const m = this.canvas.getBoundingClientRect();
    const margin = 30;
    let dx = 0;
    let dz = 0;
    const px = this.lastMouseX;
    const py = this.lastMouseY;
    if (px < m.left + margin) dx -= 1;
    if (px > m.right - margin) dx += 1;
    if (py < m.top + margin) dz -= 1;
    if (py > m.bottom - margin) dz += 1;
    if (dx !== 0 || dz !== 0) {
      const speed = this.zoom * 1.5;
      const yawCos = Math.cos(-this.yaw);
      const yawSin = Math.sin(-this.yaw);
      this.desiredTarget.x += (yawCos * dx - yawSin * dz) * speed * dt;
      this.desiredTarget.z += (-yawSin * dx - yawCos * dz) * speed * dt;
    }
  }

  private lastMouseX = 0;
  private lastMouseY = 0;
  private hasMousePos = false;

  /** Call in the input to follow the mouse at the edges. */
  updateMouse(x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.hasMousePos = true;
  }

  update(dt: number, time: number): void {
    // Keyboard panning
    let kx = 0;
    let kz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) kz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) kz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) kx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) kx += 1;
    if (kx !== 0 || kz !== 0) {
      const speed = this.zoom * 1.35;
      const yawCos = Math.cos(-this.yaw);
      const yawSin = Math.sin(-this.yaw);
      this.desiredTarget.x += (yawCos * kx - yawSin * kz) * speed * dt;
      this.desiredTarget.z += (-yawSin * kx - yawCos * kz) * speed * dt;
    }

    this.edgePan(dt);

    // Follow entity
    if (this.followId !== null && this.followResolver) {
      const ent = this.followResolver(this.followId);
      if (ent) {
        this.desiredTarget.x = ent.x;
        this.desiredTarget.z = ent.z;
      }
    }

    this.zoom = damp(this.zoom, this.desiredZoom, 6, dt);
    this.target.x = damp(this.target.x, this.desiredTarget.x, 5, dt);
    this.target.z = damp(this.target.z, this.desiredTarget.z, 5, dt);

    const dist = this.zoom;
    const y = Math.sin(this.pitch) * dist;
    const horiz = Math.cos(this.pitch) * dist;
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    const px = this.target.x + sinY * horiz;
    const pz = this.target.z + cosY * horiz;

    // Shake for explosions
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001) {
      const s = this.shake * 0.9;
      sx = (Math.sin(time * 61.2) + Math.sin(time * 37.7) * 0.6) * s;
      sy = (Math.cos(time * 53.1) + Math.sin(time * 29.9) * 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 1.4);
    }

    this.camera.position.set(px + sx, Math.max(1.5, y + sy), pz);
    this.camera.lookAt(this.target.x, 0, this.target.z);
  }

  /** Viewing angle for UI/minimap. */
  getYaw(): number {
    return this.yaw;
  }

  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  /** Current zoom distance (for LOD). */
  getZoom(): number {
    return this.zoom;
  }

  /** Approximate rectangle of the visible ground (for the minimap). */
  getGroundRect(): { x: number; z: number; w: number; d: number } {
    const halfW = this.zoom * 0.55 * this.camera.aspect;
    const halfD = this.zoom * 0.62;
    return { x: this.target.x - halfW, z: this.target.z - halfD, w: halfW * 2, d: halfD * 2 };
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
