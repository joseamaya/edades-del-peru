import * as THREE from 'three';
import { allocId } from './EntityView';
import { RNG, weightedPick } from '../util/rng';
import { ResourceKey } from '../core/types';
import { MaterialTex } from '../rendering/Textures';
import { applyGeneratedPbr } from '../rendering/Biomes';
import { TreeInstances, type TreeVariant } from '../rendering/TreeInstances';
import { HuntHerd } from '../rendering/HuntHerd';
import type { ResourceNodeSave } from '../game/saveTypes';

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

/** Resource node: tree, mine, stone quarry (`well`), hunt or fishing spot. */
export class ResourceNode {
  id = allocId();
  pos = new THREE.Vector3();
  resource: ResourceKey;
  amount: number;
  maxAmount: number;
  depleted = false;
  dead = false;
  radius: number;
  view = new THREE.Group();
  kind: 'tree' | 'mine' | 'well' | 'hunt' | 'fishing' | 'berry';
  growthTime = 0;
  private swaySeed: number;
  private scene: THREE.Scene;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private swayParts: THREE.Object3D[] = [];
  private mapType: string;
  private treeMgr?: TreeInstances;
  private treeVariants?: TreeVariants;
  treeSlot = -1;
  private treeVariant: TreeVariant = 'broad';
  private huntHerd: HuntHerd | null = null;

  constructor(
    scene: THREE.Scene,
    kind: ResourceNode['kind'],
    x: number,
    z: number,
    amount: number,
    mapType = 'andes',
    treeMgr?: TreeInstances,
    treeVariants?: TreeVariants,
  ) {
    this.scene = scene;
    this.kind = kind;
    this.mapType = mapType;
    this.treeMgr = treeMgr;
    this.treeVariants = treeVariants;
    this.pos.set(x, 0, z);
    this.amount = this.maxAmount = amount;
    this.swaySeed = Math.random() * Math.PI * 2;
    switch (kind) {
      case 'tree':
        this.resource = 'wood';
        this.radius = 0.6;
        break;
      case 'mine':
        this.resource = 'silver';
        this.radius = 1.1;
        break;
      case 'well':
        this.resource = 'stone';
        this.radius = 1.0;
        break;
      case 'hunt':
      case 'fishing':
      case 'berry':
        this.resource = 'food';
        this.radius = 0.7;
        break;
    }
    this.buildModel();
  }

  private buildModel(): void {
    const rng = new RNG(Math.floor(this.pos.x * 7 + this.pos.z * 13));
    switch (this.kind) {
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
        this.buildBush(rng);
        break;
    }
    this.view.traverse((o) => {
      if (o.userData.sway) this.swayParts.push(o);
    });
    this.scene.add(this.view);
  }

  /** Register the tree instance once its height (y) is known. */
  placeTreeInstance(y: number): void {
    if (this.kind !== 'tree' || !this.treeMgr || this.treeSlot >= 0) return;
    const scale = 0.85 + Math.random() * 0.35;
    const rotY = Math.random() * Math.PI * 2;
    this.treeSlot = this.treeMgr.register(this.id, this.treeVariant, this.pos.x, y, this.pos.z, scale, rotY);
  }

  /** Combined visibility (fog + LOD) respecting tree instancing. */
  setVisibleEx(v: boolean): void {
    if (this.kind === 'tree' && this.treeMgr && this.treeSlot >= 0) {
      this.treeMgr.setVisible(this.treeSlot, v);
    } else {
      this.view.visible = v;
    }
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
  ): void {
    const tex = MaterialTex.foliage(kind);
    const leafMat = mat('leaf-' + kind, {
      map: tex,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
      color: '#b9c49b',
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
    const fishMat = mat('fish', { color: '#9aa7b5', metalness: 0.5, roughness: 0.4, emissive: 0x0a1418 });
    for (let i = 0; i < 5; i++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), fishMat);
      fish.rotation.x = -Math.PI / 2;
      fish.rotation.z = Math.PI / 2;
      fish.position.set(rng.range(-1.4, 1.4), -0.2, rng.range(-1.4, 1.4));
      fish.rotation.y = rng.range(0, 3);
      this.add(fish, false, false);
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

  /** Subtract resource; if the tree is depleted, fell it. */
  subtract(amount: number): void {
    if (this.depleted) return;
    this.amount -= amount;
    if (this.amount <= 0) {
      this.amount = 0;
      this.depleted = true;
      if (this.kind === 'tree') {
        // fall
        if (this.treeMgr && this.treeSlot >= 0) {
          this.treeMgr.startFall(this.treeSlot);
          this.treeSlot = -1;
          this.timers.push(setTimeout(() => this.remove(), 2200));
        } else {
          this.view.rotation.z = Math.PI / 2;
          this.view.position.y = -0.2;
          this.timers.push(setTimeout(() => this.remove(), 2000));
        }
      } else if (this.kind === 'hunt') {
        this.huntHerd?.setRemaining(0);
        this.huntHerd?.fadeOut(1.5);
        this.timers.push(setTimeout(() => this.remove(), 1800));
      } else {
        this.remove();
      }
    } else {
      this.syncHuntHerd();
    }
  }

  private syncHuntHerd(): void {
    if (this.kind === 'hunt') this.huntHerd?.setRemaining(this.amount / this.maxAmount);
  }

  /** Snapshot the gameplay state (used by save/load). */
  toSave(): ResourceNodeSave {
    return {
      id: this.id,
      kind: this.kind,
      x: this.pos.x,
      z: this.pos.z,
      amount: this.amount,
      maxAmount: this.maxAmount,
    };
  }

  applySave(s: ResourceNodeSave): void {
    this.id = s.id;
    this.maxAmount = Math.max(1, s.maxAmount ?? s.amount);
    this.amount = s.amount;
    this.syncHuntHerd();
  }

  remove(): void {
    if (this.dead) return;
    this.dead = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    if (this.treeMgr && this.treeSlot >= 0) {
      this.treeMgr.unregister(this.treeSlot);
      this.treeSlot = -1;
    }
    this.huntHerd?.dispose();
    this.huntHerd = null;
    // geometries and materials are shared/cached: only removed from the scene.
    this.scene.remove(this.view);
  }

  /** Wind for trees, walking gait for hunt herds. */
  update(time: number): void {
    if (this.view.visible) this.huntHerd?.update(time);
    if (this.swayParts.length === 0) return;
    const sway = Math.sin(time * 1.4 + this.swaySeed) * 0.02;
    for (const o of this.swayParts) {
      o.rotation.z = sway;
      o.rotation.x = sway * 0.5;
    }
  }
}
