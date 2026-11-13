import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isKnownPhase, phaseOrder, type SitePhasePlan } from '../model/defs/sitePhases';
import {
  TAMBOTOCO_CAVE,
  TAMBOTOCO_CAVE_HUTS,
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_FIELDS,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_SHRINE,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_TERRACES,
  TAMBOTOCO_VILLAGES,
  type AylluField,
  type AylluHut,
} from '../model/defs/tambotocoLayout';
import { MaterialTex } from './Textures';
import type { Particles } from './Particles';

const STONE = new THREE.Color('#b3a894');
const DARK_STONE = new THREE.Color('#948a78');
const THATCH = new THREE.Color('#c39a4e');
const EARTH = new THREE.Color('#9a7650');
const CROP = new THREE.Color('#8fa84e');
const MOUTH = new THREE.Color('#0a0a0c');
const CLOTH = new THREE.Color('#9a5a3a');
const SKIN = new THREE.Color('#8a6446');
const PHASE_CAVE = 'cave';
const PHASE_SHRINE = 'huanacaure';
const PHASE_INTICANCHA = 'inticancha';

interface LifeSource {
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly phase: string;
  readonly kind: 'smoke' | 'fire';
}

interface PhaseGroup {
  readonly phase: string;
  readonly group: THREE.Group;
}

type Parts = THREE.BufferGeometry[];

function paint(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  if (nonIndexed !== geometry) geometry.dispose();
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
  parts.push(paint(g, color));
}

function cylinder(
  parts: Parts,
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
  parts.push(paint(g, color));
}

function cone(
  parts: Parts,
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
  parts.push(paint(g, color));
}

function sphere(parts: Parts, color: THREE.Color, x: number, y: number, z: number, r: number): void {
  const g = new THREE.SphereGeometry(r, 6, 5);
  g.translate(x, y, z);
  parts.push(paint(g, color));
}

function rock(parts: Parts, x: number, y: number, z: number, r: number, color = STONE): void {
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(1, 0.8, 1);
  g.translate(x, y + r * 0.45, z);
  parts.push(paint(g, color));
}

/** A small ayllu house: rectangular fieldstone walls, a thatch hip roof and a door. */
function hut(parts: Parts, h: AylluHut, y: number): void {
  box(parts, STONE, h.x, y, h.z, h.w + 0.35, 0.35, h.d + 0.35);
  box(parts, EARTH, h.x, y + 0.35, h.z, h.w, h.wall, h.d);
  cone(parts, THATCH, h.x, y + 0.35 + h.wall, h.z, Math.max(h.w, h.d) * 0.78, h.wall * 0.95, 4, Math.PI / 4);
  box(parts, MOUTH, h.x, y + 0.35, h.z + h.d / 2 + 0.01, 0.7, h.wall * 0.62, 0.08);
}

/** A terraced plot with rows; the ayllu economy made visible. */
function field(parts: Parts, f: AylluField, y: number): void {
  box(parts, EARTH, f.x, y, f.z, f.w, 0.12, f.d);
  for (let i = 0; i < f.rows; i++) {
    const offset = (i - (f.rows - 1) / 2) * (f.d / f.rows);
    box(parts, CROP, f.x, y + 0.12, f.z + offset, f.w * 0.9, 0.18, f.d / f.rows / 2.6);
  }
  box(parts, DARK_STONE, f.x, y, f.z - f.d / 2, f.w, 0.26, 0.26);
  box(parts, DARK_STONE, f.x, y, f.z + f.d / 2, f.w, 0.26, 0.26);
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
    cylinder(parts, CLOTH, px, y, pz, 0.16, 0.22, 0.9, 6);
    sphere(parts, SKIN, px, y + 1.02, pz, 0.16);
    cone(parts, CLOTH, px, y + 0.1, pz, 0.3, 0.5, 6);
  }
}

/** The stepped platform of Huanacaure; the huaca stone itself appears with the Act II phase. */
function shrinePlatform(parts: Parts, y: number): void {
  box(parts, STONE, TAMBOTOCO_SHRINE.x, y, TAMBOTOCO_SHRINE.z, 11, 0.9, 9);
  box(parts, DARK_STONE, TAMBOTOCO_SHRINE.x, y + 0.9, TAMBOTOCO_SHRINE.z, 8.5, 0.9, 6.8);
  box(parts, STONE, TAMBOTOCO_SHRINE.x, y + 1.8, TAMBOTOCO_SHRINE.z, 6, 0.9, 4.8);
  box(parts, DARK_STONE, TAMBOTOCO_SHRINE.x, y, TAMBOTOCO_SHRINE.z + 4.5, 4, 0.45, 1.8);
  box(parts, DARK_STONE, TAMBOTOCO_SHRINE.x, y + 0.45, TAMBOTOCO_SHRINE.z + 4.0, 3.4, 0.45, 1.8);
  box(parts, DARK_STONE, TAMBOTOCO_SHRINE.x, y + 0.9, TAMBOTOCO_SHRINE.z + 3.5, 2.8, 0.45, 1.8);
  villagers(parts, TAMBOTOCO_SHRINE.x - 1.8, y + 1.8, TAMBOTOCO_SHRINE.z + 1.8, 2);
}

/** The huaca stone of Ayar Uchu: it appears when the pilgrimage reaches Huanacaure. */
function shrineStone(parts: Parts, y: number): void {
  box(parts, DARK_STONE, TAMBOTOCO_SHRINE.x, y + 2.7, TAMBOTOCO_SHRINE.z, 2.4, 6.4, 1.5, 0.18);
  box(parts, MOUTH, TAMBOTOCO_SHRINE.x, y + 4.0, TAMBOTOCO_SHRINE.z + 0.78, 1.0, 2.2, 0.2, 0.18);
  box(parts, STONE, TAMBOTOCO_SHRINE.x, y + 8.9, TAMBOTOCO_SHRINE.z, 1.9, 0.2, 1.15, 0.18);
}

function cave(parts: Parts, y: number): void {
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
  for (const [dx, dy, dz, r] of rocks) rock(parts, TAMBOTOCO_CAVE.x + dx, y + dy - 0.35, TAMBOTOCO_CAVE.z + dz, r);
  box(parts, MOUTH, TAMBOTOCO_CAVE.x, y, TAMBOTOCO_CAVE.z - 0.35, 1.3, 3.4, 4.0);
  villagers(parts, TAMBOTOCO_CAVE.x - 2.2, y, TAMBOTOCO_CAVE.z + 3, 2);
}

/** The central platform of the plaza: a stone table, not an imperial ushnu. */
function plazaPlatform(parts: Parts, y: number): void {
  box(parts, STONE, TAMBOTOCO_INTICANCHA.x, y, TAMBOTOCO_INTICANCHA.z - 5, 3.4, 0.5, 3.4);
  box(parts, DARK_STONE, TAMBOTOCO_INTICANCHA.x, y + 0.5, TAMBOTOCO_INTICANCHA.z - 5, 2.4, 0.6, 2.4);
  box(parts, DARK_STONE, TAMBOTOCO_INTICANCHA.x, y + 1.1, TAMBOTOCO_INTICANCHA.z - 5, 1.1, 1.4, 1.1, 0.25);
}

/**
 * The ayllu world of the Tambotoco mission: the cave mouth, the Huanacaure shrine, three valley
 * hamlets and the planned Inticancha. Stylized in-engine architecture (fieldstone, earth, thatch)
 * whose positions live in `model/defs/tambotocoLayout.ts`; it replaces the reused chanca pucará.
 * Presentation only: the static geometry is merged per phase and the life particles are emitted
 * from `Game.updateCityLife`.
 */
export class AylluSite {
  readonly group = new THREE.Group();
  private readonly phases: PhaseGroup[] = [];
  private readonly life: LifeSource[] = [];
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  private readonly geometries: THREE.BufferGeometry[] = [];
  private phase = PHASE_CAVE;

  constructor(
    parent: THREE.Object3D,
    private readonly heightAt: (x: number, z: number) => number,
    baseY: number,
    private readonly plan: SitePhasePlan,
  ) {
    this.group.name = 'ayllu_site';
    parent.add(this.group);
    this.material.map = MaterialTex.dirt();
    const ground = (x: number, z: number): number => this.heightAt(x, z) - baseY;

    const caveParts: Parts = [];
    cave(caveParts, ground(TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z));
    for (const h of TAMBOTOCO_CAVE_HUTS) {
      hut(caveParts, h, ground(h.x, h.z));
      if (h.smoke) this.life.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.6, phase: PHASE_CAVE, kind: 'smoke' });
    }
    this.life.push({
      x: TAMBOTOCO_CAVE.x,
      z: TAMBOTOCO_CAVE.z + 2.6,
      y: ground(TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z + 2.6),
      phase: PHASE_CAVE,
      kind: 'fire',
    });
    shrinePlatform(caveParts, ground(TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z));
    for (const h of TAMBOTOCO_SHRINE_HUTS) {
      hut(caveParts, h, ground(h.x, h.z));
      if (h.smoke) this.life.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.2, phase: PHASE_CAVE, kind: 'smoke' });
    }
    for (const village of TAMBOTOCO_VILLAGES) {
      for (const h of village.huts) {
        hut(caveParts, h, ground(h.x, h.z));
        if (h.smoke) this.life.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.5, phase: PHASE_CAVE, kind: 'smoke' });
      }
      villagers(caveParts, village.x, ground(village.x, village.z), village.z, 3);
      field(caveParts, village.field, ground(village.field.x, village.field.z));
    }
    this.addPhase(PHASE_CAVE, caveParts);

    // The huaca stone appears with the pilgrimage's arrival: the phase is the deed, not a label.
    const shrineParts: Parts = [];
    shrineStone(shrineParts, ground(TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z));
    this.life.push({
      x: TAMBOTOCO_SHRINE.x,
      z: TAMBOTOCO_SHRINE.z - 1.8,
      y: ground(TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z - 1.8) + 1.5,
      phase: PHASE_SHRINE,
      kind: 'fire',
    });
    this.addPhase(PHASE_SHRINE, shrineParts);

    // Inticancha: the planned settlement appears when the ayllus found it. The player still builds
    // the store and the four cancha houses; the site marks the plaza, the plots and the terraces.
    const inticancha: Parts = [];
    const plazaY = ground(TAMBOTOCO_INTICANCHA.x, TAMBOTOCO_INTICANCHA.z);
    const plaza = new THREE.CylinderGeometry(7.2, 7.2, 0.1, 32);
    plaza.translate(TAMBOTOCO_INTICANCHA.x, plazaY + 0.05, TAMBOTOCO_INTICANCHA.z);
    inticancha.push(paint(plaza, EARTH));
    plazaPlatform(inticancha, plazaY + 0.1);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const wx = TAMBOTOCO_INTICANCHA.x + Math.cos(a) * 7.4;
      const wz = TAMBOTOCO_INTICANCHA.z + Math.sin(a) * 7.4;
      box(inticancha, DARK_STONE, wx, ground(wx, wz), wz, 1.2, 0.35, 0.35, -a);
    }
    for (const [i, cancha] of TAMBOTOCO_CANCHAS.entries()) {
      const y = ground(cancha.dx, cancha.dz);
      box(inticancha, STONE, cancha.dx, y, cancha.dz, 5.4, 0.3, 4.2);
      box(inticancha, STONE, cancha.dx, y + 0.3, cancha.dz - 2.1, 5.4, 0.55, 0.3);
      box(inticancha, STONE, cancha.dx - 2.7, y + 0.3, cancha.dz, 0.3, 0.55, 4.2);
      box(inticancha, STONE, cancha.dx + 2.7, y + 0.3, cancha.dz, 0.3, 0.55, 4.2);
      if (i % 2 === 0) villagers(inticancha, cancha.dx, y + 0.3, cancha.dz, 1);
    }
    for (const terrace of TAMBOTOCO_TERRACES) {
      box(
        inticancha,
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
    for (const f of TAMBOTOCO_FIELDS) field(inticancha, f, ground(f.x, f.z));
    for (const h of TAMBOTOCO_INTICANCHA_HUTS) {
      hut(inticancha, h, ground(h.x, h.z));
      if (h.smoke)
        this.life.push({ x: h.x, z: h.z, y: ground(h.x, h.z) + 2.6, phase: PHASE_INTICANCHA, kind: 'smoke' });
    }
    villagers(inticancha, TAMBOTOCO_INTICANCHA.x, plazaY, TAMBOTOCO_INTICANCHA.z - 4, 3);
    this.life.push({
      x: TAMBOTOCO_INTICANCHA.x,
      z: TAMBOTOCO_INTICANCHA.z - 5,
      y: plazaY + 1.7,
      phase: PHASE_INTICANCHA,
      kind: 'fire',
    });
    this.addPhase(PHASE_INTICANCHA, inticancha);

    this.setPhase(this.plan.initial);
  }

  private addPhase(phase: string, parts: Parts): void {
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = `ayllu:${phase}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    this.group.add(group);
    this.geometries.push(merged);
    this.phases.push({ phase, group });
  }

  /** Show the pieces whose phase has been reached; the order is the site plan's, not the engine's. */
  setPhase(phase: string): void {
    this.phase = isKnownPhase(this.plan, phase) ? phase : this.plan.initial;
    for (const entry of this.phases) {
      entry.group.visible = phaseOrder(this.plan, entry.phase) <= phaseOrder(this.plan, this.phase);
    }
  }

  /**
   * Emit one cooking puff or altar flame near the camera, round-robin. Called from `Game.updateCityLife`
   * (the same presentation path as Caral), so the site inherits its distance cap and quiet phases.
   */
  updateLife(focus: { x: number; z: number }, particles: Particles, lifeTurn: number): void {
    const nearby = this.life.filter(
      (s) =>
        phaseOrder(this.plan, s.phase) <= phaseOrder(this.plan, this.phase) &&
        Math.hypot(s.x - focus.x, s.z - focus.z) < 55,
    );
    if (!nearby.length) return;
    const emit = (source: LifeSource, count: number): void => {
      particles.emit({
        x: source.x,
        y: source.y,
        z: source.z,
        count,
        color: source.kind === 'fire' ? 0xff8a2a : 0x9a958a,
        kind: source.kind,
        speed: source.kind === 'fire' ? 0.45 : 0.7,
        life: source.kind === 'fire' ? 0.9 : 3,
        size: source.kind === 'fire' ? 0.7 : 1.2,
        grow: source.kind === 'fire' ? 1 : 1.5,
        spread: source.kind === 'fire' ? 0.3 : 0.5,
      });
    };
    // Every nearby altar burns; two huts smoke per tick so the hamlet reads alive from the camera.
    for (const source of nearby) if (source.kind === 'fire') emit(source, 1);
    const smokes = nearby.filter((s) => s.kind === 'smoke');
    if (smokes.length) {
      emit(smokes[lifeTurn % smokes.length]!, 2);
      emit(smokes[(lifeTurn + 1) % smokes.length]!, 1);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
    this.material.dispose();
  }
}
