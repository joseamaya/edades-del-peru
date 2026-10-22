import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyGeneratedPbr } from './Biomes';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';

export interface CaralWorkerHandle extends RigVariantHandle {
  setCarrying(carrying: boolean, color?: number): void;
}

/**
 * Project-authored accessories on the finished Caral worker GLB. The body,
 * face, hair, cotton tunic, skirt and sash are part of the asset; this adds the
 * headband, the carry bundle and the digging stick on existing bones. Cotton is
 * attested for Caral-Supe (`docs/historia/atuendos.md`); the exact garments and
 * props are plausible abstractions, not reconstructions. No metal or footwear.
 */
export function dressCaralWorker(rig: RigInstance): CaralWorkerHandle {
  const root = rig.root;
  root.updateMatrixWorld(true);

  const ownedGeometries: THREE.BufferGeometry[] = [];
  const ownedMaterials: THREE.Material[] = [];
  const trackGeometry = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeometries.push(g);
    return g;
  };
  const makeMaterial = (color: number, roughness: number): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    ownedMaterials.push(m);
    return m;
  };

  const bandMat = makeMaterial(0x8a3b2a, 0.9);
  const woodMat = makeMaterial(0x6b4a2f, 0.9);
  const stoneMat = makeMaterial(0x8a8f94, 0.85);
  const carryMat = makeMaterial(0x8a6a3a, 0.95);
  if (typeof document !== 'undefined') applyGeneratedPbr(carryMat, 'textile', { tint: 0x8a6a3a });

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

  const head = bone('Head');
  if (head) {
    const band = new THREE.Mesh(trackGeometry(new THREE.TorusGeometry(0.098, 0.011, 6, 20)), bandMat);
    band.name = 'attire_headband';
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.16, 0);
    head.add(band);
    enableShadows(band);
  }

  const spine = bonePosition('spine_03');
  const hand = bonePosition('hand_r');

  let carry: THREE.Group | null = null;
  if (spine) {
    carry = new THREE.Group();
    carry.name = 'attire_carry';
    carry.visible = false;
    const bag = new THREE.Mesh(trackGeometry(new RoundedBoxGeometry(0.22, 0.26, 0.16, 2, 0.035)), carryMat);
    carry.add(bag);
    const flap = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.23, 0.05, 0.17)), woodMat);
    flap.position.y = 0.13;
    carry.add(flap);
    // Tumpline cords from the bundle towards the shoulders.
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 4)), woodMat);
      cord.position.set(side * 0.08, 0.16, 0.02);
      cord.rotation.z = side * 0.25;
      carry.add(cord);
    }
    attach('spine_03', carry, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z - 0.17));
  }

  let tool: THREE.Group | null = null;
  if (hand) {
    tool = new THREE.Group();
    tool.name = 'attire_tool';
    const shaft = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.014, 0.017, 0.8, 6)), woodMat);
    shaft.position.y = -0.2;
    tool.add(shaft);
    const binding = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.021, 0.021, 0.06, 6)), woodMat);
    binding.position.y = -0.56;
    tool.add(binding);
    const blade = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(0.042, 0.12, 5)), stoneMat);
    blade.rotation.x = Math.PI;
    blade.position.y = -0.67;
    tool.add(blade);
    tool.rotation.set(-0.15, 0, 0);
    const toBody = new THREE.Vector3(root.position.x - hand.x, 0, root.position.z - hand.z).normalize();
    attach('hand_r', tool, hand.clone().addScaledVector(toBody, 0.03));
  }

  return {
    setCarrying(carrying: boolean, color?: number): void {
      if (carry) carry.visible = carrying;
      if (tool) tool.visible = !carrying;
      if (carrying && color !== undefined) carryMat.color.setHex(color);
    },
    dispose(): void {
      for (const g of ownedGeometries) g.dispose();
      for (const m of ownedMaterials) m.dispose();
    },
  };
}
