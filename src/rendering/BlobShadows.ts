import * as THREE from 'three';

/**
 * One instanced mesh for every unit/building contact shadow in a scene. The old per-entity plane
 * allocated its own CanvasTexture and cost one draw call per entity; at RTS zoom the shadow is a soft
 * blob, so a single shared texture and one instanced draw are enough.
 */
const MAX_SHADOWS = 1600;
const _dummy = new THREE.Object3D();

let texture: THREE.CanvasTexture | null = null;

function shadowTexture(): THREE.CanvasTexture {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class BlobShadowPool {
  readonly mesh: THREE.InstancedMesh;
  private readonly free: number[] = [];
  private readonly used = new Set<number>();
  private readonly scale = new Map<number, number>();

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_SHADOWS);
    this.mesh.name = 'blob-shadows';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  add(): number {
    const id = this.free.pop();
    if (id !== undefined) {
      this.used.add(id);
      this.mesh.count = Math.max(this.mesh.count, id + 1);
      return id;
    }
    if (this.mesh.count >= MAX_SHADOWS) return -1;
    const next = this.mesh.count;
    this.mesh.count++;
    this.used.add(next);
    return next;
  }

  /** Place one shadow; `visible=false` collapses it to zero scale without changing the instance count. */
  set(id: number, x: number, y: number, z: number, radius: number, visible: boolean): void {
    if (id < 0 || !this.used.has(id)) return;
    this.scale.set(id, radius);
    _dummy.position.set(x, y + 0.02, z);
    _dummy.rotation.set(0, 0, 0);
    const size = visible ? radius * 2.4 : 0;
    _dummy.scale.set(size, 1, size);
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(id, _dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Rescale an existing shadow without moving it (units pick a different radius after spawn). */
  setScale(id: number, radius: number): void {
    const current = this.scale.get(id);
    if (current === undefined) return;
    this.scale.set(id, radius);
    this.mesh.getMatrixAt(id, _dummy.matrix);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    _dummy.matrix.decompose(position, quaternion, scale);
    const size = radius * 2.4;
    _dummy.position.copy(position);
    _dummy.quaternion.copy(quaternion);
    _dummy.scale.set(size, 1, size);
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(id, _dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  remove(id: number): void {
    if (id < 0 || !this.used.delete(id)) return;
    _dummy.position.set(0, -1000, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(id, _dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.free.push(id);
  }
}

const pools = new WeakMap<THREE.Scene, BlobShadowPool>();

/** One pool per scene, shared by every entity view in that scene. */
export function blobShadowPool(scene: THREE.Scene): BlobShadowPool {
  let pool = pools.get(scene);
  if (!pool) {
    pool = new BlobShadowPool(scene);
    pools.set(scene, pool);
  }
  return pool;
}
