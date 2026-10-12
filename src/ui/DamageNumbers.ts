import * as THREE from 'three';

type DamageKind = 'normal' | 'big' | 'heal';

const COLORS: Record<DamageKind, string> = {
  normal: '#fff2c4',
  big: '#ff6a3a',
  heal: '#7ae07a',
};

interface NumberItem {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  age: number;
  life: number;
  active: boolean;
}

/**
 * Floating damage/heal numbers. They are DOM elements reprojected every
 * frame, so they stay anchored to the world point even if the camera moves.
 */
export class DamageNumbers {
  private pool: NumberItem[] = [];
  private active: NumberItem[] = [];
  private tmp = new THREE.Vector3();

  constructor(
    private container: HTMLElement,
    private max = 40,
  ) {}

  private acquire(): NumberItem | null {
    const free = this.pool.find((p) => !p.active);
    if (free) return free;
    if (this.pool.length >= this.max) return null;
    const el = document.createElement('div');
    el.className = 'ed-dmg';
    this.container.appendChild(el);
    const item: NumberItem = { el, pos: new THREE.Vector3(), age: 0, life: 0, active: false };
    this.pool.push(item);
    return item;
  }

  spawn(x: number, y: number, z: number, amount: number, kind: DamageKind = 'normal'): void {
    const item = this.acquire();
    if (!item) return;
    const rounded = Math.max(1, Math.round(amount));
    item.el.textContent = kind === 'heal' ? `+${rounded}` : `-${rounded}`;
    item.el.style.color = COLORS[kind];
    item.el.style.fontSize = (kind === 'big' ? 20 : 15) + 'px';
    item.el.style.opacity = '1';
    item.pos.set(x, y, z);
    item.age = 0;
    item.life = 1.0;
    item.active = true;
    item.el.style.display = 'block';
    this.active.push(item);
  }

  update(camera: THREE.Camera, dt: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      const t = item.age / item.life;
      if (t >= 1) {
        item.active = false;
        item.el.style.display = 'none';
        this.active.splice(i, 1);
        continue;
      }
      this.tmp.copy(item.pos).project(camera);
      const sx = (this.tmp.x * 0.5 + 0.5) * w;
      const sy = (-this.tmp.y * 0.5 + 0.5) * h;
      const rise = t * 34;
      item.el.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px, ${(sy - rise).toFixed(1)}px)`;
      item.el.style.opacity = String(Math.max(0, 1 - t * t));
    }
  }

  clear(): void {
    for (const item of this.pool) {
      item.active = false;
      item.el.style.display = 'none';
      item.el.remove();
    }
    this.pool.length = 0;
    this.active.length = 0;
  }
}
