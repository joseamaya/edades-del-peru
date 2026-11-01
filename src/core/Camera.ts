import * as THREE from 'three';
import { damp, smoothstep } from '../util/math';
import { isTypingTarget } from '../util/dom';
import {
  CAMERA_CONFIG,
  CAMERA_FOV_RAD,
  CAMERA_PITCH,
  clampFocusToMap,
  dragToWorld,
  edgeVector,
  keyPanVector,
  maxZoomForMap,
  rotateToWorld,
  viewGroundQuad,
  worldPerPixel,
  type Vec2,
} from './cameraMath';

export interface CameraTarget {
  x: number;
  z: number;
}

/**
 * RTS camera: orbits a ground point with zoom, Q/E rotation,
 * WASD/edge-scroll/middle-drag panning, and smoothed follow.
 *
 * Inputs only move `desiredTarget`; the camera keeps interpolating toward it
 * (damping). The one exception is a scripted `flyTo` (intro), which eases the
 * framing directly in real time and then hands control back to the damping.
 */
export class RTSCamera {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3(0, 0, 0);
  private desiredTarget = new THREE.Vector3(0, 0, 0);
  private zoom = 34;
  private desiredZoom = 34;
  private yaw = 0;
  private pitch = CAMERA_PITCH;
  private shake = 0;
  private followId: number | null = null;
  private followResolver: ((id: number) => CameraTarget | null | undefined) | null = null;
  private edgeScroll = true;
  private rotationEnabled = false;
  /** While true (a blocking menu/modal is open) panning is suppressed. */
  private uiCaptured = false;
  /** While true (the pointer is over a HUD control) edge scrolling is suppressed. */
  private pointerOverUi = false;
  /** Multiplier for keyboard/edge pan speed (user setting). */
  private speedScale = 1;
  /** Scripted camera flight (intro), overriding the damp while active. */
  private fly: {
    fromX: number;
    fromZ: number;
    fromZoom: number;
    toX: number;
    toZ: number;
    toZoom: number;
    startTime: number | null;
    dur: number;
  } | null = null;

  private mapSize: number;
  private viewportH: number;
  private readonly fovRad = CAMERA_FOV_RAD;

  private keys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private dragging = false;
  private dragLast = new THREE.Vector2();

  readonly minZoom = CAMERA_CONFIG.minZoom;
  private zoomLimit: number = CAMERA_CONFIG.maxZoom;

  constructor(canvas: HTMLCanvasElement, mapSize = 256) {
    this.canvas = canvas;
    this.mapSize = mapSize;
    this.viewportH = canvas.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 6000);
    this.camera.position.set(120, 160, 120);
    this.refreshZoomLimit();
    this.attach();
  }

  private onContextMenu = (e: Event): void => e.preventDefault();

  private attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  /** Resolve the entity to follow by id (units or buildings). */
  setFollowResolver(fn: (id: number) => CameraTarget | null | undefined): void {
    this.followResolver = fn;
  }

  /** Terrain size, used to keep the viewport over the map. */
  setMapSize(size: number): void {
    this.mapSize = size;
    this.refreshZoomLimit();
  }

  get maxZoom(): number {
    return this.zoomLimit;
  }

  /** Recompute the zoom-out limit from the map size, aspect and yaw. */
  private refreshZoomLimit(): void {
    this.zoomLimit = Math.max(this.minZoom, maxZoomForMap(this.mapSize, this.camera.aspect, this.yaw));
    if (this.desiredZoom > this.zoomLimit) this.desiredZoom = this.zoomLimit;
    if (this.zoom > this.zoomLimit) this.zoom = this.zoomLimit;
  }

  /** Suppress panning while a blocking UI (menu/modal/codex) is open. */
  setUiCaptured(on: boolean): void {
    this.uiCaptured = on;
  }

  /** Suppress edge scrolling while the pointer is over a HUD control (0 A.D.-style). */
  setPointerOverUi(on: boolean): void {
    this.pointerOverUi = on;
  }

  /** Scale keyboard/edge pan speed (the middle-drag is direct manipulation). */
  setSpeedScale(scale: number): void {
    this.speedScale = scale;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if ((k === 'q' || k === 'e') && this.rotationEnabled) {
      const dir = k === 'q' ? 1 : -1;
      this.yaw += dir * 0.045;
      this.refreshZoomLimit();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.desiredZoom = clamp(this.desiredZoom + e.deltaY * CAMERA_CONFIG.zoomWheelStep, this.minZoom, this.maxZoom);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 1) {
      this.dragging = true;
      this.dragLast.set(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.dragging && !this.uiCaptured) {
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      this.dragLast.set(e.clientX, e.clientY);
      this.panBy(dx, dy);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 1) this.dragging = false;
  };

  /** Middle-drag pan: the map follows the cursor (geometry-based, zoom/yaw aware). */
  private panBy(screenDx: number, screenDy: number): void {
    const wpp = worldPerPixel(this.zoom, this.fovRad, this.viewportH);
    const w = dragToWorld(screenDx, screenDy, this.yaw, wpp);
    this.desiredTarget.x += w.x;
    this.desiredTarget.z += w.y;
  }

  /** Pan from external input (e.g. an explicit drag). */
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

  /** Cinematic flight from the current framing to `(x,z,zoom)` over `seconds`. */
  flyTo(x: number, z: number, zoom: number, seconds: number): void {
    this.followId = null;
    this.fly = {
      fromX: this.desiredTarget.x,
      fromZ: this.desiredTarget.z,
      fromZoom: this.desiredZoom,
      toX: x,
      toZ: z,
      toZoom: clamp(zoom, this.minZoom, this.maxZoom),
      startTime: null,
      dur: Math.max(0.01, seconds),
    };
  }

  /** True while the scripted intro flight is still running. */
  isFlying(): boolean {
    return this.fly !== null;
  }

  /** Enable camera rotation (Q/E). Off by default (fixed camera, SC2 style). */
  setRotationEnabled(on: boolean): void {
    this.rotationEnabled = on;
  }

  private edgePan(dt: number): void {
    if (!this.edgeScroll || this.dragging || this.uiCaptured || this.pointerOverUi) return;
    if (!this.hasMousePos) return;
    const rect = this.canvas.getBoundingClientRect();
    const ev = edgeVector(this.lastMouseX, this.lastMouseY, rect, CAMERA_CONFIG.edgeZone);
    if (ev.x === 0 && ev.y === 0) return;
    const w = rotateToWorld(ev.x, ev.y, this.yaw);
    const speed = this.zoom * CAMERA_CONFIG.edgeSpeed * this.speedScale;
    this.desiredTarget.x += w.x * speed * dt;
    this.desiredTarget.z += w.y * speed * dt;
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

  private keyboardPan(dt: number): void {
    if (this.uiCaptured) return;
    const kv = keyPanVector(this.keys);
    if (kv.x === 0 && kv.y === 0) return;
    const w = rotateToWorld(kv.x, kv.y, this.yaw);
    const speed = this.zoom * CAMERA_CONFIG.keySpeed * this.speedScale;
    this.desiredTarget.x += w.x * speed * dt;
    this.desiredTarget.z += w.y * speed * dt;
  }

  /** Keep the focus point near the terrain edge (0 A.D.-style). */
  private clampTarget(): void {
    const c = clampFocusToMap(this.desiredTarget.x, this.desiredTarget.z, this.mapSize, CAMERA_CONFIG.edgeMargin);
    this.desiredTarget.x = c.x;
    this.desiredTarget.z = c.y;
  }

  update(dt: number, time: number): void {
    this.keyboardPan(dt);
    this.edgePan(dt);

    // Follow entity
    if (this.followId !== null && this.followResolver) {
      const ent = this.followResolver(this.followId);
      if (ent) {
        this.desiredTarget.x = ent.x;
        this.desiredTarget.z = ent.z;
      }
    }

    if (this.fly) {
      const f = this.fly;
      if (f.startTime === null) f.startTime = time;
      // real time, so the flight lasts `dur` seconds regardless of game speed/FPS
      const k = clamp((time - f.startTime) / f.dur, 0, 1);
      const e = smoothstep(0, 1, k);
      this.desiredTarget.x = f.fromX + (f.toX - f.fromX) * e;
      this.desiredTarget.z = f.fromZ + (f.toZ - f.fromZ) * e;
      this.desiredZoom = f.fromZoom + (f.toZoom - f.fromZoom) * e;
    }

    this.clampTarget();

    if (this.fly) {
      // the scripted flight (already eased) sets the framing directly, no damping
      this.zoom = this.desiredZoom;
      this.target.x = this.desiredTarget.x;
      this.target.z = this.desiredTarget.z;
      if (this.fly.startTime !== null && (time - this.fly.startTime) / this.fly.dur >= 1) this.fly = null;
    } else {
      this.zoom = damp(this.zoom, this.desiredZoom, CAMERA_CONFIG.zoomLambda, dt);
      this.target.x = damp(this.target.x, this.desiredTarget.x, CAMERA_CONFIG.panLambda, dt);
      this.target.z = damp(this.target.z, this.desiredTarget.z, CAMERA_CONFIG.panLambda, dt);
    }

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
    this.refreshZoomLimit();
  }

  /** Current zoom distance (for LOD). */
  getZoom(): number {
    return this.zoom;
  }

  /** Rotated ground footprint of the view, in world XZ (for the minimap). */
  getGroundQuad(): Vec2[] {
    return viewGroundQuad(
      this.target.x,
      this.target.z,
      this.zoom,
      this.camera.aspect,
      this.yaw,
      this.pitch,
      this.fovRad,
    );
  }

  /** Axis-aligned bounds of the ground footprint (compatibility helper). */
  getGroundRect(): { x: number; z: number; w: number; d: number } {
    const quad = this.getGroundQuad();
    const xs = quad.map((p) => p.x);
    const zs = quad.map((p) => p.y);
    const x = Math.min(...xs);
    const z = Math.min(...zs);
    return { x, z, w: Math.max(...xs) - x, d: Math.max(...zs) - z };
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewportH = h;
    this.refreshZoomLimit();
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
