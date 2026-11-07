import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROP_IDS, type PropId, type PropPlacement } from '../model/defs/props';
import type { KitModel } from './vegetationKit';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Instanced terrain props (cacti, totora, rocks, shrubs, riverbank canes) — visual only. */
export class Props {
  private readonly meshes = new Map<PropId, THREE.InstancedMesh>();
  private readonly materials: THREE.Material[] = [];
  private readonly kitMeshes = new Map<PropId, THREE.InstancedMesh[]>();
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {
    for (const id of PROP_IDS) {
      const { geo, color, castShadow } = buildPropGeometry(id);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
      this.materials.push(mat);
      const mesh = new THREE.InstancedMesh(geo, mat, 256);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = `props_${id}`;
      this.meshes.set(id, mesh);
      this.scene.add(mesh);
    }
  }

  /** Static placement; `y` is sampled from the terrain per placement. */
  place(placements: PropPlacement[], heightAt: (x: number, z: number) => number): void {
    const counts = new Map<PropId, number>();
    for (const p of placements) {
      const mesh = this.meshes.get(p.id);
      if (!mesh) continue;
      const i = counts.get(p.id) ?? 0;
      if (i >= mesh.count) continue;
      counts.set(p.id, i + 1);
      _pos.set(p.x, heightAt(p.x, p.z), p.z);
      _e.set(0, p.rotY, 0);
      _q.setFromEuler(_e);
      _scale.setScalar(p.scale);
      _m.compose(_pos, _q, _scale);
      mesh.setMatrixAt(i, _m);
    }
    for (const [id, mesh] of this.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = counts.get(id) ?? 0;
      this.syncKit(id);
    }
  }

  /**
   * Draw `id` with a Blender kit model (LOD0: props are few and static). The procedural mesh keeps
   * the placements (and its `count`) but is hidden.
   */
  attachKit(id: PropId, model: KitModel): void {
    const base = this.meshes.get(id);
    // Kit models are session-cached by the loader; Props only owns its meshes.
    if (this.disposed || !base || this.kitMeshes.has(id)) return;
    const parts = model.lods[0].map((part) => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, base.instanceMatrix.count);
      mesh.castShadow = base.castShadow;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = `props_kit_${id}`;
      this.scene.add(mesh);
      return mesh;
    });
    this.kitMeshes.set(id, parts);
    base.visible = false;
    this.syncKit(id);
  }

  private syncKit(id: PropId): void {
    const base = this.meshes.get(id);
    const parts = this.kitMeshes.get(id);
    if (!base || !parts) return;
    for (const mesh of parts) {
      for (let i = 0; i < base.count; i++) {
        base.getMatrixAt(i, _m);
        mesh.setMatrixAt(i, _m);
      }
      mesh.count = base.count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
    this.materials.forEach((m) => m.dispose());
    for (const parts of this.kitMeshes.values()) parts.forEach((mesh) => mesh.removeFromParent());
  }
}

function buildPropGeometry(id: PropId): { geo: THREE.BufferGeometry; color: string; castShadow: boolean } {
  const parts: THREE.BufferGeometry[] = [];
  if (id === 'cactus') {
    const trunk = new THREE.CylinderGeometry(0.16, 0.2, 1.6, 7);
    trunk.translate(0, 0.8, 0);
    parts.push(trunk);
    for (const side of [-1, 1]) {
      const arm = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
      arm.translate(0, 0.35, 0);
      arm.applyMatrix4(new THREE.Matrix4().makeRotationZ(side * 1.1));
      arm.applyMatrix4(new THREE.Matrix4().makeTranslation(side * 0.28, 0.95, 0));
      parts.push(arm);
    }
  } else if (id === 'totora' || id === 'cana_brava' || id === 'carrizo') {
    const tall = id === 'cana_brava' ? 2.2 : 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const reed = new THREE.CylinderGeometry(0.04, 0.05, 1.7 * tall, 4);
      reed.translate(0, 0.85 * tall, 0);
      reed.applyMatrix4(new THREE.Matrix4().makeTranslation(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14));
      parts.push(reed);
    }
  } else if (id === 'rock') {
    for (let i = 0; i < 3; i++) {
      const r = 0.25 + 0.2 * (i % 2);
      const rock = new THREE.IcosahedronGeometry(r, 0);
      rock.translate((i - 1) * 0.35, r * 0.6, ((i % 2) - 0.5) * 0.3);
      parts.push(rock);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const bush = new THREE.IcosahedronGeometry(0.4, 1);
      bush.scale(1, 0.7, 1);
      bush.translate((i - 1) * 0.3, 0.35, ((i % 2) - 0.5) * 0.3);
      parts.push(bush);
    }
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  const color = id === 'cactus' ? '#5f7a43' : id === 'rock' ? '#8a8378' : id === 'shrub' ? '#6d7a49' : '#9aa85c';
  return { geo: merged, color, castShadow: id !== 'shrub' };
}
