import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MissionSiteLandmark } from '../model/defs/siteLandmarks';
import type { Obstacle } from '../game/Pathfinding';
import { applyGeneratedPbr } from './Biomes';
import { scaleUv } from '../util/uv';

/**
 * The remaining procedural landmark composition, for the one authored site whose bundled GLB is a
 * labelled abstraction from another place and whose kit has not landed: the Vilcabamba refuge.
 * Cusco and the Republican sites (Arica, Real Felipe, Tarapacá) draw from their architecture kits
 * instead. The composition is deliberately low-detail and honest: a low platform, longhouses and a
 * small plaza, not a surveyed reconstruction. The source notes live in
 * `docs/plan/0.2.1-asset-corrections.md`.
 *
 * Geometry is merged per material, so the site costs a handful of draw calls. Textures come
 * from the shared generated PBR sets and are never disposed here (they are cached for the
 * session); the group only owns its geometries and material wrappers.
 */

type MatKey = 'fieldstone' | 'thatch' | 'flatstone' | 'plaza' | 'wood';

interface MaterialSpec {
  slot: string;
  color: string;
  tile: number;
  roughness?: number;
  /** Multiplier over the generated albedo: the source sets are photographed dark, the sites are lit. */
  lift?: number;
}

const MATERIALS: Record<MatKey, MaterialSpec> = {
  fieldstone: { slot: 'wall_fieldstone', color: '#f0e2c8', tile: 3.2, roughness: 0.95, lift: 1.8 },
  thatch: { slot: 'roof_thatch', color: '#f0cf80', tile: 2.2, roughness: 1, lift: 1.35 },
  flatstone: { slot: 'roof_flatstone', color: '#f0e4d0', tile: 3, roughness: 0.95, lift: 1.65 },
  plaza: { slot: 'ground_plaza', color: '#efe6d2', tile: 4.5, roughness: 0.95, lift: 1.5 },
  wood: { slot: 'wood', color: '#a87a50', tile: 2, roughness: 0.9, lift: 1.1 },
};

class LandmarkBuilder {
  private readonly parts = new Map<MatKey, THREE.BufferGeometry[]>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials = new Map<MatKey, THREE.MeshStandardMaterial>();

  /** Ground footprint of every hall (house, chapel, kallanka): the buildings units must walk around. */
  readonly halls: Obstacle[] = [];

  /** `footprintsOnly` runs the composition for its hall footprints without building any geometry. */
  constructor(
    private readonly heightAt: (x: number, z: number) => number,
    private readonly baseY: number,
    private readonly footprintsOnly = false,
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

  private push(key: MatKey, geometry: THREE.BufferGeometry): void {
    const bucket = this.parts.get(key);
    if (bucket) bucket.push(geometry);
    else this.parts.set(key, [geometry]);
  }

  addBox(key: MatKey, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void {
    if (this.footprintsOnly) return;
    const geometry = new THREE.BoxGeometry(w, h, d);
    const tile = MATERIALS[key].tile;
    scaleUv(geometry, Math.max(w, d) / tile, Math.max(h, 0.5) / tile);
    if (rx) geometry.rotateX(rx);
    if (ry) geometry.rotateY(ry);
    if (rz) geometry.rotateZ(rz);
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
    // The walls' axis-aligned bounds (the grid is axis-aligned; the halls turn at most a few degrees or a
    // quarter turn, so the box stays tight).
    const c = Math.abs(Math.cos(yaw));
    const sn = Math.abs(Math.sin(yaw));
    this.halls.push({ x, z, w: c * w + sn * d, d: sn * w + c * d });
    const y = baseY ?? this.padHeight(x, z, w / 2, d / 2);
    this.addBox(wall, w, h, d, x, y + h / 2, z, 0, yaw, 0);
    const [dx, dz] = this.offset(x, z, yaw, 0, d / 2 + 0.04);
    this.addBox('wood', w * 0.24, h * 0.55, 0.1, dx, y + h * 0.3, dz, 0, yaw, 0);
    if (roof === 'flatstone') {
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

/**
 * The halls of the procedural landmarks as pathfinding obstacles. The landmarks are drawn only with a
 * renderer, but the simulation must see the same buildings headless, so this replays the composition for
 * its footprints alone. Walls, terraces, trenches and corrals stay walkable: they shape the missions'
 * battlefields and their gates; only the closed buildings are solid.
 */
export function siteLandmarkObstacles(
  specs: readonly MissionSiteLandmark[],
  mapSize: number,
  heightAt: (x: number, z: number) => number,
  baseY: number,
): Obstacle[] {
  const builder = new LandmarkBuilder(heightAt, baseY, true);
  for (const spec of specs) buildOne(builder, spec, mapSize);
  return builder.halls;
}
