import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Copy every attribute to plain Float32 (meshopt GLBs use KHR_mesh_quantization: normalized
 * integers with the scale on the node), so baking the node transform cannot clip them.
 */
export function dequantize(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const src = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const data = new Float32Array(src.count * src.itemSize);
    for (let i = 0; i < src.count; i++) {
      for (let c = 0; c < src.itemSize; c++) data[i * src.itemSize + c] = src.getComponent(i, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, src.itemSize));
  }
  if (geometry.index) out.setIndex(Array.from(geometry.index.array as ArrayLike<number>));
  return out;
}

function visibleUpTo(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === root) return true;
  }
  return true;
}

/**
 * Merge the visible static meshes under `root` that share a material (and shadow flags and
 * attribute layout) into one mesh each, parented to `root`: an authored site exported as one node
 * per building part draws one call per material instead of one per part, in the main and the
 * shadow pass. Meshes for which `keep` returns true (and hidden, skinned or multi-material meshes)
 * are left untouched. Returns how many meshes were removed.
 */
export function mergeStaticByMaterial(root: THREE.Object3D, keep: (mesh: THREE.Mesh) => boolean = () => false): number {
  root.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(mesh.material)) return;
    if (!visibleUpTo(mesh, root) || keep(mesh)) return;
    const layout = Object.keys(mesh.geometry.attributes).sort().join(',');
    const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${layout}|${!!mesh.geometry.index}`;
    const list = groups.get(key) ?? [];
    list.push(mesh);
    groups.set(key, list);
  });
  let removed = 0;
  const matrix = new THREE.Matrix4();
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((mesh) => {
      const geometry = dequantize(mesh.geometry);
      return geometry.applyMatrix4(matrix.multiplyMatrices(toRoot, mesh.matrixWorld));
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const first = meshes[0];
    const out = new THREE.Mesh(merged, first.material);
    out.name = `merged:${(first.material as THREE.Material).name || first.name}`;
    out.castShadow = first.castShadow;
    out.receiveShadow = first.receiveShadow;
    root.add(out);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    removed += meshes.length - 1;
  }
  return removed;
}
