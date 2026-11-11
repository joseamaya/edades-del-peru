import * as THREE from 'three';
import type { PropsKitModel } from './propsKit';

const MAX = 64;
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _tilt = new THREE.Quaternion();
const _yaw = new THREE.Quaternion();

interface Placement {
  id: number;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  visible: boolean;
  onReady?: () => void;
}

/**
 * Instanced granodiorite outcrops for the Caral stone nodes. The model follows the terrain: one
 * matrix per node, tilted to the sampled normal and sunk slightly so no chunk floats on a slope.
 */
export class QuarryInstances {
  private readonly placements = new Map<number, Placement>();
  private ordered: Placement[] = [];
  private meshes: THREE.InstancedMesh[] = [];
  private model: PropsKitModel | null = null;
  private disposed = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly heightAt: (x: number, z: number) => number,
  ) {}

  /** Attach the loaded kit; files that fail to load keep the procedural fallback in each node. */
  attachKit(model: PropsKitModel): void {
    if (this.disposed || this.model) return;
    this.model = model;
    this.meshes = model.lods[0].map((part) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, MAX);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = `quarries_kit_${model.id}`;
      this.scene.add(mesh);
      return mesh;
    });
    this.repack();
    for (const placement of this.placements.values()) placement.onReady?.();
  }

  register(id: number, x: number, z: number, yaw: number, scale: number, onReady?: () => void): void {
    if (this.disposed) return;
    this.placements.set(id, { id, x, z, yaw, scale, visible: true, onReady });
    this.repack();
    if (this.model) onReady?.();
  }

  unregister(id: number): void {
    if (!this.placements.delete(id) || this.disposed) return;
    this.repack();
  }

  setVisible(id: number, visible: boolean): void {
    const p = this.placements.get(id);
    if (!p || p.visible === visible || this.disposed) return;
    p.visible = visible;
    this.repack();
  }

  /** Picking for the instanced outcrops, like `TreeInstances.raycast`. */
  raycast(raycaster: THREE.Raycaster, out: { dist: number; id: number }[]): void {
    for (const mesh of this.meshes) {
      if (mesh.count === 0) continue;
      mesh.computeBoundingSphere();
      for (const hit of raycaster.intersectObject(mesh, false)) {
        if (hit.instanceId === undefined) continue;
        const placement = this.ordered[hit.instanceId];
        if (placement) out.push({ dist: hit.distance, id: placement.id });
      }
    }
  }

  private repack(): void {
    this.ordered = [...this.placements.values()].filter((p) => p.visible).slice(0, MAX);
    for (let i = 0; i < this.ordered.length; i++) {
      const p = this.ordered[i]!;
      const ground = this.heightAt(p.x, p.z);
      const e = 1.1;
      const hx = this.heightAt(p.x + e, p.z) - this.heightAt(p.x - e, p.z);
      const hz = this.heightAt(p.x, p.z + e) - this.heightAt(p.x, p.z - e);
      _normal.set(-hx / (2 * e), 1, -hz / (2 * e));
      // Do not tip a boulder onto its side on the steepest loma slopes.
      if (_normal.y < 0.72) {
        _normal.y = 0.72;
      }
      _normal.normalize();
      _tilt.setFromUnitVectors(UP, _normal);
      _yaw.setFromAxisAngle(UP, p.yaw);
      _tilt.multiply(_yaw);
      _pos.set(p.x, ground - 0.32 * p.scale, p.z);
      _scale.setScalar(p.scale);
      _m.compose(_pos, _tilt, _scale);
      for (const mesh of this.meshes) mesh.setMatrixAt(i, _m);
    }
    for (const mesh of this.meshes) {
      mesh.count = this.ordered.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const mesh of this.meshes) mesh.removeFromParent();
    this.meshes = [];
    this.placements.clear();
    this.ordered = [];
    this.model = null;
  }
}
