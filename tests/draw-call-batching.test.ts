import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeStaticByMaterial } from '../src/rendering/mergeStatic';
import { SHADOW_FRAME_MAX, SHADOW_FRAME_MIN, shadowFrameFor, snapShadowFrame } from '../src/rendering/shadowFrame';

function box(material: THREE.Material, x: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.x = x;
  mesh.castShadow = true;
  return mesh;
}

function worldBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
}

describe('mergeStaticByMaterial', () => {
  it('merges meshes per material and keeps their world placement', () => {
    const a = new THREE.MeshStandardMaterial();
    const b = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    root.position.set(10, 0, 0);
    root.scale.setScalar(2);
    const nested = new THREE.Group();
    nested.position.z = 3;
    nested.add(box(a, 1));
    root.add(box(a, -1), box(a, 4), box(b, 0), nested);
    const before = worldBox(root);

    expect(mergeStaticByMaterial(root)).toBe(2);
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
    expect(meshes).toHaveLength(2);
    expect(meshes.find((m) => m.material === a)?.castShadow).toBe(true);
    const after = worldBox(root);
    expect(after.min.distanceTo(before.min)).toBeLessThan(1e-5);
    expect(after.max.distanceTo(before.max)).toBeLessThan(1e-5);
  });

  it('leaves hidden and kept meshes alone', () => {
    const a = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    const hidden = box(a, 0);
    hidden.visible = false;
    const kept = box(a, 2);
    kept.userData.heritageId = 'x';
    root.add(box(a, 4), box(a, 6), hidden, kept);
    expect(mergeStaticByMaterial(root, (m) => !!m.userData.heritageId)).toBe(1);
    expect(root.children).toContain(hidden);
    expect(root.children).toContain(kept);
  });
});

describe('shadow frame', () => {
  const camera = new THREE.PerspectiveCamera(48, 16 / 9, 1, 2000);

  function view(height: number): void {
    camera.position.set(100, height, 100 + height / Math.tan(0.9));
    camera.lookAt(100, 0, 100);
    camera.updateMatrixWorld();
  }

  it('grows with the zoom, within bounds, around the visible ground', () => {
    view(30);
    const near = shadowFrameFor(camera, 0);
    view(120);
    const far = shadowFrameFor(camera, 0);
    expect(far.extent).toBeGreaterThan(near.extent);
    for (const f of [near, far]) {
      expect(f.extent).toBeGreaterThanOrEqual(SHADOW_FRAME_MIN);
      expect(f.extent).toBeLessThanOrEqual(SHADOW_FRAME_MAX);
      // The look-at point is inside the framed square.
      expect(Math.abs(f.x - 100)).toBeLessThan(f.extent);
      expect(Math.abs(f.z - 100)).toBeLessThan(f.extent);
    }
  });

  it('snaps to whole texels so small pans do not move the frame', () => {
    const sun = new THREE.Vector3(0.5, 0.7, 0.4).normalize();
    const a = snapShadowFrame({ x: 100, y: 0, z: 100, extent: 70 }, sun, 4096);
    const b = snapShadowFrame({ x: 100.001, y: 0, z: 100.001, extent: 70 }, sun, 4096);
    expect(a.extent).toBe(72);
    // Only the depth along the sun ray may differ, which does not move anything on the shadow map.
    const delta = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    expect(delta.clone().cross(sun).length()).toBeLessThan(1e-9);
  });
});
