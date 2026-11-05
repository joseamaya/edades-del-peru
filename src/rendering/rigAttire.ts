import * as THREE from 'three';

/** Shared helpers for project-authored, presentation-only rig accessories. */
export interface RigAttireTools {
  readonly ownedGeometries: THREE.BufferGeometry[];
  readonly ownedMaterials: THREE.Material[];
  track<T extends THREE.BufferGeometry>(geometry: T): T;
  material(color: number, roughness?: number, metalness?: number): THREE.MeshStandardMaterial;
  show(name: string, visible: boolean): void;
  tint(name: string, color: number): void;
  bone(name: string): THREE.Object3D | null;
  bonePosition(name: string): THREE.Vector3 | null;
  attach(boneName: string, object: THREE.Object3D, position: THREE.Vector3): void;
  enableShadows(object: THREE.Object3D): void;
  dispose(): void;
}

/** Show the shared humanoid body and hide every culture-specific attachment. */
export function showSharedHumanoidBody(root: THREE.Object3D, male: boolean): void {
  const show = (name: string, visible: boolean): void => {
    const object = root.getObjectByName(name);
    if (object) object.visible = visible;
  };
  show('Body_f', !male);
  show('Body_m', male);
  show('Hair_f', !male);
  show('Hair_m', male);
  show('Eyes_f', !male);
  show('Eyes_m', male);
  show('Eyebrows_f', !male);
  show('Eyebrows_m', male);
  show('attire_tunic_f', !male);
  show('attire_tunic_m', male);
  show('attire_skirt_f', !male);
  show('attire_wrap_m', male);
  show('attire_skirt_chasqui_f', false);
  show('attire_belt_chasqui', false);
  show('attire_sash', false);
  show('attire_headband', false);
  show('attire_mantle', false);
  show('attire_canteen', false);
  show('attire_carry', false);
  show('attire_tool', false);
}

export function createRigAttireTools(root: THREE.Object3D): RigAttireTools {
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(geometry: T): T => {
    ownedGeometries.push(geometry);
    return geometry;
  };
  const material = (color: number, roughness = 0.9, metalness = 0): THREE.MeshStandardMaterial => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    ownedMaterials.push(mat);
    return mat;
  };
  const show = (name: string, visible: boolean): void => {
    const object = root.getObjectByName(name);
    if (object) object.visible = visible;
  };
  const tint = (name: string, color: number): void => {
    const mesh = root.getObjectByName(name) as THREE.Mesh | null;
    if (!mesh) return;
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.color.setHex(color);
    ownedMaterials.push(mat);
    mesh.material = mat;
  };
  const bone = (name: string): THREE.Object3D | null => root.getObjectByName(name) ?? null;
  const bonePosition = (name: string): THREE.Vector3 | null => {
    const b = bone(name);
    if (!b) return null;
    b.updateWorldMatrix(true, false);
    return b.getWorldPosition(new THREE.Vector3());
  };
  const enableShadows = (object: THREE.Object3D): void => {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  };
  const attach = (boneName: string, object: THREE.Object3D, position: THREE.Vector3): void => {
    const b = bone(boneName);
    if (!b) return;
    object.position.copy(position);
    object.updateMatrixWorld(true);
    b.attach(object);
    enableShadows(object);
  };
  return {
    ownedGeometries,
    ownedMaterials,
    track,
    material,
    show,
    tint,
    bone,
    bonePosition,
    attach,
    enableShadows,
    dispose(): void {
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const mat of ownedMaterials) mat.dispose();
    },
  };
}
