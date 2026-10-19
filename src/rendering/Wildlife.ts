import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpeciesId, WildlifeSpawn } from '../model/defs/wildlife';

/** Hard cap on live animals (one merged mesh each), regardless of planner output. */
const MAX_ANIMALS = 16;

interface Animal {
  group: THREE.Group;
  homeX: number;
  homeZ: number;
  phase: number;
  radius: number;
  angSpeed: number;
  bobPhase: number;
  flyHeight: number;
  ground: boolean;
  heightAt: (x: number, z: number) => number;
}

/**
 * Ambient fauna (visual only): llamas/vicuñas graze, condors/pelicans soar.
 * Motion is a deterministic orbit of the spawn point (no randomness), so it is
 * stable across runs; one merged mesh per animal, no entities/obstacles/gameplay.
 */
export class Wildlife {
  private readonly animals: Animal[] = [];
  private readonly materials: THREE.Material[] = [];
  private time = 0;

  constructor(private readonly scene: THREE.Scene) {}

  spawn(spawns: WildlifeSpawn[], heightAt: (x: number, z: number) => number): void {
    for (let i = 0; i < Math.min(spawns.length, MAX_ANIMALS - this.animals.length); i++) {
      const s = spawns[i];
      const n = this.animals.length;
      const { geo, color, flyHeight, ground } = buildAnimalGeometry(s.id);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
      this.materials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = ground;
      const group = new THREE.Group();
      group.add(mesh);
      group.scale.setScalar(s.scale);
      group.name = `fauna_${s.id}`;
      this.scene.add(group);
      this.animals.push({
        group,
        homeX: s.x,
        homeZ: s.z,
        phase: n * 2.399, // golden angle: spread the herd/locations apart
        radius: ground ? 4 + (n % 4) : 12 + (n % 5) * 2,
        angSpeed: ground ? 0.08 + (n % 3) * 0.03 : 0.2 + (n % 2) * 0.1,
        bobPhase: n * 1.7,
        flyHeight,
        ground,
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
      const bob = a.ground
        ? Math.abs(Math.sin(this.time * 3 + a.bobPhase)) * 0.03
        : Math.sin(this.time * 1.6 + a.bobPhase) * 0.25;
      a.group.position.set(x, y + a.flyHeight + bob, z);
      a.group.rotation.y = angle + Math.PI / 2; // face the direction of travel
    }
  }

  dispose(): void {
    for (const a of this.animals) {
      const mesh = a.group.children[0] as THREE.Mesh;
      mesh.geometry.dispose();
      a.group.removeFromParent();
    }
    this.animals.length = 0;
    this.materials.forEach((m) => m.dispose());
  }
}

function buildAnimalGeometry(id: SpeciesId): {
  geo: THREE.BufferGeometry;
  color: string;
  flyHeight: number;
  ground: boolean;
} {
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  };
  const leg = (x: number, z: number, h: number): void => {
    const g = new THREE.CylinderGeometry(0.045, 0.05, h, 5);
    g.translate(x, h / 2, z);
    parts.push(g);
  };

  let color: string;
  let flyHeight = 0;
  let ground = true;

  if (id === 'llama' || id === 'vicuna') {
    const bodyD = id === 'llama' ? 1.2 : 1.0;
    box(0.34, 0.34, bodyD, 0, 0.62, 0); // body
    box(0.16, 0.5, 0.16, 0, 0.95, 0.34); // neck
    box(0.18, 0.16, 0.3, 0, 1.2, 0.44); // head
    leg(-0.12, 0.28, 0.5);
    leg(0.12, 0.28, 0.5);
    leg(-0.12, -0.28, 0.5);
    leg(0.12, -0.28, 0.5);
    color = id === 'llama' ? '#8a6a4a' : '#b2916a';
  } else if (id === 'condor') {
    box(0.3, 0.22, 0.7, 0, 0, 0); // body
    box(1.5, 0.04, 0.28, 0, 0.05, 0); // wings
    box(0.14, 0.14, 0.2, 0, 0.1, 0.42); // head
    color = '#2b2b30';
    flyHeight = 9;
    ground = false;
  } else {
    box(0.32, 0.26, 0.6, 0, 0, 0);
    box(1.1, 0.04, 0.24, 0, 0.05, 0);
    const beak = new THREE.ConeGeometry(0.06, 0.34, 5);
    beak.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    beak.translate(0, 0.04, 0.44);
    parts.push(beak);
    color = '#e2e5e6';
    flyHeight = 6;
    ground = false;
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return { geo: merged, color, flyHeight, ground };
}
