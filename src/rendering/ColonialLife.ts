import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isKnownPhase, phaseOrder, type SitePhasePlan } from '../model/defs/sitePhases';
import type { ColonialHouse, ColonialLayout } from '../model/defs/colonialLayout';
import { MaterialTex } from './Textures';
import type { Particles } from './Particles';

const ADOBE = new THREE.Color('#c9b28b');
const TILE = new THREE.Color('#a5523a');
const DARK = new THREE.Color('#3a2a20');
const WOOD = new THREE.Color('#6b4a2f');
const CLOTH = new THREE.Color('#b8a37a');
const STONE = new THREE.Color('#8f8a7c');
const EARTH = new THREE.Color('#9a805c');
const CLOTHES = new THREE.Color('#7a4a3a');
const SKIN = new THREE.Color('#8a6446');
const PHASE_TRAZA = 'traza';
const PHASE_CIUDAD = 'ciudad';

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

/** A colonial house: adobe walls, a tile hip roof, a door and two small windows. */
function house(parts: Parts, h: ColonialHouse, y: number): void {
  box(parts, ADOBE, h.x, y, h.z, h.w, h.h, h.d, h.ry);
  cone(parts, TILE, h.x, y + h.h, h.z, Math.max(h.w, h.d) * 0.72, h.h * 0.55, 4, (h.ry ?? 0) + Math.PI / 4);
  const dx = Math.sin(h.ry) * (h.d / 2 + 0.02);
  const dz = Math.cos(h.ry) * (h.d / 2 + 0.02);
  box(parts, DARK, h.x + dx, y, h.z + dz, 0.7, h.h * 0.55, 0.1, h.ry);
  box(parts, WOOD, h.x - dx * 0.55, y + h.h * 0.55, h.z - dz * 0.55, 0.55, 0.55, 0.08, h.ry);
  box(parts, WOOD, h.x + dx * 0.55, y + h.h * 0.55, h.z + dz * 0.55, 0.55, 0.55, 0.08, h.ry);
}

/** A market stall: four posts, a cloth canopy and a crate. */
function stall(parts: Parts, x: number, y: number, z: number, ry: number): void {
  for (const [ox, oz] of [
    [-1.1, -0.8],
    [1.1, -0.8],
    [-1.1, 0.8],
    [1.1, 0.8],
  ]) {
    const px = x + ox * Math.cos(ry) - oz * Math.sin(ry);
    const pz = z + ox * Math.sin(ry) + oz * Math.cos(ry);
    box(parts, WOOD, px, y, pz, 0.12, 2.2, 0.12);
  }
  box(parts, CLOTH, x, y + 2.15, z, 2.8, 0.12, 2.1, ry);
  box(parts, WOOD, x, y + 0.45, z, 1.5, 0.45, 0.9, ry);
}

function person(parts: Parts, x: number, y: number, z: number): void {
  cylinder(parts, CLOTHES, x, y, z, 0.16, 0.22, 0.9, 6);
  sphere(parts, SKIN, x, y + 1.02, z, 0.16);
  cone(parts, CLOTHES, x, y + 0.1, z, 0.3, 0.5, 6);
}

function well(parts: Parts, x: number, y: number, z: number): void {
  cylinder(parts, STONE, x, y, z, 1.1, 1.2, 0.9, 12);
  cylinder(parts, DARK, x, y + 0.9, z, 0.8, 0.8, 0.1, 12);
  box(parts, WOOD, x, y + 0.9, z, 2.2, 0.12, 0.12);
}

/** The traced plaza of a founding: cord lines, stakes and packed earth before the city is built. */
function traza(parts: Parts, layout: ColonialLayout, y: number): void {
  const { x, z } = layout.center;
  cylinder(parts, EARTH, x, y, z, 9, 9, 0.08, 24);
  for (const [ox, oz] of [
    [-9, -8],
    [9, -8],
    [-9, 8],
    [9, 8],
    [-9, 0],
    [9, 0],
    [0, -8],
    [0, 8],
  ]) {
    box(parts, WOOD, x + ox, y, z + oz, 0.16, 1.2, 0.16);
  }
  box(parts, CLOTH, x, y + 1.1, z - 8, 18, 0.05, 0.08);
  box(parts, CLOTH, x, y + 1.1, z + 8, 18, 0.05, 0.08);
  box(parts, CLOTH, x - 9, y + 1.1, z, 0.08, 0.05, 16);
  box(parts, CLOTH, x + 9, y + 1.1, z, 0.08, 0.05, 16);
  for (const h of layout.traza) {
    box(parts, ADOBE, h.x, y, h.z, h.w, h.h, h.d, h.ry);
    cone(parts, TILE, h.x, y + h.h, h.z, Math.max(h.w, h.d) * 0.72, h.h * 0.5, 4, Math.PI / 4);
  }
  for (let i = 0; i < 4; i++) person(parts, x - 3 + i * 2, y, z + 2);
}

/**
 * Life around an existing colonial plaza (Cusco 1814) or the founding of Lima (1535): adobe houses,
 * market stalls, a well and people. Presentation only; positions come from `colonialLayout.ts`, the
 * static geometry is merged per phase, and smoke/fire use `Game.updateCityLife`.
 */
export class ColonialLife {
  readonly group = new THREE.Group();
  private readonly phases: PhaseGroup[] = [];
  private readonly life: LifeSource[] = [];
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  private readonly geometries: THREE.BufferGeometry[] = [];
  private phase = PHASE_CIUDAD;

  constructor(
    parent: THREE.Object3D,
    private readonly heightAt: (x: number, z: number) => number,
    baseY: number,
    layout: ColonialLayout,
    private readonly plan: SitePhasePlan,
  ) {
    this.group.name = 'colonial_life';
    parent.add(this.group);
    this.material.map = MaterialTex.dirt();
    const ground = (x: number, z: number): number => this.heightAt(x, z) - baseY;
    const worldY = (x: number, z: number): number => this.heightAt(x, z);

    if (layout.traza.length) {
      const parts: Parts = [];
      traza(parts, layout, ground(layout.center.x, layout.center.z));
      this.life.push({
        x: layout.center.x,
        z: layout.center.z - 3,
        y: worldY(layout.center.x, layout.center.z - 3) + 1,
        phase: PHASE_TRAZA,
        kind: 'fire',
      });
      this.addPhase(PHASE_TRAZA, parts);
    }

    const ciudad: Parts = [];
    for (const h of layout.houses) {
      house(ciudad, h, ground(h.x, h.z));
      this.life.push({
        x: h.x,
        z: h.z,
        y: worldY(h.x, h.z) + h.h + h.h * 0.55 + 0.3,
        phase: PHASE_CIUDAD,
        kind: 'smoke',
      });
    }
    for (const s of layout.stalls) {
      stall(ciudad, s.x, ground(s.x, s.z), s.z, s.ry);
      person(ciudad, s.x - 1.6, ground(s.x - 1.6, s.z), s.z + 0.6);
    }
    well(ciudad, layout.well.x, ground(layout.well.x, layout.well.z), layout.well.z);
    for (let i = 0; i < 4; i++) {
      person(ciudad, layout.center.x - 3 + i * 2, ground(layout.center.x, layout.center.z + 2), layout.center.z + 2);
    }
    this.life.push({
      x: layout.center.x,
      z: layout.center.z,
      y: worldY(layout.center.x, layout.center.z) + 1.2,
      phase: PHASE_CIUDAD,
      kind: 'fire',
    });
    this.addPhase(PHASE_CIUDAD, ciudad);

    this.setPhase(this.plan.initial);
  }

  private addPhase(phase: string, parts: Parts): void {
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = `colonial:${phase}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    this.group.add(group);
    this.geometries.push(merged);
    this.phases.push({ phase, group });
  }

  /** Show the phase the mission reached; the plan owns the order. */
  setPhase(phase: string): void {
    this.phase = isKnownPhase(this.plan, phase) ? phase : this.plan.initial;
    for (const entry of this.phases) {
      entry.group.visible = entry.phase === this.phase;
    }
  }

  /** Cooking smoke and the plaza brazier, from the same presentation tick as Caral and the ayllu. */
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
