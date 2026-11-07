import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeStaticByMaterial } from '../src/rendering/mergeStatic';
import { CONSOLIDATED_SOURCE_LAYER, consolidateRig } from '../src/rendering/modelConsolidation';
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

describe('consolidateRig', () => {
  /** A two-bone skinned strip; `offset` re-binds it in another space (as separate glTF skins do). */
  function rig(): { root: THREE.Group; bones: THREE.Bone[] } {
    const root = new THREE.Group();
    const hip = new THREE.Bone();
    const knee = new THREE.Bone();
    knee.position.y = 1;
    hip.add(knee);
    root.add(hip);
    root.updateMatrixWorld(true);
    return { root, bones: [hip, knee] };
  }

  function part(bones: THREE.Bone[], color: number, offset: THREE.Matrix4): THREE.SkinnedMesh {
    const geometry = new THREE.PlaneGeometry(0.4, 2, 1, 2).translate(0, 1, 0);
    // Vertices live in the offset space; the inverse binds absorb the offset.
    geometry.applyMatrix4(offset.clone().invert());
    const n = geometry.getAttribute('position').count;
    const skinIndex = new Uint16Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const y = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('position'), i).applyMatrix4(offset).y;
      skinIndex[i * 4] = y > 0.5 ? 1 : 0;
      skinWeight[i * 4] = 1;
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    const inverses = bones.map((b) => b.matrixWorld.clone().invert().multiply(offset));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ color }));
    mesh.bind(new THREE.Skeleton(bones, inverses), new THREE.Matrix4());
    return mesh;
  }

  function skinnedPositions(mesh: THREE.SkinnedMesh): THREE.Vector3[] {
    mesh.skeleton.update();
    const out: THREE.Vector3[] = [];
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      out.push(mesh.applyBoneTransform(i, v).applyMatrix4(mesh.matrixWorld));
    }
    return out;
  }

  it('merges skins bound in different spaces and keeps them on the animated bones', () => {
    const { root, bones } = rig();
    const a = part(bones, 0xff0000, new THREE.Matrix4());
    const b = part(
      bones,
      0x00ff00,
      new THREE.Matrix4().makeTranslation(0.3, -0.2, 0.1).scale(new THREE.Vector3(2, 2, 2)),
    );
    root.add(a, b);
    // Pose away from the bind pose before merging, then again after.
    bones[1].rotation.z = 0.7;
    root.updateMatrixWorld(true);
    const expected = [...skinnedPositions(a), ...skinnedPositions(b)];

    const result = consolidateRig(root);
    expect(result.meshes).toHaveLength(1);
    expect(a.layers.mask).toBe((1 << CONSOLIDATED_SOURCE_LAYER) >>> 0);
    const merged = result.meshes[0];
    root.updateMatrixWorld(true);
    const actual = skinnedPositions(merged);
    expect(actual).toHaveLength(expected.length);
    actual.forEach((v, i) => expect(v.distanceTo(expected[i])).toBeLessThan(1e-4));
    // Material colours are baked per part.
    const color = merged.geometry.getAttribute('color');
    expect([color.getX(0), color.getY(0)]).toEqual([1, 0]);
    expect([color.getX(color.count - 1), color.getY(color.count - 1)]).toEqual([0, 1]);
  });

  it('leaves hidden and textured-differently parts alone', () => {
    const { root, bones } = rig();
    const a = part(bones, 0xff0000, new THREE.Matrix4());
    const b = part(bones, 0x00ff00, new THREE.Matrix4());
    b.visible = false;
    root.add(a, b);
    expect(consolidateRig(root).meshes).toHaveLength(0);
    expect(a.layers.mask).toBe(1);
  });
});
