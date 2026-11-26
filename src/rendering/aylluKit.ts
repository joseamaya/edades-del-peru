import * as THREE from 'three';
import { AYLLU_CANCHA_SIZE, type AylluField, type AylluPath } from '../model/defs/tambotocoLayout';
import { smoothstep } from '../util/math';
import { noise2 } from '../util/noise';
import { conformWallGeometry } from './landscapeConform';

/**
 * Modular in-engine ayllu kit: fieldstone footings, earth/plaster walls, thatch roofs and terraced
 * plots, all generated from the authored positions in `tambotocoLayout.ts`. Every piece samples the
 * terrain, so nothing floats on the Pacaritambo slope and a hut, a field or a cancha can be retuned
 * without redrawing the whole site. It adds shapes and about 17k triangles over the former
 * box-per-hut pass, not a blanket polygon increase.
 */

export type Parts = THREE.BufferGeometry[];

/**
 * Surface families the kit merges by. Each family owns one material and one generated detail set;
 * vertex colours carry the actual hue, so stone, plaster, earth, thatch and wood read as different
 * materials without a texture per tint.
 */
export type SurfaceFamily =
  'stone' | 'rock' | 'earth' | 'plaster' | 'thatch' | 'wood' | 'crops' | 'cropsWet' | 'people';

export const AYLLU = {
  // Tints stay under art-direction §5's 0.8 albedo cap; the detail map multiplies them down again.
  // Warm fieldstone and straw thatch, not cold grey and mustard (tambotoco-art-pilot.md §4).
  stone: new THREE.Color('#8a8174'),
  rock: new THREE.Color('#8a7c6b'),
  darkStone: new THREE.Color('#6e675d'),
  plaster: new THREE.Color('#b49a78'),
  earth: new THREE.Color('#8a7358'),
  packedEarth: new THREE.Color('#a08a6a'),
  thatch: new THREE.Color('#b49b6a'),
  thatchDark: new THREE.Color('#8c774d'),
  crop: new THREE.Color('#6f7c3f'),
  cropDry: new THREE.Color('#8a8258'),
  // Distinct instances so only the canal-side field gets the wet-material tint; same base hue.
  cropWet: new THREE.Color('#5f7a3c'),
  cropWetDry: new THREE.Color('#8a8258'),
  mouth: new THREE.Color('#120f0c'),
  cloth: new THREE.Color('#a0603c'),
  /** Props: a wood hue carried by the shadow-casting earth family (the `wood` family is shadowless). */
  timber: new THREE.Color('#6a5238'),
  textile: new THREE.Color('#8a5a3c'),
  skin: new THREE.Color('#94694a'),
  wood: new THREE.Color('#6a5238'),
} as const;

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Keyed by object identity: crop and cropWet share a hue but must resolve to the dry/wet materials.
const SURFACE_OF = new Map<THREE.Color, SurfaceFamily>([
  [AYLLU.stone, 'stone'],
  [AYLLU.rock, 'rock'],
  [AYLLU.darkStone, 'stone'],
  [AYLLU.plaster, 'plaster'],
  [AYLLU.earth, 'earth'],
  [AYLLU.packedEarth, 'earth'],
  [AYLLU.thatch, 'thatch'],
  [AYLLU.thatchDark, 'thatch'],
  [AYLLU.crop, 'crops'],
  [AYLLU.cropDry, 'crops'],
  [AYLLU.cropWet, 'cropsWet'],
  [AYLLU.cropWetDry, 'cropsWet'],
  [AYLLU.mouth, 'wood'],
  [AYLLU.cloth, 'people'],
  [AYLLU.skin, 'people'],
  [AYLLU.timber, 'earth'],
  [AYLLU.textile, 'earth'],
  [AYLLU.wood, 'wood'],
]);

function surfaceForColor(color: THREE.Color): SurfaceFamily {
  return SURFACE_OF.get(color) ?? 'stone';
}

export interface SurfaceDetail {
  readonly map: THREE.DataTexture;
  readonly normalMap: THREE.DataTexture;
  /** World metres covered by one texture repeat. */
  readonly tile: number;
  readonly roughness: number;
  readonly normalScale: number;
}

const DETAIL_SIZE = 128;
const DETAILS = new Map<SurfaceFamily, SurfaceDetail>();

function smooth(height: Float32Array, size: number, passes: number): void {
  for (let pass = 0; pass < passes; pass++) {
    const src = height.slice();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += src[((y + dy + size) % size) * size + ((x + dx + size) % size)]!;
          }
        }
        height[y * size + x] = sum / 9;
      }
    }
  }
}

function stoneHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size).fill(0.55);
  const set = (x: number, y: number, v: number): void => {
    height[(((y % size) + size) % size) * size + (((x % size) + size) % size)] = v;
  };
  const rowHeights = [22, 29, 24, 32, 26];
  let y = 0;
  let row = 0;
  while (y < size) {
    const course = rowHeights[row % rowHeights.length]!;
    let x = (row * 13) % size;
    for (let dx = 0; dx < size; dx++) set(x + dx, y, 0.32);
    while (x < size + 40) {
      const width = 18 + Math.floor(rng() * 26);
      const shade = 0.5 + rng() * 0.16;
      for (let by = 2; by < course - 1; by++) {
        for (let bx = 2; bx < width - 1; bx++) {
          set(x + bx, y + by, shade + rng() * 0.12);
        }
      }
      for (let by = 0; by < course; by++) set(x + width - 1, y + by, 0.3);
      x += width;
    }
    y += course;
    row++;
  }
  // A few cracks and pitted stones keep the courses from looking printed.
  for (let i = 0; i < 20; i++) {
    let cx = Math.floor(rng() * size);
    let cy = Math.floor(rng() * size);
    for (let s = 0; s < 8 + rng() * 16; s++) {
      set(cx, cy, 0.28);
      cx += rng() > 0.5 ? 1 : 0;
      cy += rng() > 0.4 ? 1 : 0;
    }
  }
  smooth(height, size, 1);
  return height;
}

function thatchHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size).fill(0.56);
  for (let i = 0; i < 900; i++) {
    let x = rng() * size;
    let y = rng() * size;
    const len = 10 + rng() * 26;
    const dx = (rng() - 0.5) * 0.35;
    const dy = -1;
    const shade = 0.62 + rng() * 0.34;
    for (let s = 0; s < len; s++) {
      const px = ((Math.round(x) % size) + size) % size;
      const py = ((Math.round(y) % size) + size) % size;
      height[py * size + px] = Math.max(height[py * size + px]!, shade);
      x += dx;
      y += dy;
    }
  }
  return height;
}

function plasterHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.78 + rng() * 0.12;
  smooth(height, size, 2);
  for (let i = 0; i < 14; i++) {
    let x = Math.floor(rng() * size);
    let y = Math.floor(rng() * size);
    for (let s = 0; s < 6 + rng() * 16; s++) {
      height[((y + size) % size) * size + ((x + size) % size)] = 0.5;
      x += rng() > 0.55 ? 1 : 0;
      y += rng() > 0.3 ? 1 : 0;
    }
  }
  return height;
}

function earthHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.62 + rng() * 0.22;
  smooth(height, size, 1);
  for (let i = 0; i < 80; i++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = 0.7 + rng() * 1.8;
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (x * x + y * y > r * r) continue;
        const px = ((Math.round(cx + x) % size) + size) % size;
        const py = ((Math.round(cy + y) % size) + size) % size;
        height[py * size + px] = 0.85;
      }
    }
  }
  return height;
}

function rockHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = 0.55 + rng() * 0.3;
  smooth(height, size, 2);
  // Fracture planes and pits: enough relief for a faceted boulder, no masonry courses.
  for (let i = 0; i < 26; i++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = 2 + rng() * 8;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        const px = ((Math.round(cx + x) % size) + size) % size;
        const py = ((Math.round(cy + y) % size) + size) % size;
        height[py * size + px] = Math.max(0.25, height[py * size + px]! - rng() * 0.25);
      }
    }
  }
  return height;
}

function woodHeight(rng: () => number, size: number): Float32Array {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(x * 0.22 + Math.sin(y * 0.04) * 2.1) * 0.5 + 0.5;
      height[y * size + x] = 0.58 + grain * 0.16 + rng() * 0.05;
    }
  }
  for (let i = 0; i < 5; i++) {
    const cx = Math.floor(rng() * size);
    const cy = Math.floor(rng() * size);
    for (let y = -3; y <= 3; y++) {
      for (let x = -3; x <= 3; x++) {
        if (x * x + y * y > 9) continue;
        const px = (((cx + x) % size) + size) % size;
        const py = (((cy + y) % size) + size) % size;
        height[py * size + px] = 0.36;
      }
    }
  }
  return height;
}

function heightSet(family: SurfaceFamily): Float32Array {
  const rng = lcg(1337 + family.length * 97 + family.charCodeAt(0));
  const size = DETAIL_SIZE;
  switch (family) {
    case 'stone':
      return stoneHeight(rng, size);
    case 'rock':
      return rockHeight(rng, size);
    case 'thatch':
      return thatchHeight(rng, size);
    case 'plaster':
      return plasterHeight(rng, size);
    case 'earth':
      return earthHeight(rng, size);
    case 'wood':
      return woodHeight(rng, size);
    default:
      return new Float32Array(size * size).fill(0.8);
  }
}

function buildDetail(family: SurfaceFamily): SurfaceDetail {
  const size = DETAIL_SIZE;
  const height = heightSet(family);
  const at = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)]!;
  const albedo = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const normalStrength = family === 'thatch' ? 3.4 : family === 'stone' ? 3.0 : 2.0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Near-white detail: the material colour and the baked vertex tint carry the hue.
      const v = Math.round((0.82 + at(x, y) * 0.18) * 255);
      albedo[i] = v;
      albedo[i + 1] = v;
      albedo[i + 2] = v;
      albedo[i + 3] = 255;
      const dx = (at(x + 1, y) - at(x - 1, y)) * normalStrength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * normalStrength;
      const length = Math.hypot(-dx, -dy, 1);
      normal[i] = ((-dx / length) * 0.5 + 0.5) * 255;
      normal[i + 1] = ((-dy / length) * 0.5 + 0.5) * 255;
      normal[i + 2] = (1 / length) * 255;
      normal[i + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(albedo, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  const normalMap = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.generateMipmaps = true;
  normalMap.needsUpdate = true;
  const tuning: Record<SurfaceFamily, { tile: number; roughness: number; normalScale: number }> = {
    stone: { tile: 1.5, roughness: 0.95, normalScale: 0.5 },
    rock: { tile: 2.2, roughness: 0.98, normalScale: 0.55 },
    earth: { tile: 2.4, roughness: 0.95, normalScale: 0.4 },
    plaster: { tile: 2.1, roughness: 0.9, normalScale: 0.28 },
    thatch: { tile: 1.1, roughness: 0.86, normalScale: 0.6 },
    wood: { tile: 1.3, roughness: 0.82, normalScale: 0.4 },
    crops: { tile: 1, roughness: 1, normalScale: 0.2 },
    cropsWet: { tile: 1, roughness: 1, normalScale: 0.2 },
    people: { tile: 1, roughness: 0.9, normalScale: 0.2 },
  };
  return { map, normalMap, ...tuning[family] };
}

/** One generated detail set per surface family, shared by every phase and instance. */
export function surfaceDetail(family: SurfaceFamily): SurfaceDetail {
  let detail = DETAILS.get(family);
  if (!detail) {
    detail = buildDetail(family);
    DETAILS.set(family, detail);
  }
  return detail;
}

/** A world-scale UV tile size for a geometry, applied once when it is painted. */
function scaleSurfaceUv(geometry: THREE.BufferGeometry, family: SurfaceFamily): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) return;
  const scale = 1 / surfaceDetail(family).tile;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * scale, uv.getY(i) * scale);
  uv.needsUpdate = true;
}

/** Rewrite BoxGeometry's per-face 0..1 UVs to world metres (paint divides by the family tile). */
function boxUv(geometry: THREE.BufferGeometry, w: number, h: number, d: number): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) return;
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let face = 0; face < 6; face++) {
    const [su, sv] = dims[face]!;
    for (let i = 0; i < 4; i++) {
      const index = face * 4 + i;
      uv.setXY(index, uv.getX(index) * su, uv.getY(index) * sv);
    }
  }
  uv.needsUpdate = true;
}

/** Rewrite a cylinder/cone/sphere's 0..1 UVs to world metres around and along the primitive. */
function wrapUv(geometry: THREE.BufferGeometry, around: number, along: number): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * around, uv.getY(i) * along);
  uv.needsUpdate = true;
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
  const family = surfaceForColor(color);
  scaleSurfaceUv(flat, family);
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const tint = color.clone().multiplyScalar(shadeFor(flat, salt));
  for (let i = 0; i < count; i++) {
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  flat.userData.surface = family;
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
  boxUv(g, w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  parts.push(paint(g, color));
}

/**
 * Bake contact AO and low-frequency colour variation into a merged kit geometry. `groundAt` returns
 * the local ground under a vertex (site-space Y), so the AO follows the slope instead of the site
 * datum: a hut at 7 m on the hillside still darkens at its footing. The macro octaves sit inside the
 * 32–64 m band (≈50 m and ≈33 m); the detail map already covers 1–2 m.
 */
export function ageSurface(geometry: THREE.BufferGeometry, groundAt: HeightAt): void {
  const position = geometry.getAttribute('position');
  const color = geometry.getAttribute('color');
  const normal = geometry.getAttribute('normal');
  if (!position || !color) return;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const height = smoothstep(0, 1.6, y - groundAt(x, z));
    const nY = normal ? Math.abs(normal.getY(i)) : 0.5;
    const ao = nY > 0.7 ? 0.94 + 0.06 * height : 0.74 + 0.26 * height;
    const macro = 0.9 + 0.1 * (noise2(x * 0.02, z * 0.02) * 0.7 + noise2(x * 0.03 + 13.7, z * 0.03 - 7.1) * 0.3);
    const scale = ao * macro;
    color.setXYZ(
      i,
      Math.min(1, color.getX(i) * scale),
      Math.min(1, color.getY(i) * scale),
      Math.min(1, color.getZ(i) * scale),
    );
  }
  color.needsUpdate = true;
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
  wrapUv(g, Math.PI * (rTop + rBottom), h);
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
  wrapUv(g, Math.PI * 2 * r, h);
  if (ry) g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  parts.push(paint(g, color));
}

export function sphere(parts: Parts, color: THREE.Color, x: number, y: number, z: number, r: number): void {
  const g = new THREE.SphereGeometry(r, 6, 5);
  wrapUv(g, Math.PI * 2 * r, Math.PI * r);
  g.translate(x, y, z);
  parts.push(paint(g, color));
}

export function rock(parts: Parts, x: number, y: number, z: number, r: number, color = AYLLU.rock, spin = 0): void {
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
  const uvs: number[] = [x, z];
  for (let ring = 1; ring <= rings; ring++) {
    const r = (radius * ring) / rings;
    for (let s = 0; s < sectors; s++) {
      const a = (s / sectors) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      positions.push(px, getHeight(px, pz) + lift, pz);
      uvs.push(px, pz);
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
      uvs.push(px, pz);
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
 * A stepped, terraced plot: every strip gets a flat top at its own highest ground and a buried stone
 * face, so a field on the valley slope reads as work, not as a floating brown rectangle.
 */
export function terracedField(parts: Parts, f: AylluField, getHeight: HeightAt): void {
  const steps = 2;
  const depth = f.d / steps;
  for (let i = 0; i < steps; i++) {
    const cz = f.z - f.d / 2 + depth * (i + 0.5);
    // The plot follows the relief instead of sitting in a raised planter box; only the downhill edge
    // gets a retaining face.
    conformedFloor(parts, AYLLU.earth, f.x, cz, f.w, depth, 0, getHeight, 4, 0.08);
    const lip = cz + depth / 2;
    const face = conformWallGeometry({
      x: f.x,
      z: lip,
      size: f.w,
      yaw: 0,
      height: 0.42,
      depth: 0.32,
      offset: 0.04,
      getHeight,
      segment: 1.2,
    });
    parts.push(paint(face, AYLLU.darkStone));
    const rows = Math.max(3, f.rows);
    for (let r = 0; r < rows; r++) {
      const rz = cz + (r - (rows - 1) / 2) * (depth / rows) * 0.86;
      const top = getHeight(f.x, rz) + 0.08;
      // A raised earth ridge with a strip of crop on top; the old flat boxes read as painted planks.
      box(parts, AYLLU.earth, f.x, top + 0.02, rz, f.w * 0.86, 0.14, 0.26);
      box(
        parts,
        r % 2 === 0 ? (f.irrigated ? AYLLU.cropWet : AYLLU.crop) : f.irrigated ? AYLLU.cropWetDry : AYLLU.cropDry,
        f.x,
        top + 0.16,
        rz,
        f.w * 0.84,
        0.08,
        0.2,
      );
      for (let c = 0; c < 3; c++) {
        const cx = f.x + (c / 2 - 0.5) * f.w * 0.7;
        const cz2 = rz + (c % 2 === 0 ? -0.05 : 0.05);
        const cy = getHeight(cx, cz2) + 0.06;
        cone(parts, f.irrigated ? AYLLU.cropWet : AYLLU.crop, cx, cy + 0.18, cz2, 0.18, 0.48 + (c % 2) * 0.12, 5);
      }
    }
    // A shallow irrigation furrow along the uphill edge.
    box(parts, AYLLU.earth, f.x, getHeight(f.x, cz - depth / 2) + 0.04, cz - depth / 2 + 0.2, f.w * 0.9, 0.06, 0.22);
  }
  rock(parts, f.x - f.w / 2 + 0.8, getHeight(f.x - f.w / 2 + 0.8, f.z), f.z - f.d / 2 + 0.6, 0.26);
  rock(parts, f.x + f.w / 2 - 1.1, getHeight(f.x + f.w / 2 - 1.1, f.z), f.z + f.d / 2 - 0.5, 0.2);
}

/**
 * The Inticancha plaza: a levelled packed-earth platform with two rings of flagstones and the low
 * altar. No imperial ushnu: a stone table for a founding ayllu.
 */
export function pavedPlaza(parts: Parts, x: number, z: number, radius: number, getHeight: HeightAt): number {
  // The mission builds the communal store on this plaza, so the paving follows the ground instead of
  // raising a platform the building would sink into.
  conformedDisc(parts, AYLLU.packedEarth, x, z, radius, getHeight, 6, 40, 0.12);
  // One sparse rim of flagstones, set almost flush with the packed earth. Three concentric rings
  // read as a wooden deck from the RTS camera; a single rim reads as a bounded plaza.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.08;
    const px = x + Math.cos(a) * (radius - 0.6);
    const pz = z + Math.sin(a) * (radius - 0.6);
    box(parts, AYLLU.stone, px, getHeight(px, pz) + 0.04, pz, 0.86, 0.06, 0.52, -a);
  }
  // A low kerb bounds the plaza and leaves the four cancha axes open.
  for (let i = 0; i < 32; i++) {
    if (i % 8 === 0) continue;
    const a = (i / 32) * Math.PI * 2 + Math.PI / 32;
    const px = x + Math.cos(a) * (radius + 0.2);
    const pz = z + Math.sin(a) * (radius + 0.2);
    box(parts, AYLLU.darkStone, px, getHeight(px, pz) + 0.04, pz, 0.92, 0.2, 0.28, -a);
  }
  // Four packed-earth axes tie the plaza to the canchas.
  for (const [ax, az, w, d] of [
    [0, -1, 1.4, 6.5],
    [0, 1, 1.4, 6.5],
    [-1, 0, 6.5, 1.4],
    [1, 0, 6.5, 1.4],
  ] as const) {
    const px = x + ax * (radius + 3.1);
    const pz = z + az * (radius + 3.1);
    conformedFloor(parts, AYLLU.packedEarth, px, pz, w, d, 0, getHeight, 4, 0.08);
  }
  const altarZ = z - 4.6;
  const base = slab(parts, AYLLU.stone, {
    x,
    z: altarZ,
    w: 3.4,
    d: 3.4,
    top: getHeight(x, altarZ) + 0.3,
    burial: 0.7,
    getHeight,
  });
  // Two low steps, a stone table and a small fire bowl: a founding-altar abstraction, not an ushnu.
  box(parts, AYLLU.darkStone, x, base, altarZ, 2.8, 0.18, 2.8);
  box(parts, AYLLU.stone, x, base + 0.18, altarZ, 2.4, 0.42, 2.4);
  box(parts, AYLLU.darkStone, x, base + 0.6, altarZ, 1.6, 0.3, 1.6);
  cylinder(parts, AYLLU.darkStone, x, base + 0.9, altarZ, 0.34, 0.42, 0.32, 8);
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
  const floor = conformedFloor(parts, AYLLU.packedEarth, x, z, w, d, ry, getHeight, 4, 0.1);
  const kerb = (lx: number, lz: number, size: number, yaw: number): void => {
    const r = rotate(lx, lz, ry);
    const g = conformWallGeometry({
      x: x + r.x,
      z: z + r.z,
      size,
      yaw,
      height: 0.4,
      depth: 0.26,
      offset: 0.06,
      getHeight,
      segment: 0.8,
    });
    parts.push(paint(g, AYLLU.darkStone));
  };
  kerb(0, -d / 2, w, ry);
  kerb(-w / 2, 0, d, ry - Math.PI / 2);
  kerb(w / 2, 0, d, ry - Math.PI / 2);
  // A stone threshold marks the opening to the plaza; it follows the ground so no end is buried.
  const front = rotate(0, d / 2, ry);
  conformedFloor(parts, AYLLU.stone, x + front.x, z + front.z, 1.7, 0.55, ry, getHeight, 2, 0.06);
  const bench = rotate(0, -d / 2 + 0.8, ry);
  box(parts, AYLLU.darkStone, x + bench.x, getHeight(x + bench.x, z + bench.z) + 0.18, z + bench.z, 2, 0.3, 0.44, ry);
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
  detail = true,
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
  // Woodpile, low yard wall and midden: the hamlet reads as a working household, not four boxes.
  for (let i = 0; i < 4; i++) {
    cylinder(parts, AYLLU.wood, x + 1.5 + (i % 2) * 0.22, yardTop + i * 0.14, z - 1.9, 0.1, 0.1, 1.1, 5);
  }
  for (const side of [-1, 1]) {
    box(parts, AYLLU.darkStone, x + side * 2.3, yardTop, z - 1.4, 0.34, 0.55, 2.0, side * 0.08);
  }
  for (let i = 0; i < 4; i++) {
    rock(parts, x - 1.2 + i * 0.28, yardTop - 0.1, z + 1.6 + (i % 2) * 0.2, 0.14 + (i % 3) * 0.04, AYLLU.darkStone);
  }
  box(parts, AYLLU.mouth, x - 0.7, yardTop - 0.02, z + 1.7, 0.9, 0.05, 0.7);
  if (detail) householdDetail(parts, x, z, yardTop);
  return yardTop;
}

/**
 * Household detail around a yard: a backstrap loom and a pottery pair. All of it merges into the
 * existing stone/earth families, so the extra lived-in detail costs no draw calls; the geometry budget
 * is a few hundred triangles. The late Inticancha phases skip earth shadows, so the props are matte.
 */
function householdDetail(parts: Parts, x: number, z: number, yardTop: number): void {
  // Loom: four posts, two beams and a hanging panel, set beside the house wall.
  const lx = x + 1.45;
  const lz = z + 1.35;
  for (const [ox, oz] of [
    [-0.42, -0.32],
    [0.42, -0.32],
    [-0.42, 0.32],
    [0.42, 0.32],
  ] as const) {
    box(parts, AYLLU.timber, lx + ox, yardTop, lz + oz, 0.07, 1.15, 0.07);
  }
  box(parts, AYLLU.timber, lx, yardTop + 1.1, lz, 0.92, 0.07, 0.07);
  box(parts, AYLLU.timber, lx, yardTop + 0.42, lz, 0.92, 0.06, 0.06);
  box(parts, AYLLU.textile, lx, yardTop + 0.5, lz, 0.72, 0.55, 0.03);
  // Pottery pair: two jars of different heights and mouths.
  for (const [ox, oz, r, h] of [
    [-0.35, -1.55, 0.18, 0.3],
    [0.55, -1.35, 0.2, 0.36],
  ] as const) {
    cylinder(parts, AYLLU.earth, x + ox, yardTop, z + oz, r * 0.8, r, h, 7);
    cylinder(parts, AYLLU.darkStone, x + ox, yardTop + h, z + oz, r * 0.62, r * 0.74, 0.06, 7);
  }
}

/** Offerings at the huaca: a stone cairn, two jars and a folded cloth at the platform edge. */
export function shrineOfferings(parts: Parts, x: number, z: number, base: number): void {
  for (let i = 0; i < 5; i++) {
    rock(
      parts,
      x - 2.4 + (i % 2) * 0.3,
      base + i * 0.16,
      z + 2.2 + Math.floor(i / 2) * 0.22,
      0.22 - i * 0.015,
      AYLLU.darkStone,
      i,
    );
  }
  cylinder(parts, AYLLU.earth, x + 2.5, base, z + 1.8, 0.16, 0.2, 0.28, 7);
  cylinder(parts, AYLLU.plaster, x + 2.5, base + 0.28, z + 1.8, 0.12, 0.15, 0.05, 7);
  cylinder(parts, AYLLU.earth, x + 2.9, base, z + 1.55, 0.12, 0.16, 0.22, 7);
  box(parts, AYLLU.textile, x + 2.2, base, z + 2.15, 0.5, 0.04, 0.34, 0.2);
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

/** Ayar Uchu's huaca: a tapered monolith with a carved niche, not a plain box. */
export function shrineStone(parts: Parts, x: number, z: number, base: number): void {
  slab(parts, AYLLU.darkStone, {
    x,
    z,
    w: 2.4,
    d: 2.2,
    top: base + 0.35,
    burial: 0.7,
    getHeight: () => base,
  });
  cylinder(parts, AYLLU.rock, x, base + 0.35, z, 0.72, 1.15, 5.0, 6);
  box(parts, AYLLU.mouth, x, base + 1.2, z + 0.95, 1.0, 1.9, 0.3);
  box(parts, AYLLU.stone, x, base + 3.1, z + 0.9, 1.5, 0.3, 0.4);
  box(parts, AYLLU.stone, x, base + 4.6, z, 1.9, 0.28, 1.35);
  // A small offering ledge and two flanking stones, so the huaca belongs to the platform.
  box(parts, AYLLU.darkStone, x, base + 0.35, z + 1.45, 1.4, 0.28, 0.7);
  for (const [ox, oz] of [
    [-1.9, 0.2],
    [1.9, 0.4],
  ] as const) {
    rock(parts, x + ox, base + 0.35, z + oz, 0.5, AYLLU.rock);
  }
}

/** The cave mouth of Tambotoco: a rock arch, a dark recess and a stone threshold. */
export function caveMouth(parts: Parts, x: number, z: number, getHeight: HeightAt): void {
  const base = getHeight(x, z);
  // Two staggered rings of rock leave the mouth open; the dark recess is deeper than the lintel.
  const rocks: [number, number, number, number, number][] = [
    [-5.0, -0.2, -0.6, 2.5, 0.3],
    [-3.7, 1.4, -0.5, 2.0, -0.5],
    [-2.1, 2.7, -0.6, 1.8, 0.8],
    [2.1, 2.7, -0.6, 1.8, -0.7],
    [3.7, 1.4, -0.5, 2.0, 0.4],
    [5.0, -0.2, -0.6, 2.5, -0.2],
    [-4.2, 0.3, -2.6, 2.3, 1.1],
    [4.2, 0.3, -2.6, 2.3, -0.9],
    [-2.0, 0.2, 1.3, 1.2, 0.5],
    [2.0, 0.2, 1.3, 1.2, -0.4],
    [0, 3.6, -2.8, 2.2, 0.2],
    [-2.7, 0.6, 1.7, 0.9, -0.3],
    [2.9, 0.5, 1.8, 0.8, 0.7],
    [-5.6, 0.8, 1.1, 0.7, 1.4],
    [5.7, 0.7, 1.0, 0.6, -1.2],
  ];
  rocks.forEach(([dx, dy, dz, r, spin]) => rock(parts, x + dx, base + dy - 0.4, z + dz, r, AYLLU.rock, spin));
  // A real arch-shaped void instead of a black rectangle: the shape is extruded into the hill.
  const shape = new THREE.Shape();
  shape.moveTo(-1.75, 0);
  shape.lineTo(1.75, 0);
  shape.lineTo(1.75, 1.55);
  shape.absarc(0, 1.55, 1.75, 0, Math.PI, false);
  shape.lineTo(-1.75, 0);
  const opening = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false, curveSegments: 10 });
  opening.translate(x, base - 0.05, z - 2.6);
  parts.push(paint(opening, AYLLU.mouth));
  // The back wall keeps the tunnel from showing the sky through the hill.
  box(parts, AYLLU.mouth, x, base - 0.2, z - 2.7, 3.8, 4.2, 0.3);
  box(parts, AYLLU.rock, x, base + 3.35, z - 0.15, 4.6, 0.5, 1.0, 0.04);
  box(parts, AYLLU.rock, x, base + 3.8, z - 0.25, 5.8, 0.35, 2.2, 0.02);
  slab(parts, AYLLU.stone, {
    x,
    z: z + 2.5,
    w: 4.2,
    d: 3.4,
    lift: 0.08,
    burial: 0.8,
    getHeight,
  });
  box(parts, AYLLU.darkStone, x - 2.7, base, z + 2.4, 1.5, 0.6, 0.8, 0.25);
  box(parts, AYLLU.darkStone, x + 2.7, base, z + 2.4, 1.5, 0.6, 0.8, -0.25);
  // Scree apron: the cave must meet the slope, not sit on it like a stage flat.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 3.4 + (i % 3) * 0.8;
    const px = x + Math.cos(a) * r;
    const pz = z + 2.0 + Math.sin(a) * 1.2;
    rock(parts, px, getHeight(px, pz) - 0.1, pz, 0.22 + (i % 3) * 0.08, AYLLU.rock, i);
  }
}

/**
 * A worn footpath: an earth ribbon conformed step by step, irregular flagstones and a few curb stones.
 * Small enough to follow the Pacaritambo slope without floating at either end.
 */
/** A small stone slab bridge over the acequia: two abutments, a deck and low parapets. */
export function stoneBridge(
  parts: Parts,
  bridge: { readonly x: number; readonly z: number; readonly yaw: number; readonly w: number; readonly d: number },
  getHeight: HeightAt,
): void {
  const { x, z, yaw, w, d } = bridge;
  const at = (lx: number, lz: number): { x: number; z: number } => {
    const r = rotate(lx, lz, yaw);
    return { x: x + r.x, z: z + r.z };
  };
  const ends = [at(0, -d / 2), at(0, d / 2)];
  const deckY = Math.max(...ends.map((p) => getHeight(p.x, p.z))) + 0.5;
  box(parts, AYLLU.stone, x, deckY, z, w, 0.18, d, yaw);
  for (const side of [-1, 1]) {
    const p = at(side * (w / 2 + 0.12), 0);
    box(parts, AYLLU.darkStone, p.x, deckY + 0.16, p.z, 0.22, 0.32, d, yaw);
  }
  for (const end of ends) {
    box(parts, AYLLU.darkStone, end.x, getHeight(end.x, end.z) - 0.1, end.z, w + 0.4, 0.6, 0.8, yaw);
  }
}

export function stonePath(parts: Parts, path: AylluPath, getHeight: HeightAt): void {
  const { points, width } = path;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const steps = Math.max(1, Math.ceil(len / 1.3));
    const yaw = Math.atan2(dx, dz);
    const px = -dz / len;
    const pz = dx / len;
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const cx = a.x + dx * t;
      const cz = a.z + dz * t;
      // A thin earth strip under the stones keeps grass from growing between every slab.
      conformedFloor(parts, AYLLU.packedEarth, cx, cz, width * 0.9, 1.3, yaw, getHeight, 2, 0.03);
      const offset = ((s % 2) - 0.5) * width * 0.28;
      const sx = cx + px * offset;
      const sz = cz + pz * offset;
      box(
        parts,
        s % 3 === 0 ? AYLLU.darkStone : AYLLU.stone,
        sx,
        getHeight(sx, sz) + 0.02,
        sz,
        0.68 + (s % 4) * 0.07,
        0.07,
        0.46 + (s % 3) * 0.05,
        yaw + ((s % 5) - 2) * 0.06,
      );
      if (s % 2 === 0) {
        for (const side of [-1, 1]) {
          const rx = cx + px * side * (width * 0.5 + 0.15);
          const rz = cz + pz * side * (width * 0.5 + 0.15);
          rock(parts, rx, getHeight(rx, rz) - 0.08, rz, 0.13 + (s % 3) * 0.03, AYLLU.rock, s);
        }
      }
    }
  }
}

/** Two or three villagers: enough to read a lived-in place at RTS distance. */ export function villagers(
  parts: Parts,
  x: number,
  y: number,
  z: number,
  count: number,
): void {
  const offsets: [number, number, number][] = [
    [-0.6, 0.3, 0.2],
    [0.5, -0.4, -0.4],
    [0.1, 0.8, 0.9],
  ];
  for (let i = 0; i < count; i++) {
    const [dx, dz, yaw] = offsets[i % offsets.length]!;
    const px = x + dx;
    const pz = z + dz;
    // Shoulders, arms and hair give the static villager a human silhouette instead of a cone with a ball.
    box(parts, AYLLU.cloth, px, y + 0.82, pz, 0.42, 0.22, 0.24, yaw);
    for (const side of [-1, 1]) {
      const r = rotate(side * 0.24, 0, yaw);
      cylinder(parts, AYLLU.skin, px + r.x, y + 0.62, pz + r.z, 0.06, 0.05, 0.42, 5);
    }
    cone(parts, AYLLU.cloth, px, y + 0.1, pz, 0.3, 0.78, 6);
    sphere(parts, AYLLU.skin, px, y + 1.33, pz, 0.16);
    sphere(parts, AYLLU.mouth, px, y + 1.41, pz, 0.13);
    box(parts, AYLLU.cloth, px, y + 1.28, pz, 0.3, 0.07, 0.3, yaw);
  }
}
