import * as THREE from 'three';
import type { Unit } from '../entities/Unit';
import { commanderById } from '../model/defs/commanders';

const MAX_HEROES = 8;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const GOLD = new THREE.Color('#ffd166');
const _identity = new THREE.Quaternion();

/**
 * Field identity for the Ayar: a gold hero ring, a banner pole and a cloth flag in the commander's
 * accent colour. Presentation only; the nameplate and the portraits carry the names.
 */
export class HeroMarkers {
  readonly group = new THREE.Group();
  private readonly rings: THREE.InstancedMesh;
  private readonly poles: THREE.InstancedMesh;
  private readonly crests: THREE.InstancedMesh;
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
    const crestGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const crestMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 });
    this.rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, MAX_HEROES);
    this.poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, MAX_HEROES);
    this.crests = new THREE.InstancedMesh(crestGeometry, crestMaterial, MAX_HEROES);
    for (const mesh of [this.rings, this.poles, this.crests]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.geometries.push(ringGeometry, poleGeometry, crestGeometry);
    this.materials.push(ringMaterial, poleMaterial, crestMaterial);
    scene.add(this.group);
  }

  /** Follow the living Ayar: a gold ring, a banner pole and an accent crest. */
  sync(units: Iterable<Unit>): void {
    const heroes: { unit: Unit; accent: string }[] = [];
    for (const unit of units) {
      if (unit.dead || unit.owner !== 0) continue;
      const commander = commanderById(unit.tag);
      if (!commander?.hero) continue;
      heroes.push({ unit, accent: commander.accent ?? '#ffd166' });
      if (heroes.length === MAX_HEROES) break;
    }
    for (const [i, hero] of heroes.entries()) {
      const { unit, accent } = hero;
      _color.set(accent);
      _dummy.position.set(unit.pos.x, unit.pos.y + 0.06, unit.pos.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.rings.setMatrixAt(i, _dummy.matrix);
      this.rings.setColorAt(i, GOLD);

      _dummy.position.set(unit.pos.x, unit.pos.y + 1.3, unit.pos.z);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.poles.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(unit.pos.x, unit.pos.y + 3.02, unit.pos.z);
      _dummy.quaternion.copy(_identity);
      _dummy.updateMatrix();
      this.crests.setMatrixAt(i, _dummy.matrix);
      this.crests.setColorAt(i, _color);
    }
    for (const mesh of [this.rings, this.poles, this.crests]) {
      mesh.count = heroes.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.group.visible = heroes.length > 0;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const mesh of [this.rings, this.poles, this.crests]) mesh.dispose();
  }
}
