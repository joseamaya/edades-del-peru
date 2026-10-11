import * as THREE from 'three';

/**
 * Agua con olas Gerstner, fresnel, brillos del sol, espuma de costa
 * y reflexión especular. ShaderMaterial dedicado.
 */
export class Water {
  mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  private depthTexture: THREE.DataTexture;

  constructor(scene: THREE.Scene, heightMap: Float32Array, size: number, waterLevel = 2.2, inland = false) {
    const n = Math.round(Math.sqrt(heightMap.length));
    const depthData = new Uint8Array(n * n);
    for (let i = 0; i < heightMap.length; i++) {
      depthData[i] = Math.round(Math.max(0, Math.min(1, heightMap[i] / 45)) * 255);
    }
    this.depthTexture = new THREE.DataTexture(depthData, n, n, THREE.RedFormat, THREE.UnsignedByteType);
    this.depthTexture.magFilter = THREE.LinearFilter;
    this.depthTexture.minFilter = THREE.LinearFilter;
    this.depthTexture.needsUpdate = true;

    // En mapas costeros el agua se extiende más allá del mapa (mar/horizonte).
    // En mapas interiores (andes/altiplano/selva) cubre solo el mapa (lagos y ríos).
    const span = inland ? size : size * 2.5;
    const geo = new THREE.PlaneGeometry(span, span, 200, 200);
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
      depthScale: { value: inland ? 1 : 0.4 },
      fogColor: { value: new THREE.Color(0.8, 0.85, 0.9) },
      fogDensity: { value: 0.0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float time;
        uniform float waveHeight;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWave;
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
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 depthColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform float isDay;
        uniform sampler2D depthMap;
        uniform float waterLevel;
        uniform float depthScale;
        uniform vec3 fogColor;
        uniform float fogDensity;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vWave;

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

          // profundidad real desde el heightmap del terreno (el plano es 4x el mapa)
          vec2 duv = (vUv - 0.5) * depthScale + 0.5;
          float inMap = step(0.0, duv.x) * step(duv.x, 1.0) * step(0.0, duv.y) * step(duv.y, 1.0);
          float landH = mix(0.0, texture2D(depthMap, clamp(duv, 0.0, 1.0)).r * 45.0, inMap);
          float depth = waterLevel - landH;
          // no dibujar agua sobre tierra firme (evita cubrir el terreno)
          if (inMap > 0.5 && depth < 0.05) discard;
          float deep = smoothstep(0.4, 2.2, depth);

          float ripple = noise(vUv * 40.0 + time * 0.6) * 0.5 + noise(vUv * 90.0 - time * 0.8) * 0.3;
          vec3 base = mix(shallowColor, depthColor, deep);
          base *= 0.85 + 0.15 * ripple;

          // iluminación
          vec3 L = normalize(sunDir);
          float diff = max(dot(N, L), 0.0);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 180.0) * 3.2;
          vec3 col = base * (0.25 + diff * 0.75);
          col += sunColor * spec * isDay;
          col += sunColor * pow(max(dot(N, H), 0.0), 24.0) * 0.7 * isDay;

          // espuma en costa (profundidad muy pequeña) y crestas de ola
          float shoreFoam = (1.0 - smoothstep(0.15, 0.55, depth)) * 0.35;
          float waveFoam = smoothstep(0.55, 0.95, abs(vWave)) * 0.3;
          float foam = clamp(shoreFoam + waveFoam, 0.0, 1.0);
          col = mix(col, foamColor, foam * 0.55);

          // fresnel hacia el color del cielo (atenuado para no blanquear el agua)
          vec3 skyCol = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.58, 0.72), isDay);
          col = mix(col, skyCol, fresnel * 0.35);

          // niebla por distancia (evita "pop" en el horizonte)
          float wdist = distance(cameraPosition, vWorldPos);
          float wfog = 1.0 - exp(-fogDensity * fogDensity * wdist * wdist * 2.2);
          col = mix(col, fogColor, clamp(wfog, 0.0, 0.9));

          gl_FragColor = vec4(col, 0.96);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    // el terreno está en coords 0..size; el plano debe alinearse con él
    this.mesh.position.set(size / 2, waterLevel, size / 2);
    scene.add(this.mesh);
  }

  setSunDir(dir: THREE.Vector3): void {
    this.uniforms.sunDir.value.copy(dir);
  }

  setDayFactor(day: number): void {
    this.uniforms.isDay.value = day;
  }

  update(time: number): void {
    this.uniforms.time.value = time;
  }

  /** Altura del agua para la superficie en un punto del mapa. */
  getHeightAt(x: number, z: number): number {
    void x;
    void z;
    return 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.depthTexture.dispose();
  }
}
