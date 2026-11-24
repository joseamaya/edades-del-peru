import * as THREE from 'three';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import { MOUNTED_SPECS, isMountedVariant, type MountedRigVariant } from '../model/defs/mountedCharacters';
import type { RigInstance } from './RigInstance';
import { createRigAttireTools } from './rigAttire';
import type { RigVariantHandle } from './rigVariants';

const HAT_NAMES = {
  bicorn: 'GEO-Hat-Bicorn',
  morion: 'GEO-Hat-Morion',
  kepi: 'GEO-Hat-Kepi',
} as const;

/**
 * The rider is the infantry's shared body in the same uniform, seated on the mount. The low-poly rider of
 * `mounted_rig.glb` (sphere head, tube limbs) only remains as the fallback when the shared body is missing.
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

/** The mount's own rider meshes: hidden when the shared body takes the saddle. */
const LEGACY_RIDER_PREFIXES = ['GEO-Merged-Rider-', 'GEO-Rider-', 'GEO-Hat-'];
/** Bone of the mount the rider sits on; it carries the trot and gallop bob. */
const SEAT_BONE = 'rider_hip';

/**
 * The seated pose, as rotations in the rider's own space (+Z forward, +X the rider's left), applied on top
 * of the playing clip: thighs forward and apart around the barrel, knees down along the flank, the forearms
 * forward to the reins. Angles in degrees.
 */
export const RIDER_SEAT_POSE = {
  thighForward: -78,
  thighSpread: 24,
  kneeBend: 84,
  upperArmForward: -28,
  forearmForward: -52,
  /** Pelvis above the seat bone, in metres: the hip joint sits a little above the saddle tree. */
  seatLift: 0.04,
  /** Pelvis behind the seat bone, so the thighs fall on the saddle and not on the withers. */
  seatBack: 0.06,
} as const;

export function dressMounted(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isMountedVariant(variant)) return null;
  const spec = MOUNTED_SPECS[variant];
  const root = rig.root;
  const tools = createRigAttireTools(root);
  const { tint, dispose } = tools;

  tint('GEO-Merged-Rider-Coat', spec.coat);
  tint('GEO-Merged-Rider-Trousers', spec.trousers);
  tint('GEO-Merged-Rider-Trim', spec.trim);
  tint('GEO-Merged-Horse', spec.horseCoat);
  tint('GEO-Merged-Horse-Dark', spec.horsePoints);

  for (const [hat, name] of Object.entries(HAT_NAMES)) {
    root.traverse((object) => {
      if (!object.name.startsWith(name)) return;
      object.visible = hat === spec.hat;
      if (!object.name.endsWith('-Trim') && !object.name.endsWith('-Comb')) tint(object.name, spec.hatColor);
    });
  }

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

interface SeatedRider {
  setState(state: RigClipState): void;
  update(dt: number): void;
  die(): void;
  dispose(): void;
}

function seatRider(mount: RigInstance, riderVariant: RigVariant): SeatedRider | null {
  const seat = mount.root.getObjectByName(SEAT_BONE);
  const body = mount.root.getObjectByName('body');
  const head = mount.root.getObjectByName('head');
  if (!seat || !body || !head) return null;
  const rider = riderFactory?.(riderVariant) ?? null;
  if (!rider) return null;

  mount.root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && LEGACY_RIDER_PREFIXES.some((p) => object.name.startsWith(p))) {
      object.visible = false;
    }
  });

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
