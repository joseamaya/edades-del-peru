import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { bodyOnlyShadows, createRigAttireTools, mergePieces, showSharedHumanoidBody } from './rigAttire';
import { consolidateRig } from './modelConsolidation';
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
    // One merged mesh per material: the barrel, receiver, scope and magazine are the same steel, and the
    // stock keeps the leather response. The whole group still toggles visibility as `attire_modern_weapon`.
    const isSniper = role === 'sniper';
    const steel = [
      new THREE.CylinderGeometry(0.012, 0.014, isSniper ? 0.78 : 0.62, 6)
        .rotateX(Math.PI / 2)
        .translate(0, 0.04, isSniper ? -0.32 : -0.24),
      new THREE.BoxGeometry(0.06, 0.08, 0.3).translate(0, 0, 0.1),
      new THREE.BoxGeometry(0.035, 0.16, 0.07).rotateX(0.25).translate(0, -0.1, 0.06),
    ];
    if (isSniper) {
      steel.push(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6).rotateX(Math.PI / 2).translate(0, 0.1, 0.02));
    }
    const weapon = new THREE.Group();
    weapon.name = 'attire_modern_weapon';
    const steelGeometry = mergePieces(steel);
    if (steelGeometry) weapon.add(new THREE.Mesh(track(steelGeometry), metalMat));
    const stock = mergePieces([new THREE.BoxGeometry(0.05, 0.09, 0.22).translate(0, -0.01, 0.34)]);
    if (stock) weapon.add(new THREE.Mesh(track(stock), leatherMat));
    weapon.rotation.set(-0.2, 0, 0);
    attach('hand_r', weapon, hand.clone());
  }

  if (role === 'missionary' && spine) {
    const crossMat = material(0xc8a040, 0.5, 0.4);
    const cross = mergePieces([new THREE.BoxGeometry(0.035, 0.16, 0.015), new THREE.BoxGeometry(0.12, 0.035, 0.015)]);
    if (cross) {
      const bar = new THREE.Mesh(track(cross), crossMat);
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

  // The weapon and the carry bundle toggle visibility with the task; everything else is static gear.
  const consolidated = consolidateRig(root, {
    dynamic: ['attire_modern_weapon', 'attire_modern_carry'],
    cacheKey: `modern:${root.name}:${variant}`,
  });
  tools.ownedGeometries.push(...consolidated.geometries);
  tools.ownedMaterials.push(...consolidated.materials);
  bodyOnlyShadows(root);

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
