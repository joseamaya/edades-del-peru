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

/**
 * Layer for meshes replaced by a consolidated copy: they stay in the hierarchy (names, visibility
 * and materials remain inspectable) but neither the camera nor the shadow pass draws layer 31.
 */
export const CONSOLIDATED_SOURCE_LAYER = 31;

export interface RigConsolidation {
  meshes: THREE.SkinnedMesh[];
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

interface RigPart {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  /** Bone that carries a rigid (non-skinned) part. */
  bone: THREE.Bone | null;
}

function shownUpTo(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === root) return true;
  }
  return false;
}

/** Only flat colours or one shared base-colour map: those survive baking the colour into vertices. */
function consolidatableMaterial(material: THREE.Material | THREE.Material[]): THREE.MeshStandardMaterial | null {
  if (Array.isArray(material)) return null;
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || m.transparent || m.alphaTest > 0 || m.vertexColors) return null;
  for (const slot of TEXTURE_SLOTS) if (slot !== 'map' && m[slot]) return null;
  return m;
}

const _eps = 1e-4;
function sameMatrix(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > _eps) return false;
  return true;
}

/**
 * Merge a dressed rig's visible skinned meshes (and named rigid parts parented to a bone) into one
 * skinned mesh per base-colour map: material colours are baked into vertex colours and every part's
 * bones are remapped onto one shared skeleton. A worker's hair, eyebrows, sash and headband become
 * one draw call, its tunic and skirt another. Parts that would change the look (other texture slots,
 * transparency, existing vertex colours) or whose bind pose disagrees are left as they are; the
 * merged sources move to `CONSOLIDATED_SOURCE_LAYER`. Call after the variant is final (visibility and
 * tints), and never on parts whose visibility changes later.
 */
export function consolidateRig(root: THREE.Object3D, rigidNames: readonly string[] = []): RigConsolidation {
  const out: RigConsolidation = { meshes: [], geometries: [], materials: [] };
  root.updateMatrixWorld(true);
  const groups = new Map<string, RigPart[]>();
  const rigid = new Set(rigidNames);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !shownUpTo(mesh, root)) return;
    const material = consolidatableMaterial(mesh.material);
    if (!material) return;
    const skinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
    const bone =
      !skinned && rigid.has(mesh.name) && (mesh.parent as THREE.Bone)?.isBone ? (mesh.parent as THREE.Bone) : null;
    if (!skinned && !bone) return;
    if (skinned && !mesh.geometry.getAttribute('skinIndex')) return;
    const key = `${material.map?.uuid ?? 'flat'}|${mesh.castShadow}|${mesh.receiveShadow}`;
    const list = groups.get(key) ?? [];
    list.push({ mesh, material, bone });
    groups.set(key, list);
  });

  for (const parts of groups.values()) {
    const anchor = parts.find((p) => !p.bone)?.mesh as THREE.SkinnedMesh | undefined;
    if (parts.length < 2 || !anchor) continue;
    const bones = [...anchor.skeleton.bones];
    const inverses = anchor.skeleton.boneInverses.map((m) => m.clone());
    const boneIndex = new Map(bones.map((b, i) => [b, i]));
    const bindInverse = anchor.bindMatrix.clone().invert();
    const hasMap = !!parts[0].material.map;
    const geometries: THREE.BufferGeometry[] = [];
    const merged: RigPart[] = [];
    for (const part of parts) {
      const g = partGeometry(part, bones, inverses, boneIndex, bindInverse, hasMap);
      if (!g) continue;
      geometries.push(g);
      merged.push(part);
    }
    if (merged.length < 2) {
      geometries.forEach((g) => g.dispose());
      continue;
    }
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!geometry) continue;
    const base = merged[0].material;
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: base.map,
      roughness: base.roughness,
      metalness: base.metalness,
      // Closed rigid parts render the same double-sided; open garments need it.
      side: merged.some((p) => p.material.side !== THREE.FrontSide) ? THREE.DoubleSide : THREE.FrontSide,
    });
    material.name = `${base.name || 'rig'}:consolidated`;
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = 'rig:consolidated';
    mesh.castShadow = anchor.castShadow;
    mesh.receiveShadow = anchor.receiveShadow;
    mesh.frustumCulled = false;
    mesh.bindMode = anchor.bindMode;
    anchor.parent!.add(mesh);
    mesh.position.copy(anchor.position);
    mesh.quaternion.copy(anchor.quaternion);
    mesh.scale.copy(anchor.scale);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones, inverses), anchor.bindMatrix);
    for (const part of merged) part.mesh.layers.set(CONSOLIDATED_SOURCE_LAYER);
    out.meshes.push(mesh);
    out.geometries.push(geometry);
    out.materials.push(material);
  }
  return out;
}

/**
 * One part's geometry in the anchor's bind space: position, normal, optional uv, colour (material
 * colour × existing colour) and skin attributes remapped onto the shared bone list. Null when its
 * skeleton disagrees with the shared one.
 */
function partGeometry(
  part: RigPart,
  bones: THREE.Bone[],
  inverses: THREE.Matrix4[],
  boneIndex: Map<THREE.Bone, number>,
  bindInverse: THREE.Matrix4,
  hasMap: boolean,
): THREE.BufferGeometry | null {
  const src = part.mesh.geometry;
  const pos = src.getAttribute('position');
  const count = pos.count;
  const remap: number[] = [];
  let toAnchor: THREE.Matrix4;
  if (part.bone) {
    // Rigid part on a bone: weight 1 on that bone. world = bone · local · v must equal
    // bone · inverse(bone) · bind · v', so v' = bind⁻¹ · inverse(bone)⁻¹ · local · v.
    const index = boneIndex.get(part.bone);
    if (index === undefined) return null;
    toAnchor = bindInverse.clone().multiply(inverses[index].clone().invert()).multiply(part.mesh.matrix);
    remap.push(index);
  } else {
    // Each glTF skin may be bound in its own space: its inverse bind matrices can differ from the
    // shared ones by one constant transform C (shared⁻¹ · own, the same for every bone). The part is
    // re-expressed in the shared space with C; a part whose offset is not constant is left alone.
    const skinned = part.mesh as THREE.SkinnedMesh;
    const { bones: own, boneInverses: ownInverses } = skinned.skeleton;
    let offset: THREE.Matrix4 | null = null;
    for (let i = 0; i < own.length; i++) {
      const index = boneIndex.get(own[i]);
      if (index === undefined) continue;
      const c = inverses[index].clone().invert().multiply(ownInverses[i]);
      if (!offset) offset = c;
      else if (!sameMatrix(offset, c)) return null;
    }
    if (!offset) return null;
    const offsetInverse = offset.clone().invert();
    for (let i = 0; i < own.length; i++) {
      let index = boneIndex.get(own[i]);
      if (index === undefined) {
        index = bones.length;
        bones.push(own[i]);
        inverses.push(ownInverses[i].clone().multiply(offsetInverse));
        boneIndex.set(own[i], index);
      }
      remap.push(index);
    }
    toAnchor = bindInverse.clone().multiply(offset).multiply(skinned.bindMatrix);
  }
  const g = new THREE.BufferGeometry();
  const copy = (name: string, itemSize: number): Float32Array | null => {
    const a = src.getAttribute(name);
    if (!a) return null;
    const data = new Float32Array(count * itemSize);
    for (let i = 0; i < count; i++) for (let c = 0; c < itemSize; c++) data[i * itemSize + c] = a.getComponent(i, c);
    return data;
  };
  g.setAttribute('position', new THREE.BufferAttribute(copy('position', 3)!, 3));
  const normal = copy('normal', 3);
  if (!normal) return null;
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  if (hasMap) {
    const uv = copy('uv', 2);
    if (!uv) return null;
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const existing = src.getAttribute('color');
  const colors = new Float32Array(count * 3);
  const c = part.material.color;
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r * (existing ? existing.getX(i) : 1);
    colors[i * 3 + 1] = c.g * (existing ? existing.getY(i) : 1);
    colors[i * 3 + 2] = c.b * (existing ? existing.getZ(i) : 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const skinIndex = new Float32Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  if (part.bone) {
    for (let i = 0; i < count; i++) {
      skinIndex[i * 4] = remap[0];
      skinWeight[i * 4] = 1;
    }
  } else {
    const si = src.getAttribute('skinIndex');
    const sw = src.getAttribute('skinWeight');
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 4; k++) {
        skinIndex[i * 4 + k] = remap[si.getComponent(i, k)] ?? 0;
        skinWeight[i * 4 + k] = sw.getComponent(i, k);
      }
    }
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  const index = src.index
    ? Array.from(src.index.array as ArrayLike<number>)
    : Array.from({ length: count }, (_, i) => i);
  g.setIndex(index);
  g.applyMatrix4(toAnchor);
  return g;
}
