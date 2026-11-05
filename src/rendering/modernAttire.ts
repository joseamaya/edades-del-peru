import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { createRigAttireTools, showSharedHumanoidBody } from './rigAttire';
import {
  MODERN_SPECS,
  isModernVariant,
  modernCultureForVariant,
  modernRoleForVariant,
} from '../model/defs/modernCharacters';

/**
 * Presentation-only contemporary campaign uniform on the shared humanoid rig.
 * The green palette, helmet and assault rifle are the approximation documented
 * in `docs/historia/atuendos.md` §5; no specific unit or insignia is claimed.
 */
export function dressModern(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isModernVariant(variant)) return null;
  const culture = modernCultureForVariant(variant);
  if (!culture) return null;
  const spec = MODERN_SPECS[culture];
  const role = modernRoleForVariant(variant);
  const armed = role === 'soldier' || role === 'ranged' || role === 'sniper';
  const root = rig.root;
  const male = variant.endsWith('_m');
  const tools = createRigAttireTools(root);
  const { track, material, tint, bonePosition, attach, dispose } = tools;

  showSharedHumanoidBody(root, male);
  tint(male ? 'attire_tunic_m' : 'attire_tunic_f', spec.uniform);
  tint(male ? 'attire_wrap_m' : 'attire_skirt_f', spec.trousers);
  root.updateMatrixWorld(true);

  const spine = bonePosition('spine_03');
  const head = bonePosition('Head');
  const hand = bonePosition('hand_r');
  const vestMat = material(spec.vest, 0.95);
  const helmetMat = material(spec.helmet, 0.65);
  const metalMat = material(0x34393d, 0.45, 0.6);
  const leatherMat = material(0x2f2a22, 0.95);

  if (spine && armed) {
    const vest = new THREE.Mesh(track(new THREE.CylinderGeometry(0.21, 0.235, 0.36, 10, 1, true)), vestMat);
    vest.name = 'attire_modern_vest';
    attach('spine_03', vest, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z));
  }

  if (head && armed) {
    const helmet = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
      helmetMat,
    );
    helmet.name = 'attire_modern_helmet';
    attach('Head', helmet, new THREE.Vector3(head.x, head.y + 0.12, head.z));
  }

  if (hand && armed) {
    const weapon = new THREE.Group();
    weapon.name = 'attire_modern_weapon';
    const isSniper = role === 'sniper';
    const barrel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.014, isSniper ? 0.78 : 0.62, 6)), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, isSniper ? -0.32 : -0.24);
    weapon.add(barrel);
    if (isSniper) {
      const scope = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6)), metalMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.1, 0.02);
      weapon.add(scope);
    }
    const receiver = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.08, 0.3)), metalMat);
    receiver.position.set(0, 0, 0.1);
    weapon.add(receiver);
    const magazine = new THREE.Mesh(track(new THREE.BoxGeometry(0.035, 0.16, 0.07)), metalMat);
    magazine.position.set(0, -0.1, 0.06);
    magazine.rotation.x = 0.25;
    weapon.add(magazine);
    const stock = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.09, 0.22)), leatherMat);
    stock.position.set(0, -0.01, 0.34);
    weapon.add(stock);
    weapon.rotation.set(-0.2, 0, 0);
    attach('hand_r', weapon, hand.clone());
  }

  if (role === 'missionary' && spine) {
    const crossMat = material(0xc8a040, 0.5, 0.4);
    for (const [w, h] of [
      [0.035, 0.16],
      [0.12, 0.035],
    ]) {
      const bar = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, 0.015)), crossMat);
      bar.name = 'attire_modern_cross';
      attach('spine_03', bar, new THREE.Vector3(spine.x, spine.y + 0.06, spine.z + 0.17));
    }
  }

  let carry: THREE.Group | null = null;
  let carryBag: THREE.Mesh | null = null;
  if (role === 'worker' && spine) {
    carry = new THREE.Group();
    carry.name = 'attire_modern_carry';
    carry.visible = false;
    const carryMat = material(0x5a5240, 0.95);
    carryBag = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.26, 0.16)), carryMat);
    carry.add(carryBag);
    const flap = new THREE.Mesh(track(new THREE.BoxGeometry(0.23, 0.05, 0.17)), material(0x3f3a2c, 0.9));
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
      const weapon = root.getObjectByName('attire_modern_weapon');
      if (weapon) weapon.visible = task !== 'build';
    },
    dispose,
  };
}
