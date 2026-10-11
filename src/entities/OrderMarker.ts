import * as THREE from 'three';

type MarkerKind = 'move' | 'attack' | 'gather';

const COLORS: Record<MarkerKind, number> = {
  move: 0x6ad06a,
  attack: 0xff5252,
  gather: 0xffd24a,
};

interface Marker {
  ring: THREE.Mesh;
  dot: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  active: boolean;
}

/**
 * Ground order markers (target): a circle that expands with
 * a center dot, shown when issuing a move/attack/gather order.
 */
export class OrderMarkers {
  private ringGeo: THREE.RingGeometry;
  private dotGeo: THREE.CircleGeometry;
  private pool: Marker[] = [];
  private active: Marker[] = [];

  constructor(private scene: THREE.Scene, size = 20) {
    this.ringGeo = new THREE.RingGeometry(0.55, 0.85, 32);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.dotGeo = new THREE.CircleGeometry(0.14, 16);
    this.dotGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(this.ringGeo, mat);
      ring.visible = false;
      ring.renderOrder = 5;
      this.scene.add(ring);
      const dot = new THREE.Mesh(this.dotGeo, mat);
      dot.visible = false;
      dot.renderOrder = 6;
      this.scene.add(dot);
      this.pool.push({ ring, dot, mat, age: 0, life: 1, active: false });
    }
  }

  spawn(x: number, y: number, z: number, kind: MarkerKind): void {
    let m = this.pool.find((p) => !p.active);
    if (!m) {
      m = this.active[0];
      if (!m) return;
      this.active.shift();
    }
    m.active = true;
    m.age = 0;
    m.life = 1.1;
    m.mat.color.setHex(COLORS[kind]);
    m.mat.opacity = 0.95;
    m.ring.position.set(x, y + 0.08, z);
    m.ring.scale.setScalar(0.6);
    m.ring.visible = true;
    m.dot.position.set(x, y + 0.08, z);
    m.dot.visible = true;
    this.active.push(m);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      m.age += dt;
      const t = m.age / m.life;
      if (t >= 1) {
        m.ring.visible = false;
        m.dot.visible = false;
        m.active = false;
        this.active.splice(i, 1);
        continue;
      }
      const s = 0.6 + t * 1.1;
      m.ring.scale.setScalar(s);
      m.mat.opacity = 0.95 * (1 - t);
    }
  }

  get activeCount(): number {
    return this.active.length;
  }

  dispose(): void {
    this.ringGeo.dispose();
    this.dotGeo.dispose();
    for (const m of this.pool) {
      m.mat.dispose();
      m.ring.removeFromParent();
      m.dot.removeFromParent();
    }
    this.pool.length = 0;
    this.active.length = 0;
  }
}
