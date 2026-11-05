import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { createRigAttireTools, showSharedHumanoidBody } from './rigAttire';
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
  const armed = role === 'soldier' || role === 'ranged';
  const civilian = role === 'worker' || role === 'scout';
  const root = rig.root;
  const male = variant.endsWith('_m');
  const tools = createRigAttireTools(root);
  const { track, material, tint, bonePosition, attach, dispose } = tools;

  showSharedHumanoidBody(root, male);
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
    if (!civilian) {
      const coat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.24, 0.58, 10, 1, true)), coatMat);
      coat.name = 'attire_post_coat';
      attach('spine_03', coat, new THREE.Vector3(spine.x, spine.y - 0.12, spine.z));
      const belt = new THREE.Mesh(track(new THREE.TorusGeometry(0.21, 0.018, 5, 16)), leatherMat);
      belt.name = 'attire_post_belt';
      belt.rotation.x = Math.PI / 2;
      attach('spine_03', belt, new THREE.Vector3(spine.x, spine.y - 0.34, spine.z));
    }
    if (spec.sidearm === 'sword' && armed) {
      const scabbard = new THREE.Mesh(track(new THREE.BoxGeometry(0.025, 0.55, 0.04)), leatherMat);
      scabbard.name = 'attire_post_sword';
      scabbard.rotation.z = 0.35;
      attach('spine_03', scabbard, new THREE.Vector3(spine.x + 0.2, spine.y - 0.28, spine.z + 0.08));
    }
    if (role === 'missionary') {
      const robeMat = material(0x6a5a48, 0.95);
      const robe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.34, 0.85, 10, 1, true)), robeMat);
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

  if (head && !civilian) {
    const hatMat = material(spec.hatColor, 0.7);
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

  if (hand && armed) {
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

  let carry: THREE.Group | null = null;
  let carryBag: THREE.Mesh | null = null;
  if (role === 'worker' && spine) {
    carry = new THREE.Group();
    carry.name = 'attire_post_carry';
    carry.visible = false;
    const carryMat = material(0x8a6a3a, 0.95);
    carryBag = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.26, 0.16)), carryMat);
    carry.add(carryBag);
    const flap = new THREE.Mesh(track(new THREE.BoxGeometry(0.23, 0.05, 0.17)), material(0x6b4a2f, 0.9));
    flap.position.y = 0.13;
    carry.add(flap);
    attach('spine_03', carry, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z - 0.17));
  }

  let task: RigClipState = 'idle';
  return {
    setCarrying(next: boolean, color?: number): void {
      if (!carry) return;
      carry.visible = next;
      if (next && color !== undefined && carryBag) {
        (carryBag.material as THREE.MeshStandardMaterial).color.setHex(color);
      }
    },
    setTask(next: RigClipState): void {
      task = next;
      const weapon = root.getObjectByName('attire_post_weapon');
      if (weapon) weapon.visible = task !== 'build';
    },
    dispose,
  };
}
