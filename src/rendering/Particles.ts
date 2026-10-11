import * as THREE from 'three';
import { RNG } from '../util/rng';

type P = {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  drag: number;
  color: THREE.Color;
  alphaCurve: number[];
  gravity: number;
  kindVal: number;
  emissive: boolean;
};

/**
 * Particle system via points instancing with color/size
 * attributes. Used for smoke, fire, sparks, dust, explosions,
 * tracers and flares.
 */
export class Particles {
  private points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  private pool: P[];
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private dataAttr: THREE.BufferAttribute; // life t, seed, kind, emissive
  private cursor = 0;
  private clock = 0;
  private rng = new RNG(7);

  constructor(scene: THREE.Scene, max = 4096) {
    const positions = new Float32Array(max * 3);
    const colors = new Float32Array(max * 3);
    const sizes = new Float32Array(max);
    const data = new Float32Array(max * 4);

    this.posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
    this.dataAttr = new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aColor', this.colAttr);
    this.geo.setAttribute('aSize', this.sizeAttr);
    this.geo.setAttribute('aData', this.dataAttr);

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: { time: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute vec4 aData; // lifeT, seed, kind, emissive
        varying vec3 vColor;
        varying float vAlpha;
        varying float vEmissive;
        uniform float time;
        void main() {
          vColor = aColor;
          vEmissive = aData.w;
          float t = aData.x;
          // curva de alfa según tipo
          float alpha;
          float kind = aData.y;
          float seed = aData.z;
          if (kind < 0.5) { // humo: sube, crece, fade suave
            alpha = (1.0 - t) * (0.45 + 0.2 * sin(seed * 40.0));
          } else if (kind < 1.5) { // fuego
            alpha = sin(t * 3.14159) * 0.95;
          } else if (kind < 2.5) { // chispa
            alpha = (1.0 - t);
          } else if (kind < 3.5) { // explosión flash
            alpha = (1.0 - t) * (1.0 - t);
          } else if (kind < 4.5) { // polvo
            alpha = (1.0 - t) * 0.5;
          } else { // bengala
            alpha = 1.0;
          }
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (1.0 + t * 1.5) * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vEmissive;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.5, 0.05, d);
          if (vEmissive > 0.5) {
            // sprite brillante con núcleo
            float core = smoothstep(0.18, 0.02, d);
            vec3 col = vColor + vec3(1.0, 0.95, 0.8) * core * 0.8;
            gl_FragColor = vec4(col, soft * vAlpha);
          } else {
            float rim = smoothstep(0.5, 0.2, d);
            float center = smoothstep(0.5, 0.42, d);
            float alpha = rim * (0.55 + center * 0.45) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
          }
        }
      `,
    });

    this.pool = new Array(max).fill(0).map(() => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      size: 4,
      grow: 0,
      drag: 0.9,
      color: new THREE.Color(),
      alphaCurve: [0.5],
      gravity: 0,
      kindVal: 0,
      emissive: true,
    }));

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(opts: {
    x: number;
    y: number;
    z: number;
    count?: number;
    color?: string | number;
    speed?: number;
    life?: number;
    size?: number;
    grow?: number;
    kind?: 'humo' | 'fuego' | 'chispa' | 'explosion' | 'polvo' | 'bengala';
    spread?: number;
    gravity?: number;
    emissive?: boolean;
  }): void {
    const count = opts.count ?? 1;
    const kind = opts.kind ?? 'humo';
    const kindVal =
      kind === 'humo' ? 0 : kind === 'fuego' ? 1 : kind === 'chispa' ? 2 : kind === 'explosion' ? 3 : kind === 'polvo' ? 4 : 5;
    const baseColor = new THREE.Color(opts.color ?? 0xaaaaaa);
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      p.active = true;
      p.kindVal = kindVal;
      p.emissive = opts.emissive ?? (kind === 'fuego' || kind === 'explosion' || kind === 'bengala' || kind === 'chispa');
      p.pos.set(opts.x, opts.y, opts.z);
      const spread = opts.spread ?? 1;
      p.vel.set(
        (this.rng.float() - 0.5) * spread,
        opts.kind === 'humo' ? opts.speed ?? 1.2 : (this.rng.float() - 0.5) * spread,
        (this.rng.float() - 0.5) * spread,
      );
      if (kind === 'humo') {
        p.vel.y = (opts.speed ?? 1.4) * (0.7 + this.rng.float() * 0.6);
        p.vel.x *= 0.3;
        p.vel.z *= 0.3;
      }
      p.maxLife = p.life = (opts.life ?? 1) * (0.75 + this.rng.float() * 0.5);
      p.size = (opts.size ?? 3) * (0.8 + this.rng.float() * 0.5);
      p.grow = opts.grow ?? 1.5;
      p.drag = 0.88;
      p.gravity = opts.gravity ?? 0;
      p.color.copy(baseColor).multiplyScalar(0.75 + this.rng.float() * 0.5);
    }
  }

  update(dt: number): void {
    this.clock += dt;
    let active = 0;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      active++;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(p.drag);
      p.vel.y -= p.gravity * dt;
      p.size += p.grow * dt;
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
    }
    if (active > 0) {
      this.points.visible = true;
      this.upload();
    } else if (this.points.visible) {
      // hide and clean up once when emptied
      this.points.visible = false;
      this.upload();
    }
  }

  private upload(): void {
    const pos = this.posAttr.array as Float32Array;
    const col = this.colAttr.array as Float32Array;
    const size = this.sizeAttr.array as Float32Array;
    const data = this.dataAttr.array as Float32Array;
    let w = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      const alive = p.active;
      const t = p.active ? 1 - p.life / p.maxLife : 1;
      const seed = ((i * 2654435761) >>> 0) / 4294967296;
      pos[w * 3] = alive ? p.pos.x : 0;
      pos[w * 3 + 1] = alive ? p.pos.y : -9999;
      pos[w * 3 + 2] = alive ? p.pos.z : 0;
      col[w * 3] = p.color.r;
      col[w * 3 + 1] = p.color.g;
      col[w * 3 + 2] = p.color.b;
      size[w] = alive ? p.size : 0;
      data[w * 4] = t;
      data[w * 4 + 1] = p.kindVal;
      data[w * 4 + 2] = seed;
      data[w * 4 + 3] = p.emissive ? 1 : 0;
      w++;
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.dataAttr.needsUpdate = true;
    this.mat.uniforms.time.value = this.clock;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.upload();
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.points.removeFromParent();
  }
}
