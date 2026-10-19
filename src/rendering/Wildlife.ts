import * as THREE from 'three';
import type { WildlifeSpawn } from '../model/defs/wildlife';
import { faunaTemplate, type FaunaTemplate } from './faunaModels';

/** Hard cap on live animals, regardless of planner output. */
const MAX_ANIMALS = 16;
/** Diagonal gait: front-left + back-right vs front-right + back-left. */
const GAIT_OFFSETS = [0, Math.PI, Math.PI, 0];

interface Animal {
  group: THREE.Group;
  template: FaunaTemplate;
  legs: THREE.Group[];
  wings: { pivot: THREE.Group; side: number }[];
  homeX: number;
  homeZ: number;
  phase: number;
  radius: number;
  angSpeed: number;
  bobPhase: number;
  heightAt: (x: number, z: number) => number;
}

/**
 * Ambient fauna (visual only): llamas/vicuñas graze, condors/pelicans soar.
 * Each animal is a vertex-coloured body plus articulated legs/wings (shared
 * geometry + material). Motion is a deterministic orbit of the spawn point.
 */
export class Wildlife {
  private readonly animals: Animal[] = [];
  private readonly material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  private time = 0;

  constructor(private readonly scene: THREE.Scene) {}

  spawn(spawns: WildlifeSpawn[], heightAt: (x: number, z: number) => number): void {
    for (let i = 0; i < Math.min(spawns.length, MAX_ANIMALS - this.animals.length); i++) {
      const s = spawns[i];
      const n = this.animals.length;
      const t = faunaTemplate(s.id);
      const group = new THREE.Group();
      group.scale.setScalar(s.scale);
      group.name = `fauna_${s.id}`;

      const body = new THREE.Mesh(t.body, this.material);
      body.castShadow = t.ground;
      body.receiveShadow = true;
      group.add(body);

      const legs: THREE.Group[] = [];
      if (t.leg) {
        for (const sx of [-1, 1]) {
          for (const sz of [t.legZFront, t.legZBack]) {
            const pivot = new THREE.Group();
            pivot.position.set(sx * t.legX, t.hipY, sz);
            const mesh = new THREE.Mesh(t.leg, this.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            pivot.add(mesh);
            group.add(pivot);
            legs.push(pivot);
          }
        }
      }

      const wings: { pivot: THREE.Group; side: number }[] = [];
      if (t.wing) {
        for (const side of [-1, 1]) {
          const pivot = new THREE.Group();
          pivot.position.set(side * t.shoulderX, t.shoulderY, t.shoulderZ);
          const mesh = new THREE.Mesh(t.wing, this.material);
          mesh.scale.x = side; // mirror the left wing
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          pivot.add(mesh);
          group.add(pivot);
          wings.push({ pivot, side });
        }
      }

      this.scene.add(group);
      this.animals.push({
        group,
        template: t,
        legs,
        wings,
        homeX: s.x,
        homeZ: s.z,
        phase: n * 2.399, // golden angle: spread the herd apart
        radius: t.ground ? 4 + (n % 4) : 12 + (n % 5) * 2,
        angSpeed: t.ground ? 0.08 + (n % 3) * 0.03 : 0.2 + (n % 2) * 0.1,
        bobPhase: n * 1.7,
        heightAt,
      });
    }
  }

  update(dt: number): void {
    this.time += dt;
    for (const a of this.animals) {
      const angle = a.phase + this.time * a.angSpeed;
      const x = a.homeX + Math.cos(angle) * a.radius;
      const z = a.homeZ + Math.sin(angle) * a.radius;
      const y = a.heightAt(x, z);
      const bob = a.template.ground
        ? Math.abs(Math.sin(this.time * 3 + a.bobPhase)) * 0.03
        : Math.sin(this.time * 1.6 + a.bobPhase) * 0.25;
      a.group.position.set(x, y + a.template.flyHeight + bob, z);
      a.group.rotation.y = angle + Math.PI / 2; // face the direction of travel

      if (a.legs.length) {
        const phase = this.time * a.template.stride + a.bobPhase;
        for (let i = 0; i < a.legs.length; i++) {
          a.legs[i].rotation.x = Math.sin(phase + GAIT_OFFSETS[i % GAIT_OFFSETS.length]) * 0.45;
        }
      }
      for (const w of a.wings) {
        const base = 0.12; // slight dihedral so the wings read as wings
        w.pivot.rotation.z = w.side * (base + Math.sin(this.time * a.template.flap + a.bobPhase) * 0.5);
      }
    }
  }

  dispose(): void {
    for (const a of this.animals) a.group.removeFromParent();
    this.animals.length = 0;
    this.material.dispose();
  }
}
