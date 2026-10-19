import * as THREE from 'three';

interface Chunk {
  active: boolean;
  life: number;
  maxLife: number;
  size: number;
  bounce: boolean;
  groundY: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  axis: THREE.Vector3;
  angle: number;
  spin: number;
}

const GRAVITY = 16;

/**
 * Small instanced debris chunks for building collapses: they fly out, fall, spin
 * and bounce once, then shrink away. A fixed pool (no allocation per collapse).
 */
export class Debris {
  readonly mesh: THREE.InstancedMesh;
  private readonly pool: Chunk[];
  private readonly dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, max = 96) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8f8070, roughness: 0.95, metalness: 0, vertexColors: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'debris';
    scene.add(this.mesh);

    this.pool = new Array(max).fill(0).map(() => ({
      active: false,
      life: 0,
      maxLife: 1,
      size: 0.3,
      bounce: false,
      groundY: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      axis: new THREE.Vector3(0, 1, 0),
      angle: 0,
      spin: 0,
    }));
    this.writeAll();
  }

  /** Launch `count` chunks outward from a point; they settle at `groundY`. */
  spawn(x: number, y: number, z: number, count: number, radius: number, groundY: number): void {
    for (let i = 0; i < count; i++) {
      const c = this.pool.find((p) => !p.active);
      if (!c) return;
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      c.active = true;
      c.maxLife = c.life = 0.9 + Math.random() * 0.7;
      c.size = 0.18 + Math.random() * 0.28;
      c.bounce = false;
      c.groundY = groundY;
      c.pos.set(
        x + (Math.random() - 0.5) * radius,
        y + Math.random() * radius * 0.6,
        z + (Math.random() - 0.5) * radius,
      );
      c.vel.set(Math.cos(a) * speed, 3 + Math.random() * 3.5, Math.sin(a) * speed);
      c.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      c.angle = Math.random() * Math.PI;
      c.spin = (Math.random() - 0.5) * 14;
    }
  }

  update(dt: number): void {
    let any = false;
    for (const c of this.pool) {
      if (!c.active) continue;
      any = true;
      c.angle += c.spin * dt;
      c.vel.y -= GRAVITY * dt;
      c.pos.addScaledVector(c.vel, dt);
      const ground = c.groundY + 0.12;
      if (c.pos.y < ground) {
        c.pos.y = ground;
        if (!c.bounce && Math.abs(c.vel.y) > 1.5) {
          c.bounce = true;
          c.vel.y = Math.abs(c.vel.y) * 0.35;
          c.vel.x *= 0.5;
          c.vel.z *= 0.5;
          c.spin *= 0.5;
        } else {
          c.vel.set(0, 0, 0);
          c.spin *= 0.7;
        }
      }
      c.life -= dt;
      if (c.life <= 0) c.active = false;
    }
    this.writeAll();
    this.mesh.visible = any;
  }

  private writeAll(): void {
    this.dummy.rotation.set(0, 0, 0);
    for (let i = 0; i < this.pool.length; i++) {
      const c = this.pool[i];
      const fade = c.active ? Math.min(1, c.life / (c.maxLife * 0.4)) : 0;
      this.dummy.position.copy(c.pos);
      this.dummy.quaternion.setFromAxisAngle(c.axis, c.angle);
      this.dummy.scale.setScalar(c.active ? c.size * fade : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
