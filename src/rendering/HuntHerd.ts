import * as THREE from 'three';
import { faunaTemplate, type FaunaTemplate } from './faunaModels';

const GAIT_OFFSETS = [0, Math.PI, Math.PI, 0];
const ANIMALS = 3;
const LEGS = 4;

interface HerdAnimal {
  angle: number;
  speed: number;
  radius: number;
  phase: number;
}

interface CarcassSpot {
  x: number;
  z: number;
  yaw: number;
}

/**
 * Presentation-only herd for a hunt resource node. Three stylised camelids
 * walk small deterministic orbits; harvesting converts them to low carcasses
 * without changing the node's simulation or resource amount.
 */
export class HuntHerd {
  readonly group = new THREE.Group();
  private readonly template: FaunaTemplate;
  private readonly body: THREE.InstancedMesh;
  private readonly legs: THREE.InstancedMesh;
  private readonly carcasses: THREE.InstancedMesh;
  private readonly liveMaterial: THREE.MeshStandardMaterial;
  private readonly carcassMaterial: THREE.MeshStandardMaterial;
  private readonly animals: HerdAnimal[] = [];
  private readonly carcassSpots: CarcassSpot[] = [];
  private readonly bodyDummy = new THREE.Object3D();
  private readonly legDummy = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  private liveCount = ANIMALS;
  private time = 0;
  private fadeStart = -1;
  private fadeSeconds = 0;

  constructor(seed = 0) {
    this.template = faunaTemplate('vicuna');
    this.liveMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
    });
    this.carcassMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: 0x9a7a5a,
      roughness: 1,
      metalness: 0,
    });
    this.body = new THREE.InstancedMesh(this.template.body, this.liveMaterial, ANIMALS);
    this.legs = new THREE.InstancedMesh(this.template.leg ?? this.template.body, this.liveMaterial, ANIMALS * LEGS);
    this.carcasses = new THREE.InstancedMesh(this.template.body, this.carcassMaterial, ANIMALS);
    this.body.name = 'hunt_bodies';
    this.legs.name = 'hunt_legs';
    this.carcasses.name = 'hunt_carcasses';
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.legs.castShadow = true;
    this.legs.receiveShadow = true;
    this.carcasses.castShadow = true;
    this.carcasses.receiveShadow = true;
    this.carcasses.count = 0;
    this.group.name = 'hunt_herd';
    this.group.add(this.body, this.legs, this.carcasses);

    for (let i = 0; i < ANIMALS; i++) {
      this.animals.push({
        angle: (seed * 0.73 + i * 2.1) % (Math.PI * 2),
        speed: 0.22 + ((seed + i * 7) % 5) * 0.012,
        radius: 0.85 + (i % 2) * 0.18,
        phase: seed * 1.37 + i * 1.9,
      });
    }
    this.update(0);
  }

  get live(): number {
    return this.liveCount;
  }

  get carcassCount(): number {
    return ANIMALS - this.liveCount;
  }

  update(time: number): void {
    this.time = time;
    const t = this.template;
    for (let i = 0; i < this.liveCount; i++) {
      const a = this.animals[i];
      const angle = a.angle + time * a.speed;
      const x = Math.cos(angle) * a.radius;
      const z = Math.sin(angle) * a.radius;
      const grazing = Math.sin(time * 0.23 + a.phase) > 0.72;
      const bob = grazing ? 0 : Math.abs(Math.sin(time * 4.2 + a.phase)) * 0.025;
      this.bodyDummy.position.set(x, bob, z);
      this.bodyDummy.rotation.set(0, -angle, 0);
      this.bodyDummy.updateMatrix();
      this.body.setMatrixAt(i, this.bodyDummy.matrix);

      const swing = grazing ? 0 : Math.sin(time * 5.4 + a.phase) * 0.42;
      for (let leg = 0; leg < LEGS; leg++) {
        const side = leg < 2 ? -1 : 1;
        const front = leg % 2 === 0;
        this.legDummy.position.set(side * t.legX, t.hipY, front ? t.legZFront : t.legZBack);
        this.legDummy.rotation.set(swing * Math.sin(GAIT_OFFSETS[leg] + this.time * 5.4 + a.phase), 0, 0);
        this.legDummy.updateMatrix();
        this.matrix.multiplyMatrices(this.bodyDummy.matrix, this.legDummy.matrix);
        this.legs.setMatrixAt(i * LEGS + leg, this.matrix);
      }
    }
    this.syncCounts();
  }

  /** Map the remaining resource fraction to live animals and carcasses. */
  setRemaining(ratio: number): void {
    const wantedCarcasses = ratio > 2 / 3 ? 0 : ratio > 1 / 3 ? 1 : ratio > 0 ? 2 : ANIMALS;
    while (this.carcassCount < wantedCarcasses && this.liveCount > 0) {
      const a = this.animals[this.liveCount - 1];
      const angle = a.angle + this.time * a.speed;
      this.carcassSpots.push({ x: Math.cos(angle) * a.radius, z: Math.sin(angle) * a.radius, yaw: -angle });
      this.liveCount--;
    }
    this.syncCounts();
  }

  /** Fade the remaining herd out before its node is removed. */
  fadeOut(seconds: number): void {
    this.fadeStart = this.time;
    this.fadeSeconds = Math.max(0.01, seconds);
    this.liveMaterial.transparent = true;
    this.carcassMaterial.transparent = true;
    this.liveMaterial.needsUpdate = true;
    this.carcassMaterial.needsUpdate = true;
  }

  dispose(): void {
    this.body.dispose();
    this.legs.dispose();
    this.carcasses.dispose();
    this.liveMaterial.dispose();
    this.carcassMaterial.dispose();
  }

  private syncCounts(): void {
    this.body.count = this.liveCount;
    this.legs.count = this.liveCount * LEGS;
    this.carcasses.count = this.carcassCount;
    this.body.instanceMatrix.needsUpdate = true;
    this.legs.instanceMatrix.needsUpdate = true;
    this.updateCarcasses();
  }

  private updateCarcasses(): void {
    if (this.fadeStart >= 0) {
      const opacity = Math.max(0, 1 - (this.time - this.fadeStart) / this.fadeSeconds);
      this.liveMaterial.opacity = opacity;
      this.carcassMaterial.opacity = opacity;
    }
    for (let i = 0; i < this.carcassCount; i++) {
      const spot = this.carcassSpots[i];
      this.bodyDummy.position.set(spot.x, 0.28, spot.z);
      this.bodyDummy.rotation.set(0, spot.yaw, Math.PI / 2);
      this.bodyDummy.updateMatrix();
      this.carcasses.setMatrixAt(i, this.bodyDummy.matrix);
    }
    this.carcasses.instanceMatrix.needsUpdate = true;
  }
}
