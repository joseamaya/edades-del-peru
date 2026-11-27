import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import {
  postColonialWeaponFor,
  type PostColonialRole,
  type PostColonialSpec,
} from '../model/defs/postColonialCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import {
  bodyOnlyShadows,
  boneToRoot,
  createRigAttireTools,
  extrudedPlate,
  mergeColoredGeometry,
  showSharedHumanoidBody,
} from './rigAttire';
import { consolidateRig } from './modelConsolidation';
import { paintBodyUnderGarments, type PaintRegion } from './bodyPaint';

/**
 * The 1532–1572 coleto: dark leather. The earlier buff (0xb39a72) and a mid brown (0x6e5236) both read as the
 * skin, so the jerkin looked like a bare torso; this brown stays clear of it (tests/uniform-palette.test.ts).
 */
export const EARLY_SPANISH_COAT = 0x4a3a2c;

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
  // The 1780 rebels' line infantry fought with the pike/sling it could make, not with the royal musket:
  // the firearm is reserved for the ranged role.
  const weaponKind = postColonialWeaponFor(role, spec.weapon, variant.startsWith('rebelde_'));
  const coatColor = earlySpanish ? EARLY_SPANISH_COAT : spec.coat;
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

  /** A ball over a joint, so a rigid sleeve or leg never opens a gap of skin when the limb bends. */
  const jointCap = (boneName: string, radius: number, materialRef: THREE.Material, name: string): void => {
    const at = bonePosition(boneName);
    if (!at) return;
    const mesh = new THREE.Mesh(track(new THREE.SphereGeometry(radius, 8, 6)), materialRef);
    mesh.name = name;
    mesh.position.copy(at);
    attach(boneName, mesh, at);
  };

  // The worker tunic is the coat body; the shared tunic has a low neckline and no shoulders, and the earlier
  // short tubes left skin at the shoulder, elbow, hip, knee and foot. Everything below closes those gaps.
  if (!civilian) {
    const neck = bonePosition('neck_01');
    if (spine && neck) {
      // Yoke: chest, back and shoulders up to a standing collar.
      const bottom = spine.y - 0.08;
      // The trapezius rises above the neck joint: the yoke closes in a sloped shoulder line up to the collar.
      const top = neck.y + 0.07;
      const shoulderLine = neck.y - 0.03;
      const r = male ? 0.205 : 0.19;
      const profile = [
        [r * 0.98, bottom],
        [r, shoulderLine - 0.04],
        [r * 0.86, shoulderLine + 0.02],
        [r * 0.55, shoulderLine + 0.06],
        [0.085, top - 0.02],
        [0.08, top],
      ].map(([x, y]) => new THREE.Vector2(x, y - (top + bottom) / 2));
      const yoke = new THREE.LatheGeometry(profile, 18);
      yoke.scale(1, 1, male ? 0.8 : 0.9);
      const yokeMesh = new THREE.Mesh(track(yoke), coatMat);
      yokeMesh.name = 'attire_post_yoke';
      const yokeAt = new THREE.Vector3(spine.x, (top + bottom) / 2, spine.z + (male ? 0.05 : 0.065));
      yokeMesh.position.copy(yokeAt);
      attach('spine_03', yokeMesh, yokeAt);
      const collar = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.068, 0.078, 0.08, 12)),
        material(spec.trim, 0.9),
      );
      collar.name = 'attire_post_collar';
      const collarAt = new THREE.Vector3(neck.x, neck.y + 0.03, neck.z);
      collar.position.copy(collarAt);
      attach('neck_01', collar, collarAt);
    }
    for (const side of ['l', 'r']) {
      jointCap(`upperarm_${side}`, 0.12, coatMat, `attire_post_shoulder_${side}`);
      limbTube(`upperarm_${side}`, `lowerarm_${side}`, 0.084, 0.068, coatMat, `attire_post_sleeve_upper_${side}`, 0, 1);
      jointCap(`lowerarm_${side}`, 0.066, coatMat, `attire_post_elbow_${side}`);
      limbTube(`lowerarm_${side}`, `hand_${side}`, 0.066, 0.056, coatMat, `attire_post_sleeve_lower_${side}`, 0, 0.84);
      limbTube(
        `lowerarm_${side}`,
        `hand_${side}`,
        0.064,
        0.062,
        material(spec.trim, 0.9),
        `attire_post_cuff_${side}`,
        0.8,
        0.94,
      );
    }
    if (pelvis) {
      // The seat of the breeches/trousers, under the coat: it closes the hip between the coat and the legs.
      const seat = new THREE.Mesh(
        track(new THREE.CylinderGeometry(male ? 0.18 : 0.19, male ? 0.19 : 0.2, 0.26, 18, 1, false)),
        trouserMat,
      );
      seat.scale.set(1, 1, 0.78);
      seat.name = 'attire_post_seat';
      const seatAt = new THREE.Vector3(pelvis.x, pelvis.y - 0.07, pelvis.z + 0.06);
      seat.position.copy(seatAt);
      attach('pelvis', seat, seatAt);
    }
    for (const side of ['l', 'r']) {
      limbTube(`thigh_${side}`, `calf_${side}`, 0.148, 0.098, trouserMat, `attire_post_breeches_${side}`, -0.12, 1);
      jointCap(`calf_${side}`, 0.092, trouserMat, `attire_post_knee_${side}`);
      limbTube(`calf_${side}`, `foot_${side}`, 0.092, 0.08, trouserMat, `attire_post_leg_${side}`, 0, 0.4);
      limbTube(`calf_${side}`, `foot_${side}`, 0.1, 0.085, leatherMat, `attire_post_boot_${side}`, 0.3, 1.02);
      // Shoes over the whole foot: heel, instep and toe follow the foot and ball bones.
      jointCap(`foot_${side}`, 0.07, leatherMat, `attire_post_heel_${side}`);
      limbTube(`foot_${side}`, `ball_${side}`, 0.066, 0.058, leatherMat, `attire_post_shoe_${side}`, 0, 1);
      jointCap(`ball_${side}`, 0.056, leatherMat, `attire_post_toe_${side}`);
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
      lens.quadraticCurveTo(0, 0.15, half, 0);
      lens.quadraticCurveTo(0, -0.15, -half, 0);
      const brim = extrudedPlate(lens, 0.03, 10);
      brim.rotateX(-Math.PI / 2);
      // Upswept corners: a flat plate reads as a sombrero; a bicorn's points curl up.
      const brimPosition = brim.getAttribute('position');
      for (let i = 0; i < brimPosition.count; i++) {
        // A gentle curl: steeper points read as horns from the front at close range.
        const lift = 0.05 * (Math.abs(brimPosition.getX(i)) / half) ** 2;
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
    if (weaponKind === 'musket') {
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

  let firearm: FirearmGrip | null = null;
  if (hand && armed) {
    const parts: [THREE.BufferGeometry, number][] = [];
    const isRifle = weaponKind === 'rifle';
    if (weaponKind === 'musket' || isRifle) {
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
    if (weapon && (weaponKind === 'musket' || isRifle)) firearm = firearmGrip(rig, weapon, role === 'ranged');
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

  // The weapon and the carry bundle toggle visibility with the task, so they keep their own draw.
  const consolidated = consolidateRig(root, {
    dynamic: ['attire_post_weapon', 'attire_post_carry'],
    cacheKey: `uniform:${root.name}:${variant}`,
  });
  tools.ownedGeometries.push(...consolidated.geometries);
  tools.ownedMaterials.push(...consolidated.materials);
  if (!civilian) paintCoveredBody(rig, variant, male, coatColor, trouserColor);
  // Only the body silhouette is in the shadow pass: the merged garments and gear would be a second copy of
  // every soldier in the shadow map (both flags go, as in the worker rule).
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
      const weapon = root.getObjectByName('attire_post_weapon');
      if (weapon) weapon.visible = task !== 'build';
    },
    update(): void {
      firearm?.update(task);
    },
    dispose,
  };
}

/**
 * The closed uniform covers the torso and arms to the cuffs (coat), the hips and legs (breeches) and the lower
 * calves and feet (boots): paint the body there, so a bulge through a rigid sleeve shows cloth, not skin.
 */
function paintCoveredBody(rig: RigInstance, variant: RigVariant, male: boolean, coat: number, trousers: number): void {
  const root = rig.root;
  const body = root.getObjectByName(male ? 'Body_m' : 'Body_f') as THREE.SkinnedMesh | undefined;
  if (!body?.isSkinnedMesh) return;
  const calf = { l: new THREE.Vector3(), r: new THREE.Vector3() };
  const foot = { l: new THREE.Vector3(), r: new THREE.Vector3() };
  for (const side of ['l', 'r'] as const) {
    root.getObjectByName(`calf_${side}`)?.getWorldPosition(calf[side]);
    root.getObjectByName(`foot_${side}`)?.getWorldPosition(foot[side]);
  }
  const along = new THREE.Vector3();
  const regionOf = (bone: string, position: THREE.Vector3): PaintRegion => {
    if (/^(spine_0[123]|clavicle_[lr]|upperarm_[lr]|lowerarm_[lr])$/.test(bone)) return 'coat';
    if (/^(pelvis|thigh_[lr])$/.test(bone)) return 'trousers';
    if (/^(foot_[lr]|ball_[lr]|ball_leaf_[lr])$/.test(bone)) return 'boots';
    const shin = /^calf_([lr])$/.exec(bone);
    if (shin) {
      // The boot starts 30% down the shin (`attire_post_boot_*`).
      const side = shin[1] as 'l' | 'r';
      const axis = along.copy(foot[side]).sub(calf[side]);
      const t = position.clone().sub(calf[side]).dot(axis) / Math.max(axis.lengthSq(), 1e-6);
      return t > 0.3 ? 'boots' : 'trousers';
    }
    return null;
  };
  paintBodyUnderGarments(body, `uniform:${variant}`, { coat, trousers, boots: 0x2a1e16 }, regionOf);
}

interface FirearmGrip {
  update(task: RigClipState): void;
}

/**
 * Hold the musket or rifle like a long arm, not like the pistol the shared clips were made for.
 *
 * Fixed to the hand bone, the gun followed the wrist: the one-handed `Pistol_Shoot` turned it muzzle-down and
 * the idle hang left it pointing at the ground behind. Each frame, after the clip, the gun is re-aimed in the
 * hand: upright at the side, muzzle up (order/support arms) at rest and on the march; along the forearm, the
 * way the arm points, when a ranged soldier fires. The grip stays at the hand; only the orientation changes.
 */
function firearmGrip(rig: RigInstance, weapon: THREE.Object3D, ranged: boolean): FirearmGrip | null {
  const root = rig.root;
  const hand = root.getObjectByName('hand_r');
  const forearm = root.getObjectByName('lowerarm_r');
  if (!hand || !forearm || weapon.parent !== hand) return null;
  // Everything is solved in the rig root's space (+Z forward, +Y up, as the attire was dressed), from the
  // bones' local transforms only: no world-matrix walk per unit per frame.
  const toRoot = (bone: THREE.Object3D, out: THREE.Matrix4): THREE.Matrix4 => boneToRoot(root, bone, out);
  const handM = new THREE.Matrix4();
  const forearmM = new THREE.Matrix4();
  const handQ = new THREE.Quaternion();
  const target = new THREE.Quaternion();
  const look = new THREE.Matrix4();
  const aim = new THREE.Vector3();
  const up = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const origin = new THREE.Vector3();
  // At rest: muzzle up, tipped 12° forward so the barrel clears the shoulder, sights facing forward.
  const restAim = new THREE.Vector3(0, Math.cos(0.21), Math.sin(0.21));
  const restUp = new THREE.Vector3(0, -Math.sin(0.21), Math.cos(0.21));
  // The melee soldier's thrust/swing clip already carries the arm: keep the gun as dressed for it.
  const dressed = weapon.quaternion.clone();
  return {
    update(task) {
      if (!ranged && task === 'attack') {
        weapon.quaternion.copy(dressed);
        return;
      }
      toRoot(hand, handM).decompose(b, handQ, scale);
      if (ranged && task === 'attack') {
        a.setFromMatrixPosition(toRoot(forearm, forearmM));
        aim.copy(b).sub(a).normalize();
        up.set(0, 1, 0);
      } else {
        aim.copy(restAim);
        up.copy(restUp);
      }
      // A rotation whose -Z (the barrel, as modelled) is `aim` and whose +Y (the sights) is nearest `up`.
      look.lookAt(origin, aim, up);
      target.setFromRotationMatrix(look);
      weapon.quaternion.copy(handQ.invert().multiply(target));
    },
  };
}
