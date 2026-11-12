import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MaterialTex } from './Textures';
import { applyGeneratedPbr } from './Biomes';
import type { TreeVariant } from '../model/defs/profiles';
import type { KitModel } from './vegetationKit';
import { preserveAlphaCoverage } from './alphaCoverage';

export type { TreeVariant };

const MAX = 700;
const VARIANTS: TreeVariant[] = ['broad', 'needle', 'frond', 'algarrobo', 'molle', 'sauce', 'pacay'];
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _swayM = new THREE.Matrix4();

/** Instances further than this from the camera focus use the far (LOD1) kit model. */
export const KIT_LOD0_RADIUS = 45;
/**
 * Smaller LOD0 radius on low quality / software rendering: LOD1 cards read as noisy discs up close,
 * while LOD0 near the camera costs only ~20k triangles.
 */
export const KIT_LOD0_RADIUS_LOW = 25;

export function kitLod0RadiusFor(lowQuality: boolean): number {
  return lowQuality ? KIT_LOD0_RADIUS_LOW : KIT_LOD0_RADIUS;
}

/** Which kit LOD a tree at squared distance `d2` from the focus uses (radius 0 forces LOD1). */
export function kitLodFor(d2: number, radius: number): 0 | 1 {
  return d2 <= radius * radius ? 0 : 1;
}

interface KitLayer {
  model: KitModel;
  /** meshes[lod][part] */
  meshes: THREE.InstancedMesh[][];
  /** packed instance index -> tree slot, per LOD */
  slots: number[][];
}

interface Slot {
  used: boolean;
  id: number;
  variant: TreeVariant;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  phase: number;
  visible: boolean;
  fallTime: number;
}

/**
 * GPU tree instancing: one InstancedMesh per shared material (trunk and
 * canopies per variant). Handles spawn/despawn, visibility (fog/LOD), wind and
 * falling on chop. Picking is resolved by `instanceId` -> entity.
 */
export class TreeInstances {
  private trunkMesh: THREE.InstancedMesh;
  private canopyMesh: Record<TreeVariant, THREE.InstancedMesh>;
  private materials: THREE.Material[] = [];
  private slots: Slot[] = [];
  private free: number[] = [];
  /** One past the highest used slot: the draw count of the procedural meshes. */
  private highWater = 0;
  /** Registered slots per variant: procedural meshes of unused (or kit-drawn) variants are hidden. */
  private readonly variantUse = new Map<TreeVariant, number>();
  private time = 0;
  private windStrength = 0.035;
  private readonly kits = new Map<TreeVariant, KitLayer>();
  private focusX = 0;
  private focusZ = 0;
  private hasFocus = false;
  /** Distance from the camera focus inside which kit trees use LOD0 (0 = always LOD1). */
  kitLod0Radius = KIT_LOD0_RADIUS;
  private disposed = false;

  constructor(private scene: THREE.Scene) {
    const trunkGeo = this.buildTrunkGeo();
    const canopyGeos: Record<TreeVariant, THREE.BufferGeometry> = {
      broad: this.buildCanopyGeo(2.35, 2.0, 3.15),
      needle: this.buildCanopyGeo(1.85, 2.8, 3.6),
      frond: this.buildCanopyGeo(2.85, 1.85, 3.05),
      // Native Supe-valley trees: umbrella algarrobo, fine molle, riparian
      // sauce and the broader pacay.
      algarrobo: this.buildCanopyGeo(3.15, 1.65, 2.85),
      molle: this.buildCanopyGeo(2.15, 2.05, 2.95),
      sauce: this.buildCanopyGeo(1.7, 2.75, 3.35),
      pacay: this.buildCanopyGeo(2.7, 2.15, 3.0),
    };

    const barkMat = new THREE.MeshStandardMaterial({
      map: MaterialTex.bark(),
      normalMap: MaterialTex.normal(21),
      color: '#b59a78',
      roughness: 0.95,
    });
    applyGeneratedPbr(barkMat, 'bark', { tint: '#cbb59a' });
    this.materials.push(barkMat);
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, barkMat, MAX);
    this.trunkMesh.castShadow = true;
    this.trunkMesh.receiveShadow = true;
    this.trunkMesh.frustumCulled = false;
    this.trunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.trunkMesh.name = 'trees_trunk';
    this.scene.add(this.trunkMesh);

    this.canopyMesh = {} as Record<TreeVariant, THREE.InstancedMesh>;
    for (const variant of VARIANTS) {
      const leafMat = new THREE.MeshStandardMaterial({
        map: MaterialTex.foliage(variant),
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        color:
          variant === 'algarrobo'
            ? '#a3a57a'
            : variant === 'sauce'
              ? '#aab58a'
              : variant === 'molle'
                ? '#9aa77a'
                : variant === 'pacay'
                  ? '#a8b884'
                  : '#b9c49b',
        roughness: 1,
      });
      preserveAlphaCoverage(leafMat);
      this.materials.push(leafMat);
      const mesh = new THREE.InstancedMesh(canopyGeos[variant], leafMat, MAX);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.name = `trees_canopy_${variant}`;
      this.canopyMesh[variant] = mesh;
      this.scene.add(mesh);
    }

    // initialize all matrices to zero
    for (let i = 0; i < MAX; i++) {
      this.slots.push({
        used: false,
        id: -1,
        variant: 'broad',
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
        scale: 1,
        phase: 0,
        visible: false,
        fallTime: 0,
      });
    }
    // Hand out low slots first so the procedural meshes only draw up to the highest slot in use
    // (empty slots are zero-scaled but still cost their triangles, also in the shadow pass).
    for (let i = MAX - 1; i >= 0; i--) this.free.push(i);
    this.writeAll();
    this.syncCounts();
  }

  private buildTrunkGeo(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.13, 0.22, 3.8, 8);
    trunk.translate(0, 1.9, 0);
    parts.push(trunk);
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + 0.4;
      const br = new THREE.CylinderGeometry(0.05, 0.09, 1.0, 6);
      br.translate(0, 0.5, 0);
      const m = new THREE.Matrix4()
        .makeTranslation(Math.cos(a) * 0.23, 2.55, Math.sin(a) * 0.23)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0)));
      br.applyMatrix4(m);
      parts.push(br);
    }
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }

  private buildCanopyGeo(w: number, h: number, cy: number): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];
    for (const a of angles) {
      const card = new THREE.PlaneGeometry(w, h);
      card.applyMatrix4(new THREE.Matrix4().makeRotationY(a));
      card.applyMatrix4(new THREE.Matrix4().makeTranslation(0, cy, 0));
      parts.push(card);
    }
    const top = new THREE.PlaneGeometry(w * 0.9, h * 0.9);
    top.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.35));
    top.applyMatrix4(new THREE.Matrix4().makeTranslation(0, cy + h * 0.35, 0));
    parts.push(top);
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }

  /** Reserve an instance for a tree. Returns the slot or -1 if full. */
  register(id: number, variant: TreeVariant, x: number, y: number, z: number, scale: number, rotY: number): number {
    return this.claim(id, variant, x, y, z, scale, rotY);
  }

  /**
   * Reserve a decorative tree that is not a resource: it shares the batch and wind, but its id is
   * `-1`, so picking skips it and no obstacle or resource entry is created.
   */
  registerVisual(variant: TreeVariant, x: number, y: number, z: number, scale: number, rotY: number): number {
    return this.claim(-1, variant, x, y, z, scale, rotY);
  }

  private claim(
    id: number,
    variant: TreeVariant,
    x: number,
    y: number,
    z: number,
    scale: number,
    rotY: number,
  ): number {
    const slot = this.free.pop();
    if (slot === undefined) return -1;
    const s = this.slots[slot];
    s.used = true;
    s.id = id;
    s.variant = variant;
    s.x = x;
    s.y = y;
    s.z = z;
    s.rotY = rotY;
    s.scale = scale;
    s.phase = Math.random() * Math.PI * 2;
    s.visible = true;
    s.fallTime = 0;
    this.variantUse.set(variant, (this.variantUse.get(variant) ?? 0) + 1);
    if (slot >= this.highWater) this.highWater = slot + 1;
    this.syncCounts();
    if (this.kits.has(variant)) this.writeZero(slot);
    this.writeSlot(slot);
    this.zeroOtherCanopies(slot, variant);
    return slot;
  }

  setVisible(slot: number, visible: boolean): void {
    const s = this.slots[slot];
    if (!s || !s.used || s.visible === visible) return;
    s.visible = visible;
    this.writeSlot(slot);
  }

  startFall(slot: number): void {
    const s = this.slots[slot];
    if (s && s.used) s.fallTime = 0.001;
  }

  unregister(slot: number): void {
    const s = this.slots[slot];
    if (!s || !s.used) return;
    s.used = false;
    s.id = -1;
    this.variantUse.set(s.variant, (this.variantUse.get(s.variant) ?? 1) - 1);
    this.writeZero(slot);
    this.free.push(slot);
    if (slot === this.highWater - 1) {
      while (this.highWater > 0 && !this.slots[this.highWater - 1].used) this.highWater--;
    }
    this.syncCounts();
  }

  private syncCounts(): void {
    let trunks = false;
    for (const variant of VARIANTS) {
      const drawn = (this.variantUse.get(variant) ?? 0) > 0 && !this.kits.has(variant);
      trunks ||= drawn;
      // Hidden meshes are skipped outright (with count 0 the renderer would still set up their programs).
      this.canopyMesh[variant].visible = drawn;
      this.canopyMesh[variant].count = drawn ? this.highWater : 0;
    }
    this.trunkMesh.visible = trunks;
    this.trunkMesh.count = trunks ? this.highWater : 0;
  }

  nodeIdAt(slot: number): number {
    const s = this.slots[slot];
    return s && s.used ? s.id : -1;
  }

  /** Ray intersection with trees; returns distance and entity id. */
  raycast(raycaster: THREE.Raycaster, out: { dist: number; id: number }[]): void {
    const meshes: THREE.Mesh[] = [this.trunkMesh, ...VARIANTS.map((v) => this.canopyMesh[v])];
    for (const mesh of meshes) {
      const hits = raycaster.intersectObject(mesh, false);
      for (const h of hits) {
        if (h.instanceId === undefined) continue;
        const id = this.nodeIdAt(h.instanceId);
        if (id >= 0) out.push({ dist: h.distance, id });
      }
    }
    for (const kit of this.kits.values()) {
      kit.meshes.forEach((parts, lod) => {
        for (const mesh of parts) {
          if (mesh.count === 0) continue;
          // Instances are repacked every frame, so the cached bounding sphere would go stale.
          mesh.computeBoundingSphere();
          for (const h of raycaster.intersectObject(mesh, false)) {
            if (h.instanceId === undefined) continue;
            const id = this.nodeIdAt(kit.slots[lod][h.instanceId] ?? -1);
            if (id >= 0) out.push({ dist: h.distance, id });
          }
        }
      });
    }
  }

  /**
   * Draw `variant` with a Blender kit model instead of the procedural trunk and cards. Instances
   * are packed every update (only visible trees are drawn) and split by distance into LOD0/LOD1.
   */
  attachKit(variant: TreeVariant, model: KitModel): void {
    // Kit models are session-cached by the loader; the instancer only owns its meshes.
    if (this.disposed || this.kits.has(variant)) return;
    const meshes = model.lods.map((parts, lod) =>
      parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, MAX);
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = !part.leaf;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.name = `trees_kit_${model.id}_lod${lod}`;
        this.scene.add(mesh);
        return mesh;
      }),
    );
    this.kits.set(variant, { model, meshes, slots: [[], []] });
    this.syncCounts();
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].used && this.slots[i].variant === variant) this.writeZero(i);
    }
    this.repackKits();
  }

  hasKit(variant: TreeVariant): boolean {
    return this.kits.has(variant);
  }

  private repackKits(): void {
    if (this.kits.size === 0) return;
    for (const [variant, kit] of this.kits) {
      kit.slots[0].length = 0;
      kit.slots[1].length = 0;
      for (let i = 0; i < this.slots.length; i++) {
        const s = this.slots[i];
        if (!s.used || s.variant !== variant || (!s.visible && s.fallTime === 0)) continue;
        const dx = s.x - this.focusX;
        const dz = s.z - this.focusZ;
        const lod = this.hasFocus ? kitLodFor(dx * dx + dz * dz, this.kitLod0Radius) : 1;
        const n = kit.slots[lod].length;
        const fallAngle = s.fallTime > 0 ? Math.min(1.5708, s.fallTime * 1.4) : 0;
        this.baseMatrix(s, _m, fallAngle);
        const sway = Math.sin(this.time * 1.4 + s.phase) * this.windStrength;
        _euler.set(0, s.rotY, sway + fallAngle);
        _q2.setFromEuler(_euler);
        _pos.set(s.x, s.y, s.z);
        _scale.setScalar(s.scale);
        _swayM.compose(_pos, _q2, _scale);
        const parts = kit.model.lods[lod];
        kit.meshes[lod].forEach((mesh, j) => mesh.setMatrixAt(n, parts[j].leaf ? _swayM : _m));
        kit.slots[lod].push(i);
      }
      kit.meshes.forEach((parts, lod) => {
        for (const mesh of parts) {
          mesh.count = kit.slots[lod].length;
          // Upload only the packed instances, not the whole MAX-sized buffer.
          mesh.instanceMatrix.clearUpdateRanges();
          mesh.instanceMatrix.addUpdateRange(0, mesh.count * 16);
          mesh.instanceMatrix.needsUpdate = true;
        }
      });
    }
  }

  private baseMatrix(s: Slot, out: THREE.Matrix4, fallAngle = 0): void {
    _pos.set(s.x, s.y, s.z);
    _euler.set(0, s.rotY, fallAngle);
    _q.setFromEuler(_euler);
    _scale.setScalar(s.scale);
    out.compose(_pos, _q, _scale);
  }

  private writeSlot(slot: number): void {
    const s = this.slots[slot];
    // Kit variants are drawn by the kit layer (repacked every update); their procedural matrices were
    // zeroed when the slot was registered or the kit attached.
    if (this.kits.has(s.variant)) return;
    if (!s.visible && s.fallTime === 0) {
      this.writeZero(slot);
      return;
    }
    const fallAngle = s.fallTime > 0 ? Math.min(1.5708, s.fallTime * 1.4) : 0;
    this.baseMatrix(s, _m, fallAngle);
    this.trunkMesh.setMatrixAt(slot, _m);
    // canopy with wind (swaying around the Z axis at the tree base)
    const sway = Math.sin(this.time * 1.4 + s.phase) * this.windStrength;
    _euler.set(0, s.rotY, sway + fallAngle);
    _q2.setFromEuler(_euler);
    _pos.set(s.x, s.y, s.z);
    _scale.setScalar(s.scale);
    _m.compose(_pos, _q2, _scale);
    for (const variant of VARIANTS) {
      if (variant === s.variant) this.canopyMesh[variant].setMatrixAt(slot, _m);
    }
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.canopyMesh[s.variant].instanceMatrix.needsUpdate = true;
  }

  private zeroOtherCanopies(slot: number, keep: TreeVariant): void {
    for (const variant of VARIANTS) {
      if (variant === keep) continue;
      this.canopyMesh[variant].setMatrixAt(slot, ZERO);
      this.canopyMesh[variant].instanceMatrix.needsUpdate = true;
    }
  }

  private writeZero(slot: number): void {
    this.trunkMesh.setMatrixAt(slot, ZERO);
    this.trunkMesh.instanceMatrix.needsUpdate = true;
    for (const variant of VARIANTS) {
      this.canopyMesh[variant].setMatrixAt(slot, ZERO);
      this.canopyMesh[variant].instanceMatrix.needsUpdate = true;
    }
  }

  private writeAll(): void {
    for (let i = 0; i < MAX; i++) this.writeZero(i);
  }

  /** `focus` is the camera target; kit trees near it use LOD0. */
  update(dt: number, focus?: { x: number; z: number }): void {
    this.time += dt;
    if (focus) {
      this.focusX = focus.x;
      this.focusZ = focus.z;
      this.hasFocus = true;
    }
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.used) continue;
      const kit = this.kits.has(s.variant);
      if (s.fallTime > 0) {
        s.fallTime += dt;
        if (!kit) this.writeSlot(i);
        if (s.fallTime * 1.4 >= 1.5708) {
          s.fallTime = 0;
          this.unregister(i);
        }
      } else if (s.visible && !kit) {
        this.writeSlot(i);
      }
    }
    this.repackKits();
  }

  dispose(): void {
    this.disposed = true;
    this.trunkMesh.geometry.dispose();
    this.trunkMesh.removeFromParent();
    for (const variant of VARIANTS) {
      this.canopyMesh[variant].geometry.dispose();
      this.canopyMesh[variant].removeFromParent();
    }
    this.materials.forEach((m) => m.dispose());
    for (const kit of this.kits.values()) {
      kit.meshes.forEach((parts) => parts.forEach((mesh) => mesh.removeFromParent()));
    }
    this.kits.clear();
  }
}
