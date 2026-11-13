import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MaterialTex } from './Textures';
import type { Particles } from './Particles';

/** Positions are world metres on the Tambotoco transect (see `scripts/build_tambotoco_heightmap.py`). */
const CAVE = { x: 40, z: 55 };
const CAVE_HUTS = [
  { x: 32, z: 58 },
  { x: 50, z: 58 },
  { x: 36, z: 70 },
];
const SHRINE = { x: 120, z: 106 };
const SHRINE_HUTS = [
  { x: 112, z: 100 },
  { x: 128, z: 101 },
];
const INTICANCHA = { x: 168, z: 190 };
const CANCHAS = [
  { x: 156, z: 190 },
  { x: 180, z: 190 },
  { x: 168, z: 178 },
  { x: 168, z: 202 },
];
const TERRACES = [
  { x: 150, z: 201, w: 22, d: 1.1, ry: 0.06 },
  { x: 187, z: 201, w: 20, d: 1.1, ry: -0.08 },
  { x: 151, z: 176, w: 18, d: 1.1, ry: -0.04 },
];
const VILLAGES = [
  { name: 'hualla', x: 138, z: 162 },
  { name: 'sauaseray', x: 188, z: 214 },
  { name: 'alcabizas', x: 198, z: 166 },
];

const STONE = new THREE.Color('#b3a894');
const DARK_STONE = new THREE.Color('#948a78');
const THATCH = new THREE.Color('#c39a4e');
const EARTH = new THREE.Color('#9a7650');
const CROP = new THREE.Color('#8fa84e');
const GOLD = new THREE.Color('#d9b25c');
const MOUTH = new THREE.Color('#0a0a0c');
const CLOTH = new THREE.Color('#9a5a3a');
const SKIN = new THREE.Color('#8a6446');
const PHASES = ['cave', 'huanacaure', 'inticancha'] as const;
type Phase = (typeof PHASES)[number];
type MaterialKey = 'stone' | 'thatch' | 'earth';
type Parts = Record<MaterialKey, THREE.BufferGeometry[]>;

interface SmokeSource {
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly phase: Phase;
}

interface PhaseGroup {
  readonly phase: Phase;
  readonly group: THREE.Group;
}

function emptyParts(): Parts {
  return { stone: [], thatch: [], earth: [] };
}

function paint(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const count = nonIndexed.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return nonIndexed;
}

function box(
  parts: Parts,
  key: MaterialKey,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  ry = 0,
): void {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  parts[key].push(paint(g, color));
}

function cylinder(
  parts: Parts,
  key: MaterialKey,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  rTop: number,
  rBottom: number,
  h: number,
  segments = 10,
): void {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
  g.translate(x, y + h / 2, z);
  parts[key].push(paint(g, color));
}

function cone(
  parts: Parts,
  key: MaterialKey,
  color: THREE.Color,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  segments = 8,
  ry = 0,
): void {
  const g = new THREE.ConeGeometry(r, h, segments);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  parts[key].push(paint(g, color));
}

function sphere(parts: Parts, key: MaterialKey, color: THREE.Color, x: number, y: number, z: number, r: number): void {
  const g = new THREE.SphereGeometry(r, 6, 5);
  g.translate(x, y, z);
  parts[key].push(paint(g, color));
}

function rock(parts: Parts, x: number, y: number, z: number, r: number, color = STONE): void {
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(1, 0.8, 1);
  g.translate(x, y + r * 0.45, z);
  parts.stone.push(paint(g, color));
}

/** A small ayllu house: rectangular fieldstone walls, a thatch hip roof, a door and a smoke hole. */
function hut(parts: Parts, x: number, y: number, z: number, w: number, d: number, wall: number): void {
  box(parts, 'stone', STONE, x, y, z, w + 0.35, 0.35, d + 0.35);
  box(parts, 'earth', EARTH, x, y + 0.35, z, w, wall, d);
  // Four-sided hip roof with a small overhang; the smoke hole is the chimney marker.
  cone(parts, 'thatch', THATCH, x, y + 0.35 + wall, z, Math.max(w, d) * 0.78, wall * 0.95, 4, Math.PI / 4);
  box(parts, 'earth', MOUTH, x, y + 0.35, z + d / 2 + 0.01, 0.7, wall * 0.62, 0.08);
  box(parts, 'earth', MOUTH, x, y + 0.35 + wall + wall * 0.7, z, 0.22, 0.22, 0.22);
}

/** A terraced plot with rows; the ayllu economy made visible. */
function field(parts: Parts, x: number, y: number, z: number, w: number, d: number, rows: number): void {
  box(parts, 'earth', EARTH, x, y, z, w, 0.12, d);
  for (let i = 0; i < rows; i++) {
    const offset = (i - (rows - 1) / 2) * (d / rows);
    box(parts, 'earth', CROP, x, y + 0.12, z + offset, w * 0.9, 0.18, d / rows / 2.6);
  }
  box(parts, 'stone', DARK_STONE, x, y, z - d / 2, w, 0.26, 0.26);
  box(parts, 'stone', DARK_STONE, x, y, z + d / 2, w, 0.26, 0.26);
}

/** Two or three villagers: enough to read a lived-in place at RTS distance. */
function villagers(parts: Parts, x: number, y: number, z: number, count: number): void {
  const offsets: [number, number][] = [
    [-0.6, 0.3],
    [0.5, -0.4],
    [0.1, 0.8],
  ];
  for (let i = 0; i < count; i++) {
    const [dx, dz] = offsets[i % offsets.length]!;
    const px = x + dx;
    const pz = z + dz;
    cylinder(parts, 'earth', CLOTH, px, y, pz, 0.16, 0.22, 0.9, 6);
    sphere(parts, 'earth', SKIN, px, y + 1.02, pz, 0.16);
    cone(parts, 'earth', CLOTH, px, y + 0.1, pz, 0.3, 0.5, 6);
  }
}

function shrine(parts: Parts, y: number): void {
  // A stepped huaca platform with the tall stone the pilgrimage marks: not a fortress.
  box(parts, 'stone', STONE, SHRINE.x, y, SHRINE.z, 11, 0.9, 9);
  box(parts, 'stone', DARK_STONE, SHRINE.x, y + 0.9, SHRINE.z, 8.5, 0.9, 6.8);
  box(parts, 'stone', STONE, SHRINE.x, y + 1.8, SHRINE.z, 6, 0.9, 4.8);
  box(parts, 'stone', DARK_STONE, SHRINE.x, y, SHRINE.z + 4.5, 4, 0.45, 1.8);
  box(parts, 'stone', DARK_STONE, SHRINE.x, y + 0.45, SHRINE.z + 4.0, 3.4, 0.45, 1.8);
  box(parts, 'stone', DARK_STONE, SHRINE.x, y + 0.9, SHRINE.z + 3.5, 2.8, 0.45, 1.8);
  box(parts, 'stone', DARK_STONE, SHRINE.x, y + 2.7, SHRINE.z, 2.4, 6.4, 1.5, 0.18);
  box(parts, 'earth', MOUTH, SHRINE.x, y + 4.0, SHRINE.z + 0.78, 1.0, 2.2, 0.2, 0.18);
  box(parts, 'earth', GOLD, SHRINE.x, y + 8.9, SHRINE.z, 1.9, 0.2, 1.15, 0.18);
  villagers(parts, SHRINE.x - 1.8, y + 2.7, SHRINE.z + 1.8, 2);
}

function cave(parts: Parts, y: number): void {
  // A rock arch around a dark mouth, open toward the base camp; rocks sink into the slope.
  const rocks: [number, number, number, number][] = [
    [-3.6, 0, 0, 2.2],
    [-2.6, 1.6, 0, 1.9],
    [0, 2.7, 0, 2.0],
    [2.6, 1.6, 0, 1.9],
    [3.6, 0, 0, 2.2],
    [-3.0, 0.4, -1.7, 1.8],
    [3.0, 0.4, -1.7, 1.8],
    [-1.4, 0, 1.5, 1.3],
    [1.4, 0, 1.5, 1.3],
  ];
  for (const [dx, dy, dz, r] of rocks) rock(parts, CAVE.x + dx, y + dy - 0.35, CAVE.z + dz, r);
  box(parts, 'earth', MOUTH, CAVE.x, y, CAVE.z - 0.35, 1.3, 3.4, 4.0);
  villagers(parts, CAVE.x - 2.2, y, CAVE.z + 3, 2);
}

/**
 * The ayllu world of the Tambotoco mission: the cave mouth, the Huanacaure shrine, the valley
 * hamlets and the planned Inticancha. Stylized in-engine architecture (fieldstone, earth, thatch)
 * with the shared generated textures; it replaces the reused chanca pucará so the legend has its
 * own places. Presentation only: smoke and fire are particles and the static geometry is merged by
 * material and phase.
 */
export class AylluSite {
  readonly group = new THREE.Group();
  private readonly phases: PhaseGroup[] = [];
  private readonly smoke: SmokeSource[] = [];
  private readonly fires: { x: number; z: number; y: number; phase: Phase }[] = [];
  private readonly materials: Record<MaterialKey, THREE.Material>;
  private readonly fireMaterial = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9 });
  private readonly fireGeometry = new THREE.ConeGeometry(0.28, 0.95, 5);
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly fireMeshes: THREE.Mesh[] = [];
  private phase: Phase = 'cave';
  private smokeTimer = 0;
  private fireTimer = 0;

  constructor(
    parent: THREE.Object3D,
    private readonly heightAt: (x: number, z: number) => number,
    baseY: number,
    private readonly particles: Particles | null,
  ) {
    this.group.name = 'ayllu_site';
    parent.add(this.group);
    const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
    stone.map = MaterialTex.fieldstone();
    const thatch = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    thatch.map = MaterialTex.thatch();
    const earth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    earth.map = MaterialTex.dirt();
    this.materials = { stone, thatch, earth };
    const ground = (x: number, z: number): number => this.heightAt(x, z) - baseY;

    // Stable: cave and shrine stand from the opening; the shrine is the huaca the player visits.
    const stable = emptyParts();
    cave(stable, ground(CAVE.x, CAVE.z));
    for (const h of CAVE_HUTS) {
      hut(stable, h.x, ground(h.x, h.z), h.z, 3.2, 2.8, 1.5);
      this.smoke.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.6, phase: 'cave' });
    }
    this.fires.push({ x: CAVE.x, z: CAVE.z + 2.6, y: ground(CAVE.x, CAVE.z + 2.6), phase: 'cave' });
    shrine(stable, ground(SHRINE.x, SHRINE.z));
    for (const h of SHRINE_HUTS) {
      hut(stable, h.x, ground(h.x, h.z), h.z, 2.6, 2.3, 1.3);
      this.smoke.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.2, phase: 'cave' });
    }
    this.fires.push({ x: SHRINE.x, z: SHRINE.z - 1.8, y: ground(SHRINE.x, SHRINE.z - 1.8) + 1.5, phase: 'cave' });

    for (const [i, village] of VILLAGES.entries()) {
      for (const [j, [dx, dz]] of [
        [-4, -2],
        [4, 1],
        [0, 5],
        [-2, 6],
      ].entries()) {
        const x = village.x + dx;
        const z = village.z + dz;
        hut(stable, x, ground(x, z), z, i === 1 && j === 1 ? 3.8 : 3, 2.6, 1.4);
        if (j < 2) this.smoke.push({ x, z, y: ground(x, z) + 2.5, phase: 'cave' });
      }
      villagers(stable, village.x, ground(village.x, village.z), village.z, 3);
      field(stable, village.x + 9, ground(village.x + 9, village.z - 5), village.z - 5, 10, 7, 5);
    }
    this.addPhase('cave', stable);

    // Inticancha: the planned settlement appears when the ayllus found it. The player still builds
    // the store and the four cancha houses; the site marks the plaza, the plots and the terraces.
    const inticancha = emptyParts();
    const plaza = new THREE.CylinderGeometry(7.2, 7.2, 0.1, 32);
    plaza.translate(INTICANCHA.x, ground(INTICANCHA.x, INTICANCHA.z) + 0.05, INTICANCHA.z);
    inticancha.earth.push(paint(plaza, EARTH));
    // Ushnu: the central stone platform of the plaza.
    const uy = ground(INTICANCHA.x, INTICANCHA.z + 4);
    box(inticancha, 'stone', STONE, INTICANCHA.x, uy, INTICANCHA.z + 4, 3.4, 0.5, 3.4);
    box(inticancha, 'stone', DARK_STONE, INTICANCHA.x, uy + 0.5, INTICANCHA.z + 4, 2.4, 0.6, 2.4);
    box(inticancha, 'stone', DARK_STONE, INTICANCHA.x, uy + 1.1, INTICANCHA.z + 4, 1.1, 1.4, 1.1, 0.25);
    // A low stone curb frames the plaza; the canchas and the road stay open.
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const wx = INTICANCHA.x + Math.cos(a) * 7.4;
      const wz = INTICANCHA.z + Math.sin(a) * 7.4;
      box(inticancha, 'stone', DARK_STONE, wx, ground(wx, wz), wz, 1.2, 0.35, 0.35, -a);
    }
    for (const [i, cancha] of CANCHAS.entries()) {
      const y = ground(cancha.x, cancha.z);
      // A low stone footprint and three walls mark the plot; the player raises the house inside.
      box(inticancha, 'stone', STONE, cancha.x, y, cancha.z, 5.4, 0.3, 4.2);
      box(inticancha, 'stone', STONE, cancha.x, y + 0.3, cancha.z - 2.1, 5.4, 0.55, 0.3);
      box(inticancha, 'stone', STONE, cancha.x - 2.7, y + 0.3, cancha.z, 0.3, 0.55, 4.2);
      box(inticancha, 'stone', STONE, cancha.x + 2.7, y + 0.3, cancha.z, 0.3, 0.55, 4.2);
      if (i % 2 === 0) villagers(inticancha, cancha.x, y + 0.28, cancha.z, 1);
    }
    for (const terrace of TERRACES) {
      box(
        inticancha,
        'stone',
        DARK_STONE,
        terrace.x,
        ground(terrace.x, terrace.z),
        terrace.z,
        terrace.w,
        0.9,
        terrace.d,
        terrace.ry,
      );
    }
    field(inticancha, INTICANCHA.x - 22, ground(INTICANCHA.x - 22, INTICANCHA.z + 2), INTICANCHA.z + 2, 12, 8, 6);
    field(inticancha, INTICANCHA.x + 22, ground(INTICANCHA.x + 22, INTICANCHA.z + 2), INTICANCHA.z + 2, 12, 8, 6);
    // A ring of ayllu houses outside the four cancha plots: the settlement is inhabited before the
    // player finishes the store, and the cancha plots stay free for the houses the mission asks for.
    for (const [i, [dx, dz]] of [
      [-12, -14],
      [12, -14],
      [-13, 13],
      [13, 13],
      [0, -18],
      [0, 20],
    ].entries()) {
      const x = INTICANCHA.x + dx;
      const z = INTICANCHA.z + dz;
      hut(inticancha, x, ground(x, z), z, i === 4 ? 4.2 : 3.2, 2.8, 1.5);
      if (i % 2 === 0) this.smoke.push({ x, z, y: ground(x, z) + 2.6, phase: 'inticancha' });
      if (i % 3 === 0) villagers(inticancha, x + 2, ground(x, z), z, 2);
    }
    villagers(inticancha, INTICANCHA.x, ground(INTICANCHA.x, INTICANCHA.z), INTICANCHA.z - 4, 3);
    this.fires.push({
      x: INTICANCHA.x,
      z: INTICANCHA.z,
      y: ground(INTICANCHA.x, INTICANCHA.z) + 1.7,
      phase: 'inticancha',
    });
    this.addPhase('inticancha', inticancha);

    for (const fire of this.fires) {
      const mesh = new THREE.Mesh(this.fireGeometry, this.fireMaterial);
      mesh.name = 'ayllu:fire';
      mesh.position.set(fire.x, fire.y + 0.45, fire.z);
      this.group.add(mesh);
      this.fireMeshes.push(mesh);
    }
    this.syncFires();
    this.setPhase('cave');
  }

  private addPhase(phase: Phase, parts: Parts): void {
    const group = new THREE.Group();
    for (const key of Object.keys(parts) as MaterialKey[]) {
      if (!parts[key].length) continue;
      const merged = mergeGeometries(parts[key], false);
      parts[key].forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, this.materials[key]);
      mesh.name = `ayllu:${phase}:${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.geometries.push(merged);
    }
    this.group.add(group);
    this.phases.push({ phase, group });
  }

  /** Show the pieces whose phase has been reached (the phase plan is the site's, not the engine's). */
  setPhase(phase: string): void {
    this.phase = PHASES.includes(phase as Phase) ? (phase as Phase) : 'cave';
    for (const entry of this.phases) {
      entry.group.visible = phaseOrder(entry.phase) <= phaseOrder(this.phase);
    }
    this.syncFires();
  }

  private syncFires(): void {
    for (const [i, fire] of this.fires.entries()) {
      const mesh = this.fireMeshes[i];
      if (mesh) mesh.visible = phaseOrder(fire.phase) <= phaseOrder(this.phase);
    }
  }

  /** Cooking smoke and altar fire; presentation only, at a bounded rate. */
  update(dt: number): void {
    if (!this.particles) return;
    this.smokeTimer += dt;
    this.fireTimer += dt;
    if (this.smokeTimer >= 1.4) {
      this.smokeTimer = 0;
      for (const source of this.smoke) {
        if (phaseOrder(source.phase) > phaseOrder(this.phase)) continue;
        this.particles.emit({
          x: source.x,
          y: source.y,
          z: source.z,
          count: 1,
          color: 0x9a958a,
          kind: 'smoke',
          speed: 0.35,
          life: 2.8,
          size: 1.1,
          grow: 1.5,
          spread: 0.5,
        });
      }
    }
    if (this.fireTimer >= 0.45) {
      this.fireTimer = 0;
      for (const fire of this.fires) {
        if (phaseOrder(fire.phase) > phaseOrder(this.phase)) continue;
        this.particles.emit({
          x: fire.x,
          y: fire.y,
          z: fire.z,
          count: 1,
          color: 0xff8a2a,
          kind: 'fire',
          speed: 0.45,
          life: 0.9,
          size: 0.65,
          spread: 0.3,
        });
      }
      const pulse = 0.85 + 0.18 * Math.sin(this.smokeTimer * 9 + this.fireTimer);
      this.fireMaterial.opacity = 0.72 + 0.16 * Math.sin(this.fireTimer * 7);
      for (const mesh of this.fireMeshes) mesh.scale.setScalar(pulse);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
    for (const material of Object.values(this.materials)) material.dispose();
    this.fireMaterial.dispose();
    this.fireGeometry.dispose();
  }
}

function phaseOrder(phase: Phase): number {
  return PHASES.indexOf(phase);
}
