import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpeciesId, WildlifeSpawn } from '../model/defs/wildlife';

interface Animal {
  group: THREE.Group;
  home: THREE.Vector3;
  dir: number;
  turnTimer: number;
  speed: number;
  phase: number;
  radius: number;
  flyHeight: number;
  ground: boolean;
  heightAt: (x: number, z: number) => number;
}

/**
 * Ambient fauna (visual only): llamas/vicuñas graze, condors/pelicans soar.
 * Small counts, one merged mesh per animal, no entities/obstacles/gameplay.
 */
export class Wildlife {
  private readonly animals: Animal[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private readonly scene: THREE.Scene;

  spawn(spawns: WildlifeSpawn[], heightAt: (x: number, z: number) => number): void {
    for (const s of spawns) {
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
        home: new THREE.Vector3(s.x, 0, s.z),
        dir: s.rotY,
        turnTimer: Math.random() * 3,
        speed: ground ? 0.5 + Math.random() * 0.4 : 1.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        radius: ground ? 5 + Math.random() * 4 : 14 + Math.random() * 8,
        flyHeight,
        ground,
        heightAt,
      });
    }
  }

  update(dt: number): void {
    for (const a of this.animals) {
      a.phase += dt;
      a.turnTimer -= dt;
      if (a.turnTimer <= 0) {
        a.turnTimer = 1.5 + Math.random() * 2.5;
        const dx = a.group.position.x - a.home.x;
        const dz = a.group.position.z - a.home.z;
        if (dx * dx + dz * dz > a.radius * a.radius) {
          a.dir = Math.atan2(-dx, -dz); // head back toward home
        } else {
          a.dir += (Math.random() - 0.5) * 2.2;
        }
      }
      const nx = a.group.position.x + Math.sin(a.dir) * a.speed * dt;
      const nz = a.group.position.z + Math.cos(a.dir) * a.speed * dt;
      a.group.position.x = nx;
      a.group.position.z = nz;
      const gy = a.heightAt(nx, nz);
      const bob = a.ground ? Math.abs(Math.sin(a.phase * 3.2)) * 0.03 : Math.sin(a.phase * 1.6) * 0.25;
      a.group.position.y = gy + a.flyHeight + bob;
      a.group.rotation.y = a.dir;
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
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0): void => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry));
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
    const scale = id === 'llama' ? 1 : 0.8;
    box(0.34, 0.34, 0.8 * scale + 0.4, 0, 0.62, 0); // body
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
