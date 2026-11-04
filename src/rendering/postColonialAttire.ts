import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import {
  POST_COLONIAL_SPECS,
  isPostColonialVariant,
  postColonialCultureForVariant,
  postColonialRoleForVariant,
} from '../model/defs/postColonialCharacters';

/**
 * Presentation-only colonial/republican uniforms on the shared humanoid rig.
 * The coat/hat/weapon colours and silhouettes follow the abstractions in
 * `docs/historia/atuendos.md` §6; no new historical claim is introduced.
 */
export function dressPostColonial(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isPostColonialVariant(variant)) return null;
  const culture = postColonialCultureForVariant(variant);
  if (!culture) return null;
  const spec = POST_COLONIAL_SPECS[culture];
  const role = postColonialRoleForVariant(variant);
  const root = rig.root;
  const male = variant.endsWith('_m');
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(geometry: T): T => {
    ownedGeometries.push(geometry);
    return geometry;
  };
  const material = (color: number, roughness = 0.9, metalness = 0): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    ownedMaterials.push(m);
    return m;
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
  const attach = (boneName: string, object: THREE.Object3D, position: THREE.Vector3): void => {
    const b = bone(boneName);
    if (!b) return;
    object.position.copy(position);
    object.updateMatrixWorld(true);
    b.attach(object);
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
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
  tint(male ? 'attire_tunic_m' : 'attire_tunic_f', spec.coat);
  tint(male ? 'attire_wrap_m' : 'attire_skirt_f', spec.trousers);
  root.updateMatrixWorld(true);

  const spine = bonePosition('spine_03');
  const head = bonePosition('Head');
  const hand = bonePosition('hand_r');
  const coatMat = material(spec.coat, 0.95);
  const trimMat = material(spec.trim, 0.8);
  const leatherMat = material(0x3a2a1c, 0.95);
  const metalMat = material(0x8a8f94, 0.4, 0.65);

  if (spine) {
    const coat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.24, 0.58, 10, 1, true)), coatMat);
    coat.name = 'attire_post_coat';
    attach('spine_03', coat, new THREE.Vector3(spine.x, spine.y - 0.12, spine.z));
    const belt = new THREE.Mesh(track(new THREE.TorusGeometry(0.21, 0.018, 5, 16)), leatherMat);
    belt.name = 'attire_post_belt';
    belt.rotation.x = Math.PI / 2;
    attach('spine_03', belt, new THREE.Vector3(spine.x, spine.y - 0.34, spine.z));
    if (role === 'missionary') {
      const robe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.34, 0.85, 10, 1, true)), coatMat);
      robe.name = 'attire_post_robe';
      attach('spine_03', robe, new THREE.Vector3(spine.x, spine.y - 0.45, spine.z));
      const crossMat = material(0xc8a040, 0.5, 0.4);
      for (const [w, h] of [
        [0.035, 0.16],
        [0.12, 0.035],
      ]) {
        const bar = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, 0.015)), crossMat);
        bar.name = 'attire_post_cross';
        attach('spine_03', bar, new THREE.Vector3(spine.x, spine.y + 0.06, spine.z + 0.17));
      }
    }
  }

  if (head) {
    const hatMat = material(spec.hat === 'morion' ? 0x8a8f94 : spec.hat === 'bicorn' ? 0x24262c : 0x2b2f36, 0.7);
    let hat: THREE.Mesh;
    if (spec.hat === 'morion') {
      hat = new THREE.Mesh(track(new THREE.ConeGeometry(0.14, 0.16, 8)), hatMat);
      hat.rotation.z = 0.18;
    } else if (spec.hat === 'bicorn') {
      hat = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.07, 0.18)), hatMat);
      hat.rotation.z = 0.1;
    } else {
      hat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10)), hatMat);
    }
    hat.name = 'attire_post_hat';
    attach('Head', hat, new THREE.Vector3(head.x, head.y + 0.19, head.z));
  }

  if (hand && role !== 'missionary') {
    const weapon = new THREE.Group();
    weapon.name = 'attire_post_weapon';
    const isRifle = spec.weapon === 'rifle';
    if (spec.weapon === 'musket' || isRifle) {
      const barrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.016, 0.02, 0.92, 6)), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.05, -0.2);
      weapon.add(barrel);
      const stock = new THREE.Mesh(track(new THREE.BoxGeometry(0.07, 0.1, 0.3)), leatherMat);
      stock.position.set(0, -0.02, 0.18);
      weapon.add(stock);
      const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.026, 0.008, 4, 8)), trimMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.05, -0.55);
      weapon.add(band);
    } else {
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.025, 0.72, 0.035)), metalMat);
      blade.position.y = -0.25;
      weapon.add(blade);
      const guard = new THREE.Mesh(track(new THREE.TorusGeometry(0.06, 0.01, 4, 10)), trimMat);
      guard.rotation.x = Math.PI / 2;
      weapon.add(guard);
    }
    weapon.rotation.set(-0.2, 0, 0);
    attach('hand_r', weapon, hand.clone());
  }

  let task: RigClipState = 'idle';
  return {
    setTask(next: RigClipState): void {
      task = next;
      if (role === 'missionary') return;
      const weapon = root.getObjectByName('attire_post_weapon');
      if (weapon) weapon.visible = task !== 'build';
    },
    dispose(): void {
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const mat of ownedMaterials) mat.dispose();
    },
  };
}
