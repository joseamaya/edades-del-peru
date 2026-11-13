import * as THREE from 'three';

/**
 * Water with Gerstner waves, fresnel, sun glints, shore foam
 * and specular reflection. Dedicated ShaderMaterial.
 */

/**
 * Resolution of the refraction source relative to the drawing buffer. The pass re-renders the whole scene
 * (same draw calls), so only its fill cost shrinks: half resolution saves ~12 % of the campaign frame.
 * The water samples it as a normalized-UV distortion and a background mix, and the captures disagree with
 * the full-resolution frame on 0.03 % of pixels (mean 0.04/255), so half is visually free (#460).
 */
const REFRACTION_SCALE = 0.5;
export class Water {
  /** Share of the region's aerial fog applied to the water (a pale sky tint washes dark water out). */
  private fogScale = 1;
  private baseLevel = 0;
  /** Share of the screen-space refraction (a hazy, sunlit bed makes dark water read pale). */
  private refractionScale = 1;
  mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  private depthTexture: THREE.DataTexture;
  /** Scene colour with the water hidden, sampled for screen-space refraction. */
  readonly refractionRT: THREE.WebGLRenderTarget;
  refractionEnabled = false;

  constructor(
    scene: THREE.Scene,
    heightMap: Float32Array,
    size: number,
    waterLevel = 2.2,
    inland = false,
    /** Waterline x sampled along z (world metres); west of it is sea that must not follow the seasons. */
    coastX: readonly number[] | null = null,
  ) {
    const n = Math.round(Math.sqrt(heightMap.length));
    const depthData = new Uint8Array(n * n);
    for (let i = 0; i < heightMap.length; i++) {
      depthData[i] = Math.round(Math.max(0, Math.min(1, heightMap[i] / 45)) * 255);
    }
    this.depthTexture = new THREE.DataTexture(depthData, n, n, THREE.RedFormat, THREE.UnsignedByteType);
    this.depthTexture.magFilter = THREE.LinearFilter;
    this.depthTexture.minFilter = THREE.LinearFilter;
    this.depthTexture.needsUpdate = true;

    // Placeholder: `Game` sizes it from the drawing buffer right after construction (Water.setSize).
    this.refractionRT = new THREE.WebGLRenderTarget(1024, 1024);

    // One texel per coastline sample (x in world metres, sampled along z). The sea west of it keeps
    // its level while the river follows the flood and the drought.
    const coast = coastX && coastX.length > 1 ? coastX : null;
    const coastTexture = new THREE.DataTexture(
      new Float32Array(coast ?? [0]),
      Math.max(1, coast?.length ?? 1),
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    if (coast) {
      // Nearest: float textures are not guaranteed to offer linear filtering without an extension.
      // The coastline samples are 2 m apart and the shader ramps the mask over 3 m, so steps are fine.
      coastTexture.magFilter = THREE.NearestFilter;
      coastTexture.minFilter = THREE.NearestFilter;
      coastTexture.needsUpdate = true;
    }

    // On coastal maps the water extends beyond the map (sea/horizon).
    // On inland maps (andes/altiplano/jungle) it covers only the map (lakes and rivers).
    const span = inland ? size : size * 2.5;
    // 128 segments: the shortest wave (~26 m) still gets ~7 vertices per wavelength across the 2.5x
    // coastal span, at 40% of the triangles of the former 200x200 grid.
    const geo = new THREE.PlaneGeometry(span, span, 128, 128);
    geo.rotateX(-Math.PI / 2);

    this.uniforms = {
      time: { value: 0 },
      sunDir: { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() },
      sunColor: { value: new THREE.Color(0xfff2dd) },
      depthColor: { value: new THREE.Color(0x0a3a5a) },
      shallowColor: { value: new THREE.Color(0x1a8a9a) },
      foamColor: { value: new THREE.Color(0xffffff) },
      waveHeight: { value: 0.7 },
      isDay: { value: 1.0 },
      depthMap: { value: this.depthTexture },
      waterLevel: { value: waterLevel },
      coastMap: { value: coastTexture },
      useCoast: { value: coast ? 1 : 0 },
      mapSize: { value: size },
      /** Visual offset of the inland water (the river); the sea ignores it. */
      inlandOffset: { value: 0 },
      depthScale: { value: inland ? 1 : 0.4 },
      fogColor: { value: new THREE.Color(0.8, 0.85, 0.9) },
      fogDensity: { value: 0.0 },
      refractionMap: { value: this.refractionRT.texture },
      refractionStrength: { value: 0.012 },
      refractionAmount: { value: 0.0 },
      sheen: { value: 0.7 },
      foamAmount: { value: 0.55 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float time;
        uniform float waveHeight;
        uniform float waterLevel;
        uniform float inlandOffset;
        uniform sampler2D coastMap;
        uniform float useCoast;
        uniform float mapSize;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWave;
        varying float vLevel;
        varying vec2 vScreen;
        void main() {
          vUv = uv;
          vec3 p = position;
          float w1 = sin(p.x * 0.12 + time * 1.1) * cos(p.z * 0.09 - time * 0.9);
          float w2 = sin(p.x * 0.24 - time * 1.7 + 2.0) * sin(p.z * 0.2 + time * 1.3);
          float w3 = sin((p.x + p.z) * 0.05 + time * 0.5) * 1.4;
          float disp = (w1 * 0.7 + w2 * 0.35 + w3 * 0.2) * waveHeight;
          p.y += disp;
          vWave = w1 + w2;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          // The sea stays put: only inland water (east of the authored coastline) follows the season.
          vec2 muv = wp.xz / mapSize;
          float inMap = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
          float coast = texture2D(coastMap, vec2(clamp(muv.y, 0.0, 1.0), 0.5)).r;
          float inland = mix(1.0, inMap * smoothstep(coast + 1.0, coast + 4.0, wp.x), useCoast);
          wp.y += inlandOffset * inland;
          vLevel = waterLevel + inlandOffset * inland;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
          vScreen = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 depthColor;
        uniform vec3 shallowColor;
        uniform float sheen;
        uniform float foamAmount;
        uniform vec3 foamColor;
        uniform float isDay;
        uniform sampler2D depthMap;
        uniform float depthScale;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform sampler2D refractionMap;
        uniform float refractionStrength;
        uniform float refractionAmount;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWave;
        varying float vLevel;
        varying vec2 vScreen;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec3 N = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

          // real depth from the terrain heightmap (the plane is 4x the map)
          vec2 duv = vec2((vUv.x - 0.5) / depthScale + 0.5, (0.5 - vUv.y) / depthScale + 0.5);
          float inMap = step(0.0, duv.x) * step(duv.x, 1.0) * step(0.0, duv.y) * step(duv.y, 1.0);
          float landH = mix(0.0, texture2D(depthMap, clamp(duv, 0.0, 1.0)).r * 45.0, inMap);
          float depth = vLevel - landH;
          // do not draw water over solid land (avoids covering the terrain)
          if (inMap > 0.5 && depth < 0.05) discard;
          float deep = smoothstep(0.4, 2.2, depth);

          float ripple = noise(vUv * 40.0 + time * 0.6) * 0.5 + noise(vUv * 90.0 - time * 0.8) * 0.3;
          vec3 base = mix(shallowColor, depthColor, deep);
          base *= 0.85 + 0.15 * ripple;

          // lighting
          vec3 L = normalize(sunDir);
          float diff = max(dot(N, L), 0.0);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 180.0) * 3.2;
          vec3 col = base * (0.25 + diff * 0.75);
          col += sunColor * spec * isDay;
          col += sunColor * pow(max(dot(N, H), 0.0), 24.0) * sheen * isDay;

          // foam on the coast (very shallow depth) and wave crests
          float shoreFoam = (1.0 - smoothstep(0.15, 0.55, depth)) * 0.35;
          float waveFoam = smoothstep(0.55, 0.95, abs(vWave)) * 0.3;
          float foam = clamp(shoreFoam + waveFoam, 0.0, 1.0);
          col = mix(col, foamColor, foam * foamAmount);

          // screen-space refraction of the scene behind the surface (seabed)
          if (refractionAmount > 0.001) {
            vec2 ruv = clamp(vScreen + N.xz * refractionStrength, 0.003, 0.997);
            vec3 refr = texture2D(refractionMap, ruv).rgb;
            col = mix(col, refr, refractionAmount * (1.0 - fresnel));
          }

          // fresnel toward the sky color (attenuated so it does not whiten the water)
          vec3 skyCol = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.58, 0.72), isDay);
          col = mix(col, skyCol, fresnel * 0.35);

          // distance fog (avoids "pop" on the horizon)
          float wdist = distance(cameraPosition, vWorldPos);
          float wfog = 1.0 - exp(-fogDensity * fogDensity * wdist * wdist * 2.2);
          col = mix(col, fogColor, clamp(wfog, 0.0, 0.9));

          gl_FragColor = vec4(col, 0.96);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    // the terrain is in 0..size coords; the plane must align with it
    this.mesh.position.set(size / 2, waterLevel, size / 2);
    this.baseLevel = waterLevel;
    scene.add(this.mesh);
  }

  /** Sea level: the inland water follows the seasons, the sea does not. */
  get seaLevel(): number {
    return this.baseLevel;
  }

  /** Per-site water colours and the strength of the broad sun sheen (a high sun washes dark water out). */
  setPalette(palette: {
    deep: string;
    shallow: string;
    sheen: number;
    foam: number;
    fog: number;
    refraction: number;
  }): void {
    this.uniforms.refractionAmount.value *= palette.refraction / this.refractionScale;
    this.refractionScale = palette.refraction;
    this.uniforms.fogDensity.value *= palette.fog / this.fogScale;
    this.fogScale = palette.fog;
    (this.uniforms.depthColor.value as THREE.Color).set(palette.deep);
    (this.uniforms.shallowColor.value as THREE.Color).set(palette.shallow);
    this.uniforms.sheen.value = palette.sheen;
    this.uniforms.foamAmount.value = palette.foam;
  }

  /**
   * Visual-only drop of the water surface (m1's drought: the river shrinks to a thread between exposed
   * banks). Gameplay water (pathing, isWater) is unchanged.
   */
  setLevelOffset(offset: number): void {
    // The mesh and the sea stay at `baseLevel`; the shader applies the offset to the inland water only.
    this.uniforms.inlandOffset.value = offset;
  }

  setSunDir(dir: THREE.Vector3): void {
    this.uniforms.sunDir.value.copy(dir);
  }

  setDayFactor(day: number): void {
    this.uniforms.isDay.value = day;
  }

  /** Region atmosphere: fog colour + aerial-perspective density for the water. */
  setFog(color: string, density: number): void {
    (this.uniforms.fogColor.value as THREE.Color).set(color);
    this.uniforms.fogDensity.value = density * this.fogScale;
  }

  /** Enable or disable screen-space refraction (samples `refractionRT`). */
  setRefraction(on: boolean): void {
    this.refractionEnabled = on;
    this.uniforms.refractionAmount.value = on ? 0.5 * this.refractionScale : 0;
  }

  setSize(width: number, height: number): void {
    this.refractionRT.setSize(
      Math.max(1, Math.floor(width * REFRACTION_SCALE)),
      Math.max(1, Math.floor(height * REFRACTION_SCALE)),
    );
  }

  update(time: number): void {
    this.uniforms.time.value = time;
  }

  /** Water height for the surface at a map point. */
  getHeightAt(x: number, z: number): number {
    void x;
    void z;
    return 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.depthTexture.dispose();
    (this.uniforms.coastMap?.value as THREE.DataTexture | undefined)?.dispose();
    this.refractionRT.dispose();
  }
}
