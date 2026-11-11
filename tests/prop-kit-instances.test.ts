import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PropKitInstances } from '../src/rendering/PropKitInstances';
import type { PropsKitModel } from '../src/rendering/propsKit';

const model: PropsKitModel = {
  id: 'granodiorite',
  lods: [
    [{ geometry: new THREE.BoxGeometry(2, 1, 2), material: new THREE.MeshStandardMaterial() }],
    [{ geometry: new THREE.BoxGeometry(1, 0.5, 1), material: new THREE.MeshStandardMaterial() }],
  ],
};

const meshOf = (mgr: THREE.Scene, name = 'props_kit_granodiorite_lod0'): THREE.InstancedMesh => {
  const mesh = mgr.getObjectByName(name);
  if (!mesh) throw new Error('missing quarry instanced mesh');
  return mesh as THREE.InstancedMesh;
};

describe('quarry instancing', () => {
  it('waits for the kit, then hides the procedural fallback through the ready callback', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, () => 0);
    let ready = 0;
    mgr.register(1, 0, 0, 0, 1, () => ready++);
    expect(ready).toBe(0);
    mgr.attachKit(model);
    expect(ready).toBe(1);
    expect(meshOf(scene).count).toBe(1);
    mgr.dispose();
  });

  it('sits on the terrain and follows its normal', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, (x, z) => x * 0.5 + z * 0.1);
    mgr.attachKit(model);
    mgr.register(1, 10, 4, 0, 1);
    const matrix = new THREE.Matrix4();
    meshOf(scene).getMatrixAt(0, matrix);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(pos, quat, scale);
    // Seated on the lowest corner of the footprint, not just the centre.
    const centre = 10 * 0.5 + 4 * 0.1;
    expect(pos.y).toBeLessThan(centre - 0.1);
    expect(pos.y).toBeGreaterThan(centre - 1.6);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    expect(up.y).toBeLessThan(1);
    expect(Math.abs(up.x)).toBeGreaterThan(0.01);
    expect(scale.x).toBeCloseTo(1, 5);
    mgr.dispose();
  });

  it('switches far outcrops to LOD1', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, () => 0);
    mgr.attachKit(model);
    mgr.register(1, 100, 0, 0, 1);
    mgr.update({ x: 0, z: 0 });
    expect(meshOf(scene, 'props_kit_granodiorite_lod0').count).toBe(0);
    expect(meshOf(scene, 'props_kit_granodiorite_lod1').count).toBe(1);
    mgr.dispose();
  });

  it('keeps a shrub upright: yaw only, seated on the sampled height', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, (x, z) => x * 0.5 + z * 0.1, { x: 0, z: 0 }, { tilt: false, sink: 0.06 });
    mgr.attachKit({ id: 'pacae', lods: model.lods });
    mgr.register(3, 10, 4, 0.7, 1);
    const matrix = new THREE.Matrix4();
    meshOf(scene, 'props_kit_pacae_lod0').getMatrixAt(0, matrix);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    matrix.decompose(pos, quat, new THREE.Vector3());
    expect(pos.y).toBeCloseTo(10 * 0.5 + 4 * 0.1 - 0.06, 5);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    expect(up.y).toBeCloseTo(1, 5);
    // The yaw still applies around the vertical.
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(quat).z).not.toBeCloseTo(0, 3);
    mgr.dispose();
  });

  it('maps a ray hit back to the resource node', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, () => 0);
    mgr.attachKit(model);
    mgr.register(7, 3, 4, 0, 1);
    const ray = new THREE.Raycaster(new THREE.Vector3(3, 20, 4), new THREE.Vector3(0, -1, 0));
    const hits: { dist: number; id: number }[] = [];
    mgr.raycast(ray, hits);
    expect(hits.some((hit) => hit.id === 7)).toBe(true);
    mgr.dispose();
  });

  it('drops invisible and removed nodes from the instance count', () => {
    const scene = new THREE.Scene();
    const mgr = new PropKitInstances(scene, () => 0);
    mgr.attachKit(model);
    mgr.register(1, 0, 0, 0, 1);
    mgr.register(2, 4, 0, 0, 1);
    expect(meshOf(scene).count).toBe(2);
    mgr.setVisible(1, false);
    expect(meshOf(scene).count).toBe(1);
    mgr.unregister(2);
    expect(meshOf(scene).count).toBe(0);
    mgr.dispose();
  });
});
