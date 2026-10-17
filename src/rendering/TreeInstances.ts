import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MaterialTex } from './Textures';
import { getGeneratedMaterial } from './Biomes';
import type { TreeVariant } from '../model/defs/profiles';

export type { TreeVariant };

const MAX = 700;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

interface Slot {
  used: boolean;
  id: number;
  variant: TreeVariant;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  phase: number;
  visible: boolean;
  fallTime: number;
}

/**
 * GPU tree instancing: one InstancedMesh per shared material (trunk and
 * canopies per variant). Handles spawn/despawn, visibility (fog/LOD), wind and
 * falling on chop. Picking is resolved by `instanceId` -> entity.
 */
export class TreeInstances {
  private trunkMesh: THREE.InstancedMesh;
  private canopyMesh: Record<TreeVariant, THREE.InstancedMesh>;
  private materials: THREE.Material[] = [];
  private slots: Slot[] = [];
  private free: number[] = [];
  private time = 0;
  private windStrength = 0.035;

  constructor(private scene: THREE.Scene) {
    const trunkGeo = this.buildTrunkGeo();
    const canopyGeos: Record<TreeVariant, THREE.BufferGeometry> = {
      broad: this.buildCanopyGeo(2.9, 2.4, 3.9),
      needle: this.buildCanopyGeo(2.0, 3.3, 4.4),
      frond: this.buildCanopyGeo(3.4, 2.2, 3.7),
    };

    const barkGen = getGeneratedMaterial('bark');
    const barkMat = new THREE.MeshStandardMaterial({
      map: barkGen?.diffuse ?? MaterialTex.bark(),
      normalMap: barkGen?.normal ?? MaterialTex.normal(21),
      color: barkGen ? '#cbb59a' : '#b59a78',
      roughness: 0.95,
    });
    this.materials.push(barkMat);
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, barkMat, MAX);
    this.trunkMesh.castShadow = true;
    this.trunkMesh.receiveShadow = true;
    this.trunkMesh.frustumCulled = false;
    this.trunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.trunkMesh);

    this.canopyMesh = {} as Record<TreeVariant, THREE.InstancedMesh>;
    for (const variant of ['broad', 'needle', 'frond'] as TreeVariant[]) {
      const leafMat = new THREE.MeshStandardMaterial({
        map: MaterialTex.foliage(variant),
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        color: '#cfe0b0',
        roughness: 1,
      });
      this.materials.push(leafMat);
      const mesh = new THREE.InstancedMesh(canopyGeos[variant], leafMat, MAX);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.canopyMesh[variant] = mesh;
      this.scene.add(mesh);
    }

    // initialize all matrices to zero
    for (let i = 0; i < MAX; i++) {
      this.slots.push({
        used: false,
        id: -1,
        variant: 'broad',
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
        scale: 1,
        phase: 0,
        visible: false,
        fallTime: 0,
      });
      this.free.push(i);
    }
    this.writeAll();
  }

  private buildTrunkGeo(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.14, 0.24, 4.6, 8);
    trunk.translate(0, 2.3, 0);
    parts.push(trunk);
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + 0.4;
      const br = new THREE.CylinderGeometry(0.05, 0.09, 1.2, 6);
      br.translate(0, 0.6, 0);
      const m = new THREE.Matrix4()
        .makeTranslation(Math.cos(a) * 0.25, 3.1, Math.sin(a) * 0.25)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0)));
      br.applyMatrix4(m);
      parts.push(br);
    }
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }

  private buildCanopyGeo(w: number, h: number, cy: number): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
    for (const a of angles) {
      const card = new THREE.PlaneGeometry(w, h);
      card.applyMatrix4(new THREE.Matrix4().makeRotationY(a));
      card.applyMatrix4(new THREE.Matrix4().makeTranslation(0, cy, 0));
      parts.push(card);
    }
    const top = new THREE.PlaneGeometry(w * 0.9, h * 0.9);
    top.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.35));
    top.applyMatrix4(new THREE.Matrix4().makeTranslation(0, cy + h * 0.35, 0));
    parts.push(top);
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }

  /** Reserve an instance for a tree. Returns the slot or -1 if full. */
  register(id: number, variant: TreeVariant, x: number, y: number, z: number, scale: number, rotY: number): number {
    const slot = this.free.pop();
    if (slot === undefined) return -1;
    const s = this.slots[slot];
    s.used = true;
    s.id = id;
    s.variant = variant;
    s.x = x;
    s.y = y;
    s.z = z;
    s.rotY = rotY;
    s.scale = scale;
    s.phase = Math.random() * Math.PI * 2;
    s.visible = true;
    s.fallTime = 0;
    this.writeSlot(slot);
    this.zeroOtherCanopies(slot, variant);
    return slot;
  }

  setVisible(slot: number, visible: boolean): void {
    const s = this.slots[slot];
    if (!s || !s.used || s.visible === visible) return;
    s.visible = visible;
    this.writeSlot(slot);
  }

  startFall(slot: number): void {
    const s = this.slots[slot];
    if (s && s.used) s.fallTime = 0.001;
  }

  unregister(slot: number): void {
    const s = this.slots[slot];
    if (!s || !s.used) return;
    s.used = false;
    s.id = -1;
    this.writeZero(slot);
    this.free.push(slot);
  }

  nodeIdAt(slot: number): number {
    const s = this.slots[slot];
    return s && s.used ? s.id : -1;
  }

  /** Ray intersection with trees; returns distance and entity id. */
  raycast(raycaster: THREE.Raycaster, out: { dist: number; id: number }[]): void {
    const meshes: THREE.Mesh[] = [this.trunkMesh, this.canopyMesh.broad, this.canopyMesh.needle, this.canopyMesh.frond];
    for (const mesh of meshes) {
      const hits = raycaster.intersectObject(mesh, false);
      for (const h of hits) {
        if (h.instanceId === undefined) continue;
        const id = this.nodeIdAt(h.instanceId);
        if (id >= 0) out.push({ dist: h.distance, id });
      }
    }
  }

  private baseMatrix(s: Slot, out: THREE.Matrix4, fallAngle = 0): void {
    _pos.set(s.x, s.y, s.z);
    _euler.set(0, s.rotY, fallAngle);
    _q.setFromEuler(_euler);
    _scale.setScalar(s.scale);
    out.compose(_pos, _q, _scale);
  }

  private writeSlot(slot: number): void {
    const s = this.slots[slot];
    if (!s.visible && s.fallTime === 0) {
      this.writeZero(slot);
      return;
    }
    const fallAngle = s.fallTime > 0 ? Math.min(1.5708, s.fallTime * 1.4) : 0;
    this.baseMatrix(s, _m, fallAngle);
    this.trunkMesh.setMatrixAt(slot, _m);
    // canopy with wind (swaying around the Z axis at the tree base)
    const sway = Math.sin(this.time * 1.4 + s.phase) * this.windStrength;
    _euler.set(0, s.rotY, sway + fallAngle);
    _q2.setFromEuler(_euler);
    _pos.set(s.x, s.y, s.z);
    _scale.setScalar(s.scale);
    _m.compose(_pos, _q2, _scale);
    for (const variant of ['broad', 'needle', 'frond'] as TreeVariant[]) {
      if (variant === s.variant) this.canopyMesh[variant].setMatrixAt(slot, _m);
    }
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.canopyMesh[s.variant].instanceMatrix.needsUpdate = true;
  }

  private zeroOtherCanopies(slot: number, keep: TreeVariant): void {
    for (const variant of ['broad', 'needle', 'frond'] as TreeVariant[]) {
      if (variant === keep) continue;
      this.canopyMesh[variant].setMatrixAt(slot, ZERO);
      this.canopyMesh[variant].instanceMatrix.needsUpdate = true;
    }
  }

  private writeZero(slot: number): void {
    this.trunkMesh.setMatrixAt(slot, ZERO);
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    for (const variant of ['broad', 'needle', 'frond'] as TreeVariant[]) {
      this.canopyMesh[variant].setMatrixAt(slot, ZERO);
      this.canopyMesh[variant].instanceMatrix.needsUpdate = true;
    }
  }

  private writeAll(): void {
    for (let i = 0; i < MAX; i++) this.writeZero(i);
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.used) continue;
      if (s.fallTime > 0) {
        s.fallTime += dt;
        this.writeSlot(i);
        if (s.fallTime * 1.4 >= 1.5708) {
          s.fallTime = 0;
          this.unregister(i);
        }
      } else if (s.visible) {
        this.writeSlot(i);
      }
    }
  }

  dispose(): void {
    this.trunkMesh.geometry.dispose();
    this.trunkMesh.removeFromParent();
    for (const variant of ['broad', 'needle', 'frond'] as TreeVariant[]) {
      this.canopyMesh[variant].geometry.dispose();
      this.canopyMesh[variant].removeFromParent();
    }
    this.materials.forEach((m) => m.dispose());
  }
}
