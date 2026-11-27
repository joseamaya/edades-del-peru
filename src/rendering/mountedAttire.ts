import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import { MOUNTED_SPECS, isMountedVariant, type MountedRigVariant } from '../model/defs/mountedCharacters';
import type { RigInstance } from './RigInstance';
import { createRigAttireTools, mergeColoredGeometry } from './rigAttire';
import { consolidateRig } from './modelConsolidation';
import type { RigVariantHandle } from './rigVariants';

/**
 * The rider is the infantry's shared body in the same uniform, seated on the mount. Without the shared body
 * (an asset that failed to load) the horse goes riderless rather than showing a placeholder.
 */
export const MOUNTED_RIDER_VARIANTS: Record<MountedRigVariant, RigVariant> = {
  mounted_realistas: 'realistas_soldier_m',
  mounted_realistas_bicorn: 'realistas_bicorn_soldier_m',
  mounted_patriotas: 'patriotas_soldier_m',
  mounted_republica: 'republica_soldier_m',
  mounted_chile: 'chile_soldier_m',
  mounted_rebelde: 'rebelde_soldier_m',
};

/**
 * Builds the shared-body rider. `ModelAssets` registers it (it owns the asset cache); routing it through a
 * setter keeps this dresser free of a runtime import back into the loader.
 */
let riderFactory: ((variant: RigVariant) => RigInstance | null) | null = null;

export function setMountedRiderFactory(factory: (variant: RigVariant) => RigInstance | null): void {
  riderFactory = factory;
}

/** Bone of the mount's mid-back the saddle and rider sit on; it carries the trot and gallop bob. */
const SEAT_BONE = 'Torso2';

/**
 * Horse materials (Quaternius) -> coat role. The coat and its light/dark shades follow the side's bay or
 * chestnut; mane, tail and lower legs take the points colour; eyes, muzzle and hooves keep the source.
 */
const HORSE_MATERIAL_ROLES: Record<string, 'coat' | 'light' | 'dark' | 'points'> = {
  Main: 'coat',
  Main_Light: 'light',
  Main_Dark: 'dark',
  Hair: 'points',
};

/**
 * The seated pose, as rotations in the rider's own space (+Z forward, +X the rider's left), applied on top
 * of the playing clip: thighs forward and apart around the barrel, knees down along the flank, the forearms
 * forward to the reins. Angles in degrees.
 */
export const RIDER_SEAT_POSE = {
  thighForward: -78,
  thighSpread: 30,
  kneeBend: 84,
  upperArmForward: -28,
  forearmForward: -52,
  /**
   * Pelvis above the seat bone, in metres. The bone runs inside the barrel: the back's surface is 0.31 above
   * it at the game scale (measured on the skinned mesh), the saddle 2 cm over that, the hip joint ~9 cm more.
   */
  seatLift: 0.42,
  /** Pelvis behind the seat bone, so the thighs fall on the saddle and not on the withers. */
  seatBack: 0.04,
} as const;

export function dressMounted(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isMountedVariant(variant)) return null;
  const spec = MOUNTED_SPECS[variant];
  const root = rig.root;
  const tools = createRigAttireTools(root);
  const { dispose } = tools;

  const coat = new THREE.Color(spec.horseCoat);
  const shades = {
    coat,
    light: coat.clone().offsetHSL(0, -0.05, 0.08),
    dark: coat.clone().offsetHSL(0, 0, -0.08),
    points: new THREE.Color(spec.horsePoints),
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    const role = HORSE_MATERIAL_ROLES[source.name];
    if (!role) return;
    const mat = source.clone();
    mat.color.copy(shades[role]);
    tools.ownedMaterials.push(mat);
    mesh.material = mat;
  });

  // The mount loads as one mesh per material (eight draws, plus its shadow) and is the only rig nothing
  // dresses, so `consolidateRig` never ran on it. Now the coat colours are final: merge the flat horse parts
  // onto the horse's own skeleton. Before the saddle, because the merged material borrows the first part's
  // roughness/metalness and the saddle's matte leather would flatten the horse's coat. The rider is a
  // separate rig with its own skeleton and is attached below, so it stays out of this pass.
  const consolidated = consolidateRig(root, { cacheKey: variant });
  tools.ownedMaterials.push(...consolidated.materials);
  addSaddle(tools, spec.trim);

  const rider = seatRider(rig, MOUNTED_RIDER_VARIANTS[variant]);
  if (!rider) return { dispose };

  return {
    setTask(state: RigClipState) {
      rider.setState(state);
    },
    update(dt: number) {
      rider.update(dt);
    },
    onDeath() {
      rider.die();
    },
    dispose() {
      rider.dispose();
      dispose();
    },
  };
}

/**
 * Saddle cloth in the side's trim colour and a leather saddle with pommel and cantle, curved over the back
 * on the seat bone. Presentation tack, not a documented regimental saddle.
 */
function addSaddle(tools: ReturnType<typeof createRigAttireTools>, trim: number): void {
  const at = tools.bonePosition(SEAT_BONE);
  if (!at) return;
  const parts: [THREE.BufferGeometry, THREE.Color][] = [];
  const arc = (radius: number, length: number, spread: number, y: number) => {
    // theta = π is the cylinder's -z side; turned about x, the axis runs along the horse and that side is up.
    const g = new THREE.CylinderGeometry(radius, radius, length, 14, 1, true, Math.PI - spread / 2, spread);
    g.rotateX(Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  };
  parts.push([arc(0.29, 0.66, Math.PI * 0.8, 0), new THREE.Color(trim)]);
  parts.push([arc(0.302, 0.44, Math.PI * 0.52, 0.004), new THREE.Color(0x3a2616)]);
  const pommel = new THREE.BoxGeometry(0.16, 0.08, 0.05).translate(0, 0.32, 0.2);
  const cantle = new THREE.BoxGeometry(0.2, 0.1, 0.05).translate(0, 0.33, -0.21);
  parts.push([pommel, new THREE.Color(0x3a2616)], [cantle, new THREE.Color(0x3a2616)]);
  const merged = mergeColoredGeometry(parts);
  if (!merged) return;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  tools.ownedMaterials.push(mat);
  const saddle = new THREE.Mesh(tools.track(merged), mat);
  saddle.name = 'attire_mounted_saddle';
  // The bone runs inside the barrel; the saddle sits on the back above it, facing the horse's head.
  // The cloth's crown (radius 0.29) sits 2 cm over the back, which is 0.31 above the bone.
  const position = new THREE.Vector3(at.x, at.y + 0.33 - 0.29, at.z);
  saddle.position.copy(position);
  tools.attach(SEAT_BONE, saddle, position);
}

interface SeatedRider {
  setState(state: RigClipState): void;
  update(dt: number): void;
  die(): void;
  dispose(): void;
}

function seatRider(mount: RigInstance, riderVariant: RigVariant): SeatedRider | null {
  const seat = mount.root.getObjectByName(SEAT_BONE);
  const body = mount.root.getObjectByName('Body');
  const head = mount.root.getObjectByName('Head');
  if (!seat || !body || !head) return null;
  const rider = riderFactory?.(riderVariant) ?? null;
  if (!rider) return null;
  // The rider's body is the infantry uniform, which now carries the line's blade. A mounted trooper holds
  // the reins, not the pike or the sabre (`atuendos.md` documents sabre and firearm for the dragoon, not a
  // two-handed weapon in the rein hand), so the seat leaves the weapon at the saddle: the scabbard stays.
  rider.root.getObjectByName('attire_post_weapon')?.removeFromParent();

  // Place the rider in the mount's space with its pelvis on the seat, facing the horse's head, then hand it
  // to the seat bone so the trot and gallop carry it.
  mount.root.updateMatrixWorld(true);
  rider.root.updateMatrixWorld(true);
  const toMount = new THREE.Matrix4().copy(mount.root.matrixWorld).invert();
  const seatPos = seat.getWorldPosition(new THREE.Vector3()).applyMatrix4(toMount);
  const forward = head
    .getWorldPosition(new THREE.Vector3())
    .applyMatrix4(toMount)
    .sub(body.getWorldPosition(new THREE.Vector3()).applyMatrix4(toMount))
    .setY(0)
    .normalize();
  const pelvis = rider.root.getObjectByName('pelvis');
  const pelvisRest = pelvis ? pelvis.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
  const yaw = Math.atan2(forward.x, forward.z);
  rider.root.rotation.set(0, yaw, 0);
  const back = forward.clone().multiplyScalar(-RIDER_SEAT_POSE.seatBack);
  rider.root.position
    .copy(seatPos)
    .add(back)
    .add(
      new THREE.Vector3(-pelvisRest.x, RIDER_SEAT_POSE.seatLift - pelvisRest.y, -pelvisRest.z).applyAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        yaw,
      ),
    );
  mount.root.add(rider.root);
  rider.root.updateMatrixWorld(true);
  seat.attach(rider.root);

  const pose = seatPose(rider);
  let dead = false;
  let state: RigClipState = 'idle';
  const apply = () => pose.apply(state === 'attack' || dead);
  pose.reset();
  rider.update(0);
  apply();

  return {
    setState(next) {
      if (dead) return;
      // The horse walks, trots and gallops; the rider sits still on it and only draws for the attack.
      state = next === 'attack' ? 'attack' : 'idle';
      rider.play(state, 0.15);
    },
    update(dt) {
      pose.reset();
      rider.update(dt);
      apply();
    },
    die() {
      dead = true;
      rider.playDeath();
    },
    dispose() {
      rider.dispose();
    },
  };
}

/** Rotations applied after the clip, in the rider's space; bases restored before each mixer update. */
function seatPose(rider: RigInstance): { reset(): void; apply(armsFree: boolean): void } {
  const deg = THREE.MathUtils.degToRad;
  const bone = (name: string) => rider.root.getObjectByName(name) ?? null;
  const parts = {
    thighL: bone('thigh_l'),
    thighR: bone('thigh_r'),
    calfL: bone('calf_l'),
    calfR: bone('calf_r'),
    upperArmL: bone('upperarm_l'),
    upperArmR: bone('upperarm_r'),
    lowerArmL: bone('lowerarm_l'),
    lowerArmR: bone('lowerarm_r'),
  };
  const touched = Object.values(parts).filter((b): b is THREE.Object3D => b !== null);
  // A bone without a track in the playing clip would accumulate the offset; restore its base each frame.
  const bases = touched.map((b) => b.quaternion.clone());
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const parentQ = new THREE.Quaternion();
  const delta = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const riderRoot = rider.root;
  // The parent's orientation relative to the rider root, from local rotations only: no world-matrix walk.
  const relative = (o: THREE.Object3D, out: THREE.Quaternion) => {
    out.identity();
    for (let q: THREE.Object3D | null = o; q && q !== riderRoot; q = q.parent) out.premultiply(q.quaternion);
    return out;
  };
  const turn = (b: THREE.Object3D | null, around: THREE.Vector3, degrees: number) => {
    if (!b?.parent) return;
    axis.copy(around).applyQuaternion(relative(b.parent, parentQ).invert());
    delta.setFromAxisAngle(axis, deg(degrees));
    b.quaternion.premultiply(delta);
  };
  const p = RIDER_SEAT_POSE;
  return {
    reset() {
      touched.forEach((b, i) => b.quaternion.copy(bases[i]!));
    },
    apply(armsFree) {
      turn(parts.thighL, Z, p.thighSpread);
      turn(parts.thighR, Z, -p.thighSpread);
      turn(parts.thighL, X, p.thighForward);
      turn(parts.thighR, X, p.thighForward);
      turn(parts.calfL, X, p.kneeBend);
      turn(parts.calfR, X, p.kneeBend);
      if (armsFree) return;
      turn(parts.upperArmL, X, p.upperArmForward);
      turn(parts.upperArmR, X, p.upperArmForward);
      turn(parts.lowerArmL, X, p.forearmForward);
      turn(parts.lowerArmR, X, p.forearmForward);
    },
  };
}
