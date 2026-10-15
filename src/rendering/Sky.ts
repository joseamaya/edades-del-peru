import * as THREE from 'three';
import { fbm2 } from '../util/noise';

/**
 * Procedural sky with atmospheric scattering, sun disk with halo,
 * volumetric clouds (billboard layer with noise) and day/night cycle.
 */
export class Sky {
  group = new THREE.Group();
  private dome: THREE.Mesh;
  private sunDisc: THREE.Mesh;
  private sunGlow: THREE.Sprite;
  private moonDisc: THREE.Mesh;
  private cloudLayer: THREE.Mesh;
  private stars: THREE.Points;
  private light: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;

  sunDir = new THREE.Vector3(0.5, 0.7, 0.4).normalize();
  sunColor = new THREE.Color(0xfff2dd);
  timeOfDay = 0.5; // 0 night .. 1 day
  /** Region atmosphere: horizon tint and sun warmth (1 = neutral). */
  private atmTint = new THREE.Color(0xffffff);
  private warmth = 1;

  constructor(scene: THREE.Scene) {
    this.light = new THREE.DirectionalLight(0xffffff, 2.0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(4096, 4096);
    this.light.shadow.camera.left = -220;
    this.light.shadow.camera.right = 220;
    this.light.shadow.camera.top = 220;
    this.light.shadow.camera.bottom = -220;
    this.light.shadow.camera.far = 1200;
    this.light.shadow.bias = -0.0003;
    this.light.shadow.normalBias = 0.06;
    this.light.shadow.radius = 1.5;
    this.light.shadow.blurSamples = 6;
    scene.add(this.light);

    this.hemi = new THREE.HemisphereLight(0xcdd6e6, 0x55664a, 0.4);
    scene.add(this.hemi);

    this.dome = this.buildDome();
    this.cloudLayer = this.buildClouds();
    this.sunDisc = this.buildSun();
    this.sunGlow = this.buildGlow();
    this.moonDisc = this.buildMoon();
    this.stars = this.buildStars();

    scene.add(this.dome, this.cloudLayer, this.sunDisc, this.sunGlow, this.moonDisc, this.stars);
  }

  private buildDome(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(4800, 32, 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1a4a) },
        horizonColor: { value: new THREE.Color(0xc8d9e8) },
        sunDir: { value: new THREE.Vector3() },
        sunColor: { value: new THREE.Color(0xffddaa) },
        sunIntensity: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform float sunIntensity;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(horizonColor, topColor, pow(h, 0.55));
          // orange blend near the horizon (sunset)
          float horizonBand = smoothstep(0.0, 0.06, dir.y) * (1.0 - smoothstep(0.06, 0.22, dir.y));
          col = mix(col, mix(vec3(1.0, 0.55, 0.3), horizonColor, 0.35), horizonBand * sunIntensity);
          // halo around the sun
          float d = max(dot(dir, normalize(sunDir)), 0.0);
          col += sunColor * pow(d, 40.0) * 0.9 * sunIntensity;
          col += sunColor * pow(d, 6.0) * 0.25 * sunIntensity;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildSun(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(90, 24, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff6dd, fog: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildGlow(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,240,200,0.9)');
    g.addColorStop(0.25, 'rgba(255,220,150,0.35)');
    g.addColorStop(0.6, 'rgba(255,200,120,0.08)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1500, 1500, 1);
    sprite.frustumCulled = false;
    return sprite;
  }

  private buildMoon(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(38, 20, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildStars(): THREE.Points {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const rng = seedRng(2024);
    for (let i = 0; i < n; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(rng() * 0.98 + 0.02);
      const r = 4400;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      fog: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }

  private buildClouds(): THREE.Mesh {
    const size = 4600;
    const geo = new THREE.CircleGeometry(size, 48);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
        opacity: { value: 0.55 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        // simple hash noise
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = p * 2.1 + vec2(3.2, 1.7);
            a *= 0.5;
          }
          return v;
        }
        void main() {
          vec2 uv = vUv;
          float aspect = 1.0;
          float d = distance(uv, vec2(0.5));
          vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 3.0;
          p.x += time * 0.0025;
          float n = fbm(p * 2.0);
          float n2 = fbm(p * 5.0 + 7.0);
          float coverage = smoothstep(0.52, 0.68, n * 0.7 + n2 * 0.4);
          float edge = smoothstep(0.5, 0.75, d);
          float alpha = coverage * (1.0 - edge) * 0.9;
          // soft shading inside the cloud
          vec3 col = mix(color * 0.8, color, smoothstep(0.52, 0.85, n));
          gl_FragColor = vec4(col, alpha * opacity);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 900;
    mesh.rotation.x = -Math.PI / 2;
    mesh.frustumCulled = false;
    return mesh;
  }

  /** Configure the time of day: 0=midnight, 0.5=noon, 1=midnight. */
  setTimeOfDay(t: number): void {
    this.timeOfDay = t;
  }

  /**
   * Region atmosphere (from `HistoricalMapProfile.atmosphere`): tints the horizon
   * and warm/cools the sun by hue (not brightness). The terrain and water apply
   * `skyTint`/`fogDensity` as their own aerial perspective; `scene.fog` stays null
   * (classic sharp look).
   */
  setAtmosphere(skyTint: string, warmth: number): void {
    this.atmTint.set(skyTint);
    this.warmth = warmth;
  }

  update(time: number): void {
    // The sun orbits with a maximum elevation ~55° for lateral lighting
    const t = this.timeOfDay;
    const angle = (t - 0.25) * Math.PI * 2;
    const rawH = Math.sin(angle);
    const sunH = Math.min(rawH * 1.18, 0.82);
    const sunA = Math.cos(angle) * 0.7 + 0.3;
    this.sunDir.set(sunA, Math.max(sunH, -0.3), 0.55).normalize();

    // Light aperture depending on time
    const day = smoothStepT(sunH, -0.12, 0.12);
    const dusk = 1 - Math.abs(day * 2 - 1) < 0.25 ? smoothStepT(Math.abs(sunH), 0, 0.18) : 0;
    const intensity = 1.7 + day * 0.9;
    this.light.intensity = intensity;
    // sun warmth shifts the hue (not the brightness): warm → amber, cool → blue
    const w = this.warmth - 1;
    this._cSunTint.setRGB(1, 1, 1);
    if (w > 0) this._cSunTint.setRGB(1, 1 - Math.min(0.3, w * 1.5), 1 - Math.min(0.5, w * 3));
    else if (w < 0) this._cSunTint.setRGB(1 + Math.min(0.15, -w * 1.2), 1 + Math.min(0.08, -w * 0.6), 1);
    this._cSunLit.copy(this.sunColor).multiply(this._cSunTint);
    this.light.color.copy(this._cSunLit).lerp(this._cWarm, (1 - day) * 0.5);
    this.light.position.copy(this.sunDir).multiplyScalar(500);
    this.light.target.position.set(0, 0, 0);

    this.hemi.intensity = 0.35 + day * 0.55;
    this._cSkyDay.setHex(0xbfd4ff).lerp(this._cSkyNight, 1 - day);
    this._cGndDay.setHex(0x55664a).lerp(this._cGndNight, 1 - day);
    this.hemi.color.copy(this._cSkyDay);
    this.hemi.groundColor.copy(this._cGndDay);

    // Sky
    const domeMat = this.dome.material as THREE.ShaderMaterial;
    domeMat.uniforms.sunDir.value.copy(this.sunDir);
    domeMat.uniforms.sunIntensity.value = 0.35 + day * 0.85 + dusk * 0.6;
    this._cHorizon
      .setHex(0xc8d9e8)
      .lerp(this._cNightH, 1 - day)
      .lerp(this._cDuskH, dusk * 0.8)
      .multiply(this.atmTint);
    domeMat.uniforms.horizonColor.value.copy(this._cHorizon);
    this._cTop.setHex(0x0a1a4a).lerp(this._cTopDusk, dusk).multiply(this.atmTint);
    domeMat.uniforms.topColor.value.copy(this._cTop);
    domeMat.uniforms.sunColor.value.setRGB(1, 0.5 + day * 0.4, 0.25 + day * 0.5).multiply(this._cSunTint);

    // Sun / moon
    this._sunPos.copy(this.sunDir).multiplyScalar(4600);
    this.sunDisc.position.copy(this._sunPos);
    this.sunGlow.position.copy(this._sunPos);
    const sunMat = this.sunDisc.material as THREE.MeshBasicMaterial;
    sunMat.visible = day > 0.05 || dusk > 0.3;
    this.sunGlow.material.opacity = 0.18 + day * 0.4;
    this.sunGlow.material.visible = this.sunDisc.visible;
    this.moonDisc.position.set(-this._sunPos.x, Math.abs(this._sunPos.y) * 0.6 + 800, -this._sunPos.z);
    this.moonDisc.visible = day < 0.55;

    this.stars.visible = day < 0.35;
    (this.stars.material as THREE.PointsMaterial).opacity = (1 - day) * (1 - dusk) * 0.9;

    // Clouds
    const cloudMat = this.cloudLayer.material as THREE.ShaderMaterial;
    cloudMat.uniforms.time.value = time;
    cloudMat.uniforms.opacity.value = 0.15 + day * 0.5 + dusk * 0.1;
    cloudMat.uniforms.color.value.setRGB(0.85 + day * 0.15, 0.9 + day * 0.1, 1);
    this.cloudLayer.rotation.z = time * 0.0015;
  }

  private _cWarm = new THREE.Color(0xff8844);
  private _cSkyDay = new THREE.Color(0xbfd4ff);
  private _cSkyNight = new THREE.Color(0x2a3350);
  private _cGndDay = new THREE.Color(0x55664a);
  private _cGndNight = new THREE.Color(0x1a1a22);
  private _cHorizon = new THREE.Color(0xc8d9e8);
  private _cNightH = new THREE.Color(0x1a2438);
  private _cDuskH = new THREE.Color(0xff9a5a);
  private _cTop = new THREE.Color(0x0a1a4a);
  private _cTopDusk = new THREE.Color(0x3a1a5a);
  private _sunPos = new THREE.Vector3();
  private _cSunTint = new THREE.Color(0xffffff);
  private _cSunLit = new THREE.Color(0xfff2dd);

  getSunLight(): THREE.DirectionalLight {
    return this.light;
  }
  /** Region-tinted sun colour, for the terrain/water shaders. */
  getSunColor(): THREE.Color {
    return this._cSunLit;
  }
  getHemi(): THREE.HemisphereLight {
    return this.hemi;
  }

  /** Day intensity 0-1 (for particles, camera, etc.) */
  getDayFactor(): number {
    const h = Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
    return smoothStepT(h, -0.12, 0.12);
  }

  dispose(): void {
    const kill = (m: THREE.Mesh | null): void => {
      if (!m) return;
      m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
      m.removeFromParent();
    };
    kill(this.dome);
    kill(this.sunDisc);
    kill(this.moonDisc);
    kill(this.cloudLayer);
    const glowMat = this.sunGlow?.material as THREE.SpriteMaterial | undefined;
    glowMat?.map?.dispose();
    glowMat?.dispose();
    this.sunGlow?.removeFromParent();
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
      this.stars.removeFromParent();
    }
    this.light.dispose();
    this.light.removeFromParent();
    this.hemi.removeFromParent();
  }
}

function smoothStepT(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function seedRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cloudDensity(x: number, z: number): number {
  return fbm2(x * 0.004, z * 0.004, 4);
}
