import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CivDef, ArchStyle, EmblemId } from './defs/civs';
import { ModelSpec } from './defs/units';
import { CivId, Era } from '../core/types';
import { ERA_DEFS } from './defs/eras';
import type { HistoricalArchitectureProfile, SilhouetteMotif, WallMaterial, RoofMaterial } from './defs/architecture';
import type { LandmarkId } from './defs/landmarks';
import { mixHex } from '../util/math';
import { scaleUv } from '../util/uv';
import { MaterialTex } from '../rendering/Textures';
import { getGeneratedMaterial } from '../rendering/Biomes';

/** Procedural texture types available for materials. */
type TexKind =
  | 'wood'
  | 'brick'
  | 'stone'
  | 'concrete'
  | 'metal'
  | 'metalDark'
  | 'metalWarm'
  | 'roof'
  | 'cloth'
  | 'textile'
  | 'leather'
  | 'dirt'
  // building materials (walls / foundations / roofs), by architectural style
  | 'adobe'
  | 'cutstone'
  | 'megalith'
  | 'fieldstone'
  | 'thatch'
  | 'flatstone'
  | 'flatmetal'
  // historical Andean textiles (uncu patterns), per civilization
  | 'textile_inca'
  | 'textile_wari'
  | 'textile_tiahuanaco'
  | 'textile_moche'
  | 'textile_chavin'
  | 'textile_paracas'
  | 'textile_nazca'
  | 'textile_chimu';

export interface BuildContext {
  era: Era;
  civ: CivDef;
  playerColor: THREE.Color;
  /** Historical architecture profile of `civ` in this period (drives materials/structure). */
  arch: HistoricalArchitectureProfile;
}

const sharedGeo: Record<string, THREE.BufferGeometry> = {};
function cachedGeo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  if (!sharedGeo[key]) sharedGeo[key] = make();
  return sharedGeo[key] as T;
}

/** Geometries with baked colour × AO, memoized by source geometry uuid + part colour. */
const bakedGeoCache = new Map<string, THREE.BufferGeometry>();
/** Materials shared by appearance (so equal parts can be merged into one draw). */
const matCache = new Map<string, THREE.MeshStandardMaterial>();

interface MatOpts {
  metalness?: number;
  roughness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  flatShading?: boolean;
  /** Procedural texture to apply over the base color. */
  tex?: TexKind;
  /** UV repeat scale (1 = automatic). */
  texScale?: number;
  /** Apply a subtle normal map (on by default when there is a texture). */
  normal?: boolean;
}

/** PBR settings per texture type (intentional contrast). */
const TEX_DEFAULTS: Record<TexKind, { roughness: number; metalness: number }> = {
  wood: { roughness: 0.92, metalness: 0 },
  brick: { roughness: 0.95, metalness: 0 },
  stone: { roughness: 0.9, metalness: 0.05 },
  concrete: { roughness: 0.92, metalness: 0.02 },
  metal: { roughness: 0.35, metalness: 0.75 },
  metalDark: { roughness: 0.5, metalness: 0.7 },
  metalWarm: { roughness: 0.4, metalness: 0.6 },
  roof: { roughness: 0.85, metalness: 0.05 },
  cloth: { roughness: 0.95, metalness: 0 },
  textile: { roughness: 0.95, metalness: 0 },
  leather: { roughness: 0.8, metalness: 0 },
  dirt: { roughness: 0.98, metalness: 0 },
  adobe: { roughness: 0.95, metalness: 0 },
  cutstone: { roughness: 0.9, metalness: 0.05 },
  megalith: { roughness: 0.95, metalness: 0.05 },
  fieldstone: { roughness: 0.95, metalness: 0.03 },
  thatch: { roughness: 0.98, metalness: 0 },
  flatstone: { roughness: 0.92, metalness: 0.03 },
  flatmetal: { roughness: 0.45, metalness: 0.6 },
  textile_inca: { roughness: 0.95, metalness: 0 },
  textile_wari: { roughness: 0.95, metalness: 0 },
  textile_tiahuanaco: { roughness: 0.95, metalness: 0 },
  textile_moche: { roughness: 0.95, metalness: 0 },
  textile_chavin: { roughness: 0.95, metalness: 0 },
  textile_paracas: { roughness: 0.95, metalness: 0 },
  textile_nazca: { roughness: 0.95, metalness: 0 },
  textile_chimu: { roughness: 0.95, metalness: 0 },
};

/** Mapping of procedural type -> AI-generated PBR material (if present). */
const TEX_GEN: Partial<Record<TexKind, string>> = {
  wood: 'wood',
  roof: 'tile',
  adobe: 'wall_adobe',
  brick: 'wall_brick',
  cutstone: 'wall_cutstone',
  megalith: 'wall_megalith',
  fieldstone: 'wall_fieldstone',
  concrete: 'wall_concrete',
  thatch: 'roof_thatch',
  flatstone: 'roof_flatstone',
  flatmetal: 'roof_flatmetal',
  textile: 'textile',
  textile_inca: 'textile_inca',
  textile_wari: 'textile_wari',
  textile_tiahuanaco: 'textile_tiahuanaco',
  textile_moche: 'textile_moche',
  textile_chavin: 'textile_chavin',
  textile_paracas: 'textile_paracas',
  textile_nazca: 'textile_nazca',
  textile_chimu: 'textile_chimu',
};

/**
 * Shared material for a set of parts. The part's own colour is baked into vertex
 * colours (see `bakeVertexAO`), so `color` is not part of the key: parts that
 * differ only by colour collapse into a single material and one merged mesh.
 */
function mat(opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${opts.metalness ?? ''}|${opts.roughness ?? ''}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.opacity ?? ''}|${opts.transparent ? 1 : 0}|${opts.flatShading ? 1 : 0}|${opts.tex ?? ''}|${opts.normal ?? ''}`;
  const cached = matCache.get(key);
  if (cached) return cached;
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: opts.metalness ?? 0.15,
    roughness: opts.roughness ?? 0.75,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    opacity: opts.opacity ?? 1,
    transparent: opts.transparent ?? false,
    flatShading: opts.flatShading ?? false,
  });
  if (opts.tex) {
    const genKey = TEX_GEN[opts.tex];
    const gen = genKey ? getGeneratedMaterial(genKey) : null;
    if (gen) {
      // AI-generated PBR material (wood/adobe/tile)
      m.map = gen.diffuse;
      if (opts.roughness === undefined) m.roughness = 0.9;
      if (opts.metalness === undefined) m.metalness = 0.02;
      if (opts.normal !== false && gen.normal) {
        m.normalMap = gen.normal;
        m.normalScale = new THREE.Vector2(0.8, 0.8);
      }
      if (gen.roughness) {
        m.roughnessMap = gen.roughness;
        m.roughness = 1;
      }
    } else {
      const defaults = TEX_DEFAULTS[opts.tex] ?? TEX_DEFAULTS.metal;
      const base = (MaterialTex as unknown as Record<string, () => THREE.CanvasTexture>)[opts.tex]();
      m.map = base;
      if (opts.roughness === undefined) m.roughness = defaults.roughness;
      if (opts.metalness === undefined) m.metalness = defaults.metalness;
      if (opts.normal !== false) {
        m.normalMap = MaterialTex.normal(7);
        m.normalScale = new THREE.Vector2(0.7, 0.7);
      }
    }
  }
  matCache.set(key, m);
  return m;
}

interface PartOpts extends MatOpts {
  x?: number;
  y?: number;
  z?: number;
  ry?: number;
  rx?: number;
  rz?: number;
}

class Builder {
  group = new THREE.Group();
  private ctx: BuildContext;
  pal: ReturnType<typeof eraPalette>;
  private civ: CivDef;

  constructor(ctx: BuildContext) {
    this.ctx = ctx;
    this.civ = ctx.civ;
    this.pal = eraPalette(ctx.era, ctx.civ);
  }

  get civId(): CivId {
    return this.civ.id;
  }

  box(w: number, h: number, d: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = mat(o);
    // automatic UV repeat according to face size, baked into the geometry so the
    // texture (and therefore the material) can be shared
    let rx = 1;
    let ry = 1;
    let uvKey = '';
    if (o.tex) {
      const scale = o.texScale ?? 1;
      rx = Math.max(1, Math.min(6, Math.round(Math.max(w, d) * 2.2) * scale));
      ry = Math.max(1, Math.min(6, Math.round(h * 2.2) * scale));
      uvKey = `-${rx}x${ry}`;
    }
    const geo = cachedGeo(`box-${w}-${h}-${d}-${o.flatShading ? 1 : 0}${uvKey}`, () => {
      const g = o.flatShading ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, 0.045);
      if (o.flatShading) g.toNonIndexed();
      if (uvKey) scaleUv(g, rx, ry);
      return g;
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.color = color;
    mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    if (o.ry) mesh.rotation.y = o.ry;
    if (o.rx) mesh.rotation.x = o.rx;
    if (o.rz) mesh.rotation.z = o.rz;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'part';
    this.group.add(mesh);
    return mesh;
  }

  cyl(rt: number, rb: number, h: number, seg: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = mat(o);
    const geo = cachedGeo(`cyl-${rt}-${rb}-${h}-${seg}-${o.flatShading ? 1 : 0}`, () => {
      const g = new THREE.CylinderGeometry(rt, rb, h, seg);
      if (o.flatShading) g.toNonIndexed();
      return g;
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.color = color;
    mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    if (o.ry) mesh.rotation.y = o.ry;
    if (o.rx) mesh.rotation.x = o.rx;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'part';
    this.group.add(mesh);
    return mesh;
  }

  cone(r: number, h: number, seg: number, color: string, o: PartOpts = {}): THREE.Mesh {
    return this.cyl(r, 0, h, seg, color, o);
  }

  sphere(r: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = mat(o);
    const geo = cachedGeo(`sph-${r}-${o.flatShading ? 1 : 0}`, () => {
      const g = new THREE.SphereGeometry(r, 18, 14);
      if (o.flatShading) g.toNonIndexed();
      return g;
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.color = color;
    mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'part';
    this.group.add(mesh);
    return mesh;
  }

  /** Named pivot for animation. */
  pivot(name: string): THREE.Group {
    const g = new THREE.Group();
    g.name = 'pivot:' + name;
    this.group.add(g);
    return g;
  }

  /** Torus (arches, rings, bow limbs). */
  torus(r: number, tube: number, arc: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = mat(o);
    const geo = cachedGeo(`tor-${r}-${tube}-${arc}-${o.flatShading ? 1 : 0}`, () => {
      const g = new THREE.TorusGeometry(r, tube, 8, 20, arc);
      if (o.flatShading) g.toNonIndexed();
      return g;
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.color = color;
    mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    if (o.ry) mesh.rotation.y = o.ry;
    if (o.rx) mesh.rotation.x = o.rx;
    if (o.rz) mesh.rotation.z = o.rz;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'part';
    this.group.add(mesh);
    return mesh;
  }

  /** Add a piece to a specific parent group (for animated pivots). */
  boxIn(parent: THREE.Object3D, w: number, h: number, d: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = this.box(w, h, d, color, o);
    parent.add(m);
    return m;
  }
  cylIn(
    parent: THREE.Object3D,
    rt: number,
    rb: number,
    h: number,
    seg: number,
    color: string,
    o: PartOpts = {},
  ): THREE.Mesh {
    const m = this.cyl(rt, rb, h, seg, color, o);
    parent.add(m);
    return m;
  }
  sphereIn(parent: THREE.Object3D, r: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = this.sphere(r, color, o);
    parent.add(m);
    return m;
  }
  torusIn(parent: THREE.Object3D, r: number, tube: number, arc: number, color: string, o: PartOpts = {}): THREE.Mesh {
    const m = this.torus(r, tube, arc, color, o);
    parent.add(m);
    return m;
  }

  /** Primary civic material. */
  get civPrimary(): string {
    return this.civ.colors.primary;
  }
  get civSecondary(): string {
    return this.civ.colors.secondary;
  }
  get civAccent(): string {
    return this.civ.colors.accent;
  }
  /** Architectural style of the owner civilization. */
  get style(): ArchStyle {
    return this.civ.visual.arch;
  }
  /** Historical architecture profile (materials, structure, ornaments). */
  get arch(): HistoricalArchitectureProfile {
    return this.ctx.arch;
  }
  /** Banner/shield emblem of the owner civilization. */
  get emblem(): EmblemId {
    return this.civ.visual.emblem;
  }
  /** True for pre-Hispanic Andean styles in a pre-1532 era (they use Andean architecture). */
  get isAndean(): boolean {
    return this.ctx.era <= Era.TAHUANTINSUYO && this.style !== 'colonial' && this.style !== 'republican';
  }
  /** Build context (era and civilization). */
  get context(): BuildContext {
    return this.ctx;
  }

  finish(): THREE.Group {
    return this.group;
  }
}

function eraPalette(era: Era, civ: CivDef) {
  const ed = ERA_DEFS[era];
  const p = ed.palette;
  return {
    primary: civ.colors.primary,
    secondary: civ.colors.secondary,
    accent: civ.colors.accent,
    // walls per era: clear and readable
    wood: mixHex(p.primary, '#c8a878', 0.5),
    darkWood: mixHex(p.primary, '#6a4a28', 0.55),
    brick: mixHex(p.primary, '#b04030', 0.45),
    stone: mixHex(p.primary, '#c8c2b4', 0.62),
    concrete: mixHex(p.primary, '#b0b6bc', 0.58),
    metal: mixHex(p.primary, '#c0c8d0', 0.6),
    darkMetal: mixHex(p.primary, '#5a626c', 0.55),
    roof: mixHex(ed.palette.roof, '#b0a080', 0.35),
    accent2: ed.palette.accent,
    emissive: ed.palette.emissive,
    emissiveIntensity: ed.palette.emissiveIntensity,
    detail: mixHex(ed.palette.detail, '#8a8068', 0.35),
  };
}

// ---------------------------------------------------------------------------
// Helpers by category
// ---------------------------------------------------------------------------

type UnitRole = 'worker' | 'melee' | 'ranged' | 'elite' | 'mounted' | 'officer';

interface Attire {
  tunic: string;
  accent: string;
  tex: TexKind;
  leg: string;
  boot: boolean;
  cloak: boolean;
  earOrnaments: boolean;
  metal: boolean;
  head: 'band' | 'llautu' | 'diadem' | 'fourPoints' | 'feathers' | 'morion' | 'kepi' | 'helmet' | 'none';
  facepaint: boolean;
}

/** Attested Andean textile (uncu) pattern per civilization; others use the generic weave. */
const CIV_TEXTILE: Record<string, TexKind> = {
  inca: 'textile_inca',
  wari: 'textile_wari',
  tiahuanaco: 'textile_tiahuanaco',
  moche: 'textile_moche',
  chavin: 'textile_chavin',
  paracas: 'textile_paracas',
  nazca: 'textile_nazca',
  chimu: 'textile_chimu',
};

/**
 * Historical attire profile per civilization, era and unit role.
 * Based on `docs/historia/atuendos.md` (with sources).
 */
function getAttire(b: Builder, role: UnitRole): Attire {
  const civ = b.context.civ.id;
  const era = b.context.era;
  const geo = b.context.civ.geography;
  const col = b.context.civ.colors.primary;
  const sec = b.context.civ.colors.secondary;
  const acc = b.context.civ.colors.accent;
  const elite = role === 'elite' || role === 'officer';
  if (era <= Era.TAHUANTINSUYO) {
    let head: Attire['head'];
    if (civ === 'inca') head = elite ? 'llautu' : 'band';
    else if (civ === 'tiahuanaco' || geo === 'altiplano') head = 'fourPoints';
    else if (geo === 'coast') head = elite ? 'feathers' : 'diadem';
    else head = elite ? 'diadem' : 'band';
    return {
      tunic: mixHex(col, sec, elite ? 0.25 : 0.5),
      accent: acc,
      tex: CIV_TEXTILE[civ] ?? 'textile',
      leg: mixHex(col, '#3a2f26', 0.55),
      boot: false,
      cloak: role === 'melee' || elite,
      earOrnaments: elite,
      metal: false,
      head,
      facepaint: civ === 'chanca',
    };
  }
  if (era === Era.VICEROYALTY) {
    return {
      tunic: '#3a527a',
      accent: '#b03028',
      tex: 'cloth',
      leg: '#e8e0d0',
      boot: true,
      cloak: false,
      earOrnaments: false,
      metal: role === 'mounted',
      head: 'morion',
      facepaint: false,
    };
  }
  if (era === Era.REPUBLIC) {
    return {
      tunic: '#33405a',
      accent: acc,
      tex: 'cloth',
      leg: '#5a5a62',
      boot: true,
      cloak: false,
      earOrnaments: false,
      metal: false,
      head: 'kepi',
      facepaint: false,
    };
  }
  return {
    tunic: '#4a5540',
    accent: acc,
    tex: 'cloth',
    leg: '#3e4636',
    boot: true,
    cloak: false,
    earOrnaments: false,
    metal: false,
    head: 'helmet',
    facepaint: false,
  };
}

function addHumanoid(
  b: Builder,
  opts: {
    role?: UnitRole;
    helmet?: boolean;
    backpack?: boolean;
    weapon?: 'rifle' | 'musket' | 'sniper' | 'machete' | 'spear' | 'macana' | 'bow' | 'sling' | 'shield' | 'none';
    armor?: 'cloth' | 'metal';
    gadget?: boolean;
    tool?: 'axe' | 'pick';
    carry?: boolean;
    attire?: Partial<Attire>;
  },
): void {
  const attire = { ...getAttire(b, opts.role ?? 'melee'), ...opts.attire };
  const skin = '#d9a06a';
  const hair = '#2a1c12';
  const metalArmor = attire.metal;
  const tunic = attire.tunic;
  const limbTex = attire.tex;
  const bootCol = attire.boot ? '#2a2018' : '#241a12';

  // legs with pivots (hip at y=0.52): thigh + shin + foot
  const legL = b.pivot('legL');
  legL.position.set(-0.1, 0.52, 0);
  const legR = b.pivot('legR');
  legR.position.set(0.1, 0.52, 0);
  for (const leg of [legL, legR]) {
    b.boxIn(leg, 0.115, 0.3, 0.15, attire.leg, { y: -0.15, tex: limbTex, texScale: 2 });
    b.boxIn(leg, 0.095, 0.24, 0.13, attire.leg, { y: -0.38, tex: limbTex, texScale: 2 });
    b.boxIn(leg, 0.12, attire.boot ? 0.12 : 0.07, 0.22, bootCol, { y: attire.boot ? -0.47 : -0.5, z: 0.03 });
  }
  // pelvis / loincloth
  b.cyl(0.155, 0.13, 0.18, 10, metalArmor ? '#7a828a' : mixHex(attire.leg, '#2a241e', 0.4), {
    y: 0.55,
    tex: limbTex,
    texScale: 2,
  });
  b.box(0.34, 0.05, 0.24, '#2a2118', { y: 0.63 });
  // tapered torso (abdomen + chest)
  b.box(0.27, 0.2, 0.21, tunic, { y: 0.74, tex: limbTex, texScale: 2 });
  b.box(0.34, 0.28, 0.23, tunic, { y: 0.96, tex: limbTex, texScale: 2 });
  if (metalArmor) {
    b.box(0.36, 0.3, 0.25, '#c9d2da', { y: 0.97, tex: 'metal', texScale: 2 });
    b.box(0.4, 0.08, 0.27, '#8a929a', { y: 1.08, tex: 'metal' });
  } else {
    b.box(0.08, 0.42, 0.25, attire.accent, { x: -0.02, y: 0.85, rz: 0.35 });
    // Andean cloak/poncho for warriors
    if (attire.cloak) {
      b.cyl(0.19, 0.25, 0.34, 12, tunic, { y: 0.8, tex: 'cloth', texScale: 2 });
      b.cyl(0.252, 0.252, 0.05, 12, attire.accent, { y: 0.66, tex: 'cloth' });
    }
  }
  // rounded shoulders
  b.sphere(0.075, metalArmor ? '#b8c0c8' : tunic, { x: -0.2, y: 1.06, tex: limbTex });
  b.sphere(0.075, metalArmor ? '#b8c0c8' : tunic, { x: 0.2, y: 1.06, tex: limbTex });
  // arms with pivots (shoulder at y=1.02): upper arm + forearm + hand
  const armL = b.pivot('armL');
  armL.position.set(-0.24, 1.02, 0);
  const armR = b.pivot('armR');
  armR.position.set(0.24, 1.02, 0);
  for (const arm of [armL, armR]) {
    b.boxIn(arm, 0.085, 0.24, 0.1, tunic, { y: -0.12, tex: limbTex, texScale: 2 });
    b.boxIn(arm, 0.075, 0.22, 0.09, tunic, { y: -0.34, tex: limbTex, texScale: 2 });
    b.sphereIn(arm, 0.05, skin, { y: -0.47 });
  }
  b.boxIn(armR, 0.1, 0.07, 0.12, attire.accent, { y: -0.24 });
  // work tool in the right hand (animatable while gathering/building)
  if (opts.tool) {
    const metal = '#8a929a';
    b.cylIn(armR, 0.022, 0.022, 0.44, 6, b.pal.darkWood, { y: -0.66, tex: 'wood' });
    if (opts.tool === 'axe') {
      b.boxIn(armR, 0.06, 0.15, 0.13, metal, { y: -0.86, z: 0.045, rx: 0.2 });
      b.boxIn(armR, 0.04, 0.1, 0.16, '#c9d2da', { y: -0.86, z: 0.11 });
    } else {
      b.cylIn(armR, 0.02, 0.02, 0.3, 6, metal, { y: -0.86, rx: Math.PI / 2 });
      b.cylIn(armR, 0, 0.03, 0.11, 6, metal, { y: -0.86, z: 0.2, rx: Math.PI / 2 });
      b.cylIn(armR, 0.03, 0, 0.11, 6, metal, { y: -0.86, z: -0.2, rx: Math.PI / 2 });
    }
  }
  // shield on the left arm (melee warriors)
  if (opts.weapon === 'macana' || opts.weapon === 'spear' || opts.weapon === 'shield') {
    b.cylIn(armL, 0.16, 0.16, 0.035, 16, tunic, { x: -0.07, y: -0.3, rz: Math.PI / 2, tex: 'wood' });
    b.cylIn(armL, 0.05, 0.05, 0.05, 10, attire.accent, { x: -0.1, y: -0.3, rz: Math.PI / 2 });
    shieldEmblem(b, armL);
  }
  // neck + head (pivot at y=1.26)
  b.cyl(0.045, 0.05, 0.09, 8, skin, { y: 1.15 });
  const head = b.pivot('head');
  head.position.set(0, 1.26, 0);
  b.sphereIn(head, 0.092, skin, { y: 0.02 });
  b.sphereIn(head, 0.018, skin, { x: -0.09, y: 0.02 });
  b.sphereIn(head, 0.018, skin, { x: 0.09, y: 0.02 });
  // face: eyes, nose, mouth
  b.boxIn(head, 0.022, 0.02, 0.02, '#241a12', { x: -0.032, y: 0.03, z: 0.082 });
  b.boxIn(head, 0.022, 0.02, 0.02, '#241a12', { x: 0.032, y: 0.03, z: 0.082 });
  b.boxIn(head, 0.016, 0.03, 0.025, skin, { y: 0.005, z: 0.088 });
  b.boxIn(head, 0.03, 0.008, 0.012, '#5a2a20', { y: -0.03, z: 0.086 });
  // ear ornaments (Andean elite insignia)
  if (attire.earOrnaments) {
    b.cylIn(head, 0.028, 0.028, 0.02, 10, '#c8a040', {
      x: -0.1,
      y: 0.0,
      rz: Math.PI / 2,
      metalness: 0.7,
      roughness: 0.3,
    });
    b.cylIn(head, 0.028, 0.028, 0.02, 10, '#c8a040', {
      x: 0.1,
      y: 0.0,
      rz: Math.PI / 2,
      metalness: 0.7,
      roughness: 0.3,
    });
  }
  // facial paint (chanca)
  if (attire.facepaint) {
    b.boxIn(head, 0.05, 0.012, 0.01, '#a03028', { x: -0.04, y: 0.01, z: 0.084 });
    b.boxIn(head, 0.05, 0.012, 0.01, '#a03028', { x: 0.04, y: 0.01, z: 0.084 });
  }
  // hair (cap under the headdress)
  b.sphereIn(head, 0.093, hair, { y: 0.05, z: -0.014 });
  addHeadgear(b, head, attire);
  if (opts.gadget) {
    b.box(0.05, 0.05, 0.05, b.pal.emissive, { y: 1.22, z: 0.1, emissive: b.pal.emissive, emissiveIntensity: 1.5 });
  }
  if (opts.backpack) {
    b.box(0.2, 0.28, 0.18, '#5a4a34', { x: 0, y: 0.86, z: -0.24, tex: 'leather' });
    b.box(0.22, 0.06, 0.2, '#3a2a1a', { x: 0, y: 1.0, z: -0.25 });
  }
  // carried resource bundle (visible only while carrying)
  if (opts.carry) {
    const carry = b.pivot('carry');
    carry.position.set(0, 0.92, -0.26);
    b.boxIn(carry, 0.24, 0.26, 0.18, '#8a6a3a');
    b.boxIn(carry, 0.26, 0.05, 0.2, '#5a4630', { y: 0.14 });
    carry.visible = false;
  }
  // cape for officers/elites
  if (opts.gadget || opts.weapon === 'sniper') {
    b.box(0.36, 0.5, 0.03, attire.accent, { x: 0, y: 0.9, z: -0.15, rx: -0.08 });
  }
  // weapon (pivot for recoil animation)
  const gun = b.pivot('gun');
  gun.position.set(0.26, 0.86, 0.22);
  addWeapon(b, gun, opts.weapon ?? 'none');
}

/** Weapons and tools; Andean (bow, sling, spear, macana) and firearms. */
function addWeapon(b: Builder, gun: THREE.Group, weapon: string): void {
  switch (weapon) {
    case 'rifle':
    case 'musket':
      b.boxIn(gun, 0.07, 0.07, 0.6, b.pal.darkWood, { z: 0.22, tex: 'wood' });
      b.cylIn(gun, 0.026, 0.026, 0.5, 8, b.pal.darkMetal, { z: 0.62, rx: Math.PI / 2, metalness: 0.7 });
      b.boxIn(gun, 0.05, 0.1, 0.14, b.pal.darkWood, { y: -0.06, z: -0.06 });
      break;
    case 'sniper':
      b.boxIn(gun, 0.06, 0.08, 0.8, b.pal.darkMetal, { z: 0.3, tex: 'metalDark' });
      b.cylIn(gun, 0.035, 0.035, 0.45, 8, b.pal.darkMetal, { z: 0.72, rx: Math.PI / 2 });
      b.cylIn(gun, 0.025, 0.025, 0.12, 8, '#2a2e34', { y: 0.06, z: 0.25, rx: Math.PI / 2 });
      break;
    case 'spear':
      b.cylIn(gun, 0.014, 0.014, 1.5, 6, b.pal.darkWood, { z: 0.35, rx: Math.PI / 2, tex: 'wood' });
      b.cylIn(gun, 0.0, 0.05, 0.22, 8, b.pal.metal, { z: 1.1, rx: Math.PI / 2, metalness: 0.6 });
      break;
    case 'macana':
      b.cylIn(gun, 0.02, 0.025, 0.42, 6, b.pal.darkWood, { rx: 1.0, z: 0.06, tex: 'wood' });
      b.boxIn(gun, 0.1, 0.1, 0.3, '#6a4a2a', { rx: 1.0, z: 0.32, tex: 'wood' });
      b.boxIn(gun, 0.12, 0.12, 0.05, b.civAccent, { rx: 1.0, z: 0.2 });
      break;
    case 'machete':
      b.cylIn(gun, 0.016, 0.016, 0.24, 6, '#3a2a1a', { y: -0.05, rx: 0.9 });
      b.boxIn(gun, 0.03, 0.11, 0.38, b.pal.metal, { y: 0.05, z: 0.24, rx: 0.9, metalness: 0.7, roughness: 0.3 });
      break;
    case 'bow': {
      b.torusIn(gun, 0.3, 0.018, Math.PI * 1.05, b.pal.darkWood, { y: -0.16, z: 0.2, rz: Math.PI });
      b.cylIn(gun, 0.004, 0.004, 0.58, 4, '#d8c8a0', { y: -0.16, z: 0.2 });
      break;
    }
    case 'sling':
      b.cylIn(gun, 0.006, 0.006, 0.32, 4, '#8a6a4a', { rz: 0.6, z: 0.08 });
      b.sphereIn(gun, 0.035, '#6a5a3a', { y: -0.2, z: 0.12 });
      break;
    default:
      break;
  }
}

/** Historical headwear according to the attire profile (civ/era). */
function addHeadgear(b: Builder, head: THREE.Group, attire: Attire): void {
  const civ = b.context.civ.id;
  const fabric = b.civPrimary;
  const acc = attire.accent;
  switch (attire.head) {
    case 'llautu': {
      // llawt'u (band) + mascapaicha (red tassel), Inca elite
      b.cylIn(head, 0.105, 0.105, 0.08, 12, fabric, { y: 0.08 });
      b.cylIn(head, 0.11, 0.1, 0.05, 12, acc, { y: 0.14 });
      b.boxIn(head, 0.03, 0.12, 0.03, '#b03028', { y: 0.2, z: 0.05 });
      break;
    }
    case 'diadem': {
      const crown = civ === 'chimu';
      const col = crown ? '#c8a040' : fabric;
      b.cylIn(head, 0.105, 0.105, crown ? 0.1 : 0.06, 12, col, {
        y: crown ? 0.09 : 0.08,
        metalness: crown ? 0.7 : 0,
        roughness: crown ? 0.35 : 0.8,
      });
      b.boxIn(head, 0.2, crown ? 0.1 : 0.04, 0.04, crown ? '#e0c060' : acc, { y: crown ? 0.2 : 0.12, z: 0.06 });
      if (!crown) b.boxIn(head, 0.04, 0.1, 0.03, acc, { y: 0.18, z: 0.04 });
      break;
    }
    case 'fourPoints': {
      // four-point hat (altiplano)
      b.cylIn(head, 0.11, 0.105, 0.07, 12, fabric, { y: 0.08 });
      b.boxIn(head, 0.2, 0.09, 0.2, fabric, { y: 0.16 });
      for (const sx of [-0.08, 0.08]) {
        for (const sz of [-0.08, 0.08]) {
          b.boxIn(head, 0.04, 0.1, 0.04, acc, { x: sx, y: 0.22, z: sz });
        }
      }
      break;
    }
    case 'feathers': {
      // feather headdress with a band (coast)
      b.cylIn(head, 0.105, 0.105, 0.07, 12, fabric, { y: 0.08 });
      b.boxIn(head, 0.22, 0.02, 0.22, acc, { y: 0.13 });
      for (let i = -2; i <= 2; i++) {
        b.boxIn(head, 0.03, 0.12, 0.03, acc, { x: i * 0.045, y: 0.2, z: 0.02 });
      }
      break;
    }
    case 'morion': {
      // colonial morion (metal) with crest
      b.sphereIn(head, 0.105, '#8a929a', { y: 0.04, tex: 'metal' });
      b.cylIn(head, 0.11, 0.1, 0.06, 12, '#8a929a', { y: 0.11, tex: 'metal' });
      b.boxIn(head, 0.03, 0.14, 0.16, acc, { y: 0.2, z: 0.02 });
      b.boxIn(head, 0.02, 0.02, 0.12, '#c8a040', { y: 0.05, z: 0.11, metalness: 0.6 });
      break;
    }
    case 'kepi': {
      // 19th-c. kepi with visor
      b.cylIn(head, 0.1, 0.1, 0.12, 12, attire.tunic, { y: 0.1, tex: 'cloth' });
      b.boxIn(head, 0.2, 0.02, 0.05, '#2a2a2a', { y: 0.05, z: 0.1 });
      b.boxIn(head, 0.06, 0.03, 0.01, acc, { y: 0.06, z: 0.105 });
      break;
    }
    case 'helmet': {
      // modern helmet
      b.sphereIn(head, 0.108, '#4a5540', { y: 0.03, tex: 'cloth' });
      b.cylIn(head, 0.112, 0.108, 0.05, 12, '#3e4636', { y: 0.1 });
      b.boxIn(head, 0.14, 0.05, 0.03, '#2a2a2a', { y: 0.02, z: 0.1 });
      break;
    }
    default: {
      // plain band/hat
      b.cylIn(head, 0.1, 0.1, 0.04, 12, fabric, { y: 0.08 });
      b.boxIn(head, 0.12, 0.02, 0.16, fabric, { y: 0.1 });
      break;
    }
  }
}

function addVehicleBody(
  b: Builder,
  hull: string,
  turret: string,
  opts: { treads?: boolean; antenna?: boolean },
): THREE.Group {
  const turretGroup = b.pivot('turret');
  turretGroup.position.set(0, 0.85, 0);
  if (opts.treads) {
    b.box(0.9, 0.34, 1.5, b.pal.darkMetal, { y: 0.22, metalness: 0.5 });
    b.cyl(0.16, 0.16, 1.5, 16, b.pal.darkMetal, { x: -0.44, y: 0.18, rx: Math.PI / 2 });
    b.cyl(0.16, 0.16, 1.5, 16, b.pal.darkMetal, { x: 0.44, y: 0.18, rx: Math.PI / 2 });
  }
  b.box(0.85, 0.4, 1.3, hull, { y: 0.55, metalness: 0.5, roughness: 0.45 });
  // turret as a child of the pivot (rotates)
  b.boxIn(turretGroup, 0.6, 0.28, 0.8, turret, { y: 0.14, metalness: 0.6, roughness: 0.4 });
  const barrel = b.pivot('gun');
  barrel.position.set(0, 0.14, 0.5);
  b.cylIn(barrel, 0.09, 0.11, 1.0, 12, b.pal.darkMetal, { y: 0, z: 0.75, rx: Math.PI / 2, metalness: 0.7 });
  turretGroup.add(barrel);
  if (opts.antenna) {
    b.cylIn(turretGroup, 0.01, 0.01, 0.5, 6, b.pal.metal, { y: 0.35, z: -0.2, metalness: 0.8 });
    b.sphereIn(turretGroup, 0.04, b.pal.emissive, { y: 0.63, z: -0.2, emissive: b.pal.emissive, emissiveIntensity: 2 });
  }
  return turretGroup;
}

// ---------------------------------------------------------------------------
// Unit constructors
// ---------------------------------------------------------------------------

function buildInfantry(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  switch (type) {
    case 'soldier_grunt':
      addHumanoid(b, { role: 'melee', helmet: false, weapon: 'macana', armor: 'cloth' });
      break;
    case 'soldier_modern':
      addHumanoid(b, { role: 'melee', helmet: true, weapon: 'spear', armor: 'cloth', backpack: true });
      break;
    case 'soldier_elite':
      addHumanoid(b, { role: 'elite', helmet: true, weapon: 'rifle', armor: 'metal', backpack: true, gadget: true });
      break;
    default:
      addHumanoid(b, { role: 'melee', helmet: false, weapon: 'rifle', armor: 'cloth' });
  }
  return b.finish();
}

function buildRanged(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  const isSniper = type === 'advanced_rifleman' || type === 'veteran_rifleman';
  switch (type) {
    case 'musketeer':
      addHumanoid(b, { role: 'ranged', helmet: false, weapon: 'sling', armor: 'cloth' });
      break;
    case 'rifleman':
      addHumanoid(b, { role: 'ranged', helmet: false, weapon: 'bow', armor: 'cloth' });
      break;
    case 'veteran_rifleman':
      addHumanoid(b, { role: 'ranged', helmet: true, weapon: 'rifle', armor: 'metal', backpack: true });
      break;
    case 'advanced_rifleman':
      addHumanoid(b, { role: 'ranged', helmet: true, weapon: 'rifle', armor: 'metal', gadget: true });
      break;
    default:
      addHumanoid(b, { role: 'ranged', weapon: 'rifle' });
  }
  if (isSniper) {
    b.box(0.3, 0.06, 0.1, b.pal.darkMetal, { y: 0.6, z: 0.35 });
  }
  return b.finish();
}

function buildWorker(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  addHumanoid(b, { role: 'worker', weapon: 'none', armor: 'cloth', tool: 'axe', carry: true });
  return b.finish();
}

function buildMounted(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  // mount in a raised group (legs + body + saddle)
  const mount = b.pivot('mount');
  mount.position.y = 0.42;
  b.boxIn(mount, 0.4, 0.6, 0.9, mixHex(b.civPrimary, '#3a2a18', 0.4), { y: 0.12, z: -0.1 });
  b.boxIn(mount, 0.16, 0.16, 0.5, b.pal.darkMetal, { y: 0.52, z: -0.05 });
  b.boxIn(mount, 0.12, 0.5, 0.14, b.pal.darkMetal, { x: -0.2, y: -0.15, z: 0.25 });
  b.boxIn(mount, 0.12, 0.5, 0.14, b.pal.darkMetal, { x: 0.2, y: -0.15, z: 0.25 });
  b.boxIn(mount, 0.12, 0.5, 0.14, b.pal.darkMetal, { x: -0.2, y: -0.15, z: -0.4 });
  b.boxIn(mount, 0.12, 0.5, 0.14, b.pal.darkMetal, { x: 0.2, y: -0.15, z: -0.4 });
  // rider on top of the saddle (in a raised group so as not to touch the mount)
  const before = b.group.children.length;
  addHumanoid(b, {
    role: 'mounted',
    helmet: type === 'cavalry',
    weapon: 'machete',
    armor: type === 'cavalry' ? 'metal' : 'cloth',
  });
  const rider = new THREE.Group();
  for (const child of b.group.children.splice(before)) rider.add(child);
  rider.position.y = 0.55;
  b.group.add(rider);
  return b.finish();
}

function buildMotorcycle(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  b.cyl(0.22, 0.22, 0.35, 14, b.pal.darkMetal, { x: 0.3, rx: Math.PI / 2, metalness: 0.5 });
  b.cyl(0.22, 0.22, 0.35, 14, b.pal.darkMetal, { x: -0.3, rx: Math.PI / 2, metalness: 0.5 });
  b.box(0.3, 0.18, 1.1, b.pal.darkMetal, { y: 0.35, metalness: 0.5 });
  b.box(0.12, 0.4, 0.14, b.pal.metal, { y: 0.85, x: 0 });
  b.box(0.05, 0.5, 0.05, b.pal.darkMetal, { y: 1.3, x: -0.05 });
  const before = b.group.children.length;
  addHumanoid(b, { role: 'mounted', helmet: true, weapon: 'rifle', armor: 'cloth' });
  const rider = new THREE.Group();
  for (const child of b.group.children.splice(before)) rider.add(child);
  rider.position.y = 0.85;
  b.group.add(rider);
  return b.finish();
}

function buildDrone(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  b.cyl(0.6, 0.6, 0.18, 8, b.pal.metal, { y: 0.55, metalness: 0.6, roughness: 0.4 });
  b.cyl(0.35, 0.35, 0.1, 8, b.pal.darkMetal, { y: 0.63, metalness: 0.7 });
  b.cyl(0.5, 0.5, 0.12, 8, b.pal.emissive, {
    y: 0.42,
    emissive: b.pal.emissive,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.6,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.cyl(0.06, 0.06, 0.04, 8, b.pal.darkMetal, { x: Math.cos(a) * 0.75, y: 0.7, z: Math.sin(a) * 0.75 });
  }
  b.sphere(0.06, b.pal.emissive, { y: 0.75, emissive: b.pal.emissive, emissiveIntensity: 2 });
  return b.finish();
}

function buildTank(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  const scale = type.includes('liviano') ? 1 : type.includes('medium') ? 1.12 : type.includes('moderno') ? 1.2 : 1.3;
  b.group.scale.setScalar(scale);
  addVehicleBody(b, b.pal.darkMetal, b.pal.metal, { treads: true, antenna: true });
  return b.finish();
}

function buildAntiAir(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  // chassis
  b.box(0.9, 0.34, 1.5, b.pal.darkMetal, { y: 0.22, metalness: 0.5 });
  b.cyl(0.16, 0.16, 1.5, 16, b.pal.darkMetal, { x: -0.44, y: 0.18, rx: Math.PI / 2 });
  b.cyl(0.16, 0.16, 1.5, 16, b.pal.darkMetal, { x: 0.44, y: 0.18, rx: Math.PI / 2 });
  b.box(0.85, 0.4, 1.3, b.pal.darkMetal, { y: 0.55, metalness: 0.5 });
  // turret with the two AA barrels as children
  const turret = b.pivot('turret');
  turret.position.set(0, 0.85, 0);
  b.boxIn(turret, 0.55, 0.26, 0.7, b.pal.metal, { y: 0.13, metalness: 0.6 });
  const gun = b.pivot('gun');
  gun.position.set(0, 0.13, 0.35);
  b.cylIn(gun, 0.05, 0.05, 0.8, 8, b.pal.darkMetal, { y: 0.07, z: 0.4, rx: Math.PI / 2 });
  b.cylIn(gun, 0.05, 0.05, 0.8, 8, b.pal.darkMetal, { y: 0.2, z: 0.4, rx: Math.PI / 2 });
  turret.add(gun);
  // antenna
  b.cylIn(turret, 0.01, 0.01, 0.5, 6, b.pal.metal, { y: 0.5, z: -0.2, metalness: 0.8 });
  b.sphereIn(turret, 0.04, b.pal.emissive, { y: 0.78, z: -0.2, emissive: b.pal.emissive, emissiveIntensity: 2 });
  return b.finish();
}

function buildCannon(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  const isHowitzer = type.includes('howitzer');
  // gun carriage
  b.cyl(0.55, 0.6, 0.5, 14, b.pal.darkWood, { y: 0.5, rx: Math.PI / 2 });
  b.cyl(0.28, 0.3, 0.5, 10, b.pal.darkMetal, { x: -0.4, y: 0.35, rx: Math.PI / 2 });
  b.cyl(0.28, 0.3, 0.5, 10, b.pal.darkMetal, { x: 0.4, y: 0.35, rx: Math.PI / 2 });
  // weapon on the pivot (aims at the target)
  const gun = b.pivot('gun');
  gun.position.set(0, 0.85, 0.2);
  if (isHowitzer) {
    b.boxIn(gun, 0.22, 0.24, 1.8, b.pal.darkMetal, { y: 0, z: 0.6, metalness: 0.7 });
    b.boxIn(gun, 0.3, 0.2, 1.9, b.pal.darkMetal, { y: -0.18, z: 0.65, metalness: 0.7 });
  } else {
    b.cylIn(gun, 0.11, 0.14, 1.9, 12, b.pal.darkMetal, { y: 0, z: 0.7, rx: Math.PI / 2, metalness: 0.7 });
    b.cylIn(gun, 0.16, 0.16, 0.5, 12, b.pal.darkWood, { y: -0.1, z: -0.3, rx: Math.PI / 2 });
  }
  return b.finish();
}

function buildMortar(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  b.cyl(0.5, 0.55, 0.4, 12, b.pal.darkMetal, { y: 0.4, metalness: 0.5 });
  const gun = b.pivot('gun');
  gun.position.set(0, 0.5, 0);
  b.cylIn(gun, 0.2, 0.3, 1.4, 12, b.pal.darkMetal, { y: 0.6, rx: 0.3, metalness: 0.6 });
  b.cylIn(gun, 0.14, 0.14, 0.8, 10, b.pal.metal, { y: 1.5, rx: 0.3, metalness: 0.7 });
  return b.finish();
}

function buildCommisar(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  addHumanoid(b, { role: 'officer', helmet: true, weapon: 'none', armor: 'cloth', backpack: true });
  b.box(0.2, 0.28, 0.1, b.civAccent, { y: 0.6, x: 0.3 });
  return b.finish();
}

function buildMissionary(ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  // robed friar: brown habit, no military headwear
  addHumanoid(b, {
    role: 'officer',
    weapon: 'none',
    armor: 'cloth',
    attire: { tunic: '#6b5236', accent: '#c8a040', tex: 'cloth', leg: '#5a4630', boot: false, head: 'none' },
  });
  // cross held at the chest
  b.box(0.06, 0.46, 0.06, b.civAccent, { y: 1.0, z: 0.16 });
  b.box(0.24, 0.06, 0.06, b.civAccent, { y: 1.1, z: 0.16 });
  return b.finish();
}

// ---------------------------------------------------------------------------
// Building constructors
// ---------------------------------------------------------------------------

function buildStructure(type: string, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  switch (type) {
    case 'center_steam':
      buildHouse(b, 3.4, true);
      break;
    case 'center_imperial':
      buildCivic(b, 3.6, 'stone', true);
      break;
    case 'center_war':
      buildConcrete(b, 3.4, true);
      break;
    case 'center_atomic':
      buildConcrete(b, 3.6, true, true);
      break;
    case 'center_information':
      buildModern(b, 3.6, true);
      break;
    case 'center_modern':
      buildModern(b, 3.8, true);
      break;

    case 'house_steam':
      buildHouse(b, 1.8, false);
      break;
    case 'house_imperial':
      buildCivic(b, 1.9, 'stone');
      break;
    case 'house_war':
      buildConcrete(b, 1.9, false);
      break;
    case 'house_atomic':
      buildConcrete(b, 2.0, false, true);
      break;
    case 'house_information':
      buildModern(b, 2.0, false);
      break;
    case 'house_modern':
      buildModern(b, 2.1, false);
      break;

    case 'mill_steam':
      buildDropsite(b, 1.9, 'wood');
      break;
    case 'mill_imperial':
      buildDropsite(b, 2.0, 'brick');
      break;
    case 'mill_modern':
      buildConcrete(b, 2.0, false);
      break;
    case 'plant_food':
      buildModern(b, 2.1, false);
      break;

    case 'sawmill_steam':
      buildDropsite(b, 1.9, 'wood');
      break;
    case 'sawmill_imperial':
      buildDropsite(b, 2.0, 'brick');
      break;
    case 'sawmill_modern':
      buildConcrete(b, 2.0, false);
      break;
    case 'plant_materials':
      buildModern(b, 2.1, false);
      break;

    case 'smelter_steam':
      buildDropsite(b, 1.9, 'brick');
      break;
    case 'smelter_imperial':
      buildDropsite(b, 2.0, 'stone');
      break;
    case 'smelter_modern':
      buildConcrete(b, 2.1, false);
      break;
    case 'plant_silver':
      buildModern(b, 2.2, false);
      break;

    case 'refinery':
      buildConcrete(b, 2.2, false, true);
      break;
    case 'plant_stone':
      buildModern(b, 2.3, true);
      break;

    case 'barracks_steam':
      buildBarracks(b, 2.6, 'wood');
      break;
    case 'barracks_imperial':
      buildBarracks(b, 2.7, 'brick');
      break;
    case 'barracks_war':
      buildMilitary(b, 2.7, false);
      break;
    case 'barracks_atomic':
      buildMilitary(b, 2.8, true);
      break;
    case 'barracks_information':
      buildModern(b, 2.8, false);
      break;
    case 'barracks_modern':
      buildModern(b, 2.9, false);
      break;

    case 'arsenal_steam':
      buildBarracks(b, 2.5, 'wood');
      break;
    case 'arsenal_imperial':
      buildBarracks(b, 2.6, 'brick');
      break;
    case 'arsenal_war':
      buildMilitary(b, 2.6, false);
      break;
    case 'arsenal_atomic':
      buildMilitary(b, 2.7, true);
      break;
    case 'arsenal_information':
      buildModern(b, 2.7, false);
      break;
    case 'arsenal_modern':
      buildModern(b, 2.8, false);
      break;

    case 'stable_steam':
      buildStable(b, 2.7, 'wood');
      break;
    case 'stable_imperial':
      buildStable(b, 2.8, 'brick');
      break;
    case 'stable_war':
      buildMilitary(b, 2.8, false);
      break;
    case 'stable_atomic':
      buildMilitary(b, 2.9, true);
      break;
    case 'stable_information':
      buildModern(b, 2.9, false);
      break;
    case 'stable_modern':
      buildModern(b, 3.0, false);
      break;

    case 'factory_imperial':
      buildFactory(b, 3.0, 'brick');
      break;
    case 'factory_war':
      buildMilitary(b, 3.0, false);
      break;
    case 'factory_atomic':
      buildMilitary(b, 3.1, true);
      break;
    case 'factory_information':
      buildModern(b, 3.1, true);
      break;
    case 'factory_modern':
      buildModern(b, 3.2, true);
      break;

    case 'fortress_imperial':
      buildFortress(b, 3.4, 'stone');
      break;
    case 'fortress_war':
      buildFortress(b, 3.4, 'concrete');
      break;
    case 'fortress_atomic':
      buildFortress(b, 3.5, 'concrete');
      break;
    case 'fortress_information':
      buildModern(b, 3.5, false);
      break;
    case 'fortress_modern':
      buildModern(b, 3.6, false);
      break;

    case 'market_steam':
      buildMarket(b, 2.6, 'wood');
      break;
    case 'market_imperial':
      buildMarket(b, 2.7, 'brick');
      break;
    case 'market_modern':
      buildConcrete(b, 2.7, false);
      break;
    case 'exchange_information':
      buildModern(b, 2.8, false);
      break;
    case 'exchange_modern':
      buildModern(b, 2.9, false);
      break;

    case 'institute_imperial':
      buildCivic(b, 2.7, 'stone');
      break;
    case 'institute_war':
      buildMilitary(b, 2.7, false);
      break;
    case 'institute_atomic':
      buildMilitary(b, 2.8, true);
      break;
    case 'institute_information':
      buildModern(b, 2.8, true);
      break;
    case 'institute_modern':
      buildModern(b, 2.9, true);
      break;

    case 'farm':
      buildFarm(b);
      break;

    case 'wonder':
      buildWonder(b);
      break;

    default:
      buildHouse(b, 2.5, false);
  }
  // the wonder is a self-contained monument (no civic banner/glowing accent)
  if (type !== 'wonder') addCivAccent(b);
  return b.finish();
}

/** Civic accent: a banner with the player color. */
function addCivAccent(b: Builder): void {
  if (b.isAndean) return; // Andean buildings carry their own banner + emblem
  b.cyl(0.03, 0.03, 2.2, 6, b.pal.darkWood, { y: 3.0, x: -1.5, z: -0.4 });
  b.box(0.55, 0.22, 0.05, b.civPrimary, { y: 3.4, x: -1.2, z: -0.4, metalness: 0.4, roughness: 0.5 });
  b.box(0.2, 0.22, 0.05, b.civAccent, { y: 3.4, x: -1.45, z: -0.4, metalness: 0.4 });
}

// --- building pieces ---

function groundPad(b: Builder, size: number): void {
  b.box(size * 2.2, 0.14, size * 2.2, '#e9e0cd', { y: 0.07, roughness: 0.95, tex: 'dirt', texScale: 1.4 });
}

/** Windows with frame and glowing glass, on one face of a box of width `w`. */
function addWindows(
  b: Builder,
  w: number,
  y: number,
  z: number,
  n: number,
  o: { span?: number; emissiveIntensity?: number } = {},
): void {
  const span = o.span ?? 0.24;
  const frameCol = '#26211c';
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * w * span;
    b.box(w * 0.15, w * 0.2, w * 0.05, frameCol, { x, y, z });
    b.box(w * 0.09, w * 0.13, w * 0.06, b.pal.emissive, {
      x,
      y,
      z,
      emissive: b.pal.emissive,
      emissiveIntensity: o.emissiveIntensity ?? 1.5,
      transparent: true,
      opacity: 0.9,
    });
    // ledge
    b.box(w * 0.17, w * 0.03, w * 0.06, frameCol, { x, y: y - w * 0.12, z });
  }
}

// ---------------------------------------------------------------------------
// Andean (pre-Hispanic) architecture. Style-driven so rival civilizations read
// as different at a glance (a Caral base is not a European cottage).
// Sources: docs/historia/arquitectura.md.
// ---------------------------------------------------------------------------

/** Wall colour for the civ's Andean architecture profile (earth / stone / masonry). */
function andeanWall(b: Builder): string {
  const p = b.pal.primary;
  switch (b.arch.wall) {
    case 'megalithic':
      return mixHex(p, '#b4aca0', 0.78);
    case 'adobe':
      return mixHex(p, '#c8a878', 0.72);
    default:
      return mixHex(p, '#a89e8c', 0.72); // fieldstone / cut-stone
  }
}

/** Architecture wall material -> model texture kind (data-driven, one place). */
const WALL_TEX: Record<WallMaterial, TexKind> = {
  adobe: 'adobe',
  fieldstone: 'fieldstone',
  'cut-stone': 'cutstone',
  megalithic: 'megalith',
  brick: 'brick',
  concrete: 'concrete',
  metal: 'metal',
};

/** Architecture roof material -> model texture kind. */
const ROOF_TEX: Record<RoofMaterial, TexKind> = {
  thatch: 'thatch',
  'flat-stone': 'flatstone',
  tile: 'roof',
  'flat-metal': 'flatmetal',
};

function andeanTex(b: Builder): TexKind {
  // Chavín's carved stone reads better with the lighter procedural stone map
  // than with the near-black megalith AI texture.
  if (b.civId === CivId.CHAVIN) return 'stone';
  return WALL_TEX[b.arch.wall];
}

/** Foundation texture: terraces are always fieldstone, else the wall material. */
function foundationTex(b: Builder): TexKind {
  return b.arch.foundation === 'terrace' ? 'fieldstone' : andeanTex(b);
}

/** Facade texture from the architecture profile for the colonial/republican builders. */
function facadeTex(b: Builder, fallback: TexKind): TexKind {
  return WALL_TEX[b.arch.wall] ?? fallback;
}

/** Roof texture from the architecture profile (thatch / flat-stone / tile / flat-metal). */
function roofTex(b: Builder, fallback: TexKind): TexKind {
  return ROOF_TEX[b.arch.roof] ?? fallback;
}

function andeanStone(b: Builder): string {
  return mixHex(b.pal.primary, '#9c9182', 0.8);
}

/** Republican concrete facade colour + texture, shared by the republican builders. */
function concreteWall(b: Builder): { wall: string; tex: TexKind } {
  return { wall: mixHex(b.pal.concrete, '#ffffff', 0.6), tex: facadeTex(b, 'concrete') };
}

/** Thatch colour (straw) shared by the Andean roofs. */
function andeanThatch(b: Builder): string {
  return mixHex('#d8b65e', b.pal.primary, 0.18);
}

/** Stepped stone platform (the Andean "huaca" base). */
function andeanPlatform(b: Builder, w: number, tiers: number): void {
  const stone = andeanStone(b);
  const tex = foundationTex(b);
  for (let i = 0; i < tiers; i++) {
    const t = w * (1.24 - i * 0.08);
    b.box(t, w * 0.14, t, stone, { y: w * 0.07 + i * w * 0.14, tex });
  }
}

/** Terraced base (stepped retaining walls with flat surfaces) — highland / Inca. */
function andeanTerraceBase(b: Builder, w: number, tiers: number): number {
  const stone = andeanStone(b);
  const wall = andeanWall(b);
  const tex = andeanTex(b);
  const h = w * 0.14;
  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const t = w * (1.3 - i * 0.1);
    b.box(t, h, t, stone, { y: y + h / 2, tex: 'fieldstone' });
    b.box(t * 0.84, h * 0.32, t * 0.84, wall, { y: y + h * 0.68, tex });
    y += h;
  }
  return y;
}

/** Base chosen by the architecture profile; returns the height of the platform top. */
function andeanFoundation(b: Builder, w: number, tiers: number): number {
  switch (b.arch.foundation) {
    case 'none':
      return 0;
    case 'plinth':
      b.box(w * 1.06, w * 0.1, w * 1.06, andeanStone(b), { y: w * 0.05, tex: foundationTex(b) });
      return w * 0.1;
    case 'terrace':
      return andeanTerraceBase(b, w, tiers);
    default:
      andeanPlatform(b, w, tiers);
      return tiers * w * 0.14;
  }
}

/** Cyclopean corner blocks (altiplano megalithic style). */
function andeanMegaliths(b: Builder, w: number, baseY: number): void {
  const stone = mixHex(b.pal.primary, '#c2baae', 0.82);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    b.box(w * 0.22, w * 0.34, w * 0.22, stone, {
      x: sx * w * 0.5,
      y: baseY + w * 0.17,
      z: sz * w * 0.5,
      tex: andeanTex(b),
    });
  }
}

/** Hanging textile bands (Inca tapestries). */
function andeanTapestries(b: Builder, w: number, baseY: number): void {
  for (let i = -1; i <= 1; i++) {
    b.box(w * 0.16, w * 0.3, 0.05, i % 2 ? b.civSecondary : b.civAccent, {
      x: i * w * 0.3,
      y: baseY + w * 0.3,
      z: w * 0.48,
    });
  }
}

/** Thatch gable roof with a deep eave and a darker ridge bundle. */
function andeanThatchRoof(b: Builder, w: number, y: number): void {
  const thatch = andeanThatch(b);
  const ridge = mixHex(thatch, '#7a5a24', 0.38);
  const o = { tex: 'thatch' as TexKind, texScale: 2 };
  b.box(w * 1.18, w * 0.1, w * 0.68, thatch, { y, z: w * 0.26, rx: 0.6, ...o });
  b.box(w * 1.18, w * 0.1, w * 0.68, thatch, { y, z: -w * 0.26, rx: -0.6, ...o });
  b.box(w * 1.2, w * 0.1, w * 0.2, ridge, { y: y + w * 0.2, ...o });
  b.box(w * 1.19, w * 0.05, 0.07, mixHex(thatch, '#5a4018', 0.35), { y: y + w * 0.28 });
}

/** Recessed wall niches (Andean masonry / altiplano). */
function andeanNiches(b: Builder, w: number, tex: TexKind): void {
  const dark = mixHex(b.pal.primary, '#3a332a', 0.6);
  for (let i = -1; i <= 1; i++) {
    b.box(w * 0.14, w * 0.3, 0.06, dark, { x: i * w * 0.28, y: w * 0.42, z: w * 0.46, tex });
  }
}

/** Painted frieze band (coastal adobe — Moche/Chimú reliefs). */
function andeanFrieze(b: Builder, w: number): void {
  b.box(w * 0.96, w * 0.1, w * 0.96, b.civAccent, { y: w * 0.66 });
  for (let i = -1; i <= 1; i++) {
    b.box(w * 0.1, w * 0.1, 0.04, b.civSecondary, { x: i * w * 0.26, y: w * 0.66, z: w * 0.49 });
  }
}

/** Frontal staircase (stepped). */
function andeanStair(b: Builder, w: number, steps: number): void {
  const stone = andeanStone(b);
  for (let i = 0; i < steps; i++) {
    b.box(w * 0.34, w * 0.08, w * 0.14, stone, {
      y: w * 0.04 + i * w * 0.08,
      z: w * (0.5 + i * 0.07),
      tex: andeanTex(b),
    });
  }
}

/** A stone watchtower (chullpa-like). */
function andeanTower(b: Builder, w: number, x: number, z: number): void {
  const stone = andeanStone(b);
  b.cyl(w * 0.16, w * 0.2, w * 0.9, 8, stone, { x, y: w * 0.45, z, tex: andeanTex(b) });
  b.cyl(w * 0.2, w * 0.16, w * 0.12, 8, b.pal.darkMetal, { x, y: w * 0.95, z });
}

/** Civ banner: pole + cloth + the civ's emblem glyph. */
function andeanBanner(b: Builder, x: number, y: number, z: number, size: number): void {
  b.cyl(0.02, 0.02, size, 6, b.pal.darkWood, { x, y: y + size * 0.5, z });
  b.box(size * 0.5, size * 0.34, 0.02, b.civPrimary, { x: x + size * 0.24, y: y + size * 0.78, z });
  addEmblem(b, x + size * 0.24, y + size * 0.78, z + 0.03, size * 0.34);
}

/** The civ's procedural emblem, drawn as a small glyph facing +Z. */
function addEmblem(b: Builder, x: number, y: number, z: number, s: number): void {
  const c = b.civAccent;
  const c2 = b.civSecondary;
  const dark = mixHex(b.civPrimary, '#20180f', 0.5);
  switch (b.emblem) {
    case 'sun':
      b.cyl(s * 0.28, s * 0.28, 0.03, 12, c, { x, y, z, rx: Math.PI / 2 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.box(s * 0.1, s * 0.08, 0.03, c2, { x: x + Math.cos(a) * s * 0.42, y: y + Math.sin(a) * s * 0.42, z, rz: a });
      }
      break;
    case 'feline':
      b.box(s * 0.5, s * 0.42, 0.03, c, { x, y, z });
      b.box(s * 0.12, s * 0.14, 0.04, c, { x: x - s * 0.2, y: y + s * 0.3, z });
      b.box(s * 0.12, s * 0.14, 0.04, c, { x: x + s * 0.2, y: y + s * 0.3, z });
      b.box(s * 0.12, s * 0.1, 0.05, dark, { x: x - s * 0.12, y, z: z + 0.02 });
      b.box(s * 0.12, s * 0.1, 0.05, dark, { x: x + s * 0.12, y, z: z + 0.02 });
      break;
    case 'fret':
      for (let i = 0; i < 4; i++) {
        b.box(s * 0.16, s * 0.16, 0.03, c, { x: x - s * 0.3 + i * s * 0.22, y: y + (i % 2 ? 1 : -1) * s * 0.14, z });
      }
      b.box(s * 0.7, s * 0.1, 0.03, c2, { x, y: y - s * 0.32, z });
      break;
    case 'staff':
      b.box(s * 0.1, s * 0.8, 0.03, c2, { x, y, z });
      b.box(s * 0.34, s * 0.34, 0.03, c, { x, y: y + s * 0.34, z });
      b.box(s * 0.12, s * 0.12, 0.04, dark, { x: x - s * 0.09, y: y + s * 0.34, z: z + 0.02 });
      b.box(s * 0.12, s * 0.12, 0.04, dark, { x: x + s * 0.09, y: y + s * 0.34, z: z + 0.02 });
      break;
    case 'condor':
      b.box(s * 0.14, s * 0.5, 0.03, c, { x, y, z });
      b.box(s * 0.5, s * 0.16, 0.03, c2, { x: x - s * 0.3, y: y + s * 0.16, z, rz: 0.3 });
      b.box(s * 0.5, s * 0.16, 0.03, c2, { x: x + s * 0.3, y: y + s * 0.16, z, rz: -0.3 });
      b.box(s * 0.12, s * 0.12, 0.04, c, { x, y: y + s * 0.3, z });
      break;
    case 'wave':
      for (let i = 0; i < 3; i++) {
        b.box(s * 0.3, s * 0.08, 0.03, i % 2 ? c2 : c, { x, y: y - s * 0.2 + i * s * 0.2, z, rz: 0.4 });
        b.box(s * 0.3, s * 0.08, 0.03, i % 2 ? c : c2, { x: x + s * 0.28, y: y - s * 0.2 + i * s * 0.2, z, rz: -0.4 });
      }
      break;
    case 'geometric':
      b.box(s * 0.44, s * 0.44, 0.03, c, { x, y, z, rz: Math.PI / 4 });
      b.box(s * 0.18, s * 0.18, 0.04, c2, { x, y, z: z + 0.02, rz: Math.PI / 4 });
      break;
    case 'cross':
      b.box(s * 0.12, s * 0.6, 0.03, c, { x, y, z });
      b.box(s * 0.44, s * 0.12, 0.03, c, { x, y: y + s * 0.12, z });
      break;
    case 'sunburst':
      b.cyl(s * 0.22, s * 0.22, 0.03, 10, c, { x, y, z, rx: Math.PI / 2 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.box(s * 0.08, s * 0.2, 0.03, c2, { x: x + Math.cos(a) * s * 0.4, y: y + Math.sin(a) * s * 0.4, z, rz: a });
      }
      break;
    case 'shield':
      b.box(s * 0.5, s * 0.42, 0.03, c, { x, y: y + s * 0.1, z });
      b.cone(s * 0.25, s * 0.3, 4, c, { x, y: y - s * 0.2, z, rz: Math.PI });
      b.box(s * 0.06, s * 0.5, 0.04, c2, { x, y, z: z + 0.02 });
      b.box(s * 0.4, s * 0.06, 0.04, c2, { x, y: y + s * 0.12, z: z + 0.02 });
      break;
  }
}

/** A small civ emblem on a warrior's shield (drawn in the arm's local frame). */
function shieldEmblem(b: Builder, parent: THREE.Object3D): void {
  const c = b.civAccent;
  const c2 = b.civSecondary;
  const x = -0.095;
  const y = -0.3;
  const em = b.emblem;
  if (em === 'sun' || em === 'sunburst') {
    b.cylIn(parent, 0.05, 0.05, 0.02, 10, c, { x, y, rz: Math.PI / 2 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      b.boxIn(parent, 0.02, 0.02, 0.02, c2, { x, y: y + Math.cos(a) * 0.07, z: Math.sin(a) * 0.07 });
    }
  } else if (em === 'cross' || em === 'shield') {
    b.boxIn(parent, 0.02, 0.12, 0.02, c, { x, y });
    b.boxIn(parent, 0.02, 0.02, 0.1, c, { x, y: y + 0.02 });
  } else if (em === 'geometric' || em === 'fret' || em === 'wave') {
    b.boxIn(parent, 0.02, 0.08, 0.08, c, { x, y, rx: Math.PI / 4 });
    b.boxIn(parent, 0.02, 0.03, 0.03, c2, { x: x - 0.01, y });
  } else {
    b.boxIn(parent, 0.02, 0.06, 0.1, c, { x, y });
    b.boxIn(parent, 0.02, 0.025, 0.025, c2, { x: x - 0.01, y: y + 0.02, z: -0.03 });
    b.boxIn(parent, 0.02, 0.025, 0.025, c2, { x: x - 0.01, y: y + 0.02, z: 0.03 });
  }
}

interface AndeanOpts {
  size: number;
  tiers?: number;
  roof?: 'thatch' | 'flat' | 'shrine';
  tower?: boolean;
  stair?: boolean;
  banner?: boolean;
  /** Building role: only the center (and defensive buildings) carry a civ silhouette. */
  role?: 'center' | 'house' | 'civic' | 'military' | 'fortress' | 'market' | 'dropsite';
}

/** Parameterized Andean building: base + walls + roof, materials/ornament from the arch profile. */
function buildAndeanStructure(b: Builder, o: AndeanOpts): void {
  const w = o.size;
  const wall = andeanWall(b);
  const tex = andeanTex(b);
  const tiers = o.tiers ?? 1;
  b.box(w * 1.5, 0.12, w * 1.5, mixHex(b.pal.primary, '#cbbfa4', 0.7), { y: 0.06, tex: 'dirt', texScale: 1.4 });
  const baseY = andeanFoundation(b, w, tiers);
  b.box(w * 0.9, w * 0.62, w * 0.9, wall, { y: baseY + w * 0.31, tex });
  const masonry = b.arch.wall === 'cut-stone' || b.arch.wall === 'megalithic' || b.arch.wall === 'fieldstone';
  if (masonry) {
    const pil = mixHex(b.pal.primary, '#8f8676', 0.8);
    for (let i = -1; i <= 1; i += 2) {
      b.box(0.12, w * 0.66, 0.12, pil, { x: i * w * 0.44, y: baseY + w * 0.33, z: w * 0.44, tex });
      b.box(0.12, w * 0.66, 0.12, pil, { x: i * w * 0.44, y: baseY + w * 0.33, z: -w * 0.44, tex });
    }
  }
  const dark = mixHex(b.pal.primary, '#2a2318', 0.55);
  const adobe = b.arch.wall === 'adobe';
  if (adobe) {
    const base = mixHex(wall, '#8a7a62', 0.38);
    const plaster = mixHex(wall, '#ffffff', 0.3);
    for (const sz of [1, -1]) {
      b.box(w * 0.94, w * 0.14, 0.05, base, { y: baseY + w * 0.07, z: sz * w * 0.452, tex });
      b.box(w * 0.94, w * 0.07, 0.05, plaster, { y: baseY + w * 0.6, z: sz * w * 0.452, tex });
    }
    for (const sx of [1, -1]) {
      b.box(0.05, w * 0.14, w * 0.94, base, { x: sx * w * 0.452, y: baseY + w * 0.07, tex });
      b.box(0.05, w * 0.07, w * 0.94, plaster, { x: sx * w * 0.452, y: baseY + w * 0.6, tex });
    }
  }
  b.box(w * 0.26, w * 0.4, 0.06, dark, { y: baseY + w * 0.2, z: w * 0.46 });
  b.box(w * 0.36, w * 0.08, 0.07, mixHex(b.pal.primary, '#6a5f4a', 0.6), { y: baseY + w * 0.42, z: w * 0.46 });
  if (adobe) {
    const frame = mixHex(wall, '#ffffff', 0.2);
    for (const sx of [-1, 1]) {
      b.box(w * 0.06, w * 0.46, 0.07, frame, { x: sx * w * 0.15, y: baseY + w * 0.23, z: w * 0.465, tex });
      b.box(0.06, w * 0.18, w * 0.16, dark, { x: sx * w * 0.451, y: baseY + w * 0.34, tex });
    }
    b.box(w * 0.36, w * 0.06, 0.07, frame, { y: baseY + w * 0.46, z: w * 0.465, tex });
    b.box(w * 0.3, w * 0.05, w * 0.22, andeanStone(b), { y: 0.025, z: w * 0.53 });
    if (o.role === 'house') {
      const ax = w * 0.62;
      const az = -w * 0.22;
      b.box(w * 0.34, w * 0.4, w * 0.4, wall, { x: ax, y: baseY + w * 0.2, z: az, tex });
      b.box(w * 0.42, w * 0.08, w * 0.5, andeanThatch(b), {
        x: ax,
        y: baseY + w * 0.44,
        z: az,
        ry: Math.PI / 2,
        tex: 'thatch',
      });
    }
  }
  if (b.arch.ornament.niches) andeanNiches(b, w, tex);
  if (b.arch.ornament.frieze) andeanFrieze(b, w);
  if (b.arch.ornament.megalithBlocks) andeanMegaliths(b, w, baseY);
  if (b.arch.ornament.tapestry) andeanTapestries(b, w, baseY);
  const roofY = baseY + w * 0.72;
  let roof = o.roof ?? 'thatch';
  if (roof !== 'shrine' && b.arch.roof === 'flat-stone') roof = 'flat';
  if (roof === 'flat') {
    b.box(w * 1.0, w * 0.12, w * 1.0, andeanStone(b), {
      y: roofY,
      tex: b.arch.roof === 'flat-stone' ? 'flatstone' : andeanTex(b),
    });
    for (let i = -1; i <= 1; i += 2)
      b.box(w * 0.12, w * 0.18, w * 1.0, wall, { x: i * w * 0.46, y: roofY + w * 0.1, tex });
  } else if (roof === 'shrine') {
    andeanThatchRoof(b, w * 0.7, roofY + w * 0.05);
    b.box(w * 0.4, w * 0.34, w * 0.4, wall, { y: roofY + w * 0.2, tex });
    b.box(w * 0.16, w * 0.16, 0.06, dark, { y: roofY + w * 0.18, z: w * 0.2 });
  } else {
    andeanThatchRoof(b, w, roofY);
  }
  if (o.tower) andeanTower(b, w, -w * 0.5, -w * 0.5);
  if (o.stair) andeanStair(b, w, tiers + 2);
  if (o.banner) andeanBanner(b, w * 0.5, baseY + w * 0.6, -w * 0.4, w * 0.9);
  const motif = b.arch.silhouette;
  if (o.role === 'center' || (o.role === 'fortress' && FORTRESS_MOTIFS.has(motif))) {
    addCivSilhouette(b, w, baseY, motif);
  }
}

function buildAndeanHouse(b: Builder, size: number, grand: boolean): void {
  buildAndeanStructure(b, {
    size,
    tiers: grand ? 2 : 1,
    roof: 'thatch',
    stair: grand,
    banner: true,
    role: grand ? 'center' : 'house',
  });
}

function buildAndeanCivic(b: Builder, size: number, tower: boolean, center = false): void {
  buildAndeanStructure(b, {
    size,
    tiers: b.arch.monumentalTiers,
    roof: 'shrine',
    tower,
    stair: true,
    banner: true,
    role: center ? 'center' : 'civic',
  });
}

function buildAndeanMilitary(b: Builder, size: number, tower: boolean): void {
  buildAndeanStructure(b, { size, tiers: 1, roof: 'flat', tower, banner: true, role: 'military' });
}

function buildAndeanFortress(b: Builder, size: number): void {
  buildAndeanStructure(b, {
    size,
    tiers: Math.max(2, b.arch.monumentalTiers - 1),
    roof: 'flat',
    tower: true,
    stair: true,
    banner: true,
    role: 'fortress',
  });
}

/** Motifs that also read as defensive architecture (fortress). */
const FORTRESS_MOTIFS = new Set<SilhouetteMotif>([
  'ramp',
  'tenon-heads',
  'stone-heads',
  'perimeter-wall',
  'citadel',
  'pucara',
  'terraces',
]);

/**
 * Compact, historically grounded silhouette marker for the base center (and,
 * where it fits, the fortress). Vertical motifs sit on the platform top and
 * ground motifs ring the pad, so the building's shape — not just its colour —
 * identifies the civilization.
 * Sources: `docs/historia/arquitectura.md` §1 and the civ dossiers.
 */
function addCivSilhouette(b: Builder, w: number, baseY: number, motif: SilhouetteMotif): void {
  const stone = andeanStone(b);
  const wall = andeanWall(b);
  const tex = andeanTex(b);
  const dark = mixHex(b.pal.primary, '#2a2318', 0.55);
  const green = mixHex('#4a6a2a', b.pal.primary, 0.4);
  // Vertical motifs sit on the platform top; ground motifs ring the 1.5w pad
  // (radius ~0.8w) so they read around the base without touching the dwellings.
  const tx = w * 0.4;
  const tz = w * 0.35;
  switch (motif) {
    case 'circular-plaza': {
      // Caral: sunken circular plaza with upright stones around the platform.
      ringPlaza(b, 0, w * 0.8, stone, mixHex(b.pal.primary, '#8a7a5a', 0.5), 12, 0, 0.12);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.box(w * 0.09, w * 0.3, w * 0.09, stone, {
          x: Math.cos(a) * w * 0.82,
          y: w * 0.15,
          z: Math.sin(a) * w * 0.82,
          tex,
        });
        b.box(w * 0.11, w * 0.05, w * 0.11, dark, {
          x: Math.cos(a) * w * 0.82,
          y: w * 0.31,
          z: Math.sin(a) * w * 0.82,
        });
      }
      break;
    }
    case 'tenon-heads':
      // Chavín: cabezas clavas protruding from the temple wall.
      tenonHeadRow(b, stone, baseY + w * 0.26, w * 0.5, w * 0.16);
      break;
    case 'stone-heads': {
      // Cupisnique: stone heads set into the adobe facade.
      const head = mixHex(b.pal.primary, '#8f8676', 0.78);
      for (let i = -1; i <= 1; i++) {
        b.sphere(w * 0.12, head, { x: i * w * 0.28, y: baseY + w * 0.36, z: w * 0.52 });
        b.box(w * 0.16, w * 0.08, w * 0.06, dark, { x: i * w * 0.28, y: baseY + w * 0.3, z: w * 0.56 });
      }
      break;
    }
    case 'funerary-enclosure': {
      // Paracas: funerary enclosure with wrapped bundles around the platform.
      enclosure(b, w * 1.48, w * 0.18, w * 0.05, wall, tex, 0, 0, 0.02);
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const x = sx * w * 0.55;
        const z = sz * w * 0.55;
        b.cyl(w * 0.08, w * 0.1, w * 0.26, 8, sz > 0 ? b.civAccent : b.civSecondary, {
          x,
          y: w * 0.26,
          z,
          tex: 'cloth',
        });
        b.sphere(w * 0.09, stone, { x, y: w * 0.42, z });
      }
      break;
    }
    case 'ramp': {
      // Moche / Chincha: access ramp on the front-right face of the platform.
      const adobe = andeanWall(b);
      for (let i = 0; i < 4; i++) {
        b.box(w * 0.3, w * 0.08, w * 0.16, adobe, {
          x: w * 0.28,
          y: w * 0.04 + i * w * 0.08,
          z: w * 0.66 - i * w * 0.08,
          tex: 'brick',
        });
      }
      break;
    }
    case 'low-mound': {
      // Nazca: a broad, low ceremonial mound (Cahuachi) around the platform.
      const earth = mixHex(b.pal.primary, '#c8a878', 0.72);
      b.cyl(w * 0.86, w * 0.9, w * 0.1, 24, earth, { y: w * 0.05, tex: 'dirt', flatShading: true });
      b.cyl(w * 0.7, w * 0.74, w * 0.08, 24, earth, { y: w * 0.14, tex: 'dirt', flatShading: true });
      break;
    }
    case 'stelae': {
      // Recuay: upright carved stelae (Pashash) on the platform top.
      for (const sx of [-1, 1]) {
        b.box(w * 0.12, w * 0.4, w * 0.08, stone, {
          x: tx + sx * w * 0.16,
          y: baseY + w * 0.2,
          z: tz,
          tex,
        });
        b.box(w * 0.16, w * 0.06, w * 0.1, b.civAccent, { x: tx + sx * w * 0.16, y: baseY + w * 0.42, z: tz });
      }
      break;
    }
    case 'perimeter-wall': {
      // Wari: walled compound — high walls with an accent cap and an open front.
      for (const sx of [-1, 1]) {
        b.box(w * 0.08, w * 0.8, w * 1.3, wall, { x: sx * w * 0.72, y: w * 0.4, z: 0, tex });
        b.box(w * 0.1, w * 0.08, w * 1.3, b.civAccent, { x: sx * w * 0.72, y: w * 0.82, z: 0 });
        for (const sz of [-1, 1]) {
          b.box(w * 0.14, w * 0.95, w * 0.14, wall, {
            x: sx * w * 0.7,
            y: w * 0.475,
            z: sz * w * 0.62,
            tex,
          });
          b.box(w * 0.16, w * 0.08, w * 0.16, b.civAccent, {
            x: sx * w * 0.7,
            y: w * 0.99,
            z: sz * w * 0.62,
          });
        }
      }
      b.box(w * 1.3, w * 0.8, w * 0.08, wall, { y: w * 0.4, z: -w * 0.72, tex });
      b.box(w * 1.3, w * 0.08, w * 0.1, b.civAccent, { y: w * 0.82, z: -w * 0.72 });
      b.box(w * 0.42, w * 0.8, w * 0.08, wall, { x: -w * 0.52, y: w * 0.4, z: w * 0.72, tex });
      b.box(w * 0.42, w * 0.8, w * 0.08, wall, { x: w * 0.52, y: w * 0.4, z: w * 0.72, tex });
      break;
    }
    case 'sunken-court': {
      // Tiahuanaco: rectangular sunken patio ring around the platform.
      const cw = w * 1.5;
      const floor = mixHex(b.pal.primary, '#6a6258', 0.6);
      b.box(cw, w * 0.06, cw, floor, { y: w * 0.12, tex });
      b.box(cw, w * 0.24, w * 0.06, stone, { y: w * 0.2, z: cw / 2, tex });
      b.box(cw, w * 0.24, w * 0.06, stone, { y: w * 0.2, z: -cw / 2, tex });
      b.box(w * 0.06, w * 0.24, cw, stone, { x: cw / 2, y: w * 0.2, tex });
      b.box(w * 0.06, w * 0.24, cw, stone, { x: -cw / 2, y: w * 0.2, tex });
      break;
    }
    case 'citadel': {
      // Chimú: walled citadel (Chan Chan) — taller walls, bastions and a gate.
      for (const sx of [-1, 1]) {
        b.box(w * 0.1, w * 1.0, w * 1.3, wall, { x: sx * w * 0.72, y: w * 0.5, z: 0, tex });
        b.box(w * 0.12, w * 0.1, w * 1.3, b.civAccent, { x: sx * w * 0.72, y: w * 1.02, z: 0 });
        for (const sz of [-1, 1]) {
          b.box(w * 0.18, w * 1.15, w * 0.18, wall, {
            x: sx * w * 0.7,
            y: w * 0.575,
            z: sz * w * 0.62,
            tex,
          });
          b.box(w * 0.2, w * 0.1, w * 0.2, b.civAccent, {
            x: sx * w * 0.7,
            y: w * 1.18,
            z: sz * w * 0.62,
          });
        }
      }
      b.box(w * 1.3, w * 1.0, w * 0.1, wall, { y: w * 0.5, z: -w * 0.72, tex });
      b.box(w * 1.3, w * 0.1, w * 0.12, b.civAccent, { y: w * 1.02, z: -w * 0.72 });
      b.box(w * 0.34, w * 1.0, w * 0.1, wall, { x: -w * 0.56, y: w * 0.5, z: w * 0.72, tex });
      b.box(w * 0.34, w * 1.0, w * 0.1, wall, { x: w * 0.56, y: w * 0.5, z: w * 0.72, tex });
      b.box(w * 0.12, w * 1.1, w * 0.12, wall, { x: -w * 0.2, y: w * 0.55, z: w * 0.72, tex });
      b.box(w * 0.12, w * 1.1, w * 0.12, wall, { x: w * 0.2, y: w * 0.55, z: w * 0.72, tex });
      b.box(w * 0.52, w * 0.1, w * 0.14, b.civAccent, { y: w * 1.1, z: w * 0.72 });
      break;
    }
    case 'pucara':
      // Chanca: stone watchtower on the platform, front-right.
      b.cyl(w * 0.12, w * 0.15, w * 0.72, 8, stone, { x: tx, y: baseY + w * 0.36, z: tz, tex });
      b.cyl(w * 0.17, w * 0.13, w * 0.09, 8, stone, { x: tx, y: baseY + w * 0.76, z: tz, tex });
      for (const sx of [-1, 0, 1]) {
        b.box(w * 0.05, w * 0.09, w * 0.05, stone, { x: tx + sx * w * 0.1, y: baseY + w * 0.85, z: tz, tex });
      }
      break;
    case 'chullpa':
      // Collas/Lupaca: square funerary tower (chullpa) on the platform.
      b.box(w * 0.2, w * 0.8, w * 0.2, stone, { x: tx, y: baseY + w * 0.4, z: tz, tex });
      b.box(w * 0.24, w * 0.07, w * 0.24, stone, { x: tx, y: baseY + w * 0.8, z: tz, tex });
      b.box(w * 0.08, w * 0.18, w * 0.03, dark, { x: tx, y: baseY + w * 0.14, z: tz + w * 0.11 });
      break;
    case 'terraces': {
      // Huanca / highland: andenes as projecting agricultural ledges on the facade.
      for (let i = 0; i < 3; i++) {
        b.box(w * 0.86, w * 0.06, w * 0.06, stone, {
          y: baseY + w * 0.08 + i * w * 0.12,
          z: w * 0.5,
          tex,
        });
        b.box(w * 0.8, w * 0.03, w * 0.03, green, {
          y: baseY + w * 0.11 + i * w * 0.12,
          z: w * 0.54,
        });
      }
      break;
    }
    case 'ushnu':
      // Inca: small stepped ushnu platform with a seat, on the platform top.
      b.box(w * 0.36, w * 0.18, w * 0.36, stone, { x: tx, y: baseY + w * 0.09, z: tz, tex });
      b.box(w * 0.24, w * 0.14, w * 0.24, stone, { x: tx, y: baseY + w * 0.25, z: tz, tex });
      b.box(w * 0.09, w * 0.2, w * 0.09, b.civAccent, { x: tx, y: baseY + w * 0.42, z: tz });
      break;
    default:
      break;
  }
  b.finish().userData.civSilhouette = motif;
}

function buildAndeanFarm(b: Builder): void {
  const w = 3.0;
  const terraced = b.arch.foundation === 'terrace';
  b.box(w * 0.78, 0.1, w * 0.78, mixHex(b.pal.primary, '#7a6a3a', 0.6), { y: 0.05, tex: 'dirt' });
  if (terraced) {
    const stone = andeanStone(b);
    for (let i = -1; i <= 1; i++) {
      b.box(w * 0.72, 0.16, 0.08, stone, { z: i * 0.28, y: 0.12, tex: andeanTex(b) });
      b.box(w * 0.66, 0.06, 0.2, mixHex('#4a6a2a', b.pal.primary, 0.4), { z: i * 0.28, y: 0.16 });
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      b.box(w * 0.62, 0.04, 0.08, mixHex(b.pal.primary, '#3a6a8a', 0.5), { z: i * 0.32, y: 0.09 });
    }
    b.cyl(0.04, 0.05, 0.24, 6, mixHex('#3a6a2a', b.pal.primary, 0.3), { x: -0.4, y: 0.18, z: 0.3 });
    b.cyl(0.04, 0.05, 0.24, 6, mixHex('#4a8a2a', b.pal.primary, 0.2), { x: 0.3, y: 0.2, z: -0.2 });
  }
}

function buildAndeanMarket(b: Builder, size: number): void {
  buildAndeanStructure(b, { size, tiers: 0, roof: 'thatch', banner: true, role: 'market' });
  b.box(size * 1.0, 0.1, size * 0.7, b.civPrimary, { y: size * 0.5, ry: Math.PI / 2 });
  b.box(0.3, 0.2, 0.3, '#efe6d2', { x: -0.25, y: size * 0.12, z: 0.1, tex: 'wood' });
}

function buildHouse(b: Builder, size: number, grand: boolean): void {
  if (b.isAndean) {
    buildAndeanHouse(b, size, grand);
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = mixHex(b.pal.wood, '#ffffff', 0.52);
  // main wall with a wood grain
  b.box(w * 0.92, w * 0.72, w * 0.92, wallTint, { y: w * 0.36, tex: facadeTex(b, 'wood') });
  // corner posts / vertical beams
  for (let i = -1; i <= 1; i++) {
    b.box(0.09, w * 0.78, 0.09, b.pal.darkWood, { x: i * w * 0.3, y: w * 0.37 });
  }
  // plinth
  b.box(w * 0.96, w * 0.08, w * 0.96, b.pal.darkWood, { y: w * 0.05 });
  // gable roof with tiles
  const roofTint = mixHex(b.pal.roof, '#ffffff', 0.58);
  b.box(w * 1.06, w * 0.16, w * 0.62, roofTint, {
    y: w * 0.82,
    z: w * 0.24,
    rx: 0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.06, w * 0.16, w * 0.62, roofTint, {
    y: w * 0.82,
    z: -w * 0.24,
    rx: -0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.08, w * 0.12, w * 0.24, roofTint, { y: w * 1.06, ry: Math.PI / 2, tex: roofTex(b, 'roof') });
  // front/rear eave
  b.box(w * 1.06, 0.05, w * 0.16, b.pal.darkWood, { y: w * 0.72, z: w * 0.48 });
  b.box(w * 1.06, 0.05, w * 0.16, b.pal.darkWood, { y: w * 0.72, z: -w * 0.48 });
  // front and rear windows
  addWindows(b, w, w * 0.48, w * 0.47, grand ? 3 : 2);
  addWindows(b, w, w * 0.48, -w * 0.47, grand ? 2 : 1);
  // brick chimney
  b.box(0.24, w * 0.62, 0.24, '#f2e9d8', { x: w * 0.26, y: w * 0.95, z: -w * 0.2, tex: 'brick' });
  b.box(0.3, 0.06, 0.3, b.pal.darkWood, { x: w * 0.26, y: w * 1.26, z: -w * 0.2 });
  // door with frame
  b.box(0.36, w * 0.46, 0.06, b.pal.darkWood, { y: w * 0.21, z: w * 0.47 });
  b.box(0.42, 0.05, 0.07, b.pal.darkWood, { y: w * 0.45, z: w * 0.47 });
  // step
  b.box(0.5, 0.06, 0.18, b.pal.darkWood, { y: 0.03, z: w * 0.5 });
  // banner
  b.cyl(0.02, 0.02, w * 0.5, 6, b.pal.darkWood, { y: w * 1.1, x: -w * 0.3, z: -w * 0.3 });
  b.box(0.3, 0.14, 0.02, b.civPrimary, { y: w * 1.2, x: -w * 0.14, z: -w * 0.3 });
}

function buildCivic(b: Builder, size: number, matType: 'stone' | 'brick', center = false): void {
  if (b.isAndean) {
    buildAndeanCivic(b, size, false, center);
    return;
  }
  groundPad(b, size);
  const wallTint = matType === 'stone' ? '#ece5d8' : '#f0e2d0';
  const w = size;
  b.box(w * 0.9, w * 0.6, w * 0.9, wallTint, { y: w * 0.3, tex: facadeTex(b, matType), roughness: 0.85 });
  // columns
  for (let i = 0; i < 4; i++) {
    b.cyl(0.08, 0.1, w * 0.55, 10, b.pal.stone, { x: (i - 1.5) * w * 0.28, y: w * 0.3, z: w * 0.42 });
  }
  // gable
  b.box(w * 1.0, 0.14, w * 0.42, b.pal.darkMetal, {
    y: w * 0.68,
    z: w * 0.28,
    ry: Math.PI / 2,
    tex: 'metalDark',
    texScale: 2,
  });
  b.box(w * 1.0, 0.14, w * 0.42, b.pal.darkMetal, {
    y: w * 0.68,
    z: -w * 0.28,
    ry: Math.PI / 2,
    tex: 'metalDark',
    texScale: 2,
  });
  b.box(w * 1.0, w * 0.4, 0.14, b.pal.darkMetal, { y: w * 0.86, ry: Math.PI / 4, tex: 'metalDark', texScale: 2 });
  b.box(0.18, w * 0.5, 0.18, b.pal.accent2, { y: w * 0.6, z: w * 0.45 });
  // lantern / clock
  b.box(0.3, 0.4, 0.2, b.pal.darkMetal, { y: w * 1.0, z: w * 0.45 });
  b.box(0.3, 0.1, 0.1, b.pal.emissive, { y: w * 1.05, z: w * 0.45, emissive: b.pal.emissive, emissiveIntensity: 1.5 });
  b.cyl(0.02, 0.02, w * 0.6, 6, b.pal.darkMetal, { y: w * 1.1, z: -w * 0.3 });
  // central door with frame
  b.box(0.3, w * 0.4, 0.06, b.pal.darkMetal, { y: w * 0.2, z: w * 0.46 });
  // side windows
  addWindows(b, w, w * 0.44, w * 0.46, 2, { span: 0.3 });
}

function buildConcrete(b: Builder, size: number, tower: boolean, radar = false): void {
  if (b.isAndean) {
    // `tower` is only set for the center in the concrete family (center_war).
    buildAndeanCivic(b, size, tower, tower);
    return;
  }
  groundPad(b, size);
  const w = size;
  b.box(w * 0.92, w * 0.55, w * 0.92, mixHex(b.pal.concrete, '#ffffff', 0.62), {
    y: w * 0.28,
    tex: facadeTex(b, 'concrete'),
  });
  b.box(w * 0.98, w * 0.18, w * 0.98, b.pal.darkMetal, { y: w * 0.09, tex: 'metalDark' });
  if (tower) {
    b.box(w * 0.4, w * 0.7, w * 0.4, mixHex(b.pal.concrete, '#ffffff', 0.62), { y: w * 0.9, tex: 'concrete' });
    b.box(w * 0.46, w * 0.12, w * 0.46, b.pal.darkMetal, { y: w * 1.25, tex: 'metalDark' });
  }
  if (radar) {
    b.pivot('quipus_watchers');
    b.cyl(0.05, 0.05, w * 0.6, 6, b.pal.darkMetal, { y: w * 0.7 });
    b.sphere(w * 0.3, b.pal.metal, { y: w * 1.0, metalness: 0.6, roughness: 0.3 });
  }
  // lit windows
  for (let i = 0; i < 3; i++) {
    b.box(0.2, 0.14, 0.05, b.pal.emissive, {
      x: (i - 1) * w * 0.24,
      y: w * 0.4,
      z: w * 0.47,
      emissive: b.pal.emissive,
      emissiveIntensity: 1.3,
      transparent: true,
      opacity: 0.9,
    });
  }
  // door
  b.box(0.32, w * 0.34, 0.06, b.pal.darkMetal, { y: w * 0.18, z: w * 0.47 });
}

function buildModern(b: Builder, size: number, tower: boolean): void {
  groundPad(b, size);
  const w = size;
  b.box(w * 0.94, w * 0.6, w * 0.94, mixHex(b.pal.metal, '#ffffff', 0.45), {
    y: w * 0.3,
    tex: facadeTex(b, 'metal'),
    texScale: 2,
  });
  b.box(w * 0.96, w * 0.1, w * 0.96, b.pal.darkMetal, { y: w * 0.05, tex: 'metalDark' });
  // glass facade
  b.box(w * 0.86, w * 0.5, 0.06, b.civPrimary, {
    y: w * 0.32,
    z: w * 0.47,
    metalness: 0.7,
    roughness: 0.2,
    transparent: true,
    opacity: 0.6,
  });
  // LED strips
  for (let i = 0; i < 4; i++) {
    b.box(w * 0.82, 0.04, 0.04, b.pal.emissive, {
      y: w * 0.22 + i * w * 0.12,
      z: w * 0.47,
      emissive: b.pal.emissive,
      emissiveIntensity: 1.6,
    });
  }
  if (tower) {
    b.box(w * 0.3, w * 0.9, w * 0.3, mixHex(b.pal.metal, '#ffffff', 0.45), { y: w * 1.05, tex: 'metal', texScale: 2 });
    b.box(w * 0.36, w * 0.1, w * 0.36, b.pal.darkMetal, { y: w * 1.5, tex: 'metalDark' });
    b.cyl(0.04, 0.04, w * 0.5, 6, b.pal.darkMetal, { y: w * 1.75 });
    b.sphere(0.1, b.pal.emissive, { y: w * 2.0, emissive: b.pal.emissive, emissiveIntensity: 2 });
  }
  b.cyl(0.02, 0.02, w * 0.5, 6, b.pal.darkMetal, { y: w * 0.9, x: -w * 0.3 });
  b.box(w * 0.3, 0.14, 0.02, b.civPrimary, { y: w * 0.95, x: -w * 0.14 });
  // input
  b.box(0.36, w * 0.3, 0.06, b.pal.darkMetal, { y: w * 0.15, z: w * 0.47 });
}

function buildBarracks(b: Builder, size: number, wallType: 'wood' | 'brick'): void {
  if (b.isAndean) {
    buildAndeanMilitary(b, size, false);
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = wallType === 'wood' ? mixHex(b.pal.wood, '#ffffff', 0.5) : mixHex(b.pal.brick, '#ffffff', 0.5);
  const roofTint = mixHex(b.pal.roof, '#ffffff', 0.58);
  b.box(w * 0.9, w * 0.5, w * 0.7, wallTint, { y: w * 0.25, tex: facadeTex(b, wallType) });
  b.box(w * 0.94, w * 0.07, w * 0.74, b.pal.darkWood, { y: w * 0.04 });
  b.box(w * 1.0, w * 0.14, w * 0.44, roofTint, {
    y: w * 0.56,
    z: w * 0.16,
    rx: 0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.0, w * 0.14, w * 0.44, roofTint, {
    y: w * 0.56,
    z: -w * 0.16,
    rx: -0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.02, w * 0.1, w * 0.2, roofTint, { y: w * 0.74, ry: Math.PI / 2, tex: roofTex(b, 'roof') });
  // wide door with frame
  b.box(0.4, w * 0.36, 0.07, b.pal.darkWood, { y: w * 0.16, z: w * 0.36 });
  b.box(0.46, 0.05, 0.08, b.pal.darkWood, { y: w * 0.35, z: w * 0.36 });
  b.box(0.08, 0.4, 0.08, b.pal.darkWood, { x: -0.26, y: w * 0.17, z: w * 0.36 });
  b.box(0.08, 0.4, 0.08, b.pal.darkWood, { x: 0.26, y: w * 0.17, z: w * 0.36 });
  b.cyl(0.02, 0.02, w * 0.5, 6, b.pal.darkWood, { y: w * 0.9, x: -w * 0.35 });
  b.box(0.34, 0.16, 0.02, b.civPrimary, { y: w * 0.92, x: -w * 0.18 });
}

function buildStable(b: Builder, size: number, wallType: 'wood' | 'brick'): void {
  if (b.isAndean) {
    buildAndeanMilitary(b, size, false);
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = wallType === 'wood' ? mixHex(b.pal.wood, '#ffffff', 0.5) : mixHex(b.pal.brick, '#ffffff', 0.5);
  const roofTint = mixHex(b.pal.roof, '#ffffff', 0.58);
  b.box(w * 0.9, w * 0.55, w * 0.75, wallTint, { y: w * 0.28, tex: facadeTex(b, wallType) });
  b.box(w * 0.94, w * 0.07, w * 0.79, b.pal.darkWood, { y: w * 0.05 });
  b.box(w * 1.02, w * 0.16, w * 0.5, roofTint, {
    y: w * 0.62,
    z: w * 0.2,
    rx: 0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.02, w * 0.16, w * 0.5, roofTint, {
    y: w * 0.62,
    z: -w * 0.2,
    rx: -0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 1.04, w * 0.12, w * 0.22, roofTint, { y: w * 0.8, ry: Math.PI / 2, tex: roofTex(b, 'roof') });
  // wide doors
  b.box(0.4, w * 0.3, 0.07, b.pal.darkWood, { x: -0.22, y: w * 0.16, z: w * 0.38 });
  b.box(0.4, w * 0.3, 0.07, b.pal.darkWood, { x: 0.22, y: w * 0.16, z: w * 0.38 });
  b.box(0.08, w * 0.34, 0.08, b.pal.darkWood, { x: -0.43, y: w * 0.17, z: w * 0.38 });
  b.box(0.08, w * 0.34, 0.08, b.pal.darkWood, { x: 0.43, y: w * 0.17, z: w * 0.38 });
  addWindows(b, w, w * 0.46, w * 0.39, 2, { span: 0.26 });
  b.cyl(0.02, 0.02, w * 0.55, 6, b.pal.darkWood, { y: w * 0.9, x: -w * 0.3 });
}

function buildMilitary(b: Builder, size: number, antenna: boolean): void {
  if (b.isAndean) {
    buildAndeanMilitary(b, size, antenna);
    return;
  }
  groundPad(b, size);
  const w = size;
  b.box(w * 0.92, w * 0.5, w * 0.8, mixHex(b.pal.concrete, '#ffffff', 0.62), {
    y: w * 0.25,
    tex: facadeTex(b, 'concrete'),
  });
  b.box(w * 0.98, w * 0.16, w * 0.9, b.pal.darkMetal, { y: w * 0.08, tex: 'metalDark' });
  // corner turret
  b.cyl(0.22, 0.28, w * 0.55, 10, mixHex(b.pal.concrete, '#ffffff', 0.62), {
    x: w * 0.34,
    y: w * 0.5,
    z: w * 0.32,
    tex: 'concrete',
  });
  b.cyl(0.1, 0.1, 0.06, 8, b.pal.emissive, {
    x: w * 0.34,
    y: w * 0.8,
    z: w * 0.32,
    emissive: b.pal.emissive,
    emissiveIntensity: 1.6,
  });
  if (antenna) {
    b.cyl(0.02, 0.02, w * 0.6, 6, b.pal.darkMetal, { y: w * 0.8, z: -w * 0.3 });
    b.sphere(0.06, b.pal.emissive, { y: w * 1.1, z: -w * 0.3, emissive: b.pal.emissive, emissiveIntensity: 2 });
  }
  b.box(w * 0.5, w * 0.22, 0.06, b.pal.darkMetal, { y: w * 0.4, z: w * 0.41 });
  b.box(0.34, w * 0.3, 0.06, b.pal.darkMetal, { y: w * 0.16, z: w * 0.41 });
  addWindows(b, w, w * 0.36, w * 0.41, 2, { span: 0.3 });
}

function buildFactory(b: Builder, size: number, wallType: 'brick' | 'wood'): void {
  if (b.isAndean) {
    buildAndeanStructure(b, { size, tiers: 1, roof: 'flat', banner: true });
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = wallType === 'brick' ? mixHex(b.pal.brick, '#ffffff', 0.5) : mixHex(b.pal.wood, '#ffffff', 0.5);
  b.box(w * 1.0, w * 0.55, w * 0.8, wallTint, { y: w * 0.28, tex: facadeTex(b, wallType) });
  // flat metal roof
  b.box(w * 1.06, w * 0.1, w * 0.9, b.pal.darkMetal, { y: w * 0.55, tex: 'metalDark' });
  // chimneys
  for (let i = -1; i <= 1; i++) {
    b.cyl(0.1, 0.13, w * 0.8, 8, '#f0e2d0', { x: i * w * 0.26, y: w * 0.9, z: -w * 0.25, tex: 'brick' });
  }
  // door
  b.box(0.4, w * 0.34, 0.06, b.pal.darkMetal, { y: w * 0.18, z: w * 0.41, metalness: 0.5 });
  b.box(0.5, 0.1, 0.06, b.pal.emissive, { y: w * 0.5, z: w * 0.41, emissive: b.pal.emissive, emissiveIntensity: 1.2 });
  addWindows(b, w, w * 0.4, w * 0.41, 2, { span: 0.3 });
}

function buildFortress(b: Builder, size: number, matType: 'stone' | 'concrete'): void {
  if (b.isAndean) {
    buildAndeanFortress(b, size);
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = matType === 'stone' ? mixHex(b.pal.stone, '#ffffff', 0.5) : mixHex(b.pal.concrete, '#ffffff', 0.62);
  // central tower
  b.cyl(w * 0.5, w * 0.62, w * 1.1, 16, wallTint, { y: w * 0.55, tex: facadeTex(b, matType), texScale: 2 });
  b.cyl(w * 0.56, w * 0.5, w * 0.16, 16, b.pal.darkMetal, { y: w * 1.1, tex: 'metalDark' });
  // battlements
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.box(0.12, w * 0.16, 0.12, wallTint, {
      x: Math.cos(a) * w * 0.5,
      y: w * 1.16,
      z: Math.sin(a) * w * 0.5,
      tex: facadeTex(b, matType),
    });
  }
  // bastions
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.cyl(0.24, 0.3, w * 0.7, 10, wallTint, {
      x: Math.cos(a) * w * 0.85,
      y: w * 0.35,
      z: Math.sin(a) * w * 0.85,
      tex: facadeTex(b, matType),
    });
  }
  // connecting walls
  b.box(w * 1.5, w * 0.45, w * 0.22, wallTint, { y: w * 0.22, z: w * 0.72, tex: facadeTex(b, matType) });
  b.box(w * 1.5, w * 0.45, w * 0.22, wallTint, { y: w * 0.22, z: -w * 0.72, tex: facadeTex(b, matType) });
  b.box(w * 0.22, w * 0.45, w * 1.5, wallTint, { x: w * 0.72, y: w * 0.22, tex: facadeTex(b, matType) });
  b.box(w * 0.22, w * 0.45, w * 1.5, wallTint, { x: -w * 0.72, y: w * 0.22, tex: facadeTex(b, matType) });
  // embrasures
  for (let i = -1; i <= 1; i++) {
    b.box(0.16, 0.1, 0.05, b.pal.darkMetal, { x: i * w * 0.3, y: w * 0.5, z: w * 0.83, metalness: 0.4 });
    b.box(0.16, 0.1, 0.05, b.pal.darkMetal, { x: i * w * 0.3, y: w * 0.5, z: -w * 0.83, metalness: 0.4 });
  }
  // banner
  b.cyl(0.02, 0.02, w * 0.7, 6, b.pal.darkWood, { y: w * 1.4 });
  b.box(w * 0.4, w * 0.2, 0.03, b.civPrimary, { y: w * 1.5, z: 0.2 });
  b.box(0.24, 0.1, 0.05, b.pal.emissive, {
    y: w * 1.08,
    x: w * 0.5,
    z: w * 0.5,
    emissive: b.pal.emissive,
    emissiveIntensity: 1.6,
  });
}

function buildMarket(b: Builder, size: number, wallType: 'wood' | 'brick'): void {
  if (b.isAndean) {
    buildAndeanMarket(b, size);
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint = wallType === 'wood' ? mixHex(b.pal.wood, '#ffffff', 0.5) : mixHex(b.pal.brick, '#ffffff', 0.5);
  b.box(w * 0.9, w * 0.4, w * 0.7, wallTint, { y: w * 0.2, tex: facadeTex(b, wallType) });
  // striped awning
  b.box(w * 1.0, 0.1, w * 0.7, b.civPrimary, { y: w * 0.5, ry: Math.PI / 2, x: 0 });
  for (let i = 0; i < 6; i++) {
    b.box(w * 0.16, 0.11, w * 0.66, i % 2 === 0 ? b.civSecondary : b.civPrimary, {
      y: w * 0.5,
      x: (i - 2.5) * w * 0.16,
      ry: Math.PI / 2,
    });
  }
  // posts
  for (let i = 0; i < 4; i++) {
    b.cyl(0.05, 0.05, w * 0.55, 8, b.pal.darkWood, {
      x: (i % 2 === 0 ? -1 : 1) * w * 0.4,
      y: w * 0.28,
      z: (i < 2 ? -1 : 1) * w * 0.3,
    });
  }
  // merchandise
  b.box(0.3, 0.2, 0.3, '#efe6d2', { x: -0.25, y: w * 0.12, z: 0.1, tex: 'wood' });
  b.box(0.25, 0.25, 0.25, '#e0e6ec', { x: 0.2, y: w * 0.13, z: -0.15, tex: 'metal' });
}

function buildDropsite(b: Builder, size: number, matType: 'wood' | 'brick' | 'stone'): void {
  if (b.isAndean) {
    buildAndeanStructure(b, { size, tiers: 0, roof: 'thatch', banner: true });
    return;
  }
  groundPad(b, size);
  const w = size;
  const wallTint =
    matType === 'wood'
      ? mixHex(b.pal.wood, '#ffffff', 0.5)
      : matType === 'brick'
        ? mixHex(b.pal.brick, '#ffffff', 0.5)
        : mixHex(b.pal.stone, '#ffffff', 0.5);
  const roofTint = mixHex(b.pal.roof, '#ffffff', 0.58);
  b.box(w * 0.85, w * 0.5, w * 0.7, wallTint, { y: w * 0.25, tex: facadeTex(b, matType) });
  b.box(w * 0.95, w * 0.12, w * 0.42, roofTint, {
    y: w * 0.56,
    z: w * 0.15,
    rx: 0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 0.95, w * 0.12, w * 0.42, roofTint, {
    y: w * 0.56,
    z: -w * 0.15,
    rx: -0.55,
    ry: Math.PI / 2,
    tex: roofTex(b, 'roof'),
  });
  b.box(w * 0.97, w * 0.1, w * 0.2, roofTint, { y: w * 0.72, ry: Math.PI / 2, tex: roofTex(b, 'roof') });
  // door
  b.box(0.3, w * 0.34, 0.05, b.pal.darkWood, { y: w * 0.17, z: w * 0.36 });
  b.cyl(0.02, 0.02, w * 0.4, 6, b.pal.darkWood, { y: w * 0.7, x: -w * 0.28 });
  // loading ramp
  b.box(w * 0.5, 0.06, 0.2, b.pal.darkWood, { y: 0.03, z: w * 0.38 });
}

function buildFarm(b: Builder): void {
  if (b.isAndean) {
    buildAndeanFarm(b);
    return;
  }
  const w = 3.0;
  b.box(w * 0.7, 0.1, w * 0.7, '#e9e0cd', { y: 0.05, tex: 'dirt' });
  // furrows
  for (let i = -1; i <= 1; i++) {
    b.box(0.1, 0.04, w * 0.62, mixHex(b.pal.wood, '#4a6a2a', 0.5), { z: i * 0.35, y: 0.09 });
  }
  for (let i = -1; i <= 1; i++) {
    b.box(w * 0.62, 0.04, 0.1, mixHex(b.pal.wood, '#4a6a2a', 0.5), { x: i * 0.35, y: 0.09 });
  }
  // shoots
  b.cyl(0.04, 0.05, 0.24, 6, mixHex('#3a6a2a', b.pal.primary, 0.3), { x: -0.4, y: 0.18, z: 0.3 });
  b.cyl(0.04, 0.05, 0.24, 6, mixHex('#3a6a2a', b.pal.primary, 0.3), { x: 0.4, y: 0.18, z: -0.3 });
  b.cyl(0.04, 0.05, 0.24, 6, mixHex('#4a8a2a', b.pal.primary, 0.2), { x: 0.1, y: 0.2, z: 0.2 });
  b.cyl(0.04, 0.05, 0.24, 6, mixHex('#4a8a2a', b.pal.primary, 0.2), { x: -0.2, y: 0.2, z: -0.2 });
  // fencing
  const fence = '#8a6a42';
  for (const [fx, fz] of [
    [-w * 0.36, 0],
    [w * 0.36, 0],
    [0, -w * 0.36],
    [0, w * 0.36],
  ] as const) {
    b.box(0.08, 0.34, 0.08, fence, { x: fx, y: 0.16, z: fz });
    b.box(0.7, 0.05, 0.06, fence, { x: fx, y: 0.2, z: fz });
  }
}

/** "Huaca Sagrada": a monumental stepped Andean platform (victory monument). */
function buildWonder(b: Builder): void {
  const stone = mixHex(b.pal.primary, '#b8ac96', 0.72);
  const head = mixHex(b.pal.primary, '#4a4238', 0.55);
  const w = 7;
  const tierH = 0.62;
  groundPad(b, w);
  const baseY = tieredPlatform(b, w, 5, tierH, stone, andeanTex(b));
  // top shrine
  b.box(w * 0.32, 0.8, w * 0.32, stone, { y: baseY + 0.4, tex: andeanTex(b) });
  b.box(w * 0.2, 0.45, w * 0.2, b.civAccent, { y: baseY + 1.0, tex: andeanTex(b) });
  // tenon heads protruding from the front faces of the lower tiers
  for (let i = 0; i < 3; i++) {
    tenonHeadRow(b, head, tierH * i + tierH / 2, tierSize(w, i) / 2 + 0.1, w * 0.15);
  }
}

// ---------------------------------------------------------------------------
// Landmarks (visual only). Historically grounded abstractions; sources in
// `LANDMARKS` (`src/model/defs/landmarks.ts`).
// ---------------------------------------------------------------------------

/** Width of tier `i` of a stepped platform (shared by `tieredPlatform` and its ornaments). */
function tierSize(w: number, i: number): number {
  return w * (1.2 - i * 0.16);
}

/** A row of five tenon heads (cabezas clavas) along a front face. */
function tenonHeadRow(b: Builder, color: string, y: number, z: number, spacing: number): void {
  for (let i = -2; i <= 2; i++) b.box(0.34, 0.34, 0.5, color, { x: i * spacing, y, z, tex: andeanTex(b) });
}

/** Stepped platform shared by the monumental landmarks; returns the top height. */
function tieredPlatform(b: Builder, w: number, tiers: number, tierH: number, color: string, tex: TexKind): number {
  for (let i = 0; i < tiers; i++) {
    const t = tierSize(w, i);
    b.box(t, tierH, t, color, { y: tierH / 2 + i * tierH, tex });
  }
  return tiers * tierH;
}

/** Four walls forming a rectangular enclosure (open corners are hidden by the walls). */
function enclosure(
  b: Builder,
  w: number,
  h: number,
  thickness: number,
  color: string,
  tex: TexKind,
  cx = 0,
  cz = 0,
  y = 0,
): void {
  b.box(w, h, thickness, color, { x: cx, y: y + h / 2, z: cz + w / 2, tex });
  b.box(w, h, thickness, color, { x: cx, y: y + h / 2, z: cz - w / 2, tex });
  b.box(thickness, h, w, color, { x: cx + w / 2, y: y + h / 2, z: cz, tex });
  b.box(thickness, h, w, color, { x: cx - w / 2, y: y + h / 2, z: cz, tex });
}

/** Sunken circular plaza: outer ring, darker floor and upright stones. */
function ringPlaza(
  b: Builder,
  cx: number,
  r: number,
  stone: string,
  floor: string,
  blocks: number,
  cz = 0,
  y = 0,
): void {
  b.cyl(r, r, 0.3, 28, stone, { x: cx, y: y + 0.15, z: cz, tex: andeanTex(b), flatShading: true });
  b.cyl(r * 0.82, r * 0.82, 0.34, 28, floor, { x: cx, y: y + 0.17, z: cz, flatShading: true });
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * Math.PI * 2;
    b.box(0.4, 0.55, 0.4, stone, {
      x: cx + Math.cos(a) * r,
      y: y + 0.42,
      z: cz + Math.sin(a) * r,
      tex: andeanTex(b),
    });
  }
}

/** Painted frieze band shared by the adobe huacas (with optional modelled notches). */
function huacaFrieze(b: Builder, w: number, y: number, notches: boolean): void {
  b.box(w * 1.0, 0.34, 0.08, b.civAccent, { y, z: w * 0.62 });
  if (notches) {
    for (let i = -2; i <= 2; i++) {
      b.box(0.32, 0.3, 0.06, b.civSecondary, { x: i * w * 0.18, y, z: w * 0.63 });
    }
  }
}

/** Access ramp shared by the adobe huacas/citadels. */
function adobeRamp(b: Builder, w: number): void {
  const adobe = andeanWall(b);
  for (let i = 0; i < 4; i++) {
    b.box(1.0, 0.12, w * 0.3, adobe, { y: 0.06 + i * 0.12, z: w * 0.36 + i * 0.2, tex: 'brick' });
  }
}

/**
 * Caral's sunken circular plaza: a stone ring with a gap and entry steps toward
 * the platform, two inner terraces, a central altar and upright stones.
 * Abstraction of the circular plazas documented in the Caral dossier.
 */
function caralSunkenPlaza(b: Builder, cz: number, r: number, stone: string, floor: string, earth: string): void {
  b.cyl(r + 0.9, r + 1.05, 0.2, 28, earth, { y: 0.1, z: cz, tex: 'dirt', flatShading: true });
  const segments = 24;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    // leave an opening on the platform side (-Z) for the entry steps
    if (Math.abs(Math.sin(a) + 1) < 0.34) continue;
    b.box((2 * Math.PI * r) / segments + 0.08, 0.56, 0.34, stone, {
      x: Math.cos(a) * (r + 0.08),
      y: 0.48,
      z: cz + Math.sin(a) * (r + 0.08),
      ry: -a - Math.PI / 2,
      tex: 'fieldstone',
    });
  }
  b.cyl(r * 0.9, r * 0.9, 0.12, 28, floor, { y: 0.24, z: cz, flatShading: true });
  b.torus(r * 0.62, 0.11, Math.PI * 2, mixHex(stone, '#d8ccb0', 0.45), { y: 0.4, z: cz, rx: Math.PI / 2 });
  b.cyl(0.5, 0.58, 0.38, 12, mixHex(stone, '#d8ccb0', 0.35), { y: 0.5, z: cz, tex: 'fieldstone' });
  b.cyl(0.22, 0.3, 0.14, 10, mixHex(stone, '#2a241c', 0.55), { y: 0.75, z: cz });
  for (let i = 0; i < 3; i++) {
    b.box(1.5, 0.14, 0.5, floor, { y: 0.18 + i * 0.16, z: cz - r - 0.5 + i * 0.42 });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.16;
    b.box(0.3, 0.78, 0.3, stone, {
      x: Math.cos(a) * (r + 1.05),
      y: 0.39,
      z: cz + Math.sin(a) * (r + 1.05),
      tex: 'fieldstone',
    });
    b.box(0.38, 0.08, 0.38, mixHex(stone, '#6a5f4c', 0.45), {
      x: Math.cos(a) * (r + 1.05),
      y: 0.82,
      z: cz + Math.sin(a) * (r + 1.05),
    });
  }
}

/**
 * Caral: a broad stepped platform with a central stair and summit temple, in
 * front of a sunken circular plaza. Stone retaining faces, plastered upper
 * bands and thatch follow `docs/historia/arquitectura.md`; the plaza is an
 * abstraction of the documented sunken circular plazas.
 */
function buildCaralLandmark(b: Builder): void {
  const plaster = mixHex(b.pal.primary, '#dcc8a0', 0.76);
  const earth = mixHex(b.pal.primary, '#c8b088', 0.68);
  const stone = mixHex(b.pal.primary, '#b0a48c', 0.72);
  const dark = mixHex(b.pal.primary, '#4a3a28', 0.6);
  const w = 7;
  const tiers = 5;
  const tierH = 0.5;
  const padY = 0.18;

  b.cyl(w * 0.58, w * 0.63, padY, 24, earth, { y: padY / 2, tex: 'dirt', flatShading: true });
  for (let i = 0; i < tiers; i++) {
    const t = tierSize(w, i);
    const y = padY + tierH / 2 + i * tierH;
    b.box(t, tierH, t, plaster, { y, tex: 'adobe' });
    if (i > 0) b.box(t * 1.012, 0.12, t * 1.012, stone, { y: y - tierH / 2 + 0.06, tex: 'fieldstone' });
  }
  const baseY = padY + tiers * tierH;

  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    b.box(w * 0.3, tierH * 0.86, w * 0.16, plaster, {
      y: padY + ((i + 0.5) * (tiers * tierH)) / steps,
      z: w * 0.63 - t * w * 0.22,
      tex: 'adobe',
    });
  }
  for (const sx of [-1, 1]) {
    b.box(0.2, tiers * tierH * 1.06, w * 0.26, stone, {
      x: sx * w * 0.16,
      y: padY + tiers * tierH * 0.54,
      z: w * 0.51,
      tex: 'fieldstone',
    });
  }

  const shrine = w * 0.44;
  b.box(shrine, 1.0, shrine, plaster, { y: baseY + 0.5, tex: 'adobe' });
  b.box(shrine * 0.22, 0.56, 0.06, dark, { y: baseY + 0.3, z: shrine * 0.5 + 0.03 });
  for (const sx of [-1, 1]) {
    b.box(shrine * 0.15, 0.22, 0.06, dark, { x: sx * shrine * 0.27, y: baseY + 0.62, z: shrine * 0.5 + 0.03 });
  }
  const cornice = mixHex(plaster, '#ffffff', 0.25);
  for (const sz of [1, -1])
    b.box(shrine * 1.03, 0.1, 0.05, cornice, { y: baseY + 0.97, z: sz * shrine * 0.5, tex: 'adobe' });
  for (const sx of [1, -1])
    b.box(0.05, 0.1, shrine * 1.03, cornice, { x: sx * shrine * 0.5, y: baseY + 0.97, tex: 'adobe' });
  andeanThatchRoof(b, shrine * 0.78, baseY + 1.02);

  // low parapet around the summit, open toward the stair
  const top = tierSize(w, tiers - 1);
  b.box(top * 1.0, 0.26, 0.18, stone, { y: baseY + 0.13, z: -(top / 2 - 0.09), tex: 'fieldstone' });
  for (const sx of [1, -1]) {
    b.box(0.18, 0.26, top * 0.86, stone, { x: sx * (top / 2 - 0.09), y: baseY + 0.13, tex: 'fieldstone' });
  }

  caralSunkenPlaza(b, w * 1.1, w * 0.48, stone, mixHex(stone, '#d8c8a0', 0.55), earth);
}

/** Moche: a tall stepped adobe huaca with a painted frieze and a ramp. */
function buildMocheLandmark(b: Builder): void {
  const adobe = andeanWall(b);
  const w = 6.5;
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = w * (1.26 - i * 0.15);
    b.box(t, 0.62, t, mixHex(adobe, '#ffffff', i * 0.04), { y: 0.31 + i * 0.62, tex: 'brick' });
  }
  const baseY = tiers * 0.62;
  b.box(w * 0.5, 0.72, w * 0.5, adobe, { y: baseY + 0.36, tex: 'brick' });
  huacaFrieze(b, w, baseY * 0.5, true);
  // access ramp
  for (let i = 0; i < 5; i++) {
    b.box(1.0, 0.14, w * 0.5, adobe, { y: 0.07 + i * 0.13, z: w * 0.68 + i * 0.26, tex: 'brick' });
  }
}

/** Inca: a cut-stone ushnu platform with a central seat and a stairway. */
function buildIncaLandmark(b: Builder): void {
  const stone = andeanStone(b);
  const w = 6;
  const baseY = tieredPlatform(b, w, 3, 0.52, stone, andeanTex(b));
  b.box(0.9, 1.4, 0.9, stone, { y: baseY + 0.7, tex: andeanTex(b) });
  b.box(1.3, 0.3, 1.3, mixHex(b.pal.primary, '#c8a040', 0.55), { y: baseY + 1.5, tex: andeanTex(b) });
  for (let i = 0; i < 4; i++) {
    b.box(1.5, 0.15, 0.44, stone, { y: 0.08 + i * 0.15, z: w * 0.52 + i * 0.24, tex: andeanTex(b) });
  }
}

/** Chavín: a stepped stone temple with tenon heads beside a sunken plaza. */
/** Chavín: U-shaped stone temple, sunken circular plaza, tenon heads and the Lanzón gallery. */
function buildChavinTemple(b: Builder): void {
  const darkStone = mixHex(b.pal.primary, '#8a8378', 0.78);
  const lightStone = mixHex(b.pal.primary, '#e0d8c8', 0.9);
  const granite = mixHex(b.pal.primary, '#f0ece2', 0.94);
  const shadow = mixHex(b.pal.primary, '#3a342e', 0.6);
  const tex: TexKind = 'stone';
  const w = 7.5;
  const tierH = 0.55;
  const baseY = tieredPlatform(b, w, 3, tierH, darkStone, tex);

  // U-shaped sanctuary: tall rear block plus two forward wings around an open court.
  const rearZ = -w * 0.34;
  const wingZ = w * 0.08;
  b.box(w * 0.92, 2.3, w * 0.3, darkStone, { y: baseY + 1.15, z: rearZ, tex });
  for (const sx of [-1, 1]) {
    b.box(w * 0.22, 1.7, w * 0.74, darkStone, { x: sx * w * 0.35, y: baseY + 0.85, z: wingZ, tex });
  }

  // Central stair from the plaza to the court.
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    b.box(w * 0.26, tierH * 0.82, w * 0.2, lightStone, {
      y: ((i + 0.5) * baseY) / steps,
      z: w * 0.5 - t * w * 0.22,
      tex,
    });
  }

  // Lanzón gallery embedded in the rear block: a dark doorway, granite lintel
  // and a taller carved monolith visible from the court.
  const doorW = w * 0.2;
  const doorH = 1.7;
  b.box(doorW, doorH, 0.12, shadow, { y: baseY + doorH / 2 + 0.1, z: rearZ + w * 0.151, tex });
  b.box(doorW * 1.3, 0.16, 0.22, granite, { y: baseY + doorH + 0.18, z: rearZ + w * 0.151, tex });
  b.box(doorW * 0.62, 1.5, 0.16, shadow, { y: baseY + 0.8, z: rearZ + w * 0.18, tex });
  for (const sx of [-1, 1]) {
    b.box(0.07, 0.07, 0.03, granite, { x: sx * 0.1, y: baseY + 1.25, z: rearZ + w * 0.19 });
  }
  b.box(0.2, 0.05, 0.03, granite, { y: baseY + 1.05, z: rearZ + w * 0.19 });

  // The Lanzón stands in the court: a taller carved monolith under a granite lintel.
  const monolithZ = rearZ + w * 0.15 + 0.75;
  b.box(0.7, 2.0, 0.32, shadow, { y: baseY + 1.0, z: monolithZ, tex });
  b.box(0.9, 0.16, 0.52, granite, { y: baseY + 2.05, z: monolithZ, tex });
  for (const sx of [-1, 1]) {
    b.box(0.1, 0.1, 0.03, granite, { x: sx * 0.15, y: baseY + 1.35, z: monolithZ + 0.18 });
  }
  b.box(0.24, 0.06, 0.03, granite, { y: baseY + 1.12, z: monolithZ + 0.18 });
  for (const sx of [-1, 1]) {
    b.box(0.06, 0.2, 0.03, granite, { x: sx * 0.08, y: baseY + 1.0, z: monolithZ + 0.18 });
  }

  // Cabezas clavas (tenon heads) protruding from the facade and the wings.
  for (const y of [baseY + 0.65, baseY + 1.45]) {
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) <= 1) continue;
      b.box(0.55, 0.55, 0.85, granite, { x: i * w * 0.13, y, z: rearZ + w * 0.15 + 0.45, tex });
    }
  }
  for (const sx of [-1, 1]) {
    for (const zz of [wingZ - w * 0.16, wingZ + w * 0.16]) {
      b.box(0.62, 0.62, 0.58, granite, { x: sx * (w * 0.35 + 0.34), y: baseY + 1.0, z: zz, tex });
    }
  }

  // Sunken circular plaza with upright stones and a stone drainage channel.
  const plazaZ = w * 1.08;
  ringPlaza(b, 0, w * 0.52, lightStone, mixHex(darkStone, '#2a2622', 0.55), 12, plazaZ);
  b.box(w * 0.06, 0.03, w * 0.95, shadow, { y: 0.355, z: plazaZ, tex });
  b.box(w * 0.95, 0.03, w * 0.06, shadow, { y: 0.355, z: plazaZ, tex });

  // Two larger heads flank the stair at ground level.
  for (const sx of [-1, 1]) {
    b.box(0.5, 0.5, 0.7, lightStone, { x: sx * w * 0.28, y: 0.5, z: w * 0.55, tex });
  }
}

/** Wari: a walled urban compound with a gated front and a central platform. */
function buildWariCompound(b: Builder): void {
  const wall = andeanWall(b);
  const stone = andeanStone(b);
  const w = 8;
  const h = 1.1;
  enclosure(b, w, h, 0.4, wall, andeanTex(b));
  b.box(0.5, h * 1.25, 0.5, stone, { x: -0.9, y: h * 0.62, z: w / 2, tex: andeanTex(b) });
  b.box(0.5, h * 1.25, 0.5, stone, { x: 0.9, y: h * 0.62, z: w / 2, tex: andeanTex(b) });
  b.box(1.6, 0.5, w * 0.4, stone, { y: h + 0.25, z: 0, tex: andeanTex(b) });
  b.box(w * 0.28, 0.8, w * 0.28, wall, { y: h + 0.9, tex: andeanTex(b) });
}

/** Tiahuanaco: a megalithic platform with a monolith doorway and a sunken patio. */
function buildTiahuanacoComplex(b: Builder): void {
  const stone = mixHex(b.pal.primary, '#c2baae', 0.82);
  const w = 7;
  const baseY = tieredPlatform(b, w, 3, 0.6, stone, andeanTex(b));
  b.box(0.5, 1.6, 0.4, stone, { x: -0.6, y: baseY + 0.8, tex: andeanTex(b) });
  b.box(0.5, 1.6, 0.4, stone, { x: 0.6, y: baseY + 0.8, tex: andeanTex(b) });
  b.box(1.8, 0.4, 0.5, stone, { y: baseY + 1.8, tex: andeanTex(b) });
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    b.box(w * 0.24, w * 0.4, w * 0.24, stone, { x: sx * w * 0.5, y: baseY * 0.4, z: sz * w * 0.5, tex: andeanTex(b) });
  }
  ringPlaza(b, w * 1.5, w * 0.62, stone, mixHex(b.pal.primary, '#8a8478', 0.6), 0);
}

/** Chimú: a large adobe walled enclosure with a painted frieze and inner platform. */
function buildChimuCompound(b: Builder): void {
  const adobe = andeanWall(b);
  const w = 8.5;
  const h = 1.6;
  enclosure(b, w, h, 0.5, adobe, andeanTex(b));
  b.box(w * 0.9, 0.3, 0.1, b.civAccent, { y: h * 0.72, z: w / 2 + 0.05 });
  for (let i = 0; i < 3; i++) {
    const t = w * (0.5 - i * 0.1);
    b.box(t, 0.4, t, adobe, { y: 0.2 + i * 0.4, tex: 'brick' });
  }
  adobeRamp(b, w);
}

/** Colonial: a church with a tile roof, an arched door and a bell tower. */
function buildColonialChurch(b: Builder): void {
  const wall = mixHex(b.pal.brick, '#ffffff', 0.5);
  const roof = mixHex(b.pal.roof, '#ffffff', 0.5);
  const tex = facadeTex(b, 'brick');
  const w = 5;
  b.box(w * 0.8, w * 0.7, w * 1.5, wall, { y: w * 0.35, tex });
  b.box(w * 0.9, w * 0.14, w * 0.85, roof, { y: w * 0.78, z: w * 0.42, rx: 0.6, tex: 'roof' });
  b.box(w * 0.9, w * 0.14, w * 0.85, roof, { y: w * 0.78, z: -w * 0.42, rx: -0.6, tex: 'roof' });
  b.box(w * 0.36, w * 1.4, w * 0.36, wall, { x: -w * 0.5, y: w * 0.7, z: -w * 0.6, tex });
  b.box(w * 0.42, 0.16, w * 0.42, roof, { x: -w * 0.5, y: w * 1.45, z: -w * 0.6, tex: 'roof' });
  b.box(0.06, 0.4, 0.06, '#c8a040', { x: -w * 0.5, y: w * 1.7, z: -w * 0.6 });
  b.box(0.06, 0.06, 0.4, '#c8a040', { x: -w * 0.5, y: w * 1.62, z: -w * 0.6 });
  b.cyl(w * 0.18, w * 0.18, 0.12, 14, mixHex(b.pal.primary, '#2a2318', 0.5), {
    x: 0,
    y: w * 0.45,
    z: w * 0.75,
    rx: Math.PI / 2,
  });
}

/** Republican: a port fort with battlements, a corner bastion and a flag. */
function buildRepublicanFort(b: Builder): void {
  // the republican landmark always resolves the republican (concrete) look
  const { wall, tex } = concreteWall(b);
  const w = 7;
  const h = 1.6;
  enclosure(b, w, h, 0.6, wall, tex);
  for (let i = -2; i <= 2; i++) {
    b.box(0.32, 0.34, 0.32, wall, { x: i * w * 0.18, y: h + 0.17, z: w / 2, tex });
    b.box(0.32, 0.34, 0.32, wall, { x: i * w * 0.18, y: h + 0.17, z: -w / 2, tex });
  }
  b.cyl(w * 0.16, w * 0.2, 1.9, 12, wall, { x: w / 2, y: 0.95, z: w / 2, tex });
  b.cyl(0.04, 0.04, 1.4, 6, b.pal.darkWood, { y: w * 0.5, x: -w / 2, z: -w / 2 });
  b.box(0.6, 0.3, 0.05, b.civPrimary, { y: w * 0.5 + 0.5, x: -w / 2 + 0.3, z: -w / 2 });
}

/** Cupisnique: an early north-coast adobe huaca with modelled friezes. */
function buildCupisniqueHuaca(b: Builder): void {
  const adobe = andeanWall(b);
  const w = 6;
  const baseY = tieredPlatform(b, w, 3, 0.55, adobe, andeanTex(b));
  b.box(w * 0.5, 0.7, w * 0.5, adobe, { y: baseY + 0.35, tex: 'brick' });
  huacaFrieze(b, w, baseY * 0.5, true);
}

/** Paracas: a low funerary enclosure with wrapped bundles. */
function buildParacasNecropolis(b: Builder): void {
  const stone = mixHex(b.pal.primary, '#b8a888', 0.7);
  const w = 6;
  enclosure(b, w, 0.8, 0.35, stone, andeanTex(b));
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.7;
    b.cyl(0.28, 0.34, 1.0, 10, i % 2 ? b.civSecondary : b.civAccent, { x, y: 0.9, tex: 'cloth' });
    b.sphere(0.3, stone, { x, y: 1.45 });
  }
  ringPlaza(b, w * 1.3, w * 0.5, stone, mixHex(b.pal.primary, '#8a7a5a', 0.5), 0);
}

/** Nazca: a ground geoglyph — a stone-strip spiral beside a straight line. */
function buildNazcaGeoglyph(b: Builder): void {
  const dark = mixHex(b.pal.primary, '#5a4a3a', 0.5);
  for (let i = 0; i < 30; i++) {
    const a = i * 0.55;
    const r = 0.5 + i * 0.18;
    b.box(0.55, 0.12, 0.55, dark, {
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      y: 0.06,
      rx: a,
      tex: andeanTex(b),
      flatShading: true,
    });
  }
  for (let i = 0; i < 10; i++) {
    b.box(0.5, 0.12, 5, dark, { x: -8, z: -2.5 + i * 0.55, y: 0.06, tex: andeanTex(b) });
  }
}

/** Chincha: an adobe ceremonial complex (La Centinela). */
function buildChinchaComplex(b: Builder): void {
  const adobe = andeanWall(b);
  const w = 7;
  const baseY = tieredPlatform(b, w, 3, 0.6, adobe, andeanTex(b));
  b.box(w * 0.5, 0.8, w * 0.5, adobe, { y: baseY + 0.4, tex: 'brick' });
  huacaFrieze(b, w, baseY * 0.5, false);
  adobeRamp(b, w);
}

/** Chanca: a hilltop stone fortress (pucará) with corner towers. */
function buildChancaFortress(b: Builder): void {
  const wall = andeanWall(b);
  const stone = andeanStone(b);
  const w = 7;
  enclosure(b, w, 1.4, 0.5, wall, andeanTex(b));
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    b.cyl(0.5, 0.6, 2.0, 8, stone, { x: (sx * w) / 2, y: 1.0, z: (sz * w) / 2, tex: andeanTex(b) });
  }
  b.box(1.6, 1.8, 0.4, stone, { y: 0.9, z: w / 2, tex: andeanTex(b) });
}

/** Collas/Lupaca: a cluster of funerary towers (chullpas). */
function buildCollasChullpa(b: Builder): void {
  const stone = mixHex(b.pal.primary, '#b4aca0', 0.78);
  const dark = mixHex(b.pal.primary, '#2a2318', 0.5);
  const w = 2.2;
  for (const [x, z] of [
    [-3, 0],
    [0, 0],
    [3, 0],
    [-1.5, 3],
    [1.5, 3],
  ] as const) {
    b.cyl(w * 0.5, w * 0.62, w * 1.7, 8, stone, { x, y: w * 0.85, z, tex: andeanTex(b) });
    b.cyl(w * 0.5, w * 0.5, 0.2, 8, mixHex(b.pal.primary, '#8a8478', 0.6), { x, y: w * 1.7 + 0.1, z });
    b.box(0.5, 0.7, 0.1, dark, { x, y: w * 1.0, z: z + w * 0.6 });
  }
}

/** Huanca: a modest valley settlement centre (Hatun Xauxa-like). */
function buildHuancaCenter(b: Builder): void {
  const wall = andeanWall(b);
  const house = mixHex(b.pal.primary, '#c8a878', 0.7);
  const thatch = mixHex('#c9a94e', b.pal.primary, 0.22);
  const w = 8;
  enclosure(b, w, 0.9, 0.4, wall, andeanTex(b));
  for (const [x, z] of [
    [-2, -1],
    [2, -1],
    [0, 2],
  ] as const) {
    b.box(1.6, 1.0, 1.6, house, { x, y: 0.5, z, tex: 'brick' });
    b.box(1.9, 0.3, 1.9, thatch, { x, y: 1.15, z });
  }
}

/** Patriotas: a campaign encampment with tents and a flag. */
function buildPatriotasCamp(b: Builder): void {
  const w = 6;
  enclosure(b, w, 1.0, 0.4, mixHex(b.pal.primary, '#8a7a5a', 0.6), 'wood');
  for (const [x, z] of [
    [-1.5, -1.5],
    [1.5, -1.5],
    [0, 1.5],
  ] as const) {
    b.cone(1.0, 1.2, 6, '#d8cdb8', { x, y: 0.6, z });
  }
  b.cyl(0.04, 0.04, 1.6, 6, b.pal.darkWood, { y: 2.0, x: -w / 2 });
  b.box(0.7, 0.35, 0.05, b.civPrimary, { y: 2.5, x: -w / 2 + 0.35 });
}

/** Recuay: a walled highland centre with carved stone stelae (Pashash-like). */
function buildRecuayPashash(b: Builder): void {
  const stone = andeanStone(b);
  const wall = andeanWall(b);
  const w = 7;
  enclosure(b, w, 1.0, 0.45, wall, andeanTex(b));
  const baseY = tieredPlatform(b, w * 0.5, 2, 0.6, stone, andeanTex(b));
  for (const [x, z] of [
    [-1.3, -1.3],
    [1.3, -1.3],
    [-1.3, 1.3],
    [1.3, 1.3],
  ] as const) {
    b.box(0.45, 1.4, 0.3, stone, { x, y: 0.7, z, tex: andeanTex(b) });
  }
  b.cyl(0.42, 0.52, 1.8, 10, stone, { y: baseY + 0.9, tex: andeanTex(b) });
  b.sphere(0.3, mixHex(b.civAccent, '#8a7a5a', 0.4), { y: baseY + 1.85 });
}

/** Chile: a naval station (dry dock) with a moored ironclad. */
function buildChileApostadero(b: Builder): void {
  const { wall, tex } = concreteWall(b);
  const hull = mixHex(b.civPrimary, '#3a3a3a', 0.4);
  const steel = mixHex(b.civPrimary, '#20242a', 0.45);
  const w = 7;
  // quay walls of the naval station
  enclosure(b, w, 1.1, 0.55, wall, tex);
  // dry-dock basin
  b.box(w * 0.62, 0.18, w * 0.74, mixHex(b.pal.concrete, '#2a3a4a', 0.5), { y: 0.09, tex });
  // ironclad hull moored in the dock, with a raised bow
  b.box(w * 0.36, 0.7, w * 0.72, hull, { y: 0.53, tex: 'metal' });
  b.box(w * 0.3, 0.45, w * 0.14, hull, { y: 0.5, z: w * 0.4, tex: 'metal' });
  // rotating turret with a gun barrel
  b.cyl(0.72, 0.78, 0.5, 12, steel, { y: 1.05, z: -w * 0.1, tex: 'metal' });
  b.box(0.14, 0.14, 1.5, b.pal.darkMetal, { y: 1.12, z: -w * 0.1 + 0.7 });
  // funnels
  for (const zFrac of [-0.1, 0.35]) {
    b.cyl(0.22, 0.26, 1.1, 8, steel, { y: 1.35, z: w * zFrac, tex: 'metal' });
  }
  // mast with the national flag
  b.cyl(0.04, 0.04, 1.8, 6, b.pal.darkWood, { y: 1.7, x: -w * 0.16, z: -w * 0.28 });
  b.box(0.7, 0.35, 0.05, b.civAccent, { y: 2.35, x: -w * 0.16 + 0.35, z: -w * 0.28 });
}

function buildLandmarkStructure(type: LandmarkId, ctx: BuildContext): THREE.Group {
  const b = new Builder(ctx);
  switch (type) {
    case 'caral_ceremonial':
      buildCaralLandmark(b);
      break;
    case 'chavin_temple':
      buildChavinTemple(b);
      break;
    case 'cupisnique_huaca':
      buildCupisniqueHuaca(b);
      break;
    case 'paracas_necropolis':
      buildParacasNecropolis(b);
      break;
    case 'moche_huaca':
      buildMocheLandmark(b);
      break;
    case 'nazca_geoglyph':
      buildNazcaGeoglyph(b);
      break;
    case 'wari_compound':
      buildWariCompound(b);
      break;
    case 'tiahuanaco_complex':
      buildTiahuanacoComplex(b);
      break;
    case 'chimu_compound':
      buildChimuCompound(b);
      break;
    case 'chincha_complex':
      buildChinchaComplex(b);
      break;
    case 'chanca_fortress':
      buildChancaFortress(b);
      break;
    case 'collas_chullpa':
      buildCollasChullpa(b);
      break;
    case 'huanca_center':
      buildHuancaCenter(b);
      break;
    case 'recuay_pashash':
      buildRecuayPashash(b);
      break;
    case 'inca_ushnu':
      buildIncaLandmark(b);
      break;
    case 'colonial_church':
      buildColonialChurch(b);
      break;
    case 'patriotas_camp':
      buildPatriotasCamp(b);
      break;
    case 'republican_fort':
      buildRepublicanFort(b);
      break;
    case 'chile_apostadero':
      buildChileApostadero(b);
      break;
    default: {
      const exhaustive: never = type;
      throw new Error(`unknown landmark: ${String(exhaustive)}`);
    }
  }
  return b.finish();
}

// ---------------------------------------------------------------------------

/** Built model templates by signature (geometry is shared; materials are per instance). */
const modelCache = new Map<string, THREE.Group>();
const landmarkCache = new Map<string, THREE.Group>();

/** Clone a template; the instance owns its materials (geometry stays shared). */
function instantiateTemplate(template: THREE.Group): THREE.Group {
  const inst = template.clone();
  inst.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => m.clone());
    else if (mesh.material) mesh.material = mesh.material.clone();
  });
  return inst;
}

/** Build a parametric model. Returns a clone that owns its materials (geometry is shared). */
export function buildModel(spec: ModelSpec, ctx: BuildContext): THREE.Group {
  const key = `${spec.type}|${spec.scale ?? 1}|${spec.barrel ?? ''}|${ctx.era}|${ctx.civ.id}`;
  let template = modelCache.get(key);
  if (!template) {
    template = buildModelTemplate(spec, ctx);
    modelCache.set(key, template);
  }
  return instantiateTemplate(template);
}

/** Build a landmark model (visual only). Cached by landmark/civ/era like `buildModel`. */
export function buildLandmarkModel(id: LandmarkId, ctx: BuildContext): THREE.Group {
  const key = `${id}|${ctx.era}|${ctx.civ.id}`;
  let template = landmarkCache.get(key);
  if (!template) {
    template = buildLandmarkStructure(id, ctx);
    bakeVertexAO(template);
    mergeStaticParts(template);
    landmarkCache.set(key, template);
  }
  return instantiateTemplate(template);
}

function buildModelTemplate(spec: ModelSpec, ctx: BuildContext): THREE.Group {
  const { type, scale } = spec;
  let g: THREE.Group;
  if (type.startsWith('worker')) g = buildWorker(ctx);
  else if (type.startsWith('soldier')) g = buildInfantry(type, ctx);
  else if (type === 'musketeer' || type === 'rifleman' || type === 'veteran_rifleman' || type === 'advanced_rifleman')
    g = buildRanged(type, ctx);
  else if (type === 'hussar' || type === 'cavalry') g = buildMounted(type, ctx);
  else if (type === 'motorcycle') g = buildMotorcycle(ctx);
  else if (type === 'recon_drone') g = buildDrone(ctx);
  else if (type.startsWith('tank')) g = buildTank(type, ctx);
  else if (type.startsWith('aa')) g = buildAntiAir(ctx);
  else if (type === 'cannon' || type === 'artillery' || type === 'howitzer') g = buildCannon(type, ctx);
  else if (type === 'mortar') g = buildMortar(ctx);
  else if (type.startsWith('commissar')) g = buildCommisar(ctx);
  else if (type === 'missionary') g = buildMissionary(ctx);
  else g = buildStructure(type, ctx);

  if (scale) g.scale.setScalar(scale);
  bakeVertexAO(g);
  mergeStaticParts(g);
  return g;
}

/** Bake the part colour times AO into vertex colours, memoized by source geometry + colour. */
export function aoGeometry(geo: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const key = `${geo.uuid}|${color}`;
  const owned = bakedGeoCache.get(key);
  if (owned) return owned;
  const posAttr = geo.getAttribute('position');
  const clone = geo.clone();
  if (posAttr) {
    const n = posAttr.count;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const y = posAttr.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const range = Math.max(0.001, maxY - minY);
    const base = new THREE.Color(color);
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = (posAttr.getY(i) - minY) / range;
      const ao = 0.82 + 0.18 * t;
      cols[i * 3] = base.r * ao;
      cols[i * 3 + 1] = base.g * ao;
      cols[i * 3 + 2] = base.b * ao;
    }
    clone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  bakedGeoCache.set(key, clone);
  return clone;
}

function bakeVertexAO(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
    const color = (mesh.userData.color as string | undefined) ?? '#ffffff';
    mesh.geometry = aoGeometry(mesh.geometry, color);
  });
}

/** Merge each container's static parts by material, keeping pivot groups intact. */
function mergeStaticParts(container: THREE.Object3D): void {
  const byMat = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of container.children) {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material)) continue;
    // keep transparent parts separate so their draw order stays per part
    if ((mesh.material as THREE.Material).transparent) continue;
    const group = byMat.get(mesh.material);
    if (group) group.push(mesh);
    else byMat.set(mesh.material, [mesh]);
  }
  for (const [material, meshes] of byMat) {
    if (meshes.length < 2) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const mesh of meshes) {
      mesh.updateMatrix();
      let geo = mesh.geometry.clone();
      if (geo.index) {
        const flat = geo.toNonIndexed();
        geo.dispose();
        geo = flat;
      }
      ensureMergeAttrs(geo);
      geo.applyMatrix4(mesh.matrix);
      geos.push(geo);
    }
    const merged = mergeGeometries(geos, false);
    for (const geo of geos) geo.dispose();
    if (!merged) continue;
    const out = new THREE.Mesh(merged, material);
    out.castShadow = meshes[0].castShadow;
    out.receiveShadow = meshes[0].receiveShadow;
    out.name = 'part';
    for (const mesh of meshes) mesh.removeFromParent();
    container.add(out);
  }
  for (const child of [...container.children]) {
    if ((child as THREE.Group).isGroup) mergeStaticParts(child);
  }
}

/** Give a geometry the attributes the merge needs (position/normal/uv/color). */
function ensureMergeAttrs(geo: THREE.BufferGeometry): void {
  const count = geo.getAttribute('position')?.count ?? 0;
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!geo.getAttribute('color'))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
}

/**
 * Free a model instance's materials (each instance owns clones). Geometries are
 * shared per template and textures are cached, so they are freed by
 * clearModelCaches() and clearTextureCache() respectively.
 */
export function disposeModel(g: THREE.Group): void {
  g.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else if (m && 'dispose' in m) m.dispose();
  });
}

/** Free all shared geometries/materials of the model generator (textures are separate). */
export function clearModelCaches(): void {
  for (const k of Object.keys(sharedGeo)) {
    sharedGeo[k].dispose();
    delete sharedGeo[k];
  }
  // template geometries (baked AO + merged) are the only owners of those buffers
  for (const tpl of [...modelCache.values(), ...landmarkCache.values()]) {
    tpl.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
  }
  modelCache.clear();
  landmarkCache.clear();
  bakedGeoCache.clear();
  for (const m of matCache.values()) m.dispose();
  matCache.clear();
}
