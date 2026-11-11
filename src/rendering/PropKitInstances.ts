import * as THREE from 'three';
import { kitLodFor } from './kitLod';

/** The minimum a kit model needs to be instanced: an id for the mesh names and two LOD part lists. */
export interface InstancedKitPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface InstancedKit {
  id: string;
  lods: [InstancedKitPart[], InstancedKitPart[]];
}

/** Props sit on the ground and tilt with the slope; shrubs stand upright and only follow the height. */
export interface PropKitOptions {
  tilt?: boolean;
  /** Metres the model sinks into the ground at unit scale. */
  sink?: number;
}

const MAX = 256;
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
 * Instanced natural props (the granodiorite outcrops and the pacae shrubs). Each matrix follows the
 * terrain: outcrops are seated on the lowest ground under their footprint, tilted to the sampled
 * normal and sunk slightly; shrubs keep their trunk vertical. LOD1 takes over beyond
 * `KIT_LOD1_DISTANCE` from the camera focus, and picking resolves `instanceId` back to the node.
 */
export class PropKitInstances {
  private readonly placements = new Map<number, Placement>();
  private ordered: [Placement[], Placement[]] = [[], []];
  private meshes: [THREE.InstancedMesh[], THREE.InstancedMesh[]] = [[], []];
  private model: InstancedKit | null = null;
  private focus = { x: 0, z: 0 };
  private disposed = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly heightAt: (x: number, z: number) => number,
    focus: { x: number; z: number } = { x: 0, z: 0 },
    private readonly options: PropKitOptions = {},
  ) {
    this.focus = { ...focus };
  }

  /** Attach the loaded kit; files that fail to load keep the procedural fallback in each node. */
  attachKit(model: InstancedKit): void {
    if (this.disposed || this.model) return;
    this.model = model;
    const built = model.lods.map((parts, lod) =>
      parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, MAX);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.name = `props_kit_${model.id}_lod${lod}`;
        this.scene.add(mesh);
        return mesh;
      }),
    );
    this.meshes = [built[0]!, built[1]!];
    this.repack();
    for (const placement of this.placements.values()) placement.onReady?.();
  }

  /** Returns false when the instancer is full, so the node can keep its procedural fallback. */
  register(id: number, x: number, z: number, yaw: number, scale: number, onReady?: () => void): boolean {
    if (this.disposed || this.placements.size >= MAX) return false;
    this.placements.set(id, { id, x, z, yaw, scale, visible: true, onReady });
    this.repack();
    if (this.model) onReady?.();
    return true;
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

  /** Re-pack the LOD split as the camera focus moves. */
  update(focus: { x: number; z: number }): void {
    if (this.disposed || (focus.x === this.focus.x && focus.z === this.focus.z)) return;
    this.focus = { ...focus };
    this.repack();
  }

  /** Picking for the instanced outcrops, like `TreeInstances.raycast`. */
  raycast(raycaster: THREE.Raycaster, out: { dist: number; id: number }[]): void {
    for (let lod = 0; lod < 2; lod++) {
      for (const mesh of this.meshes[lod]) {
        if (mesh.count === 0) continue;
        mesh.computeBoundingSphere();
        for (const hit of raycaster.intersectObject(mesh, false)) {
          if (hit.instanceId === undefined) continue;
          const placement = this.ordered[lod][hit.instanceId];
          if (placement) out.push({ dist: hit.distance, id: placement.id });
        }
      }
    }
  }

  private repack(): void {
    const lists: [Placement[], Placement[]] = [[], []];
    for (const p of this.placements.values()) {
      if (!p.visible) continue;
      lists[kitLodFor(p.x, p.z, this.focus)].push(p);
    }
    this.ordered = lists;
    for (let lod = 0; lod < 2; lod++) {
      const list = lists[lod];
      for (let i = 0; i < list.length; i++) {
        this.matrixFor(list[i]!, _m);
        for (const mesh of this.meshes[lod]) mesh.setMatrixAt(i, _m);
      }
      for (const mesh of this.meshes[lod]) {
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  private matrixFor(p: Placement, out: THREE.Matrix4): void {
    const sink = (this.options.sink ?? 0.18) * p.scale;
    if (this.options.tilt === false) {
      // A shrub keeps its trunk vertical: sample the centre and sink it a little.
      _pos.set(p.x, this.heightAt(p.x, p.z) - sink, p.z);
      _yaw.setFromAxisAngle(UP, p.yaw);
      _scale.setScalar(p.scale);
      out.compose(_pos, _yaw, _scale);
      return;
    }
    // Seat the whole footprint on its lowest ground, not just the centre: on a slope the uphill
    // half is buried and the downhill edge cannot float.
    const half = 2.4 * p.scale;
    const ground = Math.min(
      this.heightAt(p.x, p.z),
      this.heightAt(p.x - half, p.z),
      this.heightAt(p.x + half, p.z),
      this.heightAt(p.x, p.z - half),
      this.heightAt(p.x, p.z + half),
    );
    const hx = this.heightAt(p.x + half, p.z) - this.heightAt(p.x - half, p.z);
    const hz = this.heightAt(p.x, p.z + half) - this.heightAt(p.x, p.z - half);
    _normal.set(-hx / (2 * half), 1, -hz / (2 * half));
    // Do not tip a boulder onto its side on the steepest loma slopes.
    if (_normal.y < 0.72) _normal.y = 0.72;
    _normal.normalize();
    _tilt.setFromUnitVectors(UP, _normal);
    _yaw.setFromAxisAngle(UP, p.yaw);
    _tilt.multiply(_yaw);
    _pos.set(p.x, ground - sink, p.z);
    _scale.setScalar(p.scale);
    out.compose(_pos, _tilt, _scale);
  }

  dispose(): void {
    this.disposed = true;
    for (const lod of this.meshes) for (const mesh of lod) mesh.removeFromParent();
    this.meshes = [[], []];
    this.placements.clear();
    this.ordered = [[], []];
    this.model = null;
  }
}
