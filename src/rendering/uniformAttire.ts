import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { PostColonialRole, PostColonialSpec } from '../model/defs/postColonialCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { createRigAttireTools, extrudedPlate, showSharedHumanoidBody, mergeColoredGeometry } from './rigAttire';
import { consolidateRig } from './modelConsolidation';

/**
 * Shared uniform dresser for the documented post-1532 cultures and the m7 rebels.
 * Coat/hat/weapon colours and silhouettes follow the abstractions in
 * `docs/historia/atuendos.md` §3–4; no new historical claim is introduced.
 *
 * The worker tunic is the coat/doublet; the dresser adds the period lower
 * garments, headwear, belt/bandolier and the era's firearm as bone attachments.
 * This keeps the proven shared skeleton and clips untouched.
 */
export function dressUniform(
  rig: RigInstance,
  variant: RigVariant,
  spec: PostColonialSpec,
  role: PostColonialRole,
): RigVariantHandle {
  const armed = role === 'soldier' || role === 'ranged';
  const civilian = role === 'worker' || role === 'scout' || role === 'missionary';
  const root = rig.root;
  const male = variant.endsWith('_m');
  // 1532–1572 is a field kit (buff wool, leather, steel), not the 18th-century Bourbon blue.
  const earlySpanish = spec.hat === 'morion';
  const coatColor = earlySpanish ? 0xb39a72 : spec.coat;
  const trouserColor = earlySpanish ? 0x5a4632 : spec.trousers;
  const tools = createRigAttireTools(root);
  const { track, material, tint, show, bonePosition, attach, dispose } = tools;

  showSharedHumanoidBody(root, male);
  tint(male ? 'attire_tunic_m' : 'attire_tunic_f', coatColor);
  // The coat covers the hips; the period breeches/trousers replace the Andean lower cloth.
  show('attire_skirt_f', false);
  show('attire_wrap_m', false);
  root.updateMatrixWorld(true);

  const spine = bonePosition('spine_03');
  const pelvis = bonePosition('pelvis');
  const head = bonePosition('Head');
  const hand = bonePosition('hand_r');
  const coatMat = material(coatColor, 0.95);
  const leatherMat = material(0x2a1e16, 0.92);
  const trouserMat = material(trouserColor, 0.95);

  /** A rigid tapered sleeve around one limb bone; the bone animation carries it. */
  const limbTube = (
    boneName: string,
    childName: string,
    rTop: number,
    rBottom: number,
    materialRef: THREE.Material,
    name: string,
    from = 0,
    to = 1,
  ): THREE.Mesh | null => {
    const a = bonePosition(boneName);
    const b = bonePosition(childName);
    if (!a || !b) return null;
    const full = b.clone().sub(a);
    const length = full.length() * (to - from);
    if (length < 0.02) return null;
    const dir = full.clone().normalize();
    const center = a.clone().addScaledVector(full, (from + to) / 2);
    const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(rTop, rBottom, length, 10, 1, true)), materialRef);
    mesh.name = name;
    mesh.position.copy(center);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    attach(boneName, mesh, center);
    return mesh;
  };

  const gearMat = material(0xffffff, 0.8, 0.15);
  gearMat.vertexColors = true;
  const metalGearMat = material(0xffffff, 0.35, 0.7);
  metalGearMat.vertexColors = true;
  /** Merge one bone's equipment into a single vertex-coloured draw. */
  const mergeGear = (
    parts: [THREE.BufferGeometry, number][],
    boneName: string,
    position: THREE.Vector3,
    name: string,
    meshMaterial: THREE.MeshStandardMaterial = gearMat,
  ): THREE.Mesh | null => {
    const source = parts.map(
      ([geometry, color]) => [geometry, new THREE.Color(color)] as [THREE.BufferGeometry, THREE.Color],
    );
    const merged = mergeColoredGeometry(source);
    if (!merged) return null;
    const mesh = new THREE.Mesh(track(merged), meshMaterial);
    mesh.name = name;
    attach(boneName, mesh, position);
    return mesh;
  };

  if (spine) {
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

  // Breeches and boots: the worker tunic is the coat, these cover the legs.
  if (!civilian) {
    for (const [side, thigh, calf, foot] of [
      ['l', 'thigh_l', 'calf_l', 'foot_l'],
      ['r', 'thigh_r', 'calf_r', 'foot_r'],
    ]) {
      limbTube(thigh, calf, 0.115, 0.09, trouserMat, `attire_post_breeches_${side}`);
      limbTube(calf, foot, 0.095, 0.075, leatherMat, `attire_post_boot_${side}`, 0.35, 1);
      const footPos = bonePosition(foot);
      if (footPos) {
        const shoe = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.07, 0.28)), leatherMat);
        shoe.name = `attire_post_shoe_${side}`;
        attach(foot, shoe, new THREE.Vector3(footPos.x, footPos.y - 0.02, footPos.z + 0.06));
      }
    }
    // Sleeves and cuffs: the shared tunic is short-sleeved, the period coat is not.
    for (const [side, upper, lower, handBone] of [
      ['l', 'upperarm_l', 'lowerarm_l', 'hand_l'],
      ['r', 'upperarm_r', 'lowerarm_r', 'hand_r'],
    ]) {
      limbTube(upper, lower, 0.075, 0.06, coatMat, `attire_post_sleeve_upper_${side}`, 0.02, 1);
      limbTube(lower, handBone, 0.06, 0.05, coatMat, `attire_post_sleeve_lower_${side}`, 0.02, 0.9);
    }
  }

  if (head && !civilian && spec.hat !== 'none') {
    const headPos = new THREE.Vector3(head.x, head.y, head.z);
    if (spec.hat === 'morion') {
      const profile = [
        [0, 0],
        [0.18, 0],
        [0.19, 0.015],
        [0.15, 0.04],
        [0.12, 0.1],
        [0.09, 0.16],
        [0, 0.19],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const dome = new THREE.LatheGeometry(profile, 18);
      dome.rotateZ(0.12);
      dome.translate(0, 0.11, 0);
      const comb = new THREE.BoxGeometry(0.025, 0.07, 0.22);
      comb.translate(0, 0.25, 0);
      mergeGear(
        [
          [dome, 0x9aa2aa],
          [comb, 0x9aa2aa],
        ],
        'Head',
        headPos,
        'attire_post_morion',
        metalGearMat,
      );
    } else if (spec.hat === 'bicorn') {
      // A two-cornered hat: from the RTS camera the top silhouette is the read, so the brim is a
      // lens with the points at the sides and a low crown in the middle. The earlier box brim read
      // as a top hat (see the pilot capture).
      const half = 0.24;
      const lens = new THREE.Shape();
      lens.moveTo(-half, 0);
      lens.quadraticCurveTo(0, 0.12, half, 0);
      lens.quadraticCurveTo(0, -0.12, -half, 0);
      const brim = extrudedPlate(lens, 0.03, 10);
      brim.rotateX(-Math.PI / 2);
      // Upswept corners: a flat plate reads as a sombrero; a bicorn's points curl up.
      const brimPosition = brim.getAttribute('position');
      for (let i = 0; i < brimPosition.count; i++) {
        const lift = 0.11 * (Math.abs(brimPosition.getX(i)) / half) ** 2;
        brimPosition.setY(i, brimPosition.getY(i) + lift);
      }
      brim.computeVertexNormals();
      brim.translate(0, 0.27, 0);
      const crown = new THREE.SphereGeometry(0.11, 12, 8);
      crown.scale(1, 0.75, 1);
      crown.translate(0, 0.32, 0);
      mergeGear(
        [
          [brim, spec.hatColor],
          [crown, spec.hatColor],
        ],
        'Head',
        headPos,
        'attire_post_bicorn',
      );
    } else {
      const crown = new THREE.CylinderGeometry(0.12, 0.13, 0.13, 12);
      crown.translate(0, 0.2, 0);
      const top = new THREE.CylinderGeometry(0.135, 0.135, 0.015, 12);
      top.translate(0, 0.27, 0);
      const visor = new THREE.BoxGeometry(0.17, 0.018, 0.1);
      visor.translate(0, 0.15, 0.14);
      const band = new THREE.CylinderGeometry(0.135, 0.135, 0.035, 12);
      band.translate(0, 0.155, 0);
      mergeGear(
        [
          [crown, spec.hatColor],
          [top, spec.hatColor],
          [visor, 0x2a1e16],
          [band, 0x2a1e16],
        ],
        'Head',
        headPos,
        'attire_post_kepi',
      );
    }
  }

  if (spine && armed) {
    const torsoParts: [THREE.BufferGeometry, number][] = [
      [new THREE.CylinderGeometry(0.1, 0.12, 0.06, 12).translate(0, 0.2, 0), coatColor],
    ];
    // The 16th-century arquebusier carries a powder bandolier; the 1879 rifleman carries the
    // cartridge belt and pouches instead, so the flasks stay out of the later uniform.
    if (spec.weapon === 'musket') {
      const strapAngle = 0.62;
      const strapCenter = { x: 0.02, y: -0.05 };
      torsoParts.push([
        new THREE.BoxGeometry(0.055, 0.5, 0.02).rotateZ(strapAngle).translate(strapCenter.x, strapCenter.y, 0.14),
        0x2a1e16,
      ]);
      // The powder flasks follow the strap instead of a loose vertical column; the earlier row read as
      // oversized buttons on the chest.
      for (let i = 0; i < 5; i++) {
        const along = -0.2 + i * 0.1;
        torsoParts.push([
          new THREE.CylinderGeometry(0.017, 0.02, 0.05, 8)
            .rotateZ(strapAngle)
            .translate(
              strapCenter.x - Math.sin(strapAngle) * along,
              strapCenter.y + Math.cos(strapAngle) * along,
              0.155,
            ),
          0xb08a3a,
        ]);
      }
    }
    mergeGear(torsoParts, 'spine_03', new THREE.Vector3(spine.x, spine.y, spine.z), 'attire_post_gear_torso');
  }

  if (pelvis && !civilian) {
    const pelvisParts: [THREE.BufferGeometry, number][] = [
      [new THREE.CylinderGeometry(0.21, 0.22, 0.06, 16).translate(0, 0.02, 0), 0x2a1e16],
    ];
    if (variant.startsWith('realistas_')) {
      pelvisParts.push([new THREE.CylinderGeometry(0.2, 0.21, 0.08, 16).translate(0, 0.06, 0), spec.trim]);
    }
    if (spec.hat === 'kepi') {
      pelvisParts.push([new THREE.CylinderGeometry(0.235, 0.24, 0.06, 18).translate(0, 0.02, 0), 0x2a1e16]);
      for (const side of [-1, 1]) {
        pelvisParts.push([new THREE.BoxGeometry(0.1, 0.09, 0.05).translate(side * 0.16, -0.02, 0.15), 0x2a1e16]);
      }
    }
    mergeGear(pelvisParts, 'pelvis', new THREE.Vector3(pelvis.x, pelvis.y, pelvis.z), 'attire_post_gear_pelvis');
  }

  if (hand && armed) {
    const parts: [THREE.BufferGeometry, number][] = [];
    const isRifle = spec.weapon === 'rifle';
    if (spec.weapon === 'musket' || isRifle) {
      parts.push([
        new THREE.CylinderGeometry(0.02, 0.023, 0.95, 8).rotateX(Math.PI / 2).translate(0, 0.05, -0.25),
        0x9aa2aa,
      ]);
      parts.push([new THREE.BoxGeometry(0.085, 0.12, 0.36).translate(0, -0.04, 0.14), 0x2a1e16]);
      parts.push([new THREE.BoxGeometry(0.09, 0.13, 0.03).translate(0, -0.04, 0.31), 0x2a1e16]);
      parts.push([new THREE.BoxGeometry(0.06, 0.08, 0.12).translate(0, 0.07, -0.12), 0x9aa2aa]);
      parts.push([
        new THREE.TorusGeometry(0.026, 0.008, 4, 8).rotateX(Math.PI / 2).translate(0, 0.05, -0.55),
        spec.trim,
      ]);
      if (isRifle) {
        parts.push([new THREE.BoxGeometry(0.012, 0.012, 0.3).translate(0, 0.05, -0.95), 0x9aa2aa]);
      }
    } else {
      parts.push([new THREE.BoxGeometry(0.025, 0.72, 0.035).translate(0, -0.25, 0), 0x9aa2aa]);
      parts.push([new THREE.TorusGeometry(0.06, 0.01, 4, 10).rotateX(Math.PI / 2), spec.trim]);
    }
    const weapon = mergeGear(parts, 'hand_r', hand.clone(), 'attire_post_weapon');
    if (weapon) weapon.rotation.set(-0.2, 0, 0);
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

  const consolidated = consolidateRig(root, [], `uniform:${root.name}:${variant}`);
  tools.ownedGeometries.push(...consolidated.geometries);
  tools.ownedMaterials.push(...consolidated.materials);

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
