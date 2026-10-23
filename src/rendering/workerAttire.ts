import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyGeneratedPbr } from './Biomes';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import {
  ANDEAN_SPECS,
  andeanCultureForVariant,
  andeanPalette,
  andeanRoleForVariant,
  type AndeanCulture,
  type AndeanRole,
} from '../model/defs/andeanCharacters';

export interface CaralWorkerHandle extends RigVariantHandle {
  setCarrying(carrying: boolean, color?: number): void;
}

/**
 * Project-authored accessories on the finished Caral worker GLB. The body,
 * face, hair, cotton tunic, skirt and sash are part of the asset; this adds the
 * headband, the carry bundle and the digging stick on existing bones. The
 * Caral scout uses the commoner tunic/skirt or wrap plus a simple manta and
 * headband, with no chasqui belt, no gourd and no tool. The Inca chasqui set is
 * reserved (`inca_chasqui_*`) and keeps the long runner skirt and wide belt;
 * it is not assigned to Caral. Cotton is attested for Caral-Supe
 * (`docs/historia/atuendos.md`); the exact garments and props are plausible
 * abstractions, not reconstructions. No metal or footwear.
 */
export function dressCaralWorker(rig: RigInstance, variant: RigVariant = 'caral_worker_f'): CaralWorkerHandle {
  const root = rig.root;
  const chasqui = variant.startsWith('inca_chasqui');
  const scout = variant.startsWith('caral_scout');
  const andeanCulture: AndeanCulture | null = andeanCultureForVariant(variant);
  const spec = andeanCulture ? ANDEAN_SPECS[andeanCulture] : null;
  const palette = andeanCulture ? andeanPalette(andeanCulture) : null;
  const andean = spec !== null;
  const role: AndeanRole =
    (andeanCulture ? andeanRoleForVariant(variant) : null) ??
    (variant.includes('_worker_') ? 'worker' : variant.includes('_scout_') ? 'scout' : 'ranged');
  const worker = !chasqui && !scout && (!andean || role === 'worker');
  const male = variant.endsWith('_m');
  const show = (name: string, visible: boolean): void => {
    const mesh = root.getObjectByName(name);
    if (mesh) mesh.visible = visible;
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
  show('attire_skirt_f', !male && !chasqui);
  show('attire_skirt_chasqui_f', !male && chasqui);
  show('attire_wrap_m', male);
  show('attire_sash', !chasqui && !andean);
  show('attire_belt_chasqui', chasqui);
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

  const tintGarment = (name: string, color: number): void => {
    const mesh = root.getObjectByName(name) as THREE.Mesh | null;
    if (!mesh) return;
    const material = (mesh.material as THREE.MeshStandardMaterial).clone();
    material.color.setHex(color);
    ownedMaterials.push(material);
    mesh.material = material;
  };
  if (chasqui) {
    tintGarment(male ? 'attire_tunic_m' : 'attire_tunic_f', 0xe8d8b8);
  }
  if (palette) {
    tintGarment(male ? 'attire_tunic_m' : 'attire_tunic_f', palette.primary);
    tintGarment(male ? 'attire_wrap_m' : 'attire_skirt_f', palette.secondary);
  }

  const bandMat = makeMaterial(palette ? palette.accent : chasqui ? 0xc8a040 : scout ? 0x9a5a3a : 0x8a3b2a, 0.9);
  const woodMat = makeMaterial(0x6b4a2f, 0.9);
  const stoneMat = makeMaterial(0x8a8f94, 0.85);
  const carryMat = makeMaterial(0x8a6a3a, 0.95);
  const gourdMat = makeMaterial(0xb98a4a, 0.95);
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

  if (spec?.facePaint && head) {
    const paintMat = makeMaterial(0x6a2a22, 0.9);
    for (const side of [-1, 1]) {
      const mark = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.026, 0.012, 0.006)), paintMat);
      mark.name = 'attire_andean_face_paint';
      mark.position.set(side * 0.034, 0.035, 0.1);
      head.add(mark);
      enableShadows(mark);
    }
  }

  const spine = bonePosition('spine_03');
  const hand = bonePosition('hand_r');

  if (scout && spine) {
    const mantleMat = makeMaterial(0xcfc0a2, 0.95);
    const mantle = new THREE.Mesh(
      trackGeometry(new THREE.CylinderGeometry(0.2, 0.27, 0.3, 10, 1, true, Math.PI * 0.2, Math.PI * 1.6)),
      mantleMat,
    );
    mantle.name = 'attire_mantle';
    attach('spine_03', mantle, new THREE.Vector3(spine.x, spine.y - 0.01, spine.z));
  }

  if (spec && spec.manta !== 'none' && spine && palette) {
    const mantaMat = makeMaterial(palette.accent, 0.95);
    const height = spec.manta === 'long' ? 0.38 : 0.3;
    const manta = new THREE.Mesh(
      trackGeometry(new THREE.CylinderGeometry(0.2, 0.27, height, 10, 1, true, Math.PI * 0.2, Math.PI * 1.6)),
      mantaMat,
    );
    manta.name = 'attire_andean_manta';
    attach('spine_03', manta, new THREE.Vector3(spine.x, spine.y - 0.01, spine.z));
  }

  let carry: THREE.Group | null = null;
  if (worker && spine) {
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

  if (chasqui) {
    const pelvis = bonePosition('pelvis');
    if (pelvis) {
      const canteen = new THREE.Group();
      canteen.name = 'attire_canteen';
      const body = new THREE.Mesh(trackGeometry(new THREE.SphereGeometry(0.07, 10, 8)), gourdMat);
      body.scale.set(1, 1.15, 0.9);
      canteen.add(body);
      const neck = new THREE.Mesh(trackGeometry(new THREE.CylinderGeometry(0.018, 0.024, 0.06, 6)), gourdMat);
      neck.position.y = 0.09;
      canteen.add(neck);
      attach('pelvis', canteen, new THREE.Vector3(pelvis.x + 0.15, pelvis.y - 0.02, pelvis.z - 0.1));
    }
  }

  let tool: THREE.Group | null = null;
  let carrying = false;
  let task: RigClipState = 'idle';
  const syncTool = (): void => {
    if (tool) tool.visible = !carrying && task !== 'build';
  };
  if (worker && hand) {
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

  if (spec && palette && role !== 'worker' && role !== 'scout') {
    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh => {
      const mesh = new THREE.Mesh(trackGeometry(geometry), material);
      mesh.name = name;
      enableShadows(mesh);
      return mesh;
    };
    const armorMat = spec.backflap && role === 'soldier' ? makeMaterial(palette.primary, 0.95) : null;
    if (spec.shoulderSash && spine) {
      const sashMat = makeMaterial(palette.secondary, 0.95);
      const sash = addMesh(new THREE.BoxGeometry(0.07, 0.4, 0.02), sashMat, 'attire_andean_sash');
      sash.rotation.z = 0.6;
      attach('spine_03', sash, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z + 0.12));
    }
    if (spec.pectoral && spine) {
      const pectoralMat = makeMaterial(spec.metal ?? palette.accent, 0.55);
      const pectoral = addMesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.018, 16),
        pectoralMat,
        'attire_andean_pectoral',
      );
      pectoral.rotation.x = Math.PI / 2;
      attach('spine_03', pectoral, new THREE.Vector3(spine.x, spine.y + 0.08, spine.z + 0.13));
      const backplate = addMesh(new THREE.BoxGeometry(0.26, 0.24, 0.025), pectoralMat, 'attire_andean_backplate');
      attach('spine_03', backplate, new THREE.Vector3(spine.x, spine.y + 0.04, spine.z - 0.18));
    }
    const metalMat =
      spec.metal !== null && (spec.helmet || spec.ear) && (role === 'soldier' || role === 'ranged')
        ? makeMaterial(spec.metal, 0.55)
        : null;
    const shieldMat = role === 'soldier' ? makeMaterial(0x7a4a2a, 0.95) : null;
    const boneL = bonePosition('hand_l');
    const pelvis = bonePosition('pelvis');
    const headBone = bonePosition('Head');
    if (spec.helmet && role === 'soldier' && headBone && metalMat) {
      const helmet = addMesh(new THREE.ConeGeometry(0.16, 0.28, 10), metalMat, 'attire_andean_helmet');
      attach('Head', helmet, new THREE.Vector3(headBone.x, headBone.y + 0.2, headBone.z));
    }
    if (spec.backflap && role === 'soldier' && spine && armorMat) {
      const backflap = addMesh(new THREE.BoxGeometry(0.34, 0.38, 0.035), armorMat, 'attire_andean_backflap');
      attach('spine_03', backflap, new THREE.Vector3(spine.x, spine.y - 0.1, spine.z - 0.19));
    }
    if (spec.ear && headBone && metalMat) {
      for (const side of [-1, 1]) {
        const ear = addMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10), metalMat, 'attire_andean_ear');
        ear.rotation.z = Math.PI / 2;
        attach('Head', ear, new THREE.Vector3(headBone.x + side * 0.105, headBone.y, headBone.z));
      }
    }
    if (role === 'soldier' && pelvis) {
      if (spec.belt) {
        const beltMat = makeMaterial(palette.accent, 0.9);
        const belt = addMesh(new THREE.CylinderGeometry(0.255, 0.26, 0.045, 20), beltMat, 'attire_andean_belt');
        attach('pelvis', belt, new THREE.Vector3(pelvis.x, pelvis.y + 0.39, pelvis.z));
      }
      if (spec.shield && boneL && shieldMat) {
        const shield = addMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), shieldMat, 'attire_andean_shield');
        shield.rotation.z = Math.PI / 2;
        attach('hand_l', shield, new THREE.Vector3(boneL.x, boneL.y - 0.28, boneL.z));
      }
      if (hand && shieldMat) {
        const shaft = addMesh(new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6), shieldMat, 'attire_andean_macana');
        shaft.rotation.z = 0.9;
        attach('hand_r', shaft, new THREE.Vector3(hand.x, hand.y - 0.3, hand.z));
        const macanaHeadMat = spec.macanaHead === 'stone' ? stoneMat : makeMaterial(palette.accent, 0.9);
        const macanaHead = addMesh(new THREE.BoxGeometry(0.12, 0.12, 0.28), macanaHeadMat, 'attire_andean_macana_head');
        macanaHead.rotation.z = 0.9;
        attach('hand_r', macanaHead, new THREE.Vector3(hand.x, hand.y - 0.48, hand.z));
      }
    }
    if (role === 'ranged' && hand) {
      const slingMat = makeMaterial(palette.accent, 0.9);
      const sling = addMesh(new THREE.TorusGeometry(0.16, 0.012, 5, 16), slingMat, 'attire_andean_sling');
      sling.rotation.x = Math.PI / 2;
      attach('hand_r', sling, new THREE.Vector3(hand.x, hand.y - 0.35, hand.z));
    }
  }

  return {
    setCarrying(next: boolean, color?: number): void {
      carrying = next;
      if (carry) carry.visible = next;
      if (next && color !== undefined) carryMat.color.setHex(color);
      syncTool();
    },
    setTask(next: RigClipState): void {
      task = next;
      syncTool();
    },
    dispose(): void {
      for (const g of ownedGeometries) g.dispose();
      for (const m of ownedMaterials) m.dispose();
    },
  };
}
