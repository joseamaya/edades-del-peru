import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyGeneratedPbr } from './Biomes';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import {
  HERO_HIDDEN_PARTS,
  HERO_WEAPON_PARTS,
  bodyOnlyShadows,
  boneToRoot,
  createRigAttireTools,
  extrudedPlate,
  latheProfile,
  mergeColoredGeometry,
  mergePieces,
} from './rigAttire';
import { consolidateRig } from './modelConsolidation';
import { paintBodyUnderGarments, type BodyPaintHandle } from './bodyPaint';
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
 * A flat trapezoid plate centred on the origin and facing ±Z. The Moche back armour is a trapezoidal
 * backflap in the documented warrior set (`docs/historia/atuendos.md` §2, Museo Larco).
 */
function trapezoidPlate(
  topWidth: number,
  bottomWidth: number,
  height: number,
  thickness: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const half = height / 2;
  shape.moveTo(-topWidth / 2, half);
  shape.lineTo(topWidth / 2, half);
  shape.lineTo(bottomWidth / 2, -half);
  shape.lineTo(-bottomWidth / 2, -half);
  shape.closePath();
  return extrudedPlate(shape, thickness);
}

/**
 * A star/rosette club head in the XY plane. The dossier documents disc, star and rosette heads for the
 * Andean porra (Museo Larco, *Club Heads*); the exact point count is a game abstraction.
 */
function starPlate(outer: number, inner: number, points: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return extrudedPlate(shape, thickness);
}

/**
 * The shared worker head, measured once in its idle pose from the dominant-`Head` vertices of
 * `Body_m`/`Body_f` and the hair, relative to the `Head` bone (the jaw joint, not the crown):
 *
 * | measure            | male  | female |
 * | ------------------ | ----- | ------ |
 * | skull top          | 0.292 | 0.250 |
 * | half-width         | 0.102 | 0.105 |
 * | skull centre (+Z)  | 0.040 | 0.033 |
 * | hair front (+Z)    | 0.168 | 0.175 |
 *
 * A headpiece built around the bone origin instead of this centre reads as a bowl tipped back (the old
 * 0.145 dome was centred on the bone and 3 cm behind the skull). Everything on the head is fitted here,
 * as the sash is fitted to the waist.
 */
export interface HeadFit {
  crown: number;
  brow: number;
  radius: number;
  centreZ: number;
}

export const HEAD_FIT: Record<'m' | 'f', HeadFit> = {
  m: { crown: 0.292, brow: 0.12, radius: 0.102, centreZ: 0.04 },
  f: { crown: 0.25, brow: 0.11, radius: 0.105, centreZ: 0.033 },
};

/** Ear-spool base in head-local space: inside the skull at ear height, so only its flange reads. */
const EAR_FIT = { x: 0.088, y: 0.115, z: 0.02 } as const;

/**
 * Mean of the cotton weave texture baked into `caral_worker.glb` (the `#cdbb95` ground with the `#8d7a58`
 * threads at 16 %): the colour a garment material's tint is multiplied by. The body painted under a tunic
 * uses the same product, so a bulge reads as the cloth, not as skin.
 */
export const COTTON_WEAVE = 0xc3b18b;

type AndeanPaintRegion = 'tunic' | 'skirt';

/** The colour a cotton garment renders at, for a material tint: the weave mean times the tint. */
function tintedCotton(tint: THREE.Color): number {
  return new THREE.Color(COTTON_WEAVE).multiply(tint).getHex();
}

function headFit(male: boolean): HeadFit {
  return HEAD_FIT[male ? 'm' : 'f'];
}

/** A fitted cap from the brow to the crown, as `[radius, y]` pairs; the caller scales and centres it. */
function capProfile(brow: number, crown: number, radius: number): [number, number][] {
  const span = crown - brow;
  return [
    [radius * 0.99, brow],
    [radius, brow + span * 0.2],
    [radius * 0.96, brow + span * 0.45],
    [radius * 0.84, brow + span * 0.65],
    [radius * 0.62, brow + span * 0.84],
    [radius * 0.33, brow + span * 0.95],
    [0, crown],
  ];
}

/**
 * The lathe cap and its rim, fitted to the head: shared by the quilted cotton cap and the conical helmet,
 * which differ only in how high they rise and what they add above the crown.
 */
function fittedCap(
  fit: HeadFit,
  crown: number,
  radius: number,
  tube = 0.012,
): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const cap = latheProfile(capProfile(fit.brow, crown, radius), 18);
  cap.scale(1, 1, 1.1).translate(0, 0, fit.centreZ);
  const rim = new THREE.TorusGeometry(radius, tube, 5, 18).rotateX(Math.PI / 2);
  rim.scale(1, 1, 1.1).translate(0, fit.brow + 0.006, fit.centreZ);
  return [cap, rim];
}

/**
 * A flared metal ear spool (orejón), the status insignia documented for Moche, Wari, Recuay and Chimú
 * (`atuendos.md` §1 §2). The lathe axis is +Y, so the caller turns it towards the side of the head.
 */
function earSpool(): THREE.BufferGeometry {
  return latheProfile(
    [
      [0, 0],
      [0.026, 0.005],
      [0.04, 0.014],
      [0.04, 0.026],
      [0.022, 0.036],
      [0, 0.04],
    ],
    14,
  );
}

/** A shallow domed round shield (rodela) with a raised rim; the lathe axis is +Y. */
/**
 * A sling held at rest, built hanging from its grip at the origin: two cords (the retained one in the fibre
 * colour, the release one in the accent band of the braid) down to a woven pouch holding a stone.
 */
export function andeanSlingPieces(accent: THREE.Color): [THREE.BufferGeometry, THREE.Color][] {
  const fibre = new THREE.Color(0x8a7356);
  const length = 0.42;
  const cord = (x0: number, x1: number) => {
    const top = new THREE.Vector3(x0, 0, 0);
    const bottom = new THREE.Vector3(x1, -length, 0);
    const g = new THREE.CylinderGeometry(0.0065, 0.0065, top.distanceTo(bottom), 4, 1);
    g.rotateZ(Math.atan2(x1 - x0, length));
    g.translate((x0 + x1) / 2, -length / 2, 0);
    return g;
  };
  const pouch = new THREE.SphereGeometry(0.034, 8, 5).scale(1.25, 0.55, 0.8).translate(0, -length - 0.012, 0);
  const stone = new THREE.SphereGeometry(0.022, 6, 4).translate(0, -length + 0.004, 0);
  return [
    [cord(-0.008, -0.03), fibre],
    [cord(0.008, 0.03), accent.clone().multiplyScalar(0.75)],
    [pouch, fibre.clone().multiplyScalar(0.85)],
    [stone, new THREE.Color(0x8a8172)],
  ];
}

function rodela(): THREE.BufferGeometry {
  // Points run rim-to-centre so the lathe winding faces outward; the reverse order culls the face.
  return latheProfile(
    [
      [0.19, 0],
      [0.19, 0.004],
      [0.17, 0.032],
      [0.13, 0.055],
      [0, 0.062],
    ],
    20,
  );
}

/** Gear that toggles visibility after dressing, so `consolidateRig` must leave it as its own draw. */
const WORKER_DYNAMIC_PARTS = [
  ...HERO_HIDDEN_PARTS,
  ...HERO_WEAPON_PARTS,
  'attire_tool',
  'attire_carry',
  'attire_net',
] as const;

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
/**
 * The rest basis shared by the dressed weapon and the per-frame grip: head up, leaning 25° out to the
 * character's right and just forward, so the club stands clear of the shoulder instead of across the jaw.
 */
const ANDEAN_REST_AIM = new THREE.Vector3(-0.42, 0.9, 0.1).normalize();
const ANDEAN_REST_UP = new THREE.Vector3(0.1, 0, 1).normalize();

interface AndeanWeaponGrip {
  update(task: RigClipState): void;
  /** The rig started dying: stop re-aiming so the club falls with the hand. */
  release(): void;
}

/**
 * Keep the porra/macana upright in the hand, the way `firearmGrip` keeps the musket's muzzle up.
 *
 * Fixed to the wrist, the club followed the hand: the shared clips swing the arm down and back, so the
 * star head dropped to the ankle on every run. Each frame after the clip the grip group is re-aimed from
 * the hand's local matrices (no world-matrix walk per unit): shaft up, head above the hand, at rest and
 * on the march. In a melee attack the clip owns the weapon, exactly as the musket's does.
 */
function andeanWeaponGrip(rig: RigInstance, weapon: THREE.Object3D): AndeanWeaponGrip | null {
  const root = rig.root;
  const hand = root.getObjectByName('hand_r');
  if (!hand || weapon.parent !== hand) return null;
  const toRoot = (bone: THREE.Object3D, out: THREE.Matrix4): THREE.Matrix4 => boneToRoot(root, bone, out);
  const handM = new THREE.Matrix4();
  const handQ = new THREE.Quaternion();
  const target = new THREE.Quaternion();
  const look = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const origin = new THREE.Vector3();
  // A melee swing keeps the club out of the fist (`dressed` in the musket's sense): the shaft runs along
  // the hand's -Z, so the clip's swing carries it. Holding the rest basis instead buried the star in the
  // torso when the arm extended.
  const alongFist = new THREE.Quaternion();
  let released = false;
  return {
    update(task) {
      if (released) return;
      if (task === 'attack') {
        weapon.quaternion.copy(alongFist);
        return;
      }
      toRoot(hand, handM).decompose(position, handQ, scale);
      look.lookAt(origin, ANDEAN_REST_AIM, ANDEAN_REST_UP);
      target.setFromRotationMatrix(look);
      weapon.quaternion.copy(handQ.invert().multiply(target));
    },
    release() {
      released = true;
    },
  };
}

export function dressCaralWorker(rig: RigInstance, variant: RigVariant = 'caral_worker_f'): CaralWorkerHandle {
  const root = rig.root;
  const chasqui = variant.startsWith('inca_chasqui');
  const scout = variant.startsWith('caral_scout');
  const finishedCaralLook = variant.startsWith('caral_worker') || variant.startsWith('caral_scout');
  const andeanCulture: AndeanCulture | null = finishedCaralLook ? null : andeanCultureForVariant(variant);
  const spec = andeanCulture ? ANDEAN_SPECS[andeanCulture] : null;
  const palette = andeanCulture ? andeanPalette(andeanCulture) : null;
  const andean = spec !== null;
  const role: AndeanRole =
    (andeanCulture ? andeanRoleForVariant(variant) : null) ??
    (variant.includes('_worker_') ? 'worker' : variant.includes('_scout_') ? 'scout' : 'ranged');
  const worker = !chasqui && !scout && (!andean || role === 'worker');
  const male = variant.endsWith('_m');
  const tools = createRigAttireTools(root);
  const {
    track: trackGeometry,
    material: makeMaterial,
    show,
    tint: tintGarment,
    bone,
    bonePosition,
    attach,
    enableShadows,
    vertexMaterial,
    dispose: disposeAttire,
  } = tools;
  show('Body_f', !male);
  show('Body_m', male);
  show('Hair_f', !male);
  show('Hair_m', male);
  // The eyes are a few pixels at any game camera distance but cost a draw call per unit.
  show('Eyes_f', false);
  show('Eyes_m', false);
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

  if (chasqui) {
    tintGarment(male ? 'attire_tunic_m' : 'attire_tunic_f', 0xe8d8b8);
  }
  if (palette) {
    tintGarment(male ? 'attire_tunic_m' : 'attire_tunic_f', palette.primary);
    tintGarment(male ? 'attire_wrap_m' : 'attire_skirt_f', palette.secondary);
  }

  const bandColor = new THREE.Color(palette ? palette.accent : chasqui ? 0xc8a040 : scout ? 0x9a5a3a : 0x8a3b2a);
  const woodMat = makeMaterial(0x6b4a2f, 0.9);
  const stoneMat = makeMaterial(0x8a8f94, 0.85);
  const carryMat = makeMaterial(0x8a6a3a, 0.95);
  const gourdMat = makeMaterial(0xb98a4a, 0.95);
  if (typeof document !== 'undefined') applyGeneratedPbr(carryMat, 'textile', { tint: 0x8a6a3a });

  const head = bone('Head');
  // A helmet replaces the headband: worn under it, the ring poked through the cap and, with the head
  // pitched into a swing, cut across the eyes.
  const helmeted =
    (spec?.helmet === true && role === 'soldier') ||
    (andeanCulture === 'inca' && (role === 'soldier' || role === 'ranged'));
  if (head) {
    // Band + face paint in one vertex-coloured mesh: the old two-to-four head attachments were
    // separate draws on every Andean unit. The band is fitted to the skull instead of the bone: the old
    // 0.098 ring sat inside the temples, so only its front arc showed as a bar across the face.
    const fit = headFit(male);
    // At the hairline, not the brow: a ring there is the widest cross-section of the head, so it hugs it
    // instead of passing in front of the eyes like a visor.
    const bandGeometry = new THREE.TorusGeometry(fit.radius * 1.06, 0.011, 6, 20).rotateX(Math.PI / 2);
    bandGeometry.scale(1, 1, 1.12).translate(0, fit.brow + (fit.crown - fit.brow) * 0.4, fit.centreZ);
    const pieces: [THREE.BufferGeometry, THREE.Color][] = helmeted ? [] : [[bandGeometry, bandColor]];
    if (spec?.facePaint && (role === 'soldier' || role === 'ranged')) {
      for (const side of [-1, 1]) {
        pieces.push([
          new THREE.BoxGeometry(0.026, 0.012, 0.006).translate(side * 0.034, 0.035, 0.1),
          new THREE.Color(0x6a2a22),
        ]);
      }
    }
    const merged = pieces.length ? mergeColoredGeometry(pieces) : null;
    if (merged) {
      const details = new THREE.Mesh(trackGeometry(merged), makeMaterial(0xffffff, 0.9));
      (details.material as THREE.MeshStandardMaterial).vertexColors = true;
      details.name = 'attire_headband';
      details.userData.facePaint = !!(spec?.facePaint && (role === 'soldier' || role === 'ranged'));
      head.add(details);
      enableShadows(details);
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
  let net: THREE.Group | null = null;
  let garmentTints: { tunic: THREE.Color; skirt: THREE.Color } | null = null;
  let carrying = false;
  let task: RigClipState = 'idle';
  let weapon: AndeanWeaponGrip | null = null;
  let gatherKind: string | null = null;
  let netInHand = true;
  const syncTool = (): void => {
    const fishing = gatherKind === 'fishing' && task === 'gather';
    if (tool) tool.visible = !carrying && task !== 'build' && !fishing;
    if (net) net.visible = !carrying && fishing && netInHand;
  };
  if (worker && hand) {
    tool = new THREE.Group();
    tool.name = 'attire_tool';
    // Wooden shaft, binding and stone blade in one vertex-coloured mesh: one draw call per pass.
    const parts: [THREE.BufferGeometry, THREE.Color][] = [
      [new THREE.CylinderGeometry(0.014, 0.017, 0.8, 6).translate(0, -0.2, 0), woodMat.color],
      [new THREE.CylinderGeometry(0.021, 0.021, 0.06, 6).translate(0, -0.56, 0), woodMat.color],
      [new THREE.ConeGeometry(0.042, 0.12, 5).rotateX(Math.PI).translate(0, -0.67, 0), stoneMat.color],
    ];
    for (const [geometry, color] of parts) {
      const n = geometry.getAttribute('position').count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) color.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const toolGeo = mergeGeometries(
      parts.map(([g]) => g),
      false,
    );
    parts.forEach(([g]) => g.dispose());
    const toolMat = makeMaterial(0xffffff, 0.9);
    toolMat.vertexColors = true;
    if (toolGeo) tool.add(new THREE.Mesh(trackGeometry(toolGeo), toolMat));
    tool.rotation.set(-0.15, 0, 0);
    const toBody = new THREE.Vector3(root.position.x - hand.x, 0, root.position.z - hand.z).normalize();
    attach('hand_r', tool, hand.clone().addScaledVector(toBody, 0.03));

    // Folded cotton net with two gourd floats (both documented at Áspero), held while fishing.
    net = new THREE.Group();
    net.name = 'attire_net';
    const netParts: [THREE.BufferGeometry, THREE.Color][] = [
      [new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1.5, 0.7).translate(0, -0.14, 0), new THREE.Color(0xe6dcc2)],
      [new THREE.SphereGeometry(0.035, 6, 5).translate(0.08, -0.28, 0.02), gourdMat.color],
      [new THREE.SphereGeometry(0.035, 6, 5).translate(-0.07, -0.3, -0.02), gourdMat.color],
    ];
    for (const [geometry, color] of netParts) {
      const n = geometry.getAttribute('position').count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) color.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const netGeo = mergeGeometries(
      netParts.map(([g]) => g),
      false,
    );
    netParts.forEach(([g]) => g.dispose());
    if (netGeo) net.add(new THREE.Mesh(trackGeometry(netGeo), toolMat));
    net.visible = false;
    attach('hand_r', net, hand.clone().addScaledVector(toBody, 0.03));
  }

  if (spec && palette && role !== 'worker' && role !== 'scout' && role !== 'amauta') {
    const soldier = role === 'soldier';
    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh => {
      const mesh = new THREE.Mesh(trackGeometry(geometry), material);
      mesh.name = name;
      enableShadows(mesh);
      return mesh;
    };
    const metalMat =
      spec.metal !== null && (spec.helmet || spec.ear) && (soldier || role === 'ranged')
        ? makeMaterial(spec.metal, 0.5, 0.35)
        : null;
    const boneL = bonePosition('hand_l');
    const pelvis = bonePosition('pelvis');
    const headBone = bonePosition('Head');
    if (spec.shoulderSash && spine) {
      const sashMat = makeMaterial(palette.secondary, 0.95);
      const sash = addMesh(new THREE.BoxGeometry(0.07, 0.4, 0.02), sashMat, 'attire_andean_sash');
      sash.rotation.z = 0.6;
      attach('spine_03', sash, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z + 0.12));
    }
    if (spec.pectoral && spine) {
      // Wari: the chest and back plates form one cuirass joined over the shoulders (Museo Larco
      // ML301403). The plates sit outside the tunic; an earlier version buried the chest disc inside it.
      const plateMat = metalMat ?? makeMaterial(palette.accent, 0.55);
      const plateProfile = [
        [0.15, 0],
        [0.145, 0.022],
        [0.11, 0.046],
        [0, 0.052],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const plate = (): THREE.BufferGeometry | null =>
        mergePieces([
          new THREE.LatheGeometry(plateProfile, 20),
          new THREE.TorusGeometry(0.145, 0.011, 6, 22).rotateX(Math.PI / 2),
          new THREE.SphereGeometry(0.04, 10, 6).scale(1, 0.6, 1).translate(0, 0.05, 0),
        ]);
      const chestGeometry = plate();
      if (chestGeometry) {
        const chest = addMesh(chestGeometry, plateMat, 'attire_andean_pectoral');
        chest.rotation.x = Math.PI / 2;
        attach('spine_03', chest, new THREE.Vector3(spine.x, spine.y + 0.06, spine.z + 0.19));
        const back = addMesh(chestGeometry.clone(), plateMat, 'attire_andean_backplate');
        back.rotation.x = -Math.PI / 2;
        attach('spine_03', back, new THREE.Vector3(spine.x, spine.y + 0.06, spine.z - 0.19));
      }
      const strapPieces: THREE.BufferGeometry[] = [];
      for (const side of [-1, 1]) {
        // Two straps in one merged mesh: identical pieces, one draw call.
        strapPieces.push(new THREE.BoxGeometry(0.045, 0.03, 0.44).translate(side * 0.09, 0.235, -0.01));
      }
      const strapGeometry = mergePieces(strapPieces);
      if (strapGeometry) {
        const straps = addMesh(strapGeometry, plateMat, 'attire_andean_pectoral_strap');
        attach('spine_03', straps, new THREE.Vector3(spine.x, spine.y, spine.z));
      }
    }
    if (spec.helmet && soldier && headBone && metalMat) {
      // Conical metal helmet with a rim and a top knob; the dossier documents the conical shape. It is a
      // fitted cap that rises to a point, not a plain cone: a straight cone narrower than the skull sank
      // into the crown and only its tip showed.
      const fit = headFit(male);
      const [cap, rim] = fittedCap(fit, fit.crown + 0.11, fit.radius * 1.05, 0.014);
      const helmetGeometry = mergePieces([
        cap,
        rim,
        new THREE.SphereGeometry(0.026, 8, 6).translate(0, fit.crown + 0.112, fit.centreZ),
      ]);
      if (helmetGeometry) {
        const helmet = addMesh(helmetGeometry, metalMat, 'attire_andean_helmet');
        attach('Head', helmet, headBone);
      }
    }
    if (spec.backflap && soldier && spine) {
      // Trapezoidal back armour, wider at the bottom, hanging behind the tunic. The dossier documents the
      // shape and calls it armour on the tunic, not the material: a contrasting textile panel reads at the
      // RTS zoom, and a shade of the tunic would disappear against the back.
      const backflapMat = makeMaterial(palette.secondary, 0.95);
      const backflap = addMesh(trapezoidPlate(0.26, 0.38, 0.4, 0.035), backflapMat, 'attire_andean_backflap');
      attach('spine_03', backflap, new THREE.Vector3(spine.x, spine.y - 0.1, spine.z - 0.18));
    }
    if (spec.ear && headBone && metalMat) {
      // The spool base sits inside the skull at ear height (the temples are only 0.08 wide there), so only
      // the flange reads, instead of a hoop floating behind the jaw.
      const spools: THREE.BufferGeometry[] = [];
      for (const side of [-1, 1]) {
        spools.push(
          earSpool()
            .rotateZ((-side * Math.PI) / 2)
            .translate(side * EAR_FIT.x, EAR_FIT.y, EAR_FIT.z),
        );
      }
      const spoolGeometry = mergePieces(spools);
      if (spoolGeometry) {
        const ears = addMesh(spoolGeometry, metalMat, 'attire_andean_ear');
        attach('Head', ears, headBone);
      }
    }
    if (soldier && pelvis && spec.belt) {
      const beltMat = makeMaterial(palette.accent, 0.9);
      // A sash around the waist of the tunic, measured on the shared body: the narrowest band is 0.25 above
      // the pelvis, ~0.18 (male) / 0.15 (female) half-wide, 0.13 half-deep and 3.5 cm forward of the spine.
      // It rides the waist bone so it bends with the torso; a 0.26 ring on the pelvis at chest height floated
      // off the body as soon as the unit leaned into a run or a swing.
      const beltGeometry = new THREE.CylinderGeometry(1, 1, 0.05, 20).scale(male ? 0.195 : 0.165, 1, 0.14);
      const belt = addMesh(beltGeometry, beltMat, 'attire_andean_belt');
      attach('spine_02', belt, new THREE.Vector3(pelvis.x, pelvis.y + 0.24, pelvis.z + 0.035));
    }
    if (soldier && boneL && spec.shield) {
      // Wooden disc and stone umbo in one vertex-coloured mesh: still reads as two materials, one draw.
      const shieldGeometry = mergeColoredGeometry([
        [rodela(), new THREE.Color(0x7a4a2a)],
        [new THREE.SphereGeometry(0.035, 10, 6).translate(0, 0.055, 0), new THREE.Color(0x8a8f94)],
      ]);
      if (shieldGeometry) {
        // Grip it at the hand, facing forward and a little outward: the old piece hung 0.28 below the
        // wrist and faced sideways, so it read as a plate floating at the thigh. The shield sits outboard
        // of the arm (the direction from the spine to the hand), so a swing carries it beside the torso
        // instead of through it.
        shieldGeometry.rotateX(Math.PI / 2);
        const shield = addMesh(shieldGeometry, vertexMaterial(0.92), 'attire_andean_shield');
        shield.rotation.y = 0.55;
        const outward = spine
          ? new THREE.Vector3(boneL.x - spine.x, 0, boneL.z - spine.z).normalize()
          : new THREE.Vector3(1, 0, 0);
        attach(
          'hand_l',
          shield,
          new THREE.Vector3(boneL.x + outward.x * 0.1, boneL.y - 0.05, boneL.z + outward.z * 0.1),
        );
      }
    }
    if (soldier && hand) {
      // One rigid weapon under a grip group, built like the musket: the shaft runs down local -Z, so the
      // per-frame grip only has to orient the group and the head can never drift off its handle. The two
      // meshes keep their names: the hero shows/hides them, and both stay out of the merged gear draw.
      const shaft = new THREE.Mesh(
        trackGeometry(new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8).rotateX(Math.PI / 2).translate(0, 0, -0.25)),
        woodMat,
      );
      shaft.name = 'attire_andean_macana';
      const macanaHeadMat = spec.macanaHead === 'stone' ? stoneMat : makeMaterial(palette.accent, 0.9);
      // Six-point stone head crossed on two planes, so it reads as a star from the front and from the RTS
      // camera instead of disappearing edge-on.
      const plaque = starPlate(0.105, 0.05, 6, 0.05);
      const macanaHeadGeometry = mergePieces([plaque, plaque.clone().rotateX(Math.PI / 2)]);
      if (macanaHeadGeometry) {
        const macanaHead = new THREE.Mesh(trackGeometry(macanaHeadGeometry), macanaHeadMat);
        macanaHead.name = 'attire_andean_macana_head';
        macanaHead.position.z = -0.56;
        const grip = new THREE.Group();
        grip.name = 'attire_andean_weapon';
        grip.add(shaft, macanaHead);
        enableShadows(grip);
        // The same rest basis the per-frame grip keeps: head up, tipped 10° forward.
        grip.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().lookAt(new THREE.Vector3(), ANDEAN_REST_AIM, ANDEAN_REST_UP),
        );
        attach('hand_r', grip, new THREE.Vector3(hand.x, hand.y, hand.z));
        weapon = andeanWeaponGrip(rig, grip);
      }
    }
    if (role === 'ranged' && hand) {
      // The warak'a hangs from the hand at rest: two thin braided cords down to a woven pouch with its stone.
      // A flat ring at the hand read as a floating hoop from the RTS camera.
      const slingGeometry = mergeColoredGeometry(andeanSlingPieces(new THREE.Color(palette.accent)));
      if (slingGeometry) {
        const sling = addMesh(slingGeometry, vertexMaterial(0.95), 'attire_andean_sling');
        attach('hand_r', sling, new THREE.Vector3(hand.x, hand.y - 0.04, hand.z));
      }
    }
  }

  // Inca field infantry: a quilted cotton helmet, the red V yoke and usuta sandals. The dossier
  // documents the uncu, padded protection, rodela and porra; the exact pattern is an abstraction.
  if (andeanCulture === 'inca' && palette && (role === 'soldier' || role === 'ranged')) {
    const headBone = bonePosition('Head');
    const spineBone = bonePosition('spine_03');
    const cream = new THREE.Color(0xe0d2b4);
    // The quilted cotton cap covers the skull from the brow to the crown, so the hair goes under it.
    show(male ? 'Hair_m' : 'Hair_f', false);
    if (headBone) {
      const fit = headFit(male);
      // An ellipsoidal cap on the measured skull, not a hemisphere on the bone: the old 0.145 dome with
      // three hoops sat on the crown like a bowl and left the hair showing under its rim.
      const [cap, rim] = fittedCap(fit, fit.crown, fit.radius);
      const seam = new THREE.TorusGeometry(fit.radius * 0.94, 0.009, 4, 18).rotateX(Math.PI / 2);
      seam.scale(1, 1, 1.1).translate(0, fit.brow + (fit.crown - fit.brow) * 0.45, fit.centreZ);
      const helmet = mergeColoredGeometry([
        [cap, cream],
        [rim, cream],
        [seam, cream],
      ]);
      if (helmet) {
        const mat = makeMaterial(0xffffff, 0.95);
        mat.vertexColors = true;
        const mesh = new THREE.Mesh(trackGeometry(helmet), mat);
        mesh.name = 'attire_andean_padded_helmet';
        enableShadows(mesh);
        attach('Head', mesh, headBone);
      }
    }
    if (spineBone) {
      const red = new THREE.Color(palette.secondary);
      const yoke = mergeColoredGeometry([
        [new THREE.BoxGeometry(0.075, 0.32, 0.012).rotateZ(0.38).translate(-0.06, 0, 0.16), red],
        [new THREE.BoxGeometry(0.075, 0.32, 0.012).rotateZ(-0.38).translate(0.06, 0, 0.16), red],
      ]);
      if (yoke) {
        const mat = makeMaterial(0xffffff, 0.95);
        mat.vertexColors = true;
        const mesh = new THREE.Mesh(trackGeometry(yoke), mat);
        mesh.name = 'attire_andean_yoke';
        enableShadows(mesh);
        attach('spine_03', mesh, spineBone);
      }
    }
    for (const [side, foot] of [
      ['l', 'foot_l'],
      ['r', 'foot_r'],
    ]) {
      const footPos = bonePosition(foot);
      if (!footPos) continue;
      const leatherColor = new THREE.Color(0x2a1e16);
      const sandal = mergeColoredGeometry([
        [new THREE.BoxGeometry(0.11, 0.025, 0.24).translate(0, -0.02, 0.04), leatherColor],
        [new THREE.BoxGeometry(0.12, 0.018, 0.035).translate(0, 0.035, -0.02), leatherColor],
      ]);
      if (!sandal) continue;
      const mat = makeMaterial(0xffffff, 0.92);
      mat.vertexColors = true;
      const mesh = new THREE.Mesh(trackGeometry(sandal), mat);
      mesh.name = `attire_andean_sandal_${side}`;
      enableShadows(mesh);
      attach(foot, mesh, footPos);
    }
  }

  /**
   * The tunic and the skirt/wrap are shells derived from the same body (`scripts/build_caral_worker.mjs`),
   * offset 3–4 cm along the normals and clipped to their volumes. Where the body bulges through them it
   * showed bare skin, so paint the covered vertices in the garment's own colour (weave × its tinted
   * material). The boxes come from the posed garment vertices, so the classification also follows the
   * hero's longer uncu and the chasqui skirt without a per-variant constant.
   */
  const paintAndeanGarments = (): BodyPaintHandle<AndeanPaintRegion> | null => {
    root.updateMatrixWorld(true);
    const body = root.getObjectByName(male ? 'Body_m' : 'Body_f') as THREE.SkinnedMesh | null;
    const tunic = root.getObjectByName(male ? 'attire_tunic_m' : 'attire_tunic_f') as THREE.Mesh | null;
    const lowerName = male ? 'attire_wrap_m' : chasqui ? 'attire_skirt_chasqui_f' : 'attire_skirt_f';
    const lower = root.getObjectByName(lowerName) as THREE.Mesh | null;
    if (!body?.isSkinnedMesh || !tunic?.isMesh || !lower?.isMesh) return null;
    body.skeleton.update();
    /**
     * The garment's posed world box at dressing time. The tunic and skirt are skinned meshes in their own
     * bind spaces (the exported tunic is not in the body's axis order), so a raw geometry box is wrong;
     * asking the skeleton for the posed vertices puts them in the same space as the body's painted vertices.
     */
    const posedBox = (mesh: THREE.Mesh): THREE.Box3 => {
      const box = new THREE.Box3();
      const skinned = mesh as THREE.SkinnedMesh;
      const position = mesh.geometry.getAttribute('position');
      if (!skinned.isSkinnedMesh || !position) return box;
      const point = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        skinned.getVertexPosition(i, point).applyMatrix4(skinned.matrixWorld);
        box.expandByPoint(point);
      }
      return box.expandByScalar(0.01);
    };
    const tunicBox = posedBox(tunic);
    const lowerBox = posedBox(lower);
    const tunicTint = (tunic.material as THREE.MeshStandardMaterial).color.clone();
    const skirtTint = (lower.material as THREE.MeshStandardMaterial).color.clone();
    garmentTints = { tunic: tunicTint, skirt: skirtTint };
    const cloth = (tint: THREE.Color): number => tintedCotton(tint);
    // The volume alone also catches a hand hanging inside the tunic's box (the arms are down in the bind
    // pose) and a calf inside the skirt's box, so the dominant bone gates each region. The skirt is the
    // outer layer at the waist and wins the overlap. Only the hero's uncu reaches below the wrap
    // (`tunicBox.min.y`); its leg bones join the tunic region, while the worker's thigh stays outside it
    // so a hip vertex inside the tunic box is not painted with the tunic colour over bare skin.
    const skirtBones = /^(pelvis|thigh_[lr]|spine_01|spine_02)$/;
    const longTunic = tunicBox.min.y < lowerBox.min.y - 0.02;
    const tunicBones = longTunic
      ? /^(spine_0[123]|clavicle_[lr]|upperarm_[lr]|pelvis|thigh_[lr])$/
      : /^(spine_0[123]|clavicle_[lr]|upperarm_[lr])$/;
    const regionOf = (bone: string, point: THREE.Vector3): AndeanPaintRegion | null => {
      if (skirtBones.test(bone) && lowerBox.containsPoint(point)) return 'skirt';
      if (tunicBones.test(bone) && tunicBox.containsPoint(point)) return 'tunic';
      return null;
    };
    return paintBodyUnderGarments(
      body,
      `andean:${variant}`,
      { tunic: cloth(tunicTint), skirt: cloth(skirtTint) },
      regionOf,
    );
  };

  // The variant is final: merge the static body parts and the rigid gear into a few skinned draws.
  // Anything whose visibility changes at runtime (the tool, the net, the carry bundle and the pieces
  // the hero hides or re-shows) keeps its own draw.
  const consolidated = consolidateRig(root, { dynamic: WORKER_DYNAMIC_PARTS, cacheKey: variant });
  tools.ownedGeometries.push(...consolidated.geometries);
  tools.ownedMaterials.push(...consolidated.materials);
  // The body stays its own textured draw, so painting it here does not feed the merged garment geometry.
  const clothPaint = paintAndeanGarments();
  // Only the body is in the shadow pass: from the RTS camera the hair, garments and gear add nothing to its
  // shadow, and skinned meshes cannot be instanced, so each part was a shadow-pass draw per unit.
  bodyOnlyShadows(root);

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
    setGatherKind(kind: string | null): void {
      if (kind === gatherKind) return;
      gatherKind = kind;
      syncTool();
    },
    setNetInHand(inHand: boolean): void {
      if (inHand === netInHand) return;
      netInHand = inHand;
      syncTool();
    },
    setClothColors(clothTint: number): void {
      // The hero's consolidated cloth multiplies the palette tints already baked into its vertex colours,
      // so the body under it needs weave × palette tint × the new cloth tint, not just the accent.
      if (!clothPaint || !garmentTints) return;
      const cloth = new THREE.Color(clothTint);
      clothPaint.setColors({
        tunic: tintedCotton(garmentTints.tunic.clone().multiply(cloth)),
        skirt: tintedCotton(garmentTints.skirt.clone().multiply(cloth)),
      });
    },
    update(): void {
      weapon?.update(task);
    },
    onDeath(): void {
      weapon?.release();
    },
    dispose(): void {
      disposeAttire();
    },
  };
}
