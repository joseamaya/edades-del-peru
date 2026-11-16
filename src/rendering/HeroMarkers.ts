import * as THREE from 'three';
import type { Unit } from '../entities/Unit';
import { COMMANDERS, commanderById, DEFAULT_HERO_ACCENT, type HeroCrest } from '../model/defs/commanders';

const MAX_HEROES = Object.values(COMMANDERS).filter((commander) => commander.hero).length;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const GOLD = new THREE.Color('#ffd166');

/** Zoom fraction of the map maximum above which only the gold ring remains (`CharacterLabels` follows it). */
export const HERO_DETAIL_ZOOM = 0.5;

/** Per-instance crest geometry: a match disposes its own meshes, so this must never be module-level. */
function crestGeometry(shape: HeroCrest): THREE.BufferGeometry {
  switch (shape) {
    case 'diamond':
      return new THREE.OctahedronGeometry(0.3, 0);
    case 'tetra':
      return new THREE.TetrahedronGeometry(0.34, 0);
    case 'stone':
      return new THREE.DodecahedronGeometry(0.26, 0);
    case 'spire':
      return new THREE.ConeGeometry(0.22, 0.5, 4);
  }
}

const CREST_ORDER: readonly HeroCrest[] = ['diamond', 'tetra', 'stone', 'spire'];

/**
 * Field identity for the Ayar: a gold ring for every hero, plus a banner pole and a crest while the
 * camera is close. The crest shape comes from `CommanderDef.crest`, so the eight siblings do not read
 * as eight identical diamonds; zooming out drops to the ring alone (one marker level).
 */
export class HeroMarkers {
  readonly group = new THREE.Group();
  private readonly rings: THREE.InstancedMesh;
  private readonly poles: THREE.InstancedMesh;
  private readonly crests = new Map<HeroCrest, THREE.InstancedMesh>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.group.name = 'hero-markers';
    const ringGeometry = new THREE.RingGeometry(0.95, 1.15, 28).rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const poleGeometry = new THREE.CylinderGeometry(0.045, 0.055, 2.6, 5);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.7, metalness: 0.15 });
    const crestMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 });
    this.rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, MAX_HEROES);
    this.poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, MAX_HEROES);
    for (const mesh of [this.rings, this.poles]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    for (const shape of CREST_ORDER) {
      const geometry = crestGeometry(shape);
      const mesh = new THREE.InstancedMesh(geometry, crestMaterial, MAX_HEROES);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.crests.set(shape, mesh);
      this.group.add(mesh);
      this.geometries.push(geometry);
    }
    this.geometries.push(ringGeometry, poleGeometry);
    this.materials.push(ringMaterial, poleMaterial, crestMaterial);
    scene.add(this.group);
  }

  /** Whether the close-zoom layer (pole and crest) is showing. */
  get detailVisible(): boolean {
    return this.poles.visible;
  }

  /**
   * Follow the living Ayar. `detail` (close zoom) adds the pole and crest to the ring; the ring alone
   * carries identity at the strategic zoom, so eight banners never cover the board.
   */
  sync(units: Iterable<Unit>, zoom: number, maxZoom: number): void {
    const detail = zoom < maxZoom * HERO_DETAIL_ZOOM;
    this.poles.visible = detail;
    for (const mesh of this.crests.values()) mesh.visible = detail;
    const heroes: { unit: Unit; accent: string; shape: HeroCrest }[] = [];
    for (const unit of units) {
      if (unit.dead || unit.owner !== 0) continue;
      const commander = commanderById(unit.tag);
      if (!commander?.hero) continue;
      heroes.push({
        unit,
        accent: commander.accent ?? DEFAULT_HERO_ACCENT,
        shape: commander.crest ?? 'diamond',
      });
      if (heroes.length === MAX_HEROES) break;
    }
    const crestIndex = new Map<HeroCrest, number>();
    for (const [i, hero] of heroes.entries()) {
      const { unit, accent, shape } = hero;
      _color.set(accent);
      _dummy.position.set(unit.pos.x, unit.pos.y + 0.06, unit.pos.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.rings.setMatrixAt(i, _dummy.matrix);
      this.rings.setColorAt(i, GOLD);
      if (!detail) continue;
      // The pole stands beside the hero, not through the body; the ring stays under the feet.
      _dummy.position.set(unit.pos.x + 0.85, unit.pos.y + 1.3, unit.pos.z - 0.25);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.poles.setMatrixAt(i, _dummy.matrix);
      const index = crestIndex.get(shape) ?? 0;
      crestIndex.set(shape, index + 1);
      _dummy.position.set(unit.pos.x + 0.85, unit.pos.y + 3.02, unit.pos.z - 0.25);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      const crest = this.crests.get(shape)!;
      crest.setMatrixAt(index, _dummy.matrix);
      crest.setColorAt(index, _color);
    }
    for (const mesh of [this.rings, this.poles]) {
      mesh.count = heroes.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (const [shape, mesh] of this.crests) {
      mesh.count = crestIndex.get(shape) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.group.visible = heroes.length > 0;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const mesh of [this.rings, this.poles, ...this.crests.values()]) mesh.dispose();
  }
}
