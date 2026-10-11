import * as THREE from 'three';

/**
 * Proyectil balístico/trazador con arco parabólico, estela y daño en área.
 */
export class Projectile {
  id = allocIdProj();
  pos = new THREE.Vector3();
  target = new THREE.Vector3();
  vel = new THREE.Vector3();
  owner: number;
  damage: number;
  area: number;
  kind: string;
  dead = false;
  speed: number;
  arc: number;
  private startY: number;
  private totalDist: number;
  private travelled = 0;
  private mesh: THREE.Mesh | null = null;
  private light: THREE.PointLight | null = null;
  private trailTimer = 0;
  private scene: THREE.Scene;
  private life = 8;
  targetId?: number;
  private onHit?: (targetId: number | undefined) => void;
  private getTargetPos?: () => THREE.Vector3 | null;
  private _tmpTarget = new THREE.Vector3();
  private _toTarget = new THREE.Vector3();

  constructor(scene: THREE.Scene, opts: {
    from: THREE.Vector3;
    target: THREE.Vector3;
    speed: number;
    damage: number;
    kind: string;
    owner: number;
    area?: number;
    arc?: number;
    targetId?: number;
    onHit?: (targetId: number | undefined) => void;
    getTargetPos?: () => THREE.Vector3 | null;
  }) {
    this.scene = scene;
    this.pos.copy(opts.from);
    this.target.copy(opts.target);
    this.owner = opts.owner;
    this.damage = opts.damage;
    this.area = opts.area ?? 0;
    this.kind = opts.kind;
    this.speed = opts.speed;
    this.arc = opts.arc ?? 0;
    this.startY = opts.from.y;
    this.totalDist = this.pos.distanceTo(this.target);
    this.targetId = opts.targetId;
    this.onHit = opts.onHit;
    this.getTargetPos = opts.getTargetPos;

    this.buildMesh();
    if (this.mesh) scene.add(this.mesh);
    if (opts.kind === 'howitzer_shell' || opts.kind === 'rail') {
      this.light = new THREE.PointLight(0xff8844, 2.5, 12);
      scene.add(this.light);
    }
  }

  private buildMesh(): void {
    const cat = projectileCategory(this.kind);
    const assets = getProjectileAssets(cat);
    this.mesh = new THREE.Mesh(assets.geo, assets.mat);
    if (cat === 'tracer' || cat === 'bullet') this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.copy(this.pos);
    this.mesh.castShadow = true;
  }

  update(dt: number): void {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.remove();
      return;
    }

    // homing: re-apuntar al centro del objetivo si sigue vivo (flechas AoE2)
    if (this.targetId !== undefined && this.getTargetPos && this.kind !== 'howitzer_shell' && this.kind !== 'nuclear') {
      const tp = this.getTargetPos();
      if (tp) {
        this._tmpTarget.copy(tp);
        this._tmpTarget.y += 0.5;
        this.target.copy(this._tmpTarget);
      }
    }

    const toTarget = this._toTarget.subVectors(this.target, this.pos);
    const dist = toTarget.length();
    const step = this.speed * dt;
    if (dist < step) {
      this.pos.copy(this.target);
      this.hit();
      return;
    }

    const dir = toTarget.normalize();
    this.pos.addScaledVector(dir, step);
    this.travelled += step;

    // arco parabólico
    if (this.arc > 0) {
      const t = Math.min(this.travelled / this.totalDist, 1);
      this.pos.y = this.startY + (this.target.y - this.startY) * t + this.arc * 8 * Math.sin(Math.PI * t);
    }

    if (this.mesh) this.mesh.position.copy(this.pos);
    if (this.light) {
      this.light.position.copy(this.pos);
      this.light.intensity = 2.5 + Math.random() * 1.5;
    }

    // estela
    if (this.kind === 'tracer' || this.kind === 'bullet') {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.02;
        emitTrail(this.scene, this.pos);
      }
    }
  }

  private hit(): void {
    this.dead = true;
    const scene = this.scene;
    emitImpact(scene, this.pos, this.kind, this.area > 0);
    this.onHit?.(this.targetId);
    if (this.light) {
      scene.remove(this.light);
      this.light = null;
    }
    this.remove();
  }

  remove(): void {
    this.dead = true;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      // geometría y material son compartidos por categoría: no se disponen aquí
      this.mesh = null;
    }
    if (this.light) {
      this.scene.remove(this.light);
      this.light = null;
    }
  }
}

type ProjectileCategory = 'laser' | 'tracer' | 'shell' | 'bullet';

function projectileCategory(kind: string): ProjectileCategory {
  if (kind === 'laser' || kind === 'rail') return 'laser';
  if (kind === 'tracer') return 'tracer';
  if (kind === 'howitzer_shell' || kind === 'nuclear') return 'shell';
  return 'bullet';
}

const projAssets = new Map<ProjectileCategory, { geo: THREE.BufferGeometry; mat: THREE.Material }>();

function getProjectileAssets(cat: ProjectileCategory): { geo: THREE.BufferGeometry; mat: THREE.Material } {
  let a = projAssets.get(cat);
  if (!a) {
    if (cat === 'laser') {
      a = { geo: new THREE.SphereGeometry(0.14, 8, 8), mat: new THREE.MeshBasicMaterial({ color: 0x66ccff }) };
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

let projId = 1;
function allocIdProj(): number {
  return projId++;
}

const trailPool: { mesh: THREE.Mesh; life: number; vel: THREE.Vector3 }[] = [];
const impactPool: { mesh: THREE.Mesh; life: number }[] = [];

function emitTrail(scene: THREE.Scene, pos: THREE.Vector3): void {
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
  p.mesh.position.copy(pos);
  p.mesh.visible = true;
  (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
  p.life = 0.22;
  p.mesh.scale.setScalar(1);
}

function emitImpact(scene: THREE.Scene, pos: THREE.Vector3, kind: string, area: boolean): void {
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
  p.mesh.position.copy(pos);
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
