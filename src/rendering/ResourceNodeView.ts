import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticByMaterial } from './mergeStatic';
import { RNG, cosmeticRandom, weightedPick } from '../util/rng';
import { MaterialTex } from './Textures';
import { applyGeneratedPbr } from './Biomes';
import { TreeInstances, type TreeVariant } from './TreeInstances';
import { HuntHerd } from './HuntHerd';
import type { ResourceNode } from '../entities/ResourceNode';
import { WATER_LEVEL, type BerryShrubId } from '../model/defs/profiles';

// Shared caches: geometries and materials reused between nodes (fewer draw calls and GC).
const geoCache = new Map<string, THREE.BufferGeometry>();
function cylGeo(rt: number, rb: number, h: number, seg: number): THREE.CylinderGeometry {
  const key = `cyl-${rt}-${rb}-${h}-${seg}`;
  let g = geoCache.get(key) as THREE.CylinderGeometry | undefined;
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg);
    geoCache.set(key, g);
  }
  return g;
}
function boxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `box-${w}-${h}-${d}`;
  let g = geoCache.get(key) as THREE.BoxGeometry | undefined;
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}
function sphereGeo(r: number, seg = 10, rings = 8): THREE.SphereGeometry {
  const key = `sph-${r}-${seg}-${rings}`;
  let g = geoCache.get(key) as THREE.SphereGeometry | undefined;
  if (!g) {
    g = new THREE.SphereGeometry(r, seg, rings);
    geoCache.set(key, g);
  }
  return g;
}
function cardGeo(w: number, h: number): THREE.PlaneGeometry {
  const key = `card-${w}-${h}`;
  let g = geoCache.get(key) as THREE.PlaneGeometry | undefined;
  if (!g) {
    g = new THREE.PlaneGeometry(w, h);
    geoCache.set(key, g);
  }
  return g;
}

function geoCacheHas(g: THREE.BufferGeometry): boolean {
  for (const cached of geoCache.values()) if (cached === g) return true;
  return false;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
interface TexOpts {
  color?: string;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  alphaTest?: number;
  side?: THREE.Side;
}
function mat(key: string, o: TexOpts = {}): THREE.MeshStandardMaterial {
  const cached = matCache.get(key);
  if (cached) return cached;
  const m = new THREE.MeshStandardMaterial({
    color: o.color ?? 0xffffff,
    map: o.map ?? null,
    normalMap: o.normalMap ?? null,
    roughness: o.roughness ?? 0.85,
    metalness: o.metalness ?? 0.1,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.normalMap) m.normalScale.set(0.7, 0.7);
  matCache.set(key, m);
  return m;
}

/** Free shared geometries and materials (call when destroying the match). */
export function clearResourceCaches(): void {
  geoCache.forEach((g) => g.dispose());
  geoCache.clear();
  matCache.forEach((m) => m.dispose());
  matCache.clear();
}

type TreeVariants = Partial<Record<TreeVariant, number>>;
const TREE_VARIANTS: TreeVariant[] = ['broad', 'needle', 'frond', 'algarrobo', 'molle', 'sauce', 'pacay'];
function variantForMap(mapType: string): TreeVariant {
  if (mapType === 'altiplano') return 'needle';
  if (mapType === 'jungle') return 'frond';
  if (mapType === 'coast') return 'algarrobo';
  return 'broad';
}

/** Visual tree/mine/quarry/hunt/fishing model for a resource node. */
export class ResourceNodeView {
  readonly view = new THREE.Group();
  private readonly swaySeed = cosmeticRandom() * Math.PI * 2;
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  private readonly swayParts: THREE.Object3D[] = [];
  private readonly mapType: string;
  private readonly treeMgr?: TreeInstances;
  private readonly treeVariants?: TreeVariants;
  private readonly berryShrub?: BerryShrubId;
  private treeVariant: TreeVariant = 'broad';
  /** The drought killed this tree standing: bare wood, no canopy, kit instance hidden. */
  private dry = false;
  private huntHerd: HuntHerd | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly node: ResourceNode,
    mapType = 'andes',
    treeMgr?: TreeInstances,
    treeVariants?: TreeVariants,
    berryShrub?: BerryShrubId,
  ) {
    this.mapType = mapType;
    this.treeMgr = treeMgr;
    this.treeVariants = treeVariants;
    this.berryShrub = berryShrub;
    this.buildModel();
  }

  private buildModel(): void {
    const rng = new RNG(Math.floor(this.node.pos.x * 7 + this.node.pos.z * 13));
    switch (this.node.kind) {
      case 'tree':
        this.buildTree(rng);
        break;
      case 'mine':
        this.buildMine(rng);
        break;
      case 'well':
        this.buildQuarry(rng);
        break;
      case 'hunt':
        this.buildHunt(rng);
        break;
      case 'fishing':
        this.buildFish(rng);
        break;
      case 'berry':
        if (this.berryShrub) this.buildFruitShrub(rng, this.berryShrub);
        else this.buildBush(rng);
        break;
    }
    this.view.traverse((o) => {
      if (o.userData.sway) this.swayParts.push(o);
    });
    this.mergeStaticParts();
    this.scene.add(this.view);
  }

  private add(mesh: THREE.Mesh, castShadow = true, receiveShadow = true): THREE.Mesh {
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    this.view.add(mesh);
    return mesh;
  }

  /** Add crossed foliage billboards (canopies with alphaTest). */
  private addFoliage(
    parent: THREE.Object3D,
    rng: RNG,
    kind: 'broad' | 'needle' | 'frond' | 'bush' | 'algarrobo' | 'molle' | 'sauce' | 'pacay',
    radius: number,
    height: number,
    tint = '#b9c49b',
  ): void {
    const tex = MaterialTex.foliage(kind);
    const leafMat = mat('leaf-' + kind + '-' + tint, {
      map: tex,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
      color: tint,
    });
    const w = radius * 2.3;
    const h = height;
    const angles = kind === 'needle' ? [0, Math.PI / 3, (2 * Math.PI) / 3] : [0, Math.PI / 3, (2 * Math.PI) / 3];
    for (let i = 0; i < angles.length; i++) {
      const card = new THREE.Mesh(cardGeo(w, h), leafMat);
      card.rotation.y = angles[i] + rng.range(-0.15, 0.15);
      card.position.y = h * 0.5;
      card.castShadow = true;
      card.receiveShadow = false;
      parent.add(card);
    }
    // tilted billboard to give volume seen from above
    const top = new THREE.Mesh(cardGeo(w * 0.9, h * 0.9), leafMat);
    top.rotation.x = -Math.PI / 2 + 0.35;
    top.position.y = h * 0.72;
    top.castShadow = true;
    top.receiveShadow = false;
    parent.add(top);
  }

  /** Pick a tree variant from the map profile's vegetation weights (seedable). */
  private pickTreeVariant(rng: RNG): TreeVariant {
    const v = this.treeVariants;
    if (!v) return variantForMap(this.mapType);
    const entries = TREE_VARIANTS.map((k) => [k, v[k] ?? 0] as [TreeVariant, number]);
    return weightedPick(rng, entries) ?? variantForMap(this.mapType);
  }

  private buildTree(rng: RNG): void {
    const variant = this.pickTreeVariant(rng);
    // With the instancing manager: only one instance is registered (no per-tree mesh).
    if (this.treeMgr) {
      this.treeVariant = variant;
      void rng;
      return;
    }
    const h = variant === 'needle' ? 4.2 + rng.range(0, 2) : 3.2 + rng.range(0, 1.6);
    const lean = rng.range(-0.06, 0.06);

    const barkMat = mat('bark', {
      map: MaterialTex.bark(),
      normalMap: MaterialTex.normal(21),
      color: '#b59a78',
      roughness: 0.95,
    });
    applyGeneratedPbr(barkMat, 'bark', { tint: '#cbb59a' });
    const trunk = new THREE.Mesh(cylGeo(0.13, 0.24, h, 8), barkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = lean;
    this.add(trunk);

    // low branches
    const branchMat = mat('bark-branch', { map: MaterialTex.bark(), color: '#9a7f5c', roughness: 0.95 });
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      const bl = rng.range(0.9, 1.5);
      const br = new THREE.Mesh(cylGeo(0.05, 0.09, bl, 6), branchMat);
      br.position.set(Math.cos(a) * 0.25, h * rng.range(0.55, 0.72), Math.sin(a) * 0.25);
      br.rotation.z = Math.cos(a) * 1.0;
      br.rotation.x = -Math.sin(a) * 1.0;
      this.add(br);
    }

    const canopy = new THREE.Group();
    canopy.position.y = h * 0.82;
    canopy.rotation.z = lean;
    this.view.add(canopy);
    const radius =
      variant === 'frond'
        ? 1.6 + rng.range(0, 0.4)
        : variant === 'needle'
          ? 1.35 + rng.range(0, 0.35)
          : 1.45 + rng.range(0, 0.55);
    const ch = variant === 'needle' ? radius * 2.1 : radius * 1.6;
    this.addFoliage(canopy, rng, variant, radius, ch);
    canopy.userData.sway = 1;
  }

  private buildMine(rng: RNG): void {
    const rockMat = mat('rock-mine', {
      map: MaterialTex.stone(),
      normalMap: MaterialTex.normal(33),
      color: '#8f8a82',
      roughness: 0.95,
    });
    applyGeneratedPbr(rockMat, 'wall_fieldstone', { tint: '#c8bfae' });
    const oreMat = mat('ore-mine', { color: '#9aa7b5', metalness: 0.9, roughness: 0.35, emissive: 0x11161c });
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = rng.range(0.45, 1.1);
      const hh = rng.range(0.4, 1.3);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.32, 0.64), 0), rockMat);
      rock.position.set(Math.cos(a) * r, hh / 2, Math.sin(a) * r);
      rock.scale.y = rng.range(0.7, 1.4);
      rock.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      this.add(rock);
    }
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(cylGeo(0.05, 0.05, rng.range(0.5, 1.1), 6), oreMat);
      m.position.set(rng.range(-0.8, 0.8), 0.3, rng.range(-0.8, 0.8));
      m.rotation.x = rng.range(-0.5, 0.5);
      this.add(m);
    }
  }

  private buildQuarry(rng: RNG): void {
    const rockMat = mat('rock-quarry', {
      map: MaterialTex.stone(),
      normalMap: MaterialTex.normal(33),
      color: '#a59c8c',
      roughness: 0.98,
    });
    applyGeneratedPbr(rockMat, 'wall_fieldstone', { tint: '#d0c4ae' });
    const blockMat = mat('quarry-block', {
      map: MaterialTex.stone(),
      normalMap: MaterialTex.normal(33),
      color: '#c8bca6',
      roughness: 0.92,
    });
    const floor = new THREE.Mesh(cylGeo(0.62, 0.74, 0.1, 12), mat('quarry-floor', { color: '#6f675a', roughness: 1 }));
    floor.position.y = 0.05;
    this.add(floor);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rng.range(-0.15, 0.15);
      const r = rng.range(0.48, 1.02);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.3, 0.58), 0), rockMat);
      rock.position.set(Math.cos(a) * r, rng.range(0.2, 0.45), Math.sin(a) * r);
      rock.scale.y = rng.range(0.65, 1.2);
      rock.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      this.add(rock);
    }
    for (let i = 0; i < 3; i++) {
      const block = new THREE.Mesh(boxGeo(0.48, 0.28, 0.34), blockMat);
      block.position.set(-0.5 + i * 0.5, 0.14 + (i % 2) * 0.12, 0.52);
      block.rotation.y = rng.range(-0.25, 0.25);
      this.add(block);
    }
  }

  private buildHunt(rng: RNG): void {
    this.huntHerd = new HuntHerd(rng.range(0, 1000));
    this.view.add(this.huntHerd.group);
  }

  private buildFish(rng: RNG): void {
    // Fishing nodes sit at y = 0 on the bed; the shoal glints just under the surface so it reads through
    // dark or murky water, and a ring of ripples marks the ground from the RTS camera. One translucent
    // material keeps each fishing ground at a single draw call.
    let shoalMat = matCache.get('fish-shoal');
    if (!shoalMat) {
      shoalMat = new THREE.MeshStandardMaterial({
        color: '#dfeae8',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        roughness: 0.6,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
      matCache.set('fish-shoal', shoalMat);
    }
    // Fishing banks are placed in the sea, which keeps `WATER_LEVEL` all year (the river is the only
    // water that follows the seasons), so the shoal and its rings stay on the surface.
    const surface = WATER_LEVEL - (this.node.pos.y ?? 0);
    for (let i = 0; i < 5; i++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), shoalMat);
      fish.rotation.x = -Math.PI / 2;
      fish.rotation.z = Math.PI / 2;
      fish.position.set(rng.range(-1.4, 1.4), surface - 0.12, rng.range(-1.4, 1.4));
      fish.rotation.y = rng.range(0, 3);
      this.add(fish, false, false);
    }
    for (const [r, w] of [
      [1.5, 0.12],
      [2.3, 0.08],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - w, r, 28), shoalMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = surface + 0.06;
      this.add(ring, false, false);
    }
  }

  private buildBush(rng: RNG): void {
    const leafMat = mat('leaf-bush', {
      map: MaterialTex.foliage('bush'),
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
      color: '#cfe0b0',
    });
    const berryMat = mat('berry', { color: '#cc3333', roughness: 0.4 });
    const canopy = new THREE.Group();
    canopy.position.y = 0.35;
    this.view.add(canopy);
    for (let i = 0; i < 2; i++) {
      const card = new THREE.Mesh(cardGeo(1.6, 1.2), leafMat);
      card.rotation.y = (i * Math.PI) / 2;
      card.castShadow = true;
      canopy.add(card);
    }
    canopy.userData.sway = 1;
    for (let k = 0; k < 8; k++) {
      const berry = new THREE.Mesh(sphereGeo(0.05, 6, 5), berryMat);
      berry.position.set(rng.range(-0.5, 0.5), 0.3 + rng.range(0, 0.4), rng.range(-0.5, 0.5));
      this.add(berry);
    }
  }

  /**
   * Documented food shrub for authored scenarios (Caral: pacae/guayaba, dossier's edible plants).
   * Multi-stemmed, low and broad, with the fruit hanging under the canopy; the generic red-berry
   * billboard read as a placeholder from the RTS camera.
   */
  private buildFruitShrub(rng: RNG, kind: BerryShrubId): void {
    this.view.userData.berryShrub = kind;
    const bark = mat('shrub-bark', { map: MaterialTex.bark(), color: '#8a6f52', roughness: 1 });
    const canopy = new THREE.Group();
    canopy.position.y = 0.6;
    canopy.userData.sway = 1;
    this.view.add(canopy);

    // Short multi-stem base: the crown must cover the branches, or the shrub reads as a pole.
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const reach = rng.range(0.5, 0.9);
      const tip = new THREE.Vector3(Math.cos(angle) * reach, rng.range(0.5, 0.8), Math.sin(angle) * reach);
      const length = tip.length();
      const geo = new THREE.CylinderGeometry(0.03, 0.075, length, 5);
      geo.translate(0, length / 2, 0);
      const stem = new THREE.Mesh(geo, bark);
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().normalize());
      stem.castShadow = true;
      stem.receiveShadow = true;
      this.view.add(stem);
    }

    for (const [x, z, scale] of [
      [-0.38, 0.08, 0.9],
      [0.4, -0.1, 0.8],
      [0.02, 0.4, 0.65],
    ] as const) {
      const cluster = new THREE.Group();
      cluster.position.set(x, 0, z);
      cluster.scale.setScalar(scale);
      canopy.add(cluster);
      this.addFoliage(cluster, rng, 'pacay', 1.0, 1.15, '#94a26b');
    }

    if (kind === 'pacae') {
      const podMat = mat('pacae-pod', { color: '#87964a', roughness: 0.9 });
      for (let i = 0; i < 12; i++) {
        const angle = rng.range(0, Math.PI * 2);
        const radius = rng.range(0.9, 1.3);
        const pod = new THREE.Mesh(cylGeo(0.025, 0.045, 0.34, 5), podMat);
        pod.position.set(Math.cos(angle) * radius, rng.range(0.0, 0.35), Math.sin(angle) * radius);
        pod.rotation.set(rng.range(-0.3, 0.3), rng.range(0, 3), rng.range(1.0, 1.4));
        pod.castShadow = true;
        canopy.add(pod);
      }
    } else {
      const fruitMat = mat('guayaba-fruit', { color: '#c4b24f', roughness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const angle = rng.range(0, Math.PI * 2);
        const radius = rng.range(0.75, 1.1);
        const fruit = new THREE.Mesh(sphereGeo(0.075, 6, 5), fruitMat);
        fruit.position.set(Math.cos(angle) * radius, rng.range(0.05, 0.45), Math.sin(angle) * radius);
        fruit.castShadow = true;
        canopy.add(fruit);
      }
    }
  }

  /**
   * Merge the node's static pieces per material (a quarry is 7 rocks, 3 blocks and a floor; a berry
   * bush 8 berries): one draw call per material instead of one per piece, in the main and the shadow
   * pass. Swaying groups merge on their own so they keep swaying; cached geometries stay alive.
   */
  private mergeStaticParts(): void {
    const sways = (mesh: THREE.Mesh): boolean => {
      for (let o = mesh.parent; o && o !== this.view; o = o.parent) if (o.userData.sway) return true;
      return false;
    };
    const unshared = (g: THREE.BufferGeometry): boolean => !geoCacheHas(g);
    mergeStaticByMaterial(this.view, sways, unshared);
    for (const part of this.swayParts) mergeStaticByMaterial(part, () => false, unshared);
  }

  /** Register the tree instance once its height (y) is known. */
  placeTreeInstance(y: number): void {
    if (this.node.kind !== 'tree' || !this.treeMgr || this.node.treeSlot >= 0) return;
    const scale = 0.85 + cosmeticRandom() * 0.35;
    const rotY = cosmeticRandom() * Math.PI * 2;
    this.node.treeSlot = this.treeMgr.register(
      this.node.id,
      this.treeVariant,
      this.node.pos.x,
      y,
      this.node.pos.z,
      scale,
      rotY,
    );
  }

  setVisible(v: boolean): void {
    // The view also holds the bare model of a dry tree, so it follows the fog/LOD in every case.
    this.view.visible = v;
    if (this.node.kind === 'tree' && this.treeMgr && this.node.treeSlot >= 0) {
      // A dry tree never brings its leafy kit instance back with the fog.
      this.treeMgr.setVisible(this.node.treeSlot, v && !this.dry);
    }
  }

  /**
   * Kill the tree standing (the drought's riparian grove): hide the leafy model or its kit instance
   * and leave a bare trunk with branches, so it reads as dry rather than logged. Idempotent.
   */
  setDry(): void {
    if (this.node.kind !== 'tree' || this.dry) return;
    this.dry = true;
    if (this.treeMgr && this.node.treeSlot >= 0) {
      this.treeMgr.setVisible(this.node.treeSlot, false);
    } else {
      for (const child of [...this.view.children]) child.visible = false;
    }
    const wood = mat('dry-wood', { map: MaterialTex.bark(), color: '#6f6152', roughness: 1 });
    const trunkHeight = 4.1;
    const parts: THREE.BufferGeometry[] = [];
    const trunk = cylGeo(0.2, 0.42, trunkHeight, 6).clone();
    trunk.translate(0, trunkHeight / 2, 0);
    parts.push(trunk);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const length = 1.4 + (i % 2) * 0.5;
      const branch = cylGeo(0.06, 0.14, length, 5).clone();
      branch.rotateZ(0.85 + (i % 2) * 0.15);
      branch.rotateY(a);
      branch.translate(Math.cos(a) * 0.4, trunkHeight * (0.55 + i * 0.09), Math.sin(a) * 0.4);
      parts.push(branch);
    }
    // One merged mesh: a bare tree must not add five draw calls to the grove.
    const bare = mergeGeometries(parts, false);
    parts.forEach((geometry) => geometry.dispose());
    if (bare) {
      bare.computeBoundingSphere();
      this.add(new THREE.Mesh(bare, wood));
    }
  }

  setPosition(x: number, y: number, z: number): void {
    this.view.position.set(x, y, z);
  }

  /** Play the depletion animation; the node marks itself dead when it ends. */
  deplete(): void {
    if (this.dry) {
      // A dry tree has no leafy instance to drop: it just goes.
      this.node.remove();
      return;
    }
    if (this.node.kind === 'tree') {
      if (this.treeMgr && this.node.treeSlot >= 0) {
        this.treeMgr.startFall(this.node.treeSlot);
        this.node.treeSlot = -1;
        this.timers.push(setTimeout(() => this.node.remove(), 2200));
      } else {
        this.view.rotation.z = Math.PI / 2;
        this.view.position.y = -0.2;
        this.timers.push(setTimeout(() => this.node.remove(), 2000));
      }
    } else if (this.node.kind === 'hunt') {
      this.huntHerd?.setRemaining(0);
      this.huntHerd?.fadeOut(1.5);
      this.timers.push(setTimeout(() => this.node.remove(), 1800));
    } else {
      this.node.remove();
    }
  }

  syncHuntHerd(): void {
    if (this.node.kind === 'hunt') this.huntHerd?.setRemaining(this.node.amount / this.node.maxAmount);
  }

  update(time: number): void {
    if (this.view.visible) this.huntHerd?.update(time);
    if (this.swayParts.length === 0) return;
    const sway = Math.sin(time * 1.4 + this.swaySeed) * 0.02;
    for (const o of this.swayParts) {
      o.rotation.z = sway;
      o.rotation.x = sway * 0.5;
    }
  }

  dispose(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    if (this.treeMgr && this.node.treeSlot >= 0) {
      this.treeMgr.unregister(this.node.treeSlot);
      this.node.treeSlot = -1;
    }
    this.huntHerd?.dispose();
    this.huntHerd = null;
    // The merged geometries are the only ones this view owns (pieces use shared, cached geometry).
    this.view.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name.startsWith('merged:')) (o as THREE.Mesh).geometry.dispose();
    });
    this.scene.remove(this.view);
  }
}
