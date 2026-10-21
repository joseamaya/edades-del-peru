import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DressingPlacement } from '../model/defs/settlementDressing';

const STONE = '#8f8678';
const DARK_STONE = '#6f665a';
const WOOD = '#6f5538';
const REED = '#b39a5c';
const STRAW = '#c2a05c';
const FISH = '#93a0a8';

/** Terrain-conforming household props, merged into one draw call per base. */
export class SettlementDressing {
  readonly group = new THREE.Group();
  private material: THREE.MeshStandardMaterial | null = null;

  constructor(placements: DressingPlacement[], heightAt: (x: number, z: number) => number) {
    this.group.name = 'settlement-dressing';
    const parts: THREE.BufferGeometry[] = [];
    for (const p of placements) parts.push(...buildProp(p, heightAt(p.x, p.z)));
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = 'dressing';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.material?.dispose();
    this.material = null;
    this.group.removeFromParent();
  }
}

function buildProp(p: DressingPlacement, y: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const place = new THREE.Matrix4().compose(
    new THREE.Vector3(p.x, y, p.z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.yaw, 0)),
    new THREE.Vector3(p.scale, p.scale, p.scale),
  );
  const b = new PartBatch(parts, place);
  switch (p.kind) {
    case 'hearth':
      hearth(b);
      break;
    case 'drying_rack':
      dryingRack(b);
      break;
    case 'basket':
      basket(b);
      break;
    case 'gourd':
      gourd(b);
      break;
    case 'cotton':
      cotton(b);
      break;
    case 'bench':
      bench(b);
      break;
    case 'windbreak':
      windbreak(b);
      break;
  }
  return parts;
}

class PartBatch {
  constructor(
    private readonly parts: THREE.BufferGeometry[],
    private readonly place: THREE.Matrix4,
  ) {}

  add(geo: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): void {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    geo.applyMatrix4(m);
    geo.applyMatrix4(this.place);
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat !== geo) geo.dispose();
    const n = flat.getAttribute('position').count;
    const c = new THREE.Color(color);
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(flat);
  }

  box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): void {
    this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }

  cyl(
    rt: number,
    rb: number,
    h: number,
    seg: number,
    color: string,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ): void {
    this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz);
  }

  sphere(r: number, color: string, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): void {
    const geo = new THREE.SphereGeometry(r, 10, 8);
    geo.scale(sx, sy, sz);
    this.add(geo, color, x, y, z);
  }
}

function hearth(b: PartBatch): void {
  b.cyl(0.42, 0.46, 0.06, 12, '#2e2822', 0, 0.03, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.add(new THREE.DodecahedronGeometry(0.11, 0), STONE, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5);
  }
  for (let i = 0; i < 3; i++) {
    b.cyl(0.05, 0.06, 0.55, 6, '#4a3a28', 0, 0.13, 0, 0, (i / 3) * Math.PI, Math.PI / 2);
  }
}

function dryingRack(b: PartBatch): void {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.cyl(0.045, 0.055, 1.15, 6, WOOD, sx * 0.55, 0.58, sz * 0.26);
    }
  }
  for (const sz of [-1, 1]) b.box(1.2, 0.06, 0.06, WOOD, 0, 1.0, sz * 0.26);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.34;
    b.cyl(0.012, 0.012, 0.22, 4, '#d8cfba', x, 0.89, 0);
    b.sphere(0.1, FISH, x, 0.76, 0, 1.7, 0.5, 0.55);
  }
}

function basket(b: PartBatch): void {
  b.cyl(0.28, 0.22, 0.34, 10, STRAW, 0, 0.18, 0);
  b.add(new THREE.TorusGeometry(0.28, 0.03, 4, 10), '#8a6a34', 0, 0.35, 0, Math.PI / 2, 0, 0);
  b.add(new THREE.DodecahedronGeometry(0.09, 0), DARK_STONE, -0.08, 0.39, 0.03);
  b.add(new THREE.DodecahedronGeometry(0.08, 0), STONE, 0.1, 0.38, -0.06);
}

function gourd(b: PartBatch): void {
  b.sphere(0.19, '#d4c070', 0, 0.2, 0, 1, 1.25, 1);
  b.sphere(0.12, '#b8b060', 0.22, 0.13, 0.05, 1, 1.15, 1);
  b.cyl(0.035, 0.05, 0.12, 6, '#a8904a', 0, 0.42, 0);
}

function cotton(b: PartBatch): void {
  b.box(0.72, 0.03, 0.46, WOOD, 0, 0.015, 0);
  for (const [x, z] of [
    [-0.2, -0.1],
    [0.05, 0.08],
    [0.24, -0.06],
    [-0.05, -0.02],
  ] as const) {
    b.sphere(0.12, '#efe6d2', x, 0.14, z);
  }
  b.cyl(0.02, 0.02, 0.52, 5, '#5a4630', 0.3, 0.1, 0.16, 0, 0, 1.1);
}

function bench(b: PartBatch): void {
  b.box(1.0, 0.12, 0.36, STONE, 0, 0.3, 0);
  for (const x of [-0.34, 0.34]) b.box(0.2, 0.24, 0.3, DARK_STONE, x, 0.12, 0);
}

function windbreak(b: PartBatch): void {
  for (const x of [-0.5, 0, 0.5]) b.cyl(0.05, 0.06, 1.1, 6, WOOD, x, 0.55, 0);
  b.box(1.2, 0.8, 0.05, REED, 0, 0.62, 0);
  b.box(1.26, 0.06, 0.08, WOOD, 0, 1.02, 0);
}
