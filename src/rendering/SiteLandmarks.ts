import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MissionSiteLandmark } from '../model/defs/siteLandmarks';
import { applyGeneratedPbr } from './Biomes';
import { scaleUv } from '../util/uv';

/**
 * Procedural landmark compositions for the authored sites whose bundled GLB is a labelled
 * abstraction from another place. They are deliberately low-detail and honest: a plaza, a
 * zig-zag wall front, a bastioned trace, an adobe village and a cloud-forest platform, not a
 * surveyed reconstruction. The source notes live in `docs/plan/0.2.1-asset-corrections.md`.
 *
 * Geometry is merged per material, so one site costs a handful of draw calls. Textures come
 * from the shared generated PBR sets and are never disposed here (they are cached for the
 * session); the group only owns its geometries and material wrappers.
 */

type MatKey =
  | 'cutstone'
  | 'fieldstone'
  | 'megalith'
  | 'adobe'
  | 'brick'
  | 'thatch'
  | 'tile'
  | 'flatstone'
  | 'plaza'
  | 'path'
  | 'terrace'
  | 'earthRoof'
  | 'wood'
  | 'ditch';

interface MaterialSpec {
  slot: string;
  color: string;
  tile: number;
  roughness?: number;
  /** Multiplier over the generated albedo: the source sets are photographed dark, the sites are lit. */
  lift?: number;
}

const MATERIALS: Record<MatKey, MaterialSpec> = {
  cutstone: { slot: 'wall_cutstone', color: '#eadcc0', tile: 3.2, roughness: 0.9, lift: 1.7 },
  fieldstone: { slot: 'wall_fieldstone', color: '#f0e2c8', tile: 3.2, roughness: 0.95, lift: 1.8 },
  megalith: { slot: 'wall_megalith', color: '#f2e4c8', tile: 4.2, roughness: 0.95, lift: 2.6 },
  adobe: { slot: 'wall_adobe', color: '#f0d2a8', tile: 3, roughness: 0.98, lift: 1.25 },
  brick: { slot: 'wall_brick', color: '#f0c8a8', tile: 2.6, roughness: 0.9, lift: 1.6 },
  thatch: { slot: 'roof_thatch', color: '#f0cf80', tile: 2.2, roughness: 1, lift: 1.35 },
  tile: { slot: 'tile', color: '#e09070', tile: 2.4, roughness: 0.85, lift: 1.2 },
  flatstone: { slot: 'roof_flatstone', color: '#f0e4d0', tile: 3, roughness: 0.95, lift: 1.65 },
  plaza: { slot: 'ground_plaza', color: '#efe6d2', tile: 4.5, roughness: 0.95, lift: 1.5 },
  path: { slot: 'ground_path', color: '#e0c8a0', tile: 4, roughness: 0.98, lift: 1.35 },
  terrace: { slot: 'terrace_face', color: '#e8c8a8', tile: 3.2, roughness: 0.95, lift: 1.5 },
  earthRoof: { slot: 'plaster_detail', color: '#c8a878', tile: 3, roughness: 0.95 },
  wood: { slot: 'wood', color: '#a87a50', tile: 2, roughness: 0.9, lift: 1.1 },
  ditch: { slot: 'ground_path', color: '#6a5c48', tile: 3, roughness: 1 },
};

class LandmarkBuilder {
  private readonly parts = new Map<MatKey, THREE.BufferGeometry[]>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials = new Map<MatKey, THREE.MeshStandardMaterial>();

  constructor(
    private readonly heightAt: (x: number, z: number) => number,
    private readonly baseY: number,
  ) {}

  ground(x: number, z: number): number {
    return this.heightAt(x, z) - this.baseY;
  }

  private materialFor(key: MatKey): THREE.MeshStandardMaterial {
    const cached = this.materials.get(key);
    if (cached) return cached;
    const spec = MATERIALS[key];
    const material = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness ?? 0.92,
      metalness: 0,
    });
    if (
      typeof document !== 'undefined' &&
      applyGeneratedPbr(material, spec.slot, { tint: spec.color, normalScale: 0.7 })
    ) {
      material.color.multiplyScalar(spec.lift ?? 1);
    }
    this.materials.set(key, material);
    return material;
  }

  /** Highest ground over a rectangle, so a platform sits on the uphill corner, not inside the slope. */
  padHeight(x: number, z: number, rx: number, rz: number): number {
    let top = -Infinity;
    for (const dx of [-rx, 0, rx]) {
      for (const dz of [-rz, 0, rz]) top = Math.max(top, this.ground(x + dx, z + dz));
    }
    return top;
  }

  /** Lowest ground over a rectangle, used to sink the foundation of a building on a slope. */
  minGround(x: number, z: number, rx: number, rz: number): number {
    let low = Infinity;
    for (const dx of [-rx, 0, rx]) {
      for (const dz of [-rz, 0, rz]) low = Math.min(low, this.ground(x + dx, z + dz));
    }
    return low;
  }

  private push(key: MatKey, geometry: THREE.BufferGeometry): void {
    const bucket = this.parts.get(key);
    if (bucket) bucket.push(geometry);
    else this.parts.set(key, [geometry]);
  }

  addBox(key: MatKey, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const tile = MATERIALS[key].tile;
    scaleUv(geometry, Math.max(w, d) / tile, Math.max(h, 0.5) / tile);
    if (rx) geometry.rotateX(rx);
    if (ry) geometry.rotateY(ry);
    if (rz) geometry.rotateZ(rz);
    geometry.translate(x, y, z);
    this.push(key, geometry);
  }

  addCylinder(
    key: MatKey,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ): void {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
    const tile = MATERIALS[key].tile;
    scaleUv(geometry, (Math.PI * 2 * Math.max(radiusTop, radiusBottom)) / tile, height / tile);
    if (ry) geometry.rotateY(ry);
    geometry.translate(x, y, z);
    this.push(key, geometry);
  }

  /** World offset of a local (lx, lz) point rotated by `yaw`. */
  offset(x: number, z: number, yaw: number, lx: number, lz: number): [number, number] {
    return [x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z - Math.sin(yaw) * lx + Math.cos(yaw) * lz];
  }

  /** Rectangular hall with a gable or flat roof. `baseY` places it on a levelled platform. */
  addHall(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    yaw: number,
    wall: MatKey,
    roof: MatKey,
    baseY?: number,
  ): void {
    const y = baseY ?? this.padHeight(x, z, w / 2, d / 2);
    this.addBox(wall, w, h, d, x, y + h / 2, z, 0, yaw, 0);
    const [dx, dz] = this.offset(x, z, yaw, 0, d / 2 + 0.04);
    this.addBox('wood', w * 0.24, h * 0.55, 0.1, dx, y + h * 0.3, dz, 0, yaw, 0);
    if (roof === 'flatstone' || roof === 'terrace' || roof === 'earthRoof') {
      this.addBox(roof, w * 1.08, 0.2, d * 1.08, x, y + h + 0.1, z, 0, yaw, 0);
      for (const side of [-1, 1]) {
        const [px, pz] = this.offset(x, z, yaw, 0, side * (d / 2 + 0.06));
        this.addBox(roof, w * 1.08, 0.3, 0.14, px, y + h + 0.2, pz, 0, yaw, 0);
        const [qx, qz] = this.offset(x, z, yaw, side * (w / 2 + 0.06), 0);
        this.addBox(roof, 0.14, 0.3, d * 1.08, qx, y + h + 0.2, qz, 0, yaw, 0);
      }
      return;
    }
    const half = d * 0.27;
    const rise = Math.min(d * 0.3, h * 0.7);
    for (const side of [1, -1]) {
      const [rx, rz] = this.offset(x, z, yaw, 0, side * half);
      this.addBox(roof, w * 1.14, 0.2, d * 0.62, rx, y + h + rise * 0.45, rz, -side * 0.55, yaw, 0);
    }
    this.addBox(roof, w * 1.16, 0.16, 0.3, x, y + h + rise * 0.85, z, 0, yaw, 0);
  }

  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, this.materialFor(key));
      mesh.name = `${name}:${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.geometries.push(merged);
    }
    return group;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}

function cuscoPlaza(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  const y = b.padHeight(x, z, 19 * s, 15 * s);
  b.addBox('plaza', 38 * s, 0.16 * s, 30 * s, x, y + 0.08 * s, z, 0, yaw);
  // The ushnu: three cut-stone tiers with a frontal stair and a small shrine on top.
  const base = y + 0.16 * s;
  let top = base;
  for (const [w, d] of [
    [20, 15],
    [16, 11],
    [12, 8],
  ] as const) {
    b.addBox('cutstone', w * s, 1.8 * s, d * s, x, top + 0.9 * s, z, 0, yaw);
    top += 1.8 * s;
  }
  for (let i = 0; i < 4; i++) {
    b.addBox(
      'cutstone',
      2.4 * s,
      0.48 * s,
      1.0 * s,
      x,
      base + 0.24 * s + i * 0.48 * s,
      z + (7.5 - i * 0.55) * s,
      0,
      yaw,
    );
  }
  b.addHall(x, z, 5.5 * s, 3.8 * s, 2.6 * s, yaw, 'cutstone', 'thatch', top);
  // Low perimeter walls on the long sides, with a central gate on each.
  for (const side of [-1, 1]) {
    for (const segment of [-1, 1]) {
      const [wx, wz] = b.offset(x, z, yaw, segment * 11 * s, side * 14.6 * s);
      b.addBox('cutstone', 12 * s, 1.4 * s, 0.6 * s, wx, y + 0.7 * s, wz, 0, yaw);
    }
  }
  const floorY = y + 0.16 * s;
  b.addHall(x, z - 11 * s, 15 * s, 6 * s, 3.6 * s, yaw, 'cutstone', 'thatch', floorY);
  b.addHall(x - 15 * s, z - 4 * s, 7 * s, 10 * s, 3.4 * s, yaw, 'cutstone', 'thatch', floorY);
  b.addHall(x + 15 * s, z - 3 * s, 7 * s, 9 * s, 3.2 * s, yaw, 'cutstone', 'thatch', floorY);
  b.addHall(x - 10 * s, z + 12 * s, 9 * s, 5 * s, 3 * s, yaw, 'cutstone', 'thatch', floorY);
  b.addHall(x + 10 * s, z + 12 * s, 9 * s, 5 * s, 3 * s, yaw, 'cutstone', 'thatch', floorY);
}

function sacsayhuaman(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  // Three cyclic terraces facing Cusco (+z), each one a retaining wall with a flat fill behind.
  const tiers = [
    { dz: 9, w: 34, h: 2.4 },
    { dz: 5, w: 27, h: 2.2 },
    { dz: 1, w: 20, h: 2.0 },
  ];
  for (const tier of tiers) {
    const base = b.ground(x, z + tier.dz * s);
    for (const segment of [-1, 0, 1]) {
      const segW = (tier.w * s) / 3;
      const zz = tier.dz + (segment === 0 ? 0 : 0.8);
      const segYaw = yaw + segment * 0.11;
      b.addBox(
        'megalith',
        segW * 1.02,
        tier.h * s,
        1.8 * s,
        x + segment * segW,
        base + (tier.h * s) / 2,
        z + zz * s,
        0,
        segYaw,
      );
      b.addBox(
        'flatstone',
        segW * 1.02,
        0.22 * s,
        3.4 * s,
        x + segment * segW,
        base + tier.h * s + 0.11 * s,
        z + (zz - 2) * s,
        0,
        segYaw,
      );
    }
    for (let i = -3; i <= 3; i++) {
      b.addBox(
        'megalith',
        1.7 * s,
        1.05 * s,
        0.55 * s,
        x + i * 4.4 * s,
        base + 0.55 * s,
        z + (tier.dz + 1.15) * s,
        0,
        yaw,
      );
    }
  }
  // The three documented towers sit on the top platform, not on the lower terraces.
  for (const [dx, radius, height] of [
    [-10, 2.1, 4.2],
    [0, 2.5, 4.8],
    [10, 2.1, 4.0],
  ] as const) {
    const base = b.ground(x + dx * s, z);
    b.addCylinder('megalith', radius * s, radius * 1.1 * s, height * s, 10, x + dx * s, base + (height * s) / 2, z);
    b.addCylinder(
      'flatstone',
      radius * 0.8 * s,
      radius * 0.8 * s,
      0.3 * s,
      10,
      x + dx * s,
      base + height * s + 0.15 * s,
      z,
    );
  }
}

function realFelipe(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  const side = 24 * s;
  const height = 3 * s;
  const thickness = 1.4 * s;
  const y = b.padHeight(x, z, side / 2 + 2 * s, side / 2 + 2 * s);
  // Levelled esplanade and the dry ditch around the trace.
  b.addBox('terrace', side + 9 * s, 0.55 * s, side + 9 * s, x, y - 0.24 * s, z, 0, yaw);
  const ditchOffset = side / 2 + 2.6 * s;
  for (const [dx, dz, w, d] of [
    [0, -ditchOffset, side + 9 * s, 3.6 * s],
    [0, ditchOffset, side + 9 * s, 3.6 * s],
    [-ditchOffset, 0, 3.6 * s, side + 9 * s],
    [ditchOffset, 0, 3.6 * s, side + 9 * s],
  ] as const) {
    const [px, pz] = b.offset(x, z, yaw, dx, dz);
    b.addBox('ditch', w, 0.08 * s, d, px, y + 0.05 * s, pz, 0, yaw);
  }
  // Curtain walls. The south and west curtains are split to leave sally gates.
  const wallY = y + height / 2;
  const [nx, nz] = b.offset(x, z, yaw, 0, -side / 2);
  b.addBox('brick', side, height, thickness, nx, wallY, nz, 0, yaw);
  const [ex, ez] = b.offset(x, z, yaw, side / 2, 0);
  b.addBox('brick', thickness, height, side, ex, wallY, ez, 0, yaw);
  for (const sideSign of [-1, 1]) {
    const [wx, wz] = b.offset(x, z, yaw, -side / 2, sideSign * side * 0.3);
    b.addBox('brick', thickness, height, side * 0.36, wx, wallY, wz, 0, yaw);
    const [sx, sz] = b.offset(x, z, yaw, sideSign * side * 0.3, side / 2);
    b.addBox('brick', side * 0.36, height, thickness, sx, wallY, sz, 0, yaw);
  }
  // Four corner bastions (a pentagonal prism reads as a bastion at RTS scale).
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const [bx, bz] = b.offset(x, z, yaw, (sx * side) / 2, (sz * side) / 2);
    const point = yaw + Math.atan2(sz, sx) + Math.PI / 2;
    b.addCylinder('brick', 4.6 * s, 4.8 * s, height + 1.2 * s, 5, bx, y + (height + 1.2 * s) / 2, bz, point);
    b.addCylinder('terrace', 3.7 * s, 3.7 * s, 0.24 * s, 5, bx, y + height + 1.32 * s, bz, point);
  }
  // Courtyard, magazine and two flagpoles; the marked center building occupies the middle.
  b.addBox('plaza', side * 0.58, 0.1 * s, side * 0.58, x, y + 0.12 * s, z, 0, yaw);
  b.addHall(x - 7 * s, z + 7 * s, 8 * s, 5 * s, 2.8 * s, yaw, 'brick', 'tile', y + 0.18 * s);
  for (const [dx, dz] of [
    [6, 6],
    [-6, -6],
  ] as const) {
    const [px, pz] = b.offset(x, z, yaw, dx * s, dz * s);
    b.addCylinder('wood', 0.08 * s, 0.08 * s, 7 * s, 6, px, y + 3.5 * s, pz);
    const [fx, fz] = b.offset(x, z, yaw, (dx + 1.1) * s, dz * s);
    b.addBox('brick', 2.2 * s, 1.1 * s, 0.08 * s, fx, y + 6.5 * s, fz, 0, yaw);
  }
}

function tarapacaVillage(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  // The quebrada falls towards the north, so each house gets its own plinth down to the local ground.
  const foundation = (cx: number, cz: number, w: number, d: number, base: number, rotation: number): void => {
    const low = b.minGround(cx, cz, w / 2, d / 2);
    const height = Math.max(0.25 * s, base - low + 0.25 * s);
    b.addBox('terrace', w + 0.6 * s, height, d + 0.6 * s, cx, base - height / 2 + 0.05 * s, cz, 0, rotation);
  };
  // Main street on the flat central shelf, with the chapel closing the west end.
  const streetY = b.padHeight(x, z, 14 * s, 2.5 * s);
  b.addBox('path', 28 * s, 0.08 * s, 4.4 * s, x, streetY + 0.05 * s, z, 0, yaw);
  const chapelX = x - 17 * s;
  const chapelZ = z - 5 * s;
  const chapelBase = b.padHeight(chapelX, chapelZ, 3.5 * s, 5 * s);
  foundation(chapelX, chapelZ, 7 * s, 10 * s, chapelBase, yaw);
  b.addHall(chapelX, chapelZ, 7 * s, 10 * s, 3.2 * s, yaw, 'adobe', 'earthRoof', chapelBase);
  const houses = [
    [-12, -9, 8, 6, 0],
    [-2, -11, 7, 5, 0.08],
    [9, -9, 9, 6, -0.05],
    [-15, 7, 7, 5, 0.05],
    [-4, 9, 8, 5, 0],
    [8, 8, 9, 6, 0.1],
    [19, -1, 6, 5, 1.5],
    [-22, 0, 6, 4, 1.55],
  ] as const;
  for (const [dx, dz, w, d, rotation] of houses) {
    const cx = x + dx * s;
    const cz = z + dz * s;
    const base = b.padHeight(cx, cz, (w * s) / 2, (d * s) / 2);
    foundation(cx, cz, w * s, d * s, base, yaw + rotation);
    b.addHall(cx, cz, w * s, d * s, 3 * s, yaw + rotation, 'adobe', 'earthRoof', base);
  }
}

function tarapacaHeights(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  // A dry trench line on the crest, with stone returns and taller outcrops so the objective reads as a
  // defensible height rather than an empty pampa. The heightfield itself stays walkable.
  const y = b.padHeight(x, z, 14 * s, 10 * s);
  b.addBox('ditch', 24 * s, 0.22 * s, 1.4 * s, x, y + 0.11 * s, z + 5 * s, 0, yaw);
  b.addBox('fieldstone', 20 * s, 1.3 * s, 0.9 * s, x - s, y + 0.65 * s, z + 5.6 * s, 0, yaw);
  b.addBox('fieldstone', 0.9 * s, 1.1 * s, 8 * s, x - 11 * s, y + 0.55 * s, z + 1.5 * s, 0, yaw);
  b.addBox('fieldstone', 0.9 * s, 1.1 * s, 6 * s, x + 11 * s, y + 0.55 * s, z + 2 * s, 0, yaw);
  for (const [dx, dz, w, d, rot] of [
    [4, -3, 3.4, 2.2, 0.4],
    [-6, -5, 2.6, 1.8, -0.3],
    [8, 1, 2.2, 1.6, 0.7],
  ] as const) {
    const cx = x + dx * s;
    const cz = z + dz * s;
    const base = b.padHeight(cx, cz, (w * s) / 2, (d * s) / 2);
    b.addBox('fieldstone', w * s, 1.8 * s, d * s, cx, base + 0.9 * s, cz, 0, yaw + rot);
  }
}

function tarapacaPachica(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  // The hamlet the reinforcements marched from: a few adobe houses around a short street and a
  // stone corral. It is a landmark, not a second town: no walls, no towers, no gameplay footprint.
  const pad = b.padHeight(x, z, 10 * s, 8 * s);
  b.addBox('path', 18 * s, 0.08 * s, 3 * s, x, pad + 0.05 * s, z, 0, yaw);
  for (const [dx, dz, w, d, rot] of [
    [-6, -5, 5, 4, 0.05],
    [2, -6, 6, 4.5, -0.08],
    [6, 4, 5, 4, 0.4],
    [-5, 5, 4.5, 3.5, -0.3],
  ] as const) {
    const cx = x + dx * s;
    const cz = z + dz * s;
    const base = b.padHeight(cx, cz, (w * s) / 2, (d * s) / 2);
    b.addHall(cx, cz, w * s, d * s, 2.6 * s, yaw + rot, 'adobe', 'earthRoof', base);
  }
  // Corral open to the street; low enough to read as an animal pen, not a fort.
  const wallY = b.padHeight(x + 2 * s, z + 8 * s, 5 * s, 3 * s);
  b.addBox('fieldstone', 10 * s, 0.9 * s, 0.6 * s, x + 2 * s, wallY + 0.45 * s, z + 8 * s, 0, yaw);
  b.addBox('fieldstone', 0.6 * s, 0.9 * s, 6 * s, x - 3 * s, wallY + 0.45 * s, z + 7 * s, 0, yaw);
  b.addBox('fieldstone', 0.6 * s, 0.9 * s, 6 * s, x + 7 * s, wallY + 0.45 * s, z + 7 * s, 0, yaw);
}

function vilcabambaRefuge(b: LandmarkBuilder, x: number, z: number, s: number, yaw: number): void {
  const y = b.padHeight(x, z, 13 * s, 9 * s);
  // A low levelled platform, retained on the downhill west edge, with a low perimeter wall.
  b.addBox('flatstone', 26 * s, 0.5 * s, 18 * s, x, y + 0.25 * s, z, 0, yaw);
  const top = y + 0.5 * s;
  b.addBox('fieldstone', 0.9 * s, 2.4 * s, 18 * s, x - 13 * s, y - 0.7 * s, z, 0, yaw);
  b.addBox('fieldstone', 26 * s, 1.2 * s, 0.9 * s, x, y - 0.1 * s, z + 9 * s, 0, yaw);
  for (const [dx, dz, w, d] of [
    [0, -9, 26, 0.7],
    [-13, 0, 0.7, 18],
    [13, 0, 0.7, 18],
  ] as const) {
    b.addBox('fieldstone', w * s, 1.1 * s, d * s, x + dx * s, top + 0.55 * s, z + dz * s, 0, yaw);
  }
  // Three longhouses around a small plaza; thatch roofs and low fieldstone walls, no towers.
  b.addHall(x - 7 * s, z - 3 * s, 11 * s, 5 * s, 2.8 * s, yaw, 'fieldstone', 'thatch', top);
  b.addHall(x + 7 * s, z - 2 * s, 9 * s, 4.5 * s, 2.6 * s, yaw, 'fieldstone', 'thatch', top);
  b.addHall(x, z + 5 * s, 10 * s, 4.5 * s, 2.6 * s, yaw, 'fieldstone', 'thatch', top);
  b.addBox('plaza', 8 * s, 0.12 * s, 6 * s, x, top + 0.06 * s, z + 1 * s, 0, yaw);
}

function buildOne(b: LandmarkBuilder, spec: MissionSiteLandmark, mapSize: number): void {
  const x = spec.x * mapSize;
  const z = spec.z * mapSize;
  const s = spec.scale ?? 1;
  const yaw = spec.yaw ?? 0;
  switch (spec.kind) {
    case 'cusco-plaza':
      cuscoPlaza(b, x, z, s, yaw);
      break;
    case 'sacsayhuaman':
      sacsayhuaman(b, x, z, s, yaw);
      break;
    case 'real-felipe':
      realFelipe(b, x, z, s, yaw);
      break;
    case 'tarapaca-village':
      tarapacaVillage(b, x, z, s, yaw);
      break;
    case 'tarapaca-heights':
      tarapacaHeights(b, x, z, s, yaw);
      break;
    case 'tarapaca-pachica':
      tarapacaPachica(b, x, z, s, yaw);
      break;
    case 'vilcabamba-refuge':
      vilcabambaRefuge(b, x, z, s, yaw);
      break;
  }
}

/** Owns the merged landmark geometry of one match; textures are shared and left alone. */
export class SiteLandmarks {
  readonly group: THREE.Group;
  private readonly builder: LandmarkBuilder;

  constructor(
    specs: readonly MissionSiteLandmark[],
    mapSize: number,
    heightAt: (x: number, z: number) => number,
    baseY: number,
  ) {
    this.builder = new LandmarkBuilder(heightAt, baseY);
    for (const spec of specs) buildOne(this.builder, spec, mapSize);
    this.group = this.builder.finish('site-landmarks');
    // Local Y is relative to the site floor; the scene group lifts the whole composition.
    this.group.position.y = baseY;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.builder.dispose();
  }
}
