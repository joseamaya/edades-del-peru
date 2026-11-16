import * as THREE from 'three';
import {
  AYLLU_CANCHA_SIZE,
  TAMBOTOCO_SHRINE_TIERS,
  TAMBOTOCO_SHRINE_TIER_HEIGHT,
  type AylluField,
  type AylluHut,
} from '../model/defs/tambotocoLayout';
import { conformWallGeometry } from './landscapeConform';

/**
 * Modular in-engine ayllu kit: fieldstone footings, earth/plaster walls, thatch roofs and terraced
 * plots, all generated from the authored positions in `tambotocoLayout.ts`. Every piece samples the
 * terrain, so nothing floats on the Pacaritambo slope and a hut, a field or a cancha can be retuned
 * without redrawing the whole site. It adds shapes and about 17k triangles over the former
 * box-per-hut pass, not a blanket polygon increase.
 */

export type Parts = THREE.BufferGeometry[];

export const AYLLU = {
  // Tints stay under art-direction §4's 0.8 albedo cap; the grain map multiplies them down again.
  stone: new THREE.Color('#cfc4ad'),
  darkStone: new THREE.Color('#a99e8a'),
  plaster: new THREE.Color('#d0bb97'),
  earth: new THREE.Color('#c9a67f'),
  packedEarth: new THREE.Color('#d2b794'),
  thatch: new THREE.Color('#e2c27c'),
  thatchDark: new THREE.Color('#b99450'),
  crop: new THREE.Color('#7f9745'),
  cropDry: new THREE.Color('#a3944d'),
  mouth: new THREE.Color('#17130f'),
  cloth: new THREE.Color('#a0603c'),
  skin: new THREE.Color('#94694a'),
  wood: new THREE.Color('#b08a5c'),
} as const;

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

let surfaces: { map: THREE.DataTexture; normalMap: THREE.DataTexture } | null = null;

/**
 * One neutral grain texture for the whole kit, generated as data so it also builds headless.
 * Vertex colours carry the material hue; the map and normal map only break the flat faces.
 */
export function aylluSurfaceTextures(): { map: THREE.DataTexture; normalMap: THREE.DataTexture } {
  if (surfaces) return surfaces;
  const size = 64;
  const rng = lcg(1337);
  let height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = rng();
  for (let pass = 0; pass < 2; pass++) {
    const src = height;
    const next = new Float32Array(src.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += src[((y + dy + size) % size) * size + ((x + dx + size) % size)]!;
          }
        }
        next[y * size + x] = sum / 9;
      }
    }
    height = next;
  }
  const at = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)]!;
  const albedo = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = 168 + at(x, y) * 72;
      albedo[i] = grain;
      albedo[i + 1] = grain * 0.97;
      albedo[i + 2] = grain * 0.92;
      albedo[i + 3] = 255;
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const length = Math.hypot(-dx, -dy, 1);
      normal[i] = ((-dx / length) * 0.5 + 0.5) * 255;
      normal[i + 1] = ((-dy / length) * 0.5 + 0.5) * 255;
      normal[i + 2] = (1 / length) * 255;
      normal[i + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(albedo, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 6);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  const normalMap = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(6, 6);
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.generateMipmaps = true;
  normalMap.needsUpdate = true;
  surfaces = { map, normalMap };
  return surfaces;
}

type HeightAt = (x: number, z: number) => number;

/** Deterministic per-piece shade so merged geometry keeps a hand-laid, non-flat surface. */
function shadeFor(geometry: THREE.BufferGeometry, salt: number): number {
  const position = geometry.getAttribute('position');
  if (!position || position.count === 0) return 1;
  const h = Math.sin(position.getX(0) * 12.9898 + position.getZ(0) * 78.233 + salt) * 43758.5453;
  return 0.94 + (h - Math.floor(h)) * 0.08;
}

export function paint(geometry: THREE.BufferGeometry, color: THREE.Color, salt = 0): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const tint = color.clone().multiplyScalar(shadeFor(flat, salt));
  for (let i = 0; i < count; i++) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

export function box(
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

export function cylinder(
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

export function cone(
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

export function sphere(parts: Parts, color: THREE.Color, x: number, y: number, z: number, r: number): void {
  const g = new THREE.SphereGeometry(r, 6, 5);
  g.translate(x, y, z);
  parts.push(paint(g, color));
}

export function rock(parts: Parts, x: number, y: number, z: number, r: number, color = AYLLU.stone, spin = 0): void {
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(1, 0.8, 1);
  if (spin) g.rotateY(spin);
  g.translate(x, y + r * 0.45, z);
  parts.push(paint(g, color));
}

/** Local XZ offset rotated the same way as `Object3D.rotateY`. */
function rotate(lx: number, lz: number, ry: number): { x: number; z: number } {
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  return { x: lx * cos + lz * sin, z: -lx * sin + lz * cos };
}

function vec(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Whether the triangle would face into the volume; computed without mutating the caller's points. */
function facesInward(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, interior: THREE.Vector3): boolean {
  const normal = vec(b.x - a.x, b.y - a.y, b.z - a.z).cross(vec(c.x - a.x, c.y - a.y, c.z - a.z));
  const mid = vec((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3).sub(interior);
  return normal.dot(mid) < 0;
}

function triangle(
  parts: Parts,
  color: THREE.Color,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  interior: THREE.Vector3,
  salt = 0,
): void {
  const [p, q, r] = facesInward(a, b, c, interior) ? [a, c, b] : [a, b, c];
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([p!.x, p!.y, p!.z, q!.x, q!.y, q!.z, r!.x, r!.y, r!.z], 3),
  );
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2));
  g.computeVertexNormals();
  parts.push(paint(g, color, salt));
}

function quad(
  parts: Parts,
  color: THREE.Color,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  interior: THREE.Vector3,
  salt = 0,
): void {
  // Swap the quad's order, never the caller's Vector3s: gable faces reuse their corner points.
  const [p, q, r, s] = facesInward(a, b, c, interior) ? [a, d, c, b] : [a, b, c, d];
  const u = Math.max(1, p!.distanceTo(q!));
  const v = Math.max(1, p!.distanceTo(s!));
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [p!.x, p!.y, p!.z, q!.x, q!.y, q!.z, r!.x, r!.y, r!.z, p!.x, p!.y, p!.z, r!.x, r!.y, r!.z, s!.x, s!.y, s!.z],
      3,
    ),
  );
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  g.computeVertexNormals();
  parts.push(paint(g, color, salt));
}

export interface SlabOptions {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly ry?: number;
  /** Explicit top; otherwise the highest ground under the footprint plus `lift`. */
  readonly top?: number;
  /** Height above the highest corner; default 0.12. */
  readonly lift?: number;
  /** How far the slab is buried under the lowest corner; default 0.8. */
  readonly burial?: number;
  readonly getHeight: HeightAt;
}

/**
 * A terrain-conformed plinth: flat top at the highest corner, sides dropping below the lowest one.
 * This is what keeps houses, canchas and terraces from floating on a slope.
 */
export function slab(parts: Parts, color: THREE.Color, o: SlabOptions): number {
  const ry = o.ry ?? 0;
  const hw = o.w / 2;
  const hd = o.d / 2;
  const local: [number, number][] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  const rotateToWorld = ([lx, lz]: [number, number]): { x: number; z: number } => {
    const r = rotate(lx, lz, ry);
    return { x: o.x + r.x, z: o.z + r.z };
  };
  const world = local.map(rotateToWorld);
  // A 3x3 sample, not only the corners: a terrain bulge inside the footprint must not bury the top.
  const heights: number[] = [];
  for (let i = 0; i <= 2; i++) {
    for (let j = 0; j <= 2; j++) {
      const p = rotateToWorld([-hw + (o.w * i) / 2, -hd + (o.d * j) / 2]);
      heights.push(o.getHeight(p.x, p.z));
    }
  }
  const top = o.top ?? Math.max(...heights) + (o.lift ?? 0.12);
  const bottom = Math.min(...heights) - (o.burial ?? 0.8);
  const interior = vec(o.x, (top + bottom) / 2, o.z);
  const t = world.map((p) => vec(p.x, top, p.z));
  const b = world.map((p) => vec(p.x, bottom, p.z));
  quad(parts, color, t[0]!, t[1]!, t[2]!, t[3]!, interior, 3);
  quad(parts, color, b[0]!, b[1]!, b[2]!, b[3]!, interior, 3);
  // Two stone courses per side: a tall plinth or terrace face reads as masonry, not concrete.
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    for (let course = 0; course < 2; course++) {
      const y0 = bottom + ((top - bottom) * course) / 2;
      const y1 = bottom + ((top - bottom) * (course + 1)) / 2;
      quad(
        parts,
        color,
        vec(b[i]!.x, y0, b[i]!.z),
        vec(b[j]!.x, y0, b[j]!.z),
        vec(b[j]!.x, y1, b[j]!.z),
        vec(b[i]!.x, y1, b[i]!.z),
        interior,
        course === 0 ? 2 : 6,
      );
    }
  }
  return top;
}

/**
 * A levelled disc for a small yard: flat top at the highest rim, a stone skirt down to every rim
 * point. Villages use it for a hearth patio, where no player building is placed.
 */
export function levelDisc(
  parts: Parts,
  color: THREE.Color,
  x: number,
  z: number,
  radius: number,
  getHeight: HeightAt,
  segments = 40,
  lift = 0.14,
): number {
  const rim = Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const pz = z + Math.sin(a) * radius;
    return { x: px, z: pz, ground: getHeight(px, pz) };
  });
  const top = Math.max(...rim.map((p) => p.ground)) + lift;
  const center = vec(x, top, z);
  const interior = vec(x, top - 2, z);
  const topRim = rim.map((p) => vec(p.x, top, p.z));
  const groundRim = rim.map((p) => vec(p.x, p.ground, p.z));
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    triangle(parts, color, center, topRim[i]!, topRim[j]!, interior, 5);
    // The retaining skirt is coursed like the rest of the kit's stonework.
    for (let course = 0; course < 2; course++) {
      const t0 = course / 2;
      const t1 = (course + 1) / 2;
      quad(
        parts,
        AYLLU.darkStone,
        topRim[i]!.clone().lerp(groundRim[i]!, t0),
        topRim[j]!.clone().lerp(groundRim[j]!, t0),
        topRim[j]!.clone().lerp(groundRim[j]!, t1),
        topRim[i]!.clone().lerp(groundRim[i]!, t1),
        interior,
        course === 0 ? 7 : 9,
      );
    }
  }
  return top;
}

/**
 * A thin paved disc that follows the ground vertex by vertex. Plazas use this instead of a levelled
 * platform: the mission places a building on the Inticancha plaza, so its floor must stay at grade.
 */
export function conformedDisc(
  parts: Parts,
  color: THREE.Color,
  x: number,
  z: number,
  radius: number,
  getHeight: HeightAt,
  rings = 6,
  sectors = 40,
  lift = 0.05,
): number {
  const positions: number[] = [x, getHeight(x, z) + lift, z];
  const uvs: number[] = [x / 2, z / 2];
  for (let ring = 1; ring <= rings; ring++) {
    const r = (radius * ring) / rings;
    for (let s = 0; s < sectors; s++) {
      const a = (s / sectors) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      positions.push(px, getHeight(px, pz) + lift, pz);
      uvs.push(px / 2, pz / 2);
    }
  }
  const indices: number[] = [];
  for (let s = 0; s < sectors; s++) {
    indices.push(0, 1 + ((s + 1) % sectors), 1 + s);
  }
  for (let ring = 1; ring < rings; ring++) {
    const inner = 1 + (ring - 1) * sectors;
    const outer = 1 + ring * sectors;
    for (let s = 0; s < sectors; s++) {
      const next = (s + 1) % sectors;
      indices.push(inner + s, inner + next, outer + next);
      indices.push(inner + s, outer + next, outer + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  parts.push(paint(g, color));
  return getHeight(x, z) + lift;
}

/** A gridded floor that follows the ground; used for the cancha plots the player builds on. */
export function conformedFloor(
  parts: Parts,
  color: THREE.Color,
  x: number,
  z: number,
  w: number,
  d: number,
  ry: number,
  getHeight: HeightAt,
  segments = 4,
  lift = 0.06,
): number {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= segments; j++) {
    for (let i = 0; i <= segments; i++) {
      const r = rotate(-w / 2 + (w * i) / segments, -d / 2 + (d * j) / segments, ry);
      const px = x + r.x;
      const pz = z + r.z;
      positions.push(px, getHeight(px, pz) + lift, pz);
      uvs.push((w * i) / segments, (d * j) / segments);
    }
  }
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const dd = c + 1;
      indices.push(a, c, b, b, c, dd);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  parts.push(paint(g, color));
  return getHeight(x, z) + lift;
}

/**
 * A gable roof: closed thatch prism with an overhang and a darker ridge. The ridge runs along local
 * X, so the gable ends face the sides the door does not use.
 */
export function gableRoof(
  parts: Parts,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  ry: number,
  rise: number,
  overhang = 0.4,
): number {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const at = (lx: number, ly: number, lz: number): THREE.Vector3 => {
    const r = rotate(lx, lz, ry);
    return vec(x + r.x, y + ly, z + r.z);
  };
  const p1 = at(-hw, 0, hd);
  const p2 = at(hw, 0, hd);
  const p3 = at(hw, rise, 0);
  const p4 = at(-hw, rise, 0);
  const p5 = at(-hw, 0, -hd);
  const p6 = at(hw, 0, -hd);
  const interior = at(0, rise * 0.3 - 0.3, 0);
  quad(parts, AYLLU.thatch, p1, p2, p3, p4, interior, 7);
  quad(parts, AYLLU.thatch, p6, p5, p4, p3, interior, 11);
  quad(parts, AYLLU.thatchDark, p1, p5, p6, p2, interior, 13);
  triangle(parts, AYLLU.thatch, p1, p4, p5, interior, 17);
  triangle(parts, AYLLU.thatch, p2, p3, p6, interior, 19);
  box(parts, AYLLU.thatchDark, x, y + rise - 0.05, z, w + overhang * 2 + 0.1, 0.14, 0.26, ry);
  return y + rise;
}

/** A small stone threshold and a dark recess are enough to read a door at RTS zoom. */
function doorway(
  parts: Parts,
  x: number,
  z: number,
  ry: number,
  base: number,
  depth: number,
  wall: number,
  width = 0.74,
): void {
  const r = rotate(0, depth / 2 + 0.06, ry);
  const dx = x + r.x;
  const dz = z + r.z;
  box(parts, AYLLU.mouth, dx, base, dz, width, wall * 0.62, 0.12, ry);
  box(parts, AYLLU.darkStone, dx, base + wall * 0.62, dz, width + 0.4, 0.18, 0.3, ry);
  box(parts, AYLLU.stone, dx, base - 0.14, dz, width + 0.3, 0.14, 0.5, ry);
}

export interface HouseResult {
  /** Roof apex, measured from the site origin (add the site base for a world Y). */
  readonly top: number;
  /** Wall top (eave), measured from the site origin. */
  readonly eave: number;
}

/**
 * One modular dwelling. `kind` changes the silhouette without a second model: a plastered house, a
 * round qollqa and an open shed cover the three volumes an ayllu needs.
 */
export function aylluHut(parts: Parts, h: AylluHut, getHeight: HeightAt): HouseResult {
  const ry = h.ry ?? 0;
  if (h.kind === 'shed') {
    const floor = slab(parts, AYLLU.earth, {
      x: h.x,
      z: h.z,
      w: h.w + 0.2,
      d: h.d + 0.2,
      ry,
      lift: 0.06,
      burial: 0.7,
      getHeight,
    });
    return shed(parts, h, ry, floor);
  }
  const plinth = slab(parts, AYLLU.stone, {
    x: h.x,
    z: h.z,
    w: h.w + 0.6,
    d: h.d + 0.6,
    ry,
    // Cut into the slope at the centre instead of standing on the highest corner: a hillside house
    // sinks its uphill wall and only the downhill face shows a foundation.
    top: getHeight(h.x, h.z) + 0.16,
    burial: 1.2,
    getHeight,
  });
  if (h.kind === 'storehouse') return storehouse(parts, h, ry, plinth);
  return house(parts, h, ry, plinth);
}

function house(parts: Parts, h: AylluHut, ry: number, plinth: number): HouseResult {
  const wallBase = plinth + 0.26;
  box(parts, AYLLU.stone, h.x, plinth, h.z, h.w + 0.18, 0.26, h.d + 0.18, ry);
  const plastered = h.wallColor !== 'earth';
  box(parts, plastered ? AYLLU.plaster : AYLLU.earth, h.x, wallBase, h.z, h.w, h.wall, h.d, ry);
  // A dark course at the base and a light one under the eave break the single wall volume.
  box(parts, AYLLU.darkStone, h.x, wallBase, h.z, h.w + 0.04, 0.18, h.d + 0.04, ry);
  const eave = wallBase + h.wall;
  box(parts, AYLLU.stone, h.x, eave - 0.12, h.z, h.w + 0.1, 0.12, h.d + 0.1, ry);
  doorway(parts, h.x, h.z, ry, wallBase, h.d, h.wall);
  if (h.w >= 3.4) {
    const r = rotate(h.w / 2 + 0.04, 0, ry);
    box(parts, AYLLU.mouth, h.x + r.x, wallBase + h.wall * 0.45, h.z + r.z, 0.1, 0.36, 0.4, ry);
  }
  const rise = Math.max(0.55, h.wall * 0.52);
  const top = gableRoof(parts, h.x, eave, h.z, h.w, h.d, ry, rise);
  return { top, eave };
}

function storehouse(parts: Parts, h: AylluHut, ry: number, plinth: number): HouseResult {
  const radius = Math.min(h.w, h.d) / 2;
  const barrel = h.wall * 1.05;
  cylinder(parts, AYLLU.stone, h.x, plinth, h.z, radius * 0.93, radius, barrel, 10);
  box(parts, AYLLU.darkStone, h.x, plinth, h.z, radius * 1.6, 0.16, radius * 1.6, ry);
  const roofBase = plinth + barrel;
  cone(parts, AYLLU.thatch, h.x, roofBase, h.z, radius + 0.45, h.wall * 0.85, 10, ry);
  const r = rotate(0, radius + 0.06, ry);
  box(parts, AYLLU.mouth, h.x + r.x, plinth + 0.1, h.z + r.z, 0.62, barrel * 0.56, 0.12, ry);
  box(parts, AYLLU.darkStone, h.x + r.x, plinth + 0.1 + barrel * 0.56, h.z + r.z, 0.9, 0.16, 0.26, ry);
  return { top: roofBase + h.wall * 0.85, eave: roofBase };
}

function shed(parts: Parts, h: AylluHut, ry: number, plinth: number): HouseResult {
  const hw = h.w / 2 - 0.12;
  const hd = h.d / 2 - 0.12;
  const post = Math.max(1.5, h.wall * 1.05);
  for (const [sx, sz] of [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ] as const) {
    const r = rotate(sx, sz, ry);
    box(parts, AYLLU.wood, h.x + r.x, plinth, h.z + r.z, 0.18, post, 0.18, ry);
  }
  // A stone back and side at waist height keep the shed readable as a built volume, not a canopy.
  const back = rotate(0, -hd, ry);
  box(parts, AYLLU.stone, h.x + back.x, plinth, h.z + back.z, h.w, 1.1, 0.26, ry);
  const side = rotate(-hw, 0, ry);
  box(parts, AYLLU.stone, h.x + side.x, plinth, h.z + side.z, 0.26, 1.1, h.d, ry);
  const eave = plinth + post;
  const rise = 0.8;
  const top = gableRoof(parts, h.x, eave, h.z, h.w, h.d, ry, rise, 0.32);
  return { top, eave };
}

/**
 * A stepped, terraced plot: every strip gets a flat top at its own highest ground and a buried stone
 * face, so a field on the valley slope reads as work, not as a floating brown rectangle.
 */
export function terracedField(parts: Parts, f: AylluField, getHeight: HeightAt): void {
  const steps = 2;
  const depth = f.d / steps;
  for (let i = 0; i < steps; i++) {
    const cz = f.z - f.d / 2 + depth * (i + 0.5);
    const top = slab(parts, AYLLU.earth, {
      x: f.x,
      z: cz,
      w: f.w,
      d: depth,
      lift: 0.1,
      burial: 0.9,
      getHeight,
    });
    // The downhill face of each step, and a thin cap so the terrace edge catches the light.
    const lip = cz + depth / 2;
    slab(parts, AYLLU.darkStone, { x: f.x, z: lip, w: f.w, d: 0.36, top: top + 0.06, burial: 1.1, getHeight });
    const rows = Math.max(3, f.rows);
    for (let r = 0; r < rows; r++) {
      const rz = cz + (r - (rows - 1) / 2) * (depth / rows) * 0.86;
      box(parts, r % 2 === 0 ? AYLLU.crop : AYLLU.cropDry, f.x, top + 0.03, rz, f.w * 0.86, 0.14, 0.3);
    }
    // A few maize clumps break the corrugated board into a standing crop.
    for (let c = 0; c < 5; c++) {
      const cx = f.x + (c / 4 - 0.5) * f.w * 0.78;
      const cz2 = cz + (c % 2 === 0 ? -1 : 1) * depth * 0.18;
      cone(parts, AYLLU.crop, cx, top + 0.03, cz2, 0.22, 0.55, 5);
    }
  }
  for (const sx of [-f.w / 2, f.w / 2]) {
    slab(parts, AYLLU.darkStone, {
      x: f.x + sx,
      z: f.z,
      w: 0.3,
      d: f.d,
      lift: 0.18,
      burial: 0.45,
      getHeight,
    });
  }
}

/**
 * The Inticancha plaza: a levelled packed-earth platform with two rings of flagstones and the low
 * altar. No imperial ushnu: a stone table for a founding ayllu.
 */
export function pavedPlaza(parts: Parts, x: number, z: number, radius: number, getHeight: HeightAt): number {
  // The mission builds the communal store on this plaza, so the paving follows the ground instead of
  // raising a platform the building would sink into.
  conformedDisc(parts, AYLLU.packedEarth, x, z, radius, getHeight, 6, 40, 0.12);
  for (const [ring, count, size] of [
    [radius - 0.45, 34, 1.05],
    [radius * 0.74, 24, 1.0],
    [radius * 0.46, 16, 0.9],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (ring === radius - 0.45 ? 0 : 0.18);
      const px = x + Math.cos(a) * ring;
      const pz = z + Math.sin(a) * ring;
      box(parts, AYLLU.stone, px, getHeight(px, pz) + 0.12, pz, size, 0.14, size * 0.64, -a);
    }
  }
  const altarZ = z - 4.6;
  const base = slab(parts, AYLLU.stone, {
    x,
    z: altarZ,
    w: 3.2,
    d: 3.2,
    top: getHeight(x, altarZ) + 0.3,
    burial: 0.7,
    getHeight,
  });
  box(parts, AYLLU.darkStone, x, base, altarZ, 2.4, 0.5, 2.4);
  box(parts, AYLLU.stone, x, base + 0.5, altarZ, 1.6, 0.35, 1.6);
  box(parts, AYLLU.darkStone, x, base + 0.85, altarZ, 1.0, 1.0, 1.0, Math.PI / 4);
  return getHeight(x, z) + 0.12;
}

/**
 * A cancha plot: a ground-conformed stone floor with three low kerbs and an opening to the plaza.
 * `a4_canchas` builds a house on each plot, so nothing here may rise into a podium.
 */
export function canchaPlot(
  parts: Parts,
  x: number,
  z: number,
  facing: { x: number; z: number },
  getHeight: HeightAt,
): number {
  const ry = Math.atan2(facing.x - x, facing.z - z);
  const { w, d } = AYLLU_CANCHA_SIZE;
  const floor = conformedFloor(parts, AYLLU.stone, x, z, w, d, ry, getHeight, 4, 0.1);
  const kerb = (lx: number, lz: number, size: number, yaw: number): void => {
    const r = rotate(lx, lz, ry);
    const g = conformWallGeometry({
      x: x + r.x,
      z: z + r.z,
      size,
      yaw,
      height: 0.34,
      depth: 0.24,
      offset: 0.06,
      getHeight,
      segment: 0.8,
    });
    parts.push(paint(g, AYLLU.darkStone));
  };
  kerb(0, -d / 2, w, ry);
  kerb(-w / 2, 0, d, ry - Math.PI / 2);
  kerb(w / 2, 0, d, ry - Math.PI / 2);
  for (const [lx, lz] of [
    [-1.1, 0.4],
    [1.1, -0.5],
  ] as const) {
    const r = rotate(lx, lz, ry);
    box(parts, AYLLU.stone, x + r.x, getHeight(x + r.x, z + r.z) + 0.1, z + r.z, 1.5, 0.12, 1.0, ry);
  }
  const bench = rotate(0, d / 2 - 0.8, ry);
  box(parts, AYLLU.darkStone, x + bench.x, getHeight(x + bench.x, z + bench.z) + 0.18, z + bench.z, 2, 0.32, 0.46, ry);
  return floor;
}

/** Hearth, pots and a drying rack: the small props that make a hamlet lived in at RTS distance. */
export function villageDressing(
  parts: Parts,
  x: number,
  z: number,
  getHeight: HeightAt,
  phase: 'camp' | 'village',
  yard = true,
  base?: number,
): number {
  const yardTop =
    base ??
    (yard
      ? levelDisc(parts, AYLLU.packedEarth, x, z, phase === 'camp' ? 2 : 2.6, getHeight, 16, 0.1)
      : getHeight(x, z));
  const hearth = yardTop;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    rock(parts, x + 0.6 + Math.cos(a) * 0.62, hearth - 0.1, z + 0.4 + Math.sin(a) * 0.62, 0.2, AYLLU.darkStone);
  }
  box(parts, AYLLU.mouth, x + 0.6, hearth - 0.02, z + 0.4, 0.7, 0.08, 0.7);
  for (const [ox, oz, r] of [
    [-1.4, 1.0, 0.22],
    [-1.0, 1.35, 0.17],
  ] as const) {
    cylinder(parts, AYLLU.earth, x + ox, yardTop, z + oz, r * 0.7, r, 0.36, 7);
  }
  const rackX = x - 1.8;
  const rackZ = z - 1.1;
  const rackY = yardTop;
  box(parts, AYLLU.wood, rackX, rackY, rackZ - 0.55, 0.1, 1.3, 0.1);
  box(parts, AYLLU.wood, rackX, rackY, rackZ + 0.55, 0.1, 1.3, 0.1);
  box(parts, AYLLU.wood, rackX, rackY + 1.15, rackZ, 0.08, 0.08, 1.3);
  return yardTop;
}

/** Dry-stone terrace: a retaining face conformed to the slope, with a thin cap. */
export function retainingTerrace(
  parts: Parts,
  terrace: { x: number; z: number; w: number; d: number; ry: number },
  getHeight: HeightAt,
): void {
  const top = slab(parts, AYLLU.darkStone, {
    x: terrace.x,
    z: terrace.z,
    w: terrace.w,
    d: terrace.d,
    ry: terrace.ry,
    lift: 0.9,
    burial: 1.4,
    getHeight,
  });
  slab(parts, AYLLU.stone, {
    x: terrace.x,
    z: terrace.z,
    w: terrace.w + 0.3,
    d: terrace.d + 0.3,
    ry: terrace.ry,
    top: top + 0.14,
    burial: 0.4,
    getHeight,
  });
}

/** The stepped platform of Huanacaure, level on the slope; the huaca stone arrives with its phase. */
export function shrinePlatform(parts: Parts, x: number, z: number, getHeight: HeightAt): number {
  const [first] = TAMBOTOCO_SHRINE_TIERS;
  const base = Math.max(
    getHeight(x - first.w / 2, z - first.d / 2),
    getHeight(x + first.w / 2, z - first.d / 2),
    getHeight(x - first.w / 2, z + first.d / 2),
    getHeight(x + first.w / 2, z + first.d / 2),
  );
  for (const [i, tier] of TAMBOTOCO_SHRINE_TIERS.entries()) {
    slab(parts, i % 2 === 0 ? AYLLU.stone : AYLLU.darkStone, {
      x,
      z,
      w: tier.w,
      d: tier.d,
      top: base + TAMBOTOCO_SHRINE_TIER_HEIGHT * (i + 1),
      burial: TAMBOTOCO_SHRINE_TIER_HEIGHT * (i + 1) + 0.8,
      getHeight,
    });
  }
  for (const [i, inset] of [0.9, 0.55, 0.3].entries()) {
    const depth = 1.9 - i * 0.2;
    slab(parts, AYLLU.darkStone, {
      x,
      z: z + first.d / 2 - inset,
      w: 4 - i * 0.6,
      d: depth,
      top: base + 0.3 * (i + 1),
      burial: 1.2,
      getHeight,
    });
  }
  const top = base + TAMBOTOCO_SHRINE_TIER_HEIGHT * TAMBOTOCO_SHRINE_TIERS.length;
  for (const [sx, sz] of [
    [-2.4, -1.8],
    [2.4, -1.8],
    [-2.4, 1.8],
    [2.4, 1.8],
  ] as const) {
    box(parts, AYLLU.stone, x + sx, top, z + sz, 0.7, 0.7, 0.7, 0.2);
  }
  return top;
}

/** Ayar Uchu's huaca: a tapered monolith with a carved niche, not a plain box. */
export function shrineStone(parts: Parts, x: number, z: number, base: number): void {
  cylinder(parts, AYLLU.darkStone, x, base, z, 0.92, 1.25, 6.4, 4);
  box(parts, AYLLU.mouth, x, base + 1.4, z + 0.72, 1.0, 2.2, 0.22);
  box(parts, AYLLU.stone, x, base + 3.6, z + 0.68, 1.5, 0.3, 0.3);
  box(parts, AYLLU.stone, x, base + 6.3, z, 2.2, 0.3, 1.4);
  for (const [ox, oz] of [
    [-1.9, 0.2],
    [1.9, 0.4],
  ] as const) {
    rock(parts, x + ox, base, z + oz, 0.5, AYLLU.darkStone);
  }
}

/** The cave mouth of Tambotoco: a rock arch, a dark recess and a stone threshold. */
export function caveMouth(parts: Parts, x: number, z: number, getHeight: HeightAt): void {
  const base = getHeight(x, z);
  // Two staggered rings of rock leave the mouth open; the dark recess is deeper than the lintel.
  const rocks: [number, number, number, number, number][] = [
    [-4.6, -0.2, -0.6, 2.2, 0.3],
    [-3.4, 1.3, -0.5, 1.8, -0.5],
    [-1.9, 2.5, -0.5, 1.6, 0.8],
    [1.9, 2.5, -0.5, 1.6, -0.7],
    [3.4, 1.3, -0.5, 1.8, 0.4],
    [4.6, -0.2, -0.6, 2.2, -0.2],
    [-3.8, 0.3, -2.3, 2.1, 1.1],
    [3.8, 0.3, -2.3, 2.1, -0.9],
    [-1.9, 0.2, 1.2, 1.1, 0.5],
    [1.9, 0.2, 1.2, 1.1, -0.4],
    [0, 3.2, -2.4, 2.0, 0.2],
    [-2.4, 0.6, 1.6, 0.8, -0.3],
    [2.6, 0.5, 1.7, 0.7, 0.7],
  ];
  rocks.forEach(([dx, dy, dz, r, spin], i) =>
    rock(parts, x + dx, base + dy - 0.4, z + dz, r, i % 3 === 0 ? AYLLU.darkStone : AYLLU.stone, spin),
  );
  box(parts, AYLLU.mouth, x, base - 0.2, z - 0.1, 3.6, 4.0, 2.2);
  box(parts, AYLLU.darkStone, x, base + 3.6, z - 0.1, 5.8, 0.6, 2.4);
  slab(parts, AYLLU.stone, {
    x,
    z: z + 2.4,
    w: 3.8,
    d: 3.2,
    lift: 0.08,
    burial: 0.8,
    getHeight,
  });
  box(parts, AYLLU.darkStone, x - 2.7, base, z + 2.4, 1.5, 0.6, 0.8, 0.25);
  box(parts, AYLLU.darkStone, x + 2.7, base, z + 2.4, 1.5, 0.6, 0.8, -0.25);
}

/** Two or three villagers: enough to read a lived-in place at RTS distance. */
export function villagers(parts: Parts, x: number, y: number, z: number, count: number): void {
  const offsets: [number, number][] = [
    [-0.6, 0.3],
    [0.5, -0.4],
    [0.1, 0.8],
  ];
  for (let i = 0; i < count; i++) {
    const [dx, dz] = offsets[i % offsets.length]!;
    const px = x + dx;
    const pz = z + dz;
    cylinder(parts, AYLLU.cloth, px, y, pz, 0.16, 0.22, 0.9, 6);
    sphere(parts, AYLLU.skin, px, y + 1.02, pz, 0.16);
    cone(parts, AYLLU.cloth, px, y + 0.1, pz, 0.3, 0.5, 6);
  }
}
