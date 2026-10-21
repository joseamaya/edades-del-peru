import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyGeneratedPbr } from './Biomes';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';

export interface CaralWorkerHandle extends RigVariantHandle {
  setCarrying(carrying: boolean, color?: number): void;
}

/**
 * Dress the shared CC0 mannequin as a Caral worker. This is a presentation
 * variant (rigid attachments on the existing bones), not a new mesh: the
 * cotton loincloth/headband, hair and digging stick are project-authored
 * abstractions based on `docs/historia/atuendos.md` (Caral-Supe cotton;
 * specific garments are not documented). Geometry/materials are owned by the
 * rig instance and disposed with it; the shared body geometry is not touched.
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
  const makeMaterial = (
    color: number,
    roughness: number,
    side: THREE.Side = THREE.FrontSide,
  ): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, side });
    ownedMaterials.push(m);
    return m;
  };

  const skin = makeMaterial(0xc08a5f, 0.82);
  const hairMat = makeMaterial(0x241a12, 0.95);
  const bandMat = makeMaterial(0x8a3b2a, 0.9);
  const eyeMat = makeMaterial(0x18120e, 0.6);
  const clothMat = makeMaterial(0xc9b18a, 0.95, THREE.DoubleSide);
  const woodMat = makeMaterial(0x6b4a2f, 0.9);
  const stoneMat = makeMaterial(0x8a8f94, 0.85);
  const carryMat = makeMaterial(0x8a6a3a, 0.95);
  // Textures need a DOM; headless unit tests keep the plain cloth materials.
  if (typeof document !== 'undefined') {
    applyGeneratedPbr(clothMat, 'textile', { tint: 0xb9a88c });
    applyGeneratedPbr(carryMat, 'textile', { tint: 0x8a6a3a });
  }

  // The mannequin has a body mesh plus a joint overlay; give both the same
  // per-instance skin material so the limbs read as one continuous body.
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    if (!source) return;
    const body = source.clone();
    body.color.copy(skin.color);
    body.roughness = skin.roughness;
    body.metalness = 0;
    body.needsUpdate = true;
    mesh.material = body;
    ownedMaterials.push(body);
  });

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

  const pelvis = bonePosition('pelvis');
  const spine = bonePosition('spine_03');
  const hand = bonePosition('hand_r');
  const head = bone('Head');
  if (head) {
    const attachLocal = (boneName: string, object: THREE.Object3D, x: number, y: number, z: number): void => {
      const b = bone(boneName);
      if (!b) return;
      object.position.set(x, y, z);
      b.add(object);
      enableShadows(object);
    };

    const hair = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(0.105, 12, 10)), hairMat);
    hair.name = 'attire:hair';
    hair.scale.set(1.03, 0.95, 1.05);
    attachLocal('Head', hair, 0, 0.17, -0.03);

    const band = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.112, 0.112, 0.025, 12, 1, true)), bandMat);
    band.name = 'attire:headband';
    attachLocal('Head', band, 0, 0.16, 0);

    const eye = trackGeometry(new THREE.SphereGeometry(0.013, 6, 4));
    for (const side of [-1, 1]) {
      const e = new THREE.Mesh(eye, eyeMat);
      e.name = side < 0 ? 'attire:eye_l' : 'attire:eye_r';
      attachLocal('Head', e, side * 0.032, 0.135, 0.095);
    }

    const nose = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(0.015, 0.045, 5)), skin);
    nose.name = 'attire:nose';
    nose.rotation.x = Math.PI / 2;
    attachLocal('Head', nose, 0, 0.118, 0.108);

    const mouth = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.035, 0.006, 0.006)), eyeMat);
    mouth.name = 'attire:mouth';
    attachLocal('Head', mouth, 0, 0.072, 0.096);

    const brow = trackGeometry(new THREE.BoxGeometry(0.03, 0.006, 0.008));
    for (const side of [-1, 1]) {
      const b = new THREE.Mesh(brow, hairMat);
      attachLocal('Head', b, side * 0.033, 0.152, 0.09);
    }
  }

  const torso = bonePosition('spine_01');
  if (torso) {
    const mantle = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 12, 1, true)), clothMat);
    mantle.name = 'attire:mantle';
    attach('spine_01', mantle, new THREE.Vector3(torso.x, torso.y + 0.18, torso.z));
  }

  if (pelvis) {
    const cloth = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.14, 0.19, 0.32, 12, 1, true)), clothMat);
    cloth.name = 'attire:loincloth';
    attach('pelvis', cloth, new THREE.Vector3(pelvis.x, pelvis.y - 0.02, pelvis.z));
    const belt = new THREE.Mesh(trackGeometry(new THREE.TorusGeometry(0.145, 0.014, 6, 18)), woodMat);
    belt.rotation.x = Math.PI / 2;
    attach('pelvis', belt, new THREE.Vector3(pelvis.x, pelvis.y + 0.13, pelvis.z));
  }

  let carry: THREE.Group | null = null;
  if (spine) {
    carry = new THREE.Group();
    carry.name = 'attire:carry';
    carry.visible = false;
    const bag = new THREE.Mesh(trackGeometry(new RoundedBoxGeometry(0.2, 0.24, 0.15, 2, 0.03)), carryMat);
    carry.add(bag);
    const flap = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.21, 0.05, 0.16)), woodMat);
    flap.position.y = 0.12;
    carry.add(flap);
    attach('spine_03', carry, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z - 0.17));
  }

  let tool: THREE.Group | null = null;
  if (hand) {
    tool = new THREE.Group();
    tool.name = 'attire:tool';
    const shaft = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.015, 0.018, 0.72, 6)), woodMat);
    shaft.position.y = -0.18;
    tool.add(shaft);
    const binding = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 6)), woodMat);
    binding.position.y = -0.5;
    tool.add(binding);
    const blade = new THREE.Mesh(trackGeometry(new THREE.ConeGeometry(0.045, 0.12, 5)), stoneMat);
    blade.rotation.x = Math.PI;
    blade.position.y = -0.6;
    tool.add(blade);
    tool.rotation.set(-0.35, 0, 0.1);
    attach('hand_r', tool, new THREE.Vector3(hand.x, hand.y, hand.z));
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
