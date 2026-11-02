import * as THREE from 'three';
import { cosmeticRandom } from '../util/rng';
import type { Projectile } from '../entities/Projectile';

type ProjectileCategory = 'arrow' | 'sling' | 'tracer' | 'shell' | 'bullet';

function projectileCategory(kind: string): ProjectileCategory {
  if (kind === 'arrow') return 'arrow';
  if (kind === 'sling_stone') return 'sling';
  if (kind === 'tracer') return 'tracer';
  if (kind === 'howitzer_shell' || kind === 'nuclear') return 'shell';
  return 'bullet';
}

const projAssets = new Map<ProjectileCategory, { geo: THREE.BufferGeometry; mat: THREE.Material }>();

function getProjectileAssets(cat: ProjectileCategory): { geo: THREE.BufferGeometry; mat: THREE.Material } {
  let a = projAssets.get(cat);
  if (!a) {
    if (cat === 'arrow') {
      a = {
        geo: new THREE.CylinderGeometry(0.02, 0.02, 0.65, 5),
        mat: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 }),
      };
    } else if (cat === 'sling') {
      a = { geo: new THREE.SphereGeometry(0.09, 6, 5), mat: new THREE.MeshStandardMaterial({ color: 0x6f6a5f }) };
    } else if (cat === 'tracer') {
      a = { geo: new THREE.CapsuleGeometry(0.03, 0.5, 2, 6), mat: new THREE.MeshBasicMaterial({ color: 0xffdd66 }) };
    } else if (cat === 'shell') {
      a = {
        geo: new THREE.ConeGeometry(0.16, 0.5, 8),
        mat: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.4 }),
      };
    } else {
      a = { geo: new THREE.CapsuleGeometry(0.025, 0.2, 2, 5), mat: new THREE.MeshBasicMaterial({ color: 0xffcc88 }) };
    }
    projAssets.set(cat, a);
  }
  return a;
}

const ARROW_UP = new THREE.Vector3(0, 1, 0);

/** Mesh/light/trail for one simulated projectile. */
export class ProjectileView {
  private readonly mesh: THREE.Mesh;
  private light: THREE.PointLight | null = null;
  private trailTimer = 0;
  private impactEmitted = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly projectile: Projectile,
  ) {
    const cat = projectileCategory(projectile.kind);
    const assets = getProjectileAssets(cat);
    this.mesh = new THREE.Mesh(assets.geo, assets.mat);
    if (cat === 'tracer' || cat === 'bullet' || cat === 'arrow') this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.copy(projectile.pos);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    if (projectile.kind === 'howitzer_shell' || projectile.kind === 'nuclear') {
      this.light = new THREE.PointLight(0xff8844, 2.5, 12);
      scene.add(this.light);
    }
  }

  sync(dt: number): void {
    const p = this.projectile;
    this.mesh.position.copy(p.pos);
    if (p.kind === 'arrow') this.mesh.quaternion.setFromUnitVectors(ARROW_UP, p.dir);
    if (this.light) {
      this.light.position.copy(p.pos);
      this.light.intensity = 2.5 + cosmeticRandom() * 1.5;
    }
    if (p.dead) {
      if (p.impact && !this.impactEmitted) {
        this.impactEmitted = true;
        emitImpact(this.scene, p.pos, p.kind, p.area > 0);
      }
      this.dispose();
      return;
    }
    if (p.kind === 'tracer' || p.kind === 'bullet') {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.02;
        emitTrail(this.scene, p.pos);
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    if (this.light) {
      this.scene.remove(this.light);
      this.light = null;
    }
  }
}

const trailPool: { mesh: THREE.Mesh; life: number; vel: THREE.Vector3 }[] = [];
const impactPool: { mesh: THREE.Mesh; life: number }[] = [];

function emitTrail(scene: THREE.Scene, pos: { x: number; y: number; z: number }): void {
  let p = trailPool.find((x) => x.life <= 0);
  if (!p) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 5, 5),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.7 }),
    );
    p = { mesh, life: 0, vel: new THREE.Vector3() };
    scene.add(mesh);
    trailPool.push(p);
  }
  p.mesh.position.set(pos.x, pos.y, pos.z);
  p.mesh.visible = true;
  (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
  p.life = 0.22;
  p.mesh.scale.setScalar(1);
}

function emitImpact(scene: THREE.Scene, pos: { x: number; y: number; z: number }, kind: string, area: boolean): void {
  const color = kind === 'nuclear' ? 0x88ffcc : area ? 0xffaa55 : 0xffdd66;
  let p = impactPool.find((x) => x.life <= 0);
  if (!p) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    p = { mesh, life: 0 };
    scene.add(mesh);
    impactPool.push(p);
  }
  p.mesh.position.set(pos.x, pos.y, pos.z);
  p.mesh.visible = true;
  (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
  p.life = 0.25;
  p.mesh.scale.setScalar(area ? 1.5 : 0.8);
}

export function updateProjectilePools(dt: number): void {
  for (const p of trailPool) {
    if (p.life > 0) {
      p.life -= dt;
      p.mesh.scale.multiplyScalar(1.6);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.6;
      if (p.life <= 0) p.mesh.visible = false;
    }
  }
  for (const p of impactPool) {
    if (p.life > 0) {
      p.life -= dt;
      p.mesh.scale.multiplyScalar(1.9);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.6;
      if (p.life <= 0) p.mesh.visible = false;
    }
  }
}
