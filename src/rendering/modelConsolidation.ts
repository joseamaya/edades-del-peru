import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'envMap',
] as const;

interface Candidate {
  mesh: THREE.SkinnedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
}

function isBakeable(material: THREE.Material): material is THREE.MeshStandardMaterial {
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || m.transparent || m.alphaTest > 0) return false;
  for (const slot of TEXTURE_SLOTS) if (m[slot]) return false;
  return true;
}

function sameLayout(a: THREE.BufferGeometry, b: THREE.BufferGeometry): boolean {
  const an = Object.keys(a.attributes).sort();
  const bn = Object.keys(b.attributes).sort();
  if (an.length !== bn.length) return false;
  for (let i = 0; i < an.length; i++) {
    if (an[i] !== bn[i]) return false;
    const aa = a.attributes[an[i]];
    const ba = b.attributes[bn[i]];
    if (aa.itemSize !== ba.itemSize || aa.normalized !== ba.normalized) return false;
  }
  return true;
}

function bakeColor(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial): THREE.BufferGeometry {
  const out = geometry.clone();
  const count = out.getAttribute('position').count;
  const existing = out.getAttribute('color');
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = material.color.r * (existing ? existing.getX(i) : 1);
    colors[i * 3 + 1] = material.color.g * (existing ? existing.getY(i) : 1);
    colors[i * 3 + 2] = material.color.b * (existing ? existing.getZ(i) : 1);
  }
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return out;
}

/**
 * Merge a skinned mesh's flat-coloured primitives into one mesh/material by
 * baking each material colour into vertex colours. Textured or transparent
 * materials are left untouched because merging them would change the look.
 * Returns the number of primitives that were merged.
 */
export function consolidateSkinnedPrimitives(root: THREE.Object3D): number {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh) meshes.push(mesh);
  });

  const groups = new Map<string, THREE.SkinnedMesh[]>();
  for (const mesh of meshes) {
    if (!mesh.skeleton || !mesh.parent) continue;
    const key = `${mesh.skeleton.uuid}:${mesh.parent.uuid}`;
    const group = groups.get(key);
    if (group) group.push(mesh);
    else groups.set(key, [mesh]);
  }

  let merged = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const candidates: Candidate[] = [];
    let skip = false;
    for (const mesh of group) {
      const material = mesh.material;
      if (Array.isArray(material) || !isBakeable(material) || !mesh.geometry.getAttribute('skinIndex')) {
        skip = true;
        break;
      }
      candidates.push({ mesh, geometry: bakeColor(mesh.geometry, material), material });
    }
    if (skip || candidates.length < 2 || !candidates.every((c) => sameLayout(c.geometry, candidates[0].geometry))) {
      for (const c of candidates) c.geometry.dispose();
      continue;
    }

    const geometry = mergeGeometries(
      candidates.map((c) => c.geometry),
      false,
    );
    if (!geometry) {
      for (const c of candidates) c.geometry.dispose();
      continue;
    }

    const first = candidates[0];
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: first.material.roughness,
      metalness: first.material.metalness,
      side: first.material.side,
      flatShading: first.material.flatShading,
    });
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = `${first.mesh.name || 'skinned'}:consolidated`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.bindMode = first.mesh.bindMode;
    mesh.bind(first.mesh.skeleton, first.mesh.bindMatrix);
    first.mesh.parent!.add(mesh);

    const keptGeometries = new Set<THREE.BufferGeometry>();
    const keptMaterials = new Set<THREE.Material>();
    root.traverse((object) => {
      const other = object as THREE.Mesh;
      if (!other.isMesh || group.includes(other as THREE.SkinnedMesh)) return;
      if (other.geometry) keptGeometries.add(other.geometry);
      const mats = Array.isArray(other.material) ? other.material : [other.material];
      for (const m of mats) if (m) keptMaterials.add(m);
    });

    for (const c of candidates) {
      c.mesh.removeFromParent();
      c.geometry.dispose();
      if (!keptGeometries.has(c.mesh.geometry)) c.mesh.geometry.dispose();
      if (!keptMaterials.has(c.material)) c.material.dispose();
    }
    merged += candidates.length;
  }
  return merged;
}
