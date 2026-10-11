import * as THREE from 'three';
import { fbm2, noise2, ridged2 } from '../util/noise';
import { RNG } from '../util/rng';
import { getGroundTextures, GroundTextures } from './Textures';
import { getGroundPBR } from './Biomes';
import { smoothstep } from '../util/math';

// Colores scratch reutilizados en la generación de bioma (evita ~200k allocaciones).
const _cBase = new THREE.Color();
const _cDirt = new THREE.Color();
const _cRock = new THREE.Color();
const _cSnow = new THREE.Color();
const _cSand = new THREE.Color();

/** Textura 1x1 de relleno (normal neutra / rugosidad constante). */
function flatTex(r: number, g: number, b: number): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Terreno procedural: heightmap FBM + montañas + ríos + playas.
 * Vertex colors de bioma (hierba/tierra/arena/roca/nieve) y shader
 * que añade detalle fractal, AO por pendiente y splatting de texturas.
 */
export class Terrain {
  readonly size: number;
  readonly resolution: number; // vértices por lado
  heightMap: Float32Array;
  moistureMap: Float32Array;
  waterLevel = 2.2;
  mesh: THREE.Mesh;
  group = new THREE.Group();

  private textures: GroundTextures;
  private rng: RNG;
  private pbrExtra: THREE.Texture[] = [];
  /** Aridez del bioma (0 húmedo .. 1 desértico); tiñe de arena y reduce vegetación. */
  private arid = 0;
  /** Densidad de vegetación (0 seco .. 1 selva); tiñe de verde la hierba. */
  private veg = 0;

  constructor(size: number, resolution: number, seed: number, mapType: string) {
    this.size = size;
    this.resolution = resolution;
    this.rng = new RNG(seed * 7919 + 17);
    this.textures = getGroundTextures();
    this.arid = mapType === 'coast' ? 0.9 : mapType === 'estepas' ? 0.55 : mapType === 'altiplano' ? 0.35 : 0;
    this.veg = mapType === 'jungle' ? 1 : mapType === 'andes' ? 0.6 : mapType === 'altiplano' ? 0.15 : 0;
    this.heightMap = new Float32Array((resolution + 1) * (resolution + 1));
    this.moistureMap = new Float32Array((resolution + 1) * (resolution + 1));
    this.generate(mapType);
    this.mesh = this.buildMesh();
    this.group.add(this.mesh);
  }

  private idx(x: number, z: number): number {
    return z * (this.resolution + 1) + x;
  }

  /** Interpola la altura del terreno en coordenadas del mundo. */
  getHeight(wx: number, wz: number): number {
    const x = wx / this.size * this.resolution;
    const z = wz / this.size * this.resolution;
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const x1 = Math.min(x0 + 1, this.resolution);
    const z1 = Math.min(z0 + 1, this.resolution);
    const fx = x - x0;
    const fz = z - z0;
    const h00 = this.heightMap[this.idx(x0, z0)];
    const h10 = this.heightMap[this.idx(x1, z0)];
    const h01 = this.heightMap[this.idx(x0, z1)];
    const h11 = this.heightMap[this.idx(x1, z1)];
    const a = h00 + (h10 - h00) * fx;
    const b = h01 + (h11 - h01) * fx;
    return a + (b - a) * fz;
  }

  /** ¿Punto es agua navegable? */
  isWater(wx: number, wz: number): boolean {
    return this.getHeight(wx, wz) < this.waterLevel - 0.15;
  }

  isBeach(wx: number, wz: number): boolean {
    const h = this.getHeight(wx, wz);
    return h >= this.waterLevel - 0.15 && h < this.waterLevel + 0.9;
  }

  isBuildable(wx: number, wz: number): boolean {
    const h = this.getHeight(wx, wz);
    return h > this.waterLevel + 0.4;
  }

  private generate(mapType: string): void {
    const n = this.resolution + 1;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const nx = x / (this.resolution / 2) - 1;
        const nz = z / (this.resolution / 2) - 1;
        const dist = Math.sqrt(nx * nx + nz * nz);
        const border = Math.max(Math.abs(nx), Math.abs(nz)); // 0 centro → 1 borde

        // Base continental con islas / lagos según tipo
        let base: number;
        let mtnAmp = 15;
        if (mapType === 'archipielago') {
          base = fbm2(nx * 1.6 + 5, nz * 1.6, 4);
          const ring = Math.sin(dist * Math.PI * 3.2) * 0.16;
          base = base * 0.72 + ring + 0.24;
        } else if (mapType === 'lago') {
          base = fbm2(nx * 1.4 + 3, nz * 1.4, 4) * 0.85 + 0.32;
          base += smoothstep(0.62, 1.0, dist) * 0.5;
        } else if (mapType === 'estepas') {
          base = fbm2(nx * 1.0 + 7, nz * 1.0, 3) * 0.6 + 0.42;
        } else if (mapType === 'coast') {
          // litoral: tierra firme (valle) en todo el interior y mar en el marco del mapa
          base = fbm2(nx * 1.0 + 13, nz * 1.0, 4) * 0.16 + 0.74;
          base -= smoothstep(0.9, 1.02, border) * 1.0;
          mtnAmp = 5;
        } else if (mapType === 'altiplano') {
          // meseta alta (puna) y relativamente plana; lagos tallados por ríos
          base = fbm2(nx * 0.9 + 21, nz * 0.9, 3) * 0.14 + 0.64;
          mtnAmp = 8;
        } else if (mapType === 'jungle') {
          // ceja de selva: relieve medio, ríos
          base = fbm2(nx * 1.1 + 31, nz * 1.1, 3) * 0.25 + 0.66;
          base -= smoothstep(0.92, 1.06, border) * 0.7;
          mtnAmp = 9;
        } else if (mapType === 'andes') {
          // cordillera: valles a media altura y montañas en las cumbres
          base = fbm2(nx * 1.1 + 41, nz * 1.1, 4) * 0.24 + 0.64;
          mtnAmp = 16;
        } else {
          // continente: masa de tierra principal con océano en bordes
          base = fbm2(nx * 1.25 + 2, nz * 1.25, 5) * 0.38 + 0.62;
          base -= smoothstep(0.64, 1.04, dist) * 0.6;
          base += (noise2(nx * 3.1 + 9, nz * 3.1) - 0.5) * 0.12;
        }

        // Montañas (se aplanan en el borde para evitar picos y artefactos)
        const mtn = ridged2(nx * 1.7 + 11, nz * 1.7, 4);
        const mtnMask = smoothstep(0.45, 0.82, mtn);
        const edgeBlend = 1 - smoothstep(0.92, 1.06, border);
        const height =
          base * 6.6 +
          Math.max(0, mtn - 0.52) * mtnAmp * mtnMask * edgeBlend;

        // Suavizado de la orilla
        const h = height;
        this.heightMap[this.idx(x, z)] = h;
        const moist = fbm2(nx * 2.2 + 40, nz * 2.2, 3) * 0.6 + fbm2(nx * 0.4 + 3, nz * 0.4, 2) * 0.4;
        this.moistureMap[this.idx(x, z)] = moist * (1 - this.arid * 0.72);
      }
    }

    // Ríos: tallar con ruido direccional
    this.carveRivers();
  }

  private carveRivers(): void {
    const n = this.resolution + 1;
    const riverCount = 2;
    for (let r = 0; r < riverCount; r++) {
      const startX = this.rng.int(0, n - 1);
      const endX = this.rng.int(0, n - 1);
      let cx = startX;
      let cz = 0;
      let wander = this.rng.range(-1, 1);
      while (cz < n) {
        wander += this.rng.range(-0.5, 0.5);
        wander = Math.max(-2.4, Math.min(2.4, wander));
        const width = 1.6;
        for (let dx = -Math.ceil(width * 2); dx <= Math.ceil(width * 2); dx++) {
          for (let dz = 0; dz < 3; dz++) {
            const x = Math.round(cx + dx + (endX - cx) * (cz / n));
            const z = Math.min(cz + dz, n - 1);
            if (x < 0 || x >= n) continue;
            const d = Math.abs(dx);
            const drop = (1 - d / (width * 2)) * 3.4;
            const i = this.idx(x, z);
            if (this.heightMap[i] > this.waterLevel - 0.4) {
              this.heightMap[i] = Math.max(this.waterLevel - 0.6 - drop * 0.6, this.heightMap[i] - drop);
            }
          }
        }
        cz += this.rng.int(2, 4);
        cx += wander;
        cx = Math.max(2, Math.min(n - 3, cx));
      }
    }
  }

  private buildMesh(): THREE.Mesh {
    const n = this.resolution + 1;
    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    const uvs = new Float32Array(n * n * 2);
    const indices: number[] = [];

    const waterLevel = this.waterLevel;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        const h = this.heightMap[i];
        const wx = (x / this.resolution) * this.size;
        const wz = (z / this.resolution) * this.size;
        positions[i * 3] = wx;
        positions[i * 3 + 1] = h;
        positions[i * 3 + 2] = wz;
        uvs[i * 2] = wx * 0.1;
        uvs[i * 2 + 1] = wz * 0.1;

        // Pendiente
        const hx = this.heightMap[this.idx(Math.min(x + 1, this.resolution), z)];
        const hz = this.heightMap[this.idx(x, Math.min(z + 1, this.resolution))];
        const slope = Math.abs(h - hx) + Math.abs(h - hz);

        const moist = this.moistureMap[i];
        const col = this.biomeColor(h, slope, moist, waterLevel);
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
    }

    for (let z = 0; z < this.resolution; z++) {
      for (let x = 0; x < this.resolution; x++) {
        const a = z * n + x;
        const b = z * n + x + 1;
        const c = (z + 1) * n + x;
        const d = (z + 1) * n + x + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const tex = this.textures;
    const pbr = {
      grass: getGroundPBR('grass'),
      dirt: getGroundPBR('dirt'),
      sand: getGroundPBR('sand'),
      rock: getGroundPBR('rock'),
      snow: getGroundPBR('snow'),
    };
    const anyPbr = Object.values(pbr).some((x) => !!x);
    const flatN = flatTex(128, 128, 255);
    const flatR = flatTex(200, 200, 200);
    const diff = (slot: keyof typeof pbr, fallback: THREE.Texture): THREE.Texture => pbr[slot]?.diffuse ?? fallback;
    const nrm = (slot: keyof typeof pbr): THREE.Texture => pbr[slot]?.normal ?? flatN;
    const rgh = (slot: keyof typeof pbr): THREE.Texture => pbr[slot]?.roughness ?? flatR;
    this.pbrExtra = [flatN, flatR];
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        grass: { value: diff('grass', tex.grass) },
        dirt: { value: diff('dirt', tex.dirt) },
        sand: { value: diff('sand', tex.sand) },
        rock: { value: diff('rock', tex.rock) },
        snow: { value: diff('snow', tex.snow) },
        grassN: { value: nrm('grass') },
        dirtN: { value: nrm('dirt') },
        sandN: { value: nrm('sand') },
        rockN: { value: nrm('rock') },
        snowN: { value: nrm('snow') },
        grassR: { value: rgh('grass') },
        dirtR: { value: rgh('dirt') },
        sandR: { value: rgh('sand') },
        rockR: { value: rgh('rock') },
        snowR: { value: rgh('snow') },
        usePbr: { value: anyPbr ? 1 : 0 },
        waterLevel: { value: waterLevel },
        time: { value: 0 },
        sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
        sunColor: { value: new THREE.Color(1, 0.96, 0.88) },
        ambientColor: { value: new THREE.Color(0.34, 0.36, 0.4) },
        fogColor: { value: new THREE.Color(0.78, 0.85, 0.92) },
        fogDensity: { value: 0.0 },
        cloudShadow: { value: 1.0 },
        cameraPos: { value: new THREE.Vector3() },
        mapSize: { value: this.size },
        fowMap: { value: null as THREE.Texture | null },
        fowEnabled: { value: 0 },
        arid: { value: this.arid },
        veg: { value: this.veg },
      },
      vertexShader: /* glsl */ `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec4 vDirShadowCoord;
        #ifdef USE_SHADOWMAP
        uniform mat4 directionalShadowMatrix[ 1 ];
        struct DirectionalLightShadow {
          float shadowIntensity;
          float shadowBias;
          float shadowNormalBias;
          float shadowRadius;
          vec2 shadowMapSize;
        };
        uniform DirectionalLightShadow directionalLightShadows[ 1 ];
        #endif
        void main() {
          vColor = color;
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vHeight = wp.y;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D grass;
        uniform sampler2D dirt;
        uniform sampler2D sand;
        uniform sampler2D rock;
        uniform sampler2D snow;
        uniform sampler2D grassN;
        uniform sampler2D dirtN;
        uniform sampler2D sandN;
        uniform sampler2D rockN;
        uniform sampler2D snowN;
        uniform sampler2D grassR;
        uniform sampler2D dirtR;
        uniform sampler2D sandR;
        uniform sampler2D rockR;
        uniform sampler2D snowR;
        uniform float usePbr;
        uniform float veg;
        uniform float waterLevel;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 ambientColor;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float cloudShadow;
        uniform vec3 cameraPos;
        uniform float mapSize;
        uniform sampler2D fowMap;
        uniform float fowEnabled;
        uniform float arid;
        varying vec3 vColor;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec4 vDirShadowCoord;
        #ifdef USE_SHADOWMAP
        uniform sampler2D directionalShadowMap[ 1 ];
        struct DirectionalLightShadow {
          float shadowIntensity;
          float shadowBias;
          float shadowNormalBias;
          float shadowRadius;
          vec2 shadowMapSize;
        };
        uniform DirectionalLightShadow directionalLightShadows[ 1 ];
        #endif

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
            p *= 2.1;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // detalle fractal local (dos octavas para romper la repetición)
          float detail = fbm(vUv * 6.0 + vWorldPos.xz * 0.02);
          float detail2 = fbm(vUv * 15.0 - vWorldPos.xz * 0.04);
          vec3 col = vColor;

          // pendiente real (normal hacia arriba)
          float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);

          // mezcla con texturas: hierba por defecto, arena solo en costa,
          // roca en altura y en pendientes, nieve en cumbres, tierra en zonas secas
          float sandAmt = max(1.0 - smoothstep(waterLevel + 0.2, waterLevel + 1.8, vHeight), arid * (1.0 - smoothstep(6.0, 10.0, vHeight)));
          float rockAmt = clamp(smoothstep(4.5, 9.0, vHeight) * 0.7 + smoothstep(0.25, 0.6, slope) * 0.85, 0.0, 1.0);
          float snowAmt = smoothstep(11.0, 15.5, vHeight);
          float dirtAmt = (1.0 - smoothstep(0.6, 2.8, vHeight)) * 0.4;
          vec3 ground = texture(grass, vUv * 2.0).rgb;
          ground = mix(ground, texture(dirt, vUv * 2.4 + 3.0).rgb, max(dirtAmt, arid * 0.4));
          ground = mix(ground, texture(sand, vUv * 3.0).rgb, clamp(sandAmt + arid * 0.45, 0.0, 1.0));
          ground = mix(ground, texture(rock, vUv * 2.6).rgb, rockAmt);
          ground = mix(ground, texture(snow, vUv * 2.2).rgb, snowAmt);
          ground = (ground - 0.5) * 1.12 + 0.5; // contraste
          col = mix(col, ground, 0.75);
          // vegetación: tiñe de verde la hierba en biomas húmedos (selva/andes)
          col = mix(col, col * vec3(0.68, 1.08, 0.52), veg * 0.8);
          col = mix(col, col * (0.84 + 0.32 * detail2), 0.35);

          // AO por pendiente
          float slopeAO = 0.82 + 0.18 * (1.0 - smoothstep(0.0, 0.55, slope));
          col *= slopeAO;
          // micro-variación
          col *= 0.9 + 0.2 * detail;

          // micro-relieve: normal analítica + mapas de normal PBR
          vec3 N = normalize(vNormal);
          vec2 nu = vWorldPos.xz * 0.45;
          float nC = fbm(nu);
          float nX = fbm(nu + vec2(0.06, 0.0));
          float nZ = fbm(nu + vec2(0.0, 0.06));
          float bumpAmt = (1.0 - smoothstep(0.0, 0.5, slope)) * 0.6;
          vec2 bump = vec2((nC - nX) * bumpAmt, (nC - nZ) * bumpAmt);
          float rough = 0.9;

          if (usePbr > 0.5) {
            float wSnow = snowAmt;
            float wRock = rockAmt * (1.0 - wSnow);
            float wSand = clamp(sandAmt + arid * 0.45, 0.0, 1.0) * (1.0 - wRock - wSnow);
            float wDirt = max(dirtAmt, arid * 0.4);
            float wGrass = max(0.0, 1.0 - wDirt - wSand - wRock - wSnow);
            float wsum = max(1e-3, wGrass + wDirt + wSand + wRock + wSnow);
            vec2 uv2 = vUv * 2.5;
            vec2 nb =
              (texture(grassN, uv2).rg * 2.0 - 1.0) * wGrass +
              (texture(dirtN, uv2).rg * 2.0 - 1.0) * wDirt +
              (texture(sandN, uv2).rg * 2.0 - 1.0) * wSand +
              (texture(rockN, uv2).rg * 2.0 - 1.0) * wRock +
              (texture(snowN, uv2).rg * 2.0 - 1.0) * wSnow;
            bump += nb / wsum * 0.8;
            rough = (
              texture(grassR, uv2).r * wGrass + texture(dirtR, uv2).r * wDirt +
              texture(sandR, uv2).r * wSand + texture(rockR, uv2).r * wRock +
              texture(snowR, uv2).r * wSnow
            ) / wsum;
          }

          // iluminación direccional del sol + ambiente (relieve del terreno)
          N = normalize(N + vec3(bump.x, 0.0, bump.y));
          float ndl = max(dot(N, sunDir), 0.0);
          vec3 lit = col * (ambientColor + sunColor * ndl * cloudShadow * 1.15);
          // brillo especular débil modulado por rugosidad
          vec3 V = normalize(cameraPos - vWorldPos);
          vec3 Hv = normalize(sunDir + V);
          float shin = mix(12.0, 90.0, 1.0 - clamp(rough, 0.0, 1.0));
          float spec = pow(max(dot(N, Hv), 0.0), shin) * (1.0 - clamp(rough, 0.0, 1.0)) * 0.22;
          lit += sunColor * spec * cloudShadow;
          lit *= 0.7 + 0.35 * ndl * cloudShadow;
          // sombras direccionales recibidas (unidades y edificios)
          #include <terrain_shadow_hook>

          // niebla atmosférica (perspectiva aérea)
          float dist = distance(cameraPos, vWorldPos);
          float fogAmt = 1.0 - exp(-fogDensity * fogDensity * dist * dist * 2.2);

          // fundido del borde del mapa hacia el color de niebla
          float halfSize = mapSize * 0.5;
          vec2 edge = vec2(abs(vWorldPos.x - halfSize), abs(vWorldPos.z - halfSize));
          float edgeAmt = smoothstep(mapSize * 0.47, mapSize * 0.5, max(edge.x, edge.y));
          vec3 outCol = mix(lit, fogColor, clamp(max(fogAmt, edgeAmt), 0.0, 0.30));

          // niebla de guerra pegada al relieve: inexplorado negro, explorado atenuado, visible claro
          float fw = fowEnabled > 0.5 ? texture(fowMap, vWorldPos.xz / mapSize).r : 1.0;
          float explored = smoothstep(0.30, 0.65, fw);
          float visible = smoothstep(0.72, 0.95, fw);
          float fowDim = mix(0.0, 0.42, explored);
          fowDim = mix(fowDim, 1.0, visible);
          outCol *= fowDim;

          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    // recibir sombras direccionales: muestreo manual del shadow map VSM
    (mat as any).shadowMap = true;
    mat.customProgramCacheKey = () => 'terrain-shadow-v5';
    mat.onBeforeCompile = (shader: any) => {
      shader.vertexShader = shader.vertexShader.replace(
        'gl_Position = projectionMatrix * viewMatrix * wp;',
        `gl_Position = projectionMatrix * viewMatrix * wp;
         #if defined(USE_SHADOWMAP)
           vec3 shadowN = normalize(mat3(modelMatrix) * normal);
           vec4 shadowWP = wp + vec4(shadowN * directionalLightShadows[0].shadowNormalBias, 0.0);
           vDirShadowCoord = directionalShadowMatrix[0] * shadowWP;
         #endif`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <terrain_shadow_hook>',
        `#if defined(USE_SHADOWMAP)
          vec4 sc = vDirShadowCoord;
          sc.xyz /= sc.w;
          sc.z += directionalLightShadows[0].shadowBias;
          float sh = 1.0;
          if (sc.x >= 0.0 && sc.x <= 1.0 && sc.y >= 0.0 && sc.y <= 1.0 && sc.z <= 1.0) {
            vec2 vdist = texture2D(directionalShadowMap[0], sc.xy).rg;
            float mean = vdist.x;
            float variance = vdist.y * vdist.y;
            float hard = step(mean, sc.z);
            float v = clamp((variance / (variance + (sc.z - mean) * (sc.z - mean)) - 0.3) / 0.7, 0.0, 1.0);
            sh = max(hard, v);
          }
          lit *= mix(1.0, sh, directionalLightShadows[0].shadowIntensity);
        #endif`,
      );
    };
    return mesh;
  }

  private biomeColor(h: number, slope: number, moist: number, waterLevel: number): THREE.Color {
    // Arena cerca del agua
    if (h < waterLevel + 0.55) {
      _cBase.setRGB(0.78, 0.7, 0.5);
      _cBase.multiplyScalar(0.92 + Math.max(0, h - waterLevel) * 0.08);
      return _cBase;
    }
    // Hierba: verde vibrante, más exuberante con humedad
    const hue = 0.30 + (1 - moist) * 0.035;
    _cBase.setHSL(hue, 0.5 + moist * 0.18, 0.33 + moist * 0.1 + Math.min(0.05, h * 0.003));
    _cDirt.setHSL(0.08, 0.4, 0.36);
    _cRock.setHSL(0.07, 0.1, 0.46);
    _cSnow.setHSL(0.6, 0.05, 0.92);
    _cSand.setHSL(0.1, 0.42, 0.6);

    _cBase.lerp(_cDirt, (1 - Math.min(1, moist * 1.8)) * 0.55);
    // Desierto costero: desplaza a arena/tierra
    _cBase.lerp(_cSand, this.arid * 0.7);
    _cBase.lerp(_cRock, smoothstep(1.8, 4.5, slope));
    _cBase.lerp(_cSnow, smoothstep(9.5, 15, h));
    return _cBase;
  }

  /** Coloca una semilla de árboles/props tras generar. */
  getTexture(): GroundTextures {
    return this.textures;
  }

  update(time: number): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = time;
    if (this.camera) {
      mat.uniforms.cameraPos.value.copy(this.camera.position);
    }
  }

  setCloudShadow(factor: number): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.cloudShadow.value = factor;
  }

  setFogColor(color: THREE.Color): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.fogColor.value.copy(color);
  }

  setSunLight(sunDir: THREE.Vector3, color: THREE.Color): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.sunDir.value.copy(sunDir);
    mat.uniforms.sunColor.value.copy(color);
  }

  /** Conecta el mapa de niebla de guerra al shader del terreno. */
  setFow(texture: THREE.Texture, enabled: boolean): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.fowMap.value = texture;
    mat.uniforms.fowEnabled.value = enabled ? 1 : 0;
  }

  camera: THREE.Camera | null = null;

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.pbrExtra.forEach((t) => t.dispose());
    this.pbrExtra = [];
    this.group.removeFromParent();
  }
}
