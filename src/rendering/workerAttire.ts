import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyGeneratedPbr } from './Biomes';
import type { RigClipState, RigVariant } from '../model/defs/modelAssets';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { createRigAttireTools, extrudedPlate, latheProfile, mergeColoredGeometry, mergePieces } from './rigAttire';
import { consolidateRig } from './modelConsolidation';
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
  if (head) {
    // Band + face paint in one vertex-coloured mesh: the old two-to-four head attachments were
    // separate draws on every Andean unit.
    const pieces: [THREE.BufferGeometry, THREE.Color][] = [
      [new THREE.TorusGeometry(0.098, 0.011, 6, 20).rotateX(Math.PI / 2).translate(0, 0.16, 0), bandColor],
    ];
    if (spec?.facePaint && (role === 'soldier' || role === 'ranged')) {
      for (const side of [-1, 1]) {
        pieces.push([
          new THREE.BoxGeometry(0.026, 0.012, 0.006).translate(side * 0.034, 0.035, 0.1),
          new THREE.Color(0x6a2a22),
        ]);
      }
    }
    const merged = mergeColoredGeometry(pieces);
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
  let carrying = false;
  let task: RigClipState = 'idle';
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
      // Conical metal helmet with a rim and a top knob; the dossier documents the conical shape.
      const helmetGeometry = mergePieces([
        new THREE.ConeGeometry(0.135, 0.25, 12).translate(0, 0.125, 0),
        new THREE.TorusGeometry(0.135, 0.014, 6, 18).rotateX(Math.PI / 2),
        new THREE.SphereGeometry(0.026, 8, 6).translate(0, 0.255, 0),
      ]);
      if (helmetGeometry) {
        const helmet = addMesh(helmetGeometry, metalMat, 'attire_andean_helmet');
        attach('Head', helmet, new THREE.Vector3(headBone.x, headBone.y + 0.08, headBone.z));
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
      const spools: THREE.BufferGeometry[] = [];
      for (const side of [-1, 1]) {
        spools.push(
          earSpool()
            .rotateZ((-side * Math.PI) / 2)
            .translate(side * 0.096, 0.13, -0.005),
        );
      }
      const spoolGeometry = mergePieces(spools);
      if (spoolGeometry) {
        const ears = addMesh(spoolGeometry, metalMat, 'attire_andean_ear');
        attach('Head', ears, new THREE.Vector3(headBone.x, headBone.y, headBone.z));
      }
    }
    if (soldier && pelvis && spec.belt) {
      const beltMat = makeMaterial(palette.accent, 0.9);
      const belt = addMesh(new THREE.CylinderGeometry(0.255, 0.26, 0.045, 20), beltMat, 'attire_andean_belt');
      attach('pelvis', belt, new THREE.Vector3(pelvis.x, pelvis.y + 0.39, pelvis.z));
    }
    if (soldier && boneL && spec.shield) {
      // Wooden disc and stone umbo in one vertex-coloured mesh: still reads as two materials, one draw.
      const shieldGeometry = mergeColoredGeometry([
        [rodela(), new THREE.Color(0x7a4a2a)],
        [new THREE.SphereGeometry(0.035, 10, 6).translate(0, 0.055, 0), new THREE.Color(0x8a8f94)],
      ]);
      if (shieldGeometry) {
        const shield = addMesh(shieldGeometry, vertexMaterial(0.92), 'attire_andean_shield');
        shield.rotation.z = Math.PI / 2;
        attach('hand_l', shield, new THREE.Vector3(boneL.x, boneL.y - 0.28, boneL.z));
      }
    }
    if (soldier && hand) {
      const shaft = addMesh(new THREE.CylinderGeometry(0.018, 0.022, 0.6, 8), woodMat, 'attire_andean_macana');
      shaft.rotation.z = 0.9;
      attach('hand_r', shaft, new THREE.Vector3(hand.x, hand.y - 0.22, hand.z));
      const macanaHeadMat = spec.macanaHead === 'stone' ? stoneMat : makeMaterial(palette.accent, 0.9);
      const macanaHead = addMesh(starPlate(0.115, 0.052, 6, 0.05), macanaHeadMat, 'attire_andean_macana_head');
      macanaHead.rotation.z = 0.9;
      attach('hand_r', macanaHead, new THREE.Vector3(hand.x, hand.y - 0.42, hand.z));
    }
    if (role === 'ranged' && hand) {
      const slingMat = makeMaterial(palette.accent, 0.9);
      const sling = addMesh(new THREE.TorusGeometry(0.16, 0.012, 5, 16), slingMat, 'attire_andean_sling');
      sling.rotation.x = Math.PI / 2;
      attach('hand_r', sling, new THREE.Vector3(hand.x, hand.y - 0.35, hand.z));
    }
  }

  // Inca field infantry: a quilted cotton helmet, the red V yoke and usuta sandals. The dossier
  // documents the uncu, padded protection, rodela and porra; the exact pattern is an abstraction.
  if (andeanCulture === 'inca' && palette && (role === 'soldier' || role === 'ranged')) {
    const headBone = bonePosition('Head');
    const spineBone = bonePosition('spine_03');
    const cream = new THREE.Color(0xe0d2b4);
    if (headBone) {
      const helmet = mergeColoredGeometry([
        [new THREE.SphereGeometry(0.145, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).translate(0, 0.13, 0), cream],
        ...[0.07, 0.12, 0.17].map((y): [THREE.BufferGeometry, THREE.Color] => [
          new THREE.TorusGeometry(0.132, 0.012, 5, 18).rotateX(Math.PI / 2).translate(0, y, 0),
          cream,
        ]),
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

  // The variant is final: merge the static body parts into a few skinned meshes (hair, eyebrows, sash
  // and headband in one draw call, the garments in another). The tool and the carry bundle toggle
  // their visibility at runtime, so they stay separate.
  const consolidated = consolidateRig(root, ['attire_headband'], variant);
  tools.ownedGeometries.push(...consolidated.geometries);
  tools.ownedMaterials.push(...consolidated.materials);
  // Only the body is in the shadow pass: from the RTS camera the hair and garments add nothing to its
  // shadow, and skinned meshes cannot be instanced, so each part was a shadow-pass draw per unit. Both
  // flags go so the part stays out of the caster pass (and the old VSM receiver pass).
  const isBody = (o: THREE.Object3D): boolean => /^Body_[fm]$/.test(o.name);
  // Only for the Caral worker GLB: a rig without its base bodies keeps its shadows.
  if (root.getObjectByName('Body_f') || root.getObjectByName('Body_m')) {
    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh || isBody(child)) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });
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
    dispose(): void {
      disposeAttire();
    },
  };
}
