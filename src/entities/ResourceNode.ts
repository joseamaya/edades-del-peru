import * as THREE from 'three';
import { allocId } from './EntityView';
import { RNG, weightedPick } from '../util/rng';
import { ResourceKey } from '../core/types';
import { MaterialTex } from '../rendering/Textures';
import { TreeInstances, type TreeVariant } from '../rendering/TreeInstances';
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
const TREE_VARIANTS: TreeVariant[] = ['broad', 'needle', 'frond'];
function variantForMap(mapType: string): TreeVariant {
  if (mapType === 'altiplano') return 'needle';
  if (mapType === 'jungle') return 'frond';
  return 'broad';
}

/** Resource node: tree, mine, well, hunt or fishing spot. */
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
        this.buildWell(rng);
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
    kind: 'broad' | 'needle' | 'frond' | 'bush',
    radius: number,
    height: number,
  ): void {
    const tex = MaterialTex.foliage(kind);
    const leafMat = mat('leaf-' + kind, {
      map: tex,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
      color: '#cfe0b0',
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
    const h = variant === 'needle' ? 5 + rng.range(0, 2.5) : 3.8 + rng.range(0, 2.2);
    const lean = rng.range(-0.06, 0.06);

    const barkMat = mat('bark', {
      map: MaterialTex.bark(),
      normalMap: MaterialTex.normal(21),
      color: '#b59a78',
      roughness: 0.95,
    });
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
    canopy.position.y = h * 0.86;
    canopy.rotation.z = lean;
    this.view.add(canopy);
    const radius =
      variant === 'frond'
        ? 1.9 + rng.range(0, 0.5)
        : variant === 'needle'
          ? 1.5 + rng.range(0, 0.4)
          : 1.7 + rng.range(0, 0.7);
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
    const oreMat = mat('ore-mine', { color: '#9aa7b5', metalness: 0.9, roughness: 0.35, emissive: 0x11161c });
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = rng.range(0.5, 1.3);
      const hh = rng.range(0.5, 1.6);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.4, 0.8), 0), rockMat);
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

  private buildWell(rng: RNG): void {
    const metalMat = mat('metal-well', { map: MaterialTex.metal(), color: '#9aa4ae', metalness: 0.6, roughness: 0.5 });
    const woodMat = mat('wood-well', { map: MaterialTex.wood(), color: '#a88a5e', roughness: 0.9 });
    void rng;
    const base = new THREE.Mesh(cylGeo(0.7, 0.85, 0.35, 12), metalMat);
    base.position.y = 0.18;
    this.add(base);
    const tower = new THREE.Mesh(cylGeo(0.16, 0.16, 1.8, 8), metalMat);
    tower.position.y = 1.1;
    this.add(tower);
    const body = new THREE.Mesh(boxGeo(0.7, 0.4, 0.7), metalMat);
    body.position.set(0, 0.6, 0.4);
    this.add(body);
    const drum = new THREE.Mesh(cylGeo(0.25, 0.25, 0.15, 10), woodMat);
    drum.position.set(0.2, 0.85, 0.4);
    this.add(drum);
    const arm = new THREE.Mesh(boxGeo(0.7, 0.08, 0.14), metalMat);
    arm.position.set(0.3, 1.0, 0.4);
    this.add(arm);
    const lampMat = mat('lamp-well', { color: '#ffcc44', emissive: 0xffcc44, emissiveIntensity: 2, roughness: 0.4 });
    const light = new THREE.Mesh(cylGeo(0.06, 0.06, 0.08, 8), lampMat);
    light.position.set(0, 1.4, 0);
    this.add(light);
    const pit = new THREE.Mesh(
      cylGeo(0.55, 0.6, 0.12, 12),
      mat('pit-well', { color: '#141414', metalness: 0.4, roughness: 0.6 }),
    );
    pit.position.y = 0.06;
    this.add(pit);
  }

  private buildHunt(rng: RNG): void {
    const bodyCol = rng.pick(['#8a6a4a', '#5a4a3a', '#7a5a3a']);
    const hideMat = mat('hide-' + bodyCol, { map: MaterialTex.hide(bodyCol), color: '#ffffff', roughness: 0.9 });
    const legMat = mat('hide-legs', { color: '#3a2a1a', roughness: 0.9 });
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ox = rng.range(-1.2, 1.2);
      const oz = rng.range(-1.2, 1.2);
      const body = new THREE.Mesh(boxGeo(0.5, 0.3, 0.8), hideMat);
      body.position.set(ox, 0.35, oz);
      body.rotation.y = rng.range(0, 3);
      this.add(body);
      const head = new THREE.Mesh(boxGeo(0.22, 0.22, 0.24), hideMat);
      head.position.set(ox, 0.45, oz + 0.48);
      this.add(head);
      for (let l = 0; l < 4; l++) {
        const leg = new THREE.Mesh(boxGeo(0.08, 0.3, 0.08), legMat);
        leg.position.set(ox + (l < 2 ? -0.18 : 0.18), 0.15, oz + (l % 2 === 0 ? -0.3 : 0.3));
        this.add(leg);
      }
    }
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
        this.view.rotation.x = Math.PI / 2;
        this.timers.push(setTimeout(() => this.remove(), 800));
      } else {
        this.remove();
      }
    }
  }

  /** Snapshot the gameplay state (used by save/load). */
  toSave(): ResourceNodeSave {
    return { id: this.id, kind: this.kind, x: this.pos.x, z: this.pos.z, amount: this.amount };
  }

  applySave(s: ResourceNodeSave): void {
    this.id = s.id;
    this.amount = s.amount;
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
    // geometries and materials are shared/cached: only removed from the scene.
    this.scene.remove(this.view);
  }

  /** Wind for trees. */
  update(time: number): void {
    if (this.swayParts.length === 0) return;
    const sway = Math.sin(time * 1.4 + this.swaySeed) * 0.02;
    for (const o of this.swayParts) {
      o.rotation.z = sway;
      o.rotation.x = sway * 0.5;
    }
  }
}
