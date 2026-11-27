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
  gravity: number;
  kindVal: number;
  emissive: boolean;
};

type Layer = {
  points: THREE.Points;
  geo: THREE.BufferGeometry;
  mat: THREE.ShaderMaterial;
  pool: P[];
  posAttr: THREE.BufferAttribute;
  colAttr: THREE.BufferAttribute;
  sizeAttr: THREE.BufferAttribute;
  dataAttr: THREE.BufferAttribute;
  cursor: number;
};

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute vec4 aData; // lifeT, kind, seed, emissive
  varying vec3 vColor;
  varying float vAlpha;
  varying float vEmissive;
  varying float vKind;
  uniform float time;
  void main() {
    float t = aData.x;
    float kind = aData.y;
    float seed = aData.z;
    vEmissive = aData.w;
    vKind = kind;
    vColor = aColor;
    // Fire runs from #fff2b0 to #ff8a2a to #a02a10 as it ages.
    if (kind > 0.5 && kind < 1.5) {
      vec3 hot = vec3(1.0, 0.949, 0.690);
      vec3 mid = vec3(1.0, 0.541, 0.165);
      vec3 cold = vec3(0.627, 0.165, 0.063);
      vColor = t < 0.5 ? mix(hot, mid, t * 2.0) : mix(mid, cold, (t - 0.5) * 2.0);
    }
    float alpha;
    if (kind < 0.5) { // smoke: rises, grows, soft fade
      alpha = (1.0 - t) * (0.45 + 0.2 * sin(seed * 40.0));
    } else if (kind < 1.5) { // fire
      alpha = sin(t * 3.14159) * 0.95;
      // Per-particle flicker, not a shared pulse.
      alpha *= 0.82 + 0.18 * sin(seed * 61.0 + time * 13.0);
    } else if (kind < 2.5) { // spark
      alpha = (1.0 - t);
    } else if (kind < 3.5) { // flash explosion
      alpha = (1.0 - t) * (1.0 - t);
    } else if (kind < 4.5) { // dust
      alpha = (1.0 - t) * 0.5;
    } else { // flare
      alpha = 1.0;
    }
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Fire licks upward and shrinks as it burns; smoke and dust keep growing.
    float grow = (kind > 0.5 && kind < 1.5) ? (1.0 - t * 0.6) : (1.0 + t * 1.5);
    gl_PointSize = aSize * grow * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vEmissive;
  varying float vKind;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    // The fire sprite is a teardrop: the tail stretches away from the hot core.
    if (vKind > 0.5 && vKind < 1.5) uv.y = (uv.y - 0.08) * 1.45;
    float d = length(uv);
    float soft = smoothstep(0.5, 0.05, d);
    if (vEmissive > 0.5) {
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
`;

function createLayer(scene: THREE.Scene, max: number, additive: boolean): Layer {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const sizes = new Float32Array(max);
  const data = new Float32Array(max * 4);
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
  const dataAttr = new THREE.BufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aColor', colAttr);
  geo.setAttribute('aSize', sizeAttr);
  geo.setAttribute('aData', dataAttr);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { time: { value: 0 } },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const pool = new Array(max).fill(0).map(() => ({
    active: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    life: 0,
    maxLife: 1,
    size: 4,
    grow: 0,
    drag: 0.9,
    color: new THREE.Color(),
    gravity: 0,
    kindVal: 0,
    emissive: additive,
  }));
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  return { points, geo, mat, pool, posAttr, colAttr, sizeAttr, dataAttr, cursor: 0 };
}

/**
 * Particle system via points instancing with color/size attributes. Smoke and dust stay on a
 * normal-blended layer; fire, sparks, explosions and flares live on an additive one, so the glow does
 * not turn the smoke into a lantern. The public `emit` API is unchanged.
 */
export class Particles {
  private readonly normal: Layer;
  private readonly additive: Layer;
  private readonly layers: Layer[];
  private clock = 0;
  private rng = new RNG(7);

  constructor(scene: THREE.Scene, max = 4096) {
    // Fire is the common case in a burning building or a volley; give the additive layer half the pool.
    this.normal = createLayer(scene, Math.ceil(max * 0.5), false);
    this.additive = createLayer(scene, Math.floor(max * 0.5), true);
    this.layers = [this.normal, this.additive];
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
    kind?: 'smoke' | 'fire' | 'spark' | 'explosion' | 'dust' | 'flare';
    spread?: number;
    gravity?: number;
    emissive?: boolean;
  }): void {
    const count = opts.count ?? 1;
    const kind = opts.kind ?? 'smoke';
    const kindVal =
      kind === 'smoke'
        ? 0
        : kind === 'fire'
          ? 1
          : kind === 'spark'
            ? 2
            : kind === 'explosion'
              ? 3
              : kind === 'dust'
                ? 4
                : 5;
    const emissive = opts.emissive ?? (kind === 'fire' || kind === 'explosion' || kind === 'flare' || kind === 'spark');
    const layer = emissive ? this.additive : this.normal;
    const baseColor = new THREE.Color(opts.color ?? 0xaaaaaa);
    for (let i = 0; i < count; i++) {
      const p = layer.pool[layer.cursor];
      layer.cursor = (layer.cursor + 1) % layer.pool.length;
      p.active = true;
      p.kindVal = kindVal;
      p.emissive = emissive;
      p.pos.set(opts.x, opts.y, opts.z);
      const spread = opts.spread ?? 1;
      p.vel.set(
        (this.rng.float() - 0.5) * spread,
        opts.kind === 'smoke' ? (opts.speed ?? 1.2) : (this.rng.float() - 0.5) * spread,
        (this.rng.float() - 0.5) * spread,
      );
      if (kind === 'smoke') {
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

  /**
   * Gunpowder flash at a muzzle. Heavy ordnance gets a full emissive bloom plus grey smoke; a firearm
   * gets a short, small flash. Arrows and sling stones never call this.
   */
  emitGunFlash(x: number, y: number, z: number, heavy: boolean): void {
    if (heavy) {
      this.emit({ x, y, z, count: 14, color: 0xffd27a, kind: 'fire', speed: 2.4, life: 0.4, size: 2.2, spread: 1.8 });
      this.emit({
        x,
        y,
        z,
        count: 10,
        color: 0xffe8a8,
        kind: 'explosion',
        speed: 1.6,
        life: 0.35,
        size: 1.6,
        spread: 1.4,
      });
      this.emit({ x, y: y + 0.3, z, count: 8, color: 0x77736a, kind: 'smoke', speed: 1.3, life: 1.4, size: 1.5 });
      return;
    }
    this.emit({ x, y, z, count: 6, color: 0xffd27a, kind: 'fire', speed: 1.5, life: 0.18, size: 1.1, spread: 0.9 });
  }

  update(dt: number): void {
    this.clock += dt;
    for (const layer of this.layers) {
      let active = 0;
      for (const p of layer.pool) {
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
        layer.points.visible = true;
        this.upload(layer);
      } else if (layer.points.visible) {
        layer.points.visible = false;
        this.upload(layer);
      }
    }
  }

  private upload(layer: Layer): void {
    const pos = layer.posAttr.array as Float32Array;
    const col = layer.colAttr.array as Float32Array;
    const size = layer.sizeAttr.array as Float32Array;
    const data = layer.dataAttr.array as Float32Array;
    let w = 0;
    for (let i = 0; i < layer.pool.length; i++) {
      const p = layer.pool[i];
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
    layer.posAttr.needsUpdate = true;
    layer.colAttr.needsUpdate = true;
    layer.sizeAttr.needsUpdate = true;
    layer.dataAttr.needsUpdate = true;
    layer.mat.uniforms.time.value = this.clock;
  }

  clear(): void {
    for (const layer of this.layers) {
      for (const p of layer.pool) p.active = false;
      this.upload(layer);
    }
  }

  dispose(): void {
    for (const layer of this.layers) {
      layer.geo.dispose();
      layer.mat.dispose();
      layer.points.removeFromParent();
    }
  }
}
