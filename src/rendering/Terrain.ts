import * as THREE from 'three';
import { getGroundTextures, GroundTextures } from './Textures';
import { getGroundPBR } from './Biomes';
import { smoothstep, terrainSlope } from '../util/math';
import { generateHeightField, CANAL_WIDTH_CELLS } from './heightField';
import { FOW_DIM_GLSL } from './fowGlsl';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainLayout } from '../model/defs/terrainLayout';

// Scratch colors reused in biome generation (avoids ~200k allocations).
const _cBase = new THREE.Color();
const _cDirt = new THREE.Color();
const _cRock = new THREE.Color();
const _cSnow = new THREE.Color();
const _cSand = new THREE.Color();
const _cTerraced = new THREE.Color();
const _cCanalBed = new THREE.Color();

/** 1x1 filler texture (neutral normal / constant roughness). */
function flatTex(r: number, g: number, b: number): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Procedural terrain: FBM heightmap + mountains + rivers + beaches.
 * Biome vertex colors (grass/soil/sand/rock/snow) and a shader
 * that adds fractal detail, slope-based AO and texture splatting.
 */
export class Terrain {
  readonly size: number;
  readonly resolution: number; // vertices per side
  heightMap: Float32Array;
  moistureMap: Float32Array;
  /** Agricultural terracing strength per vertex (0 none .. ~0.55 shelf), for farm yield. */
  terraceMap: Float32Array;
  /** Irrigation canal strength per vertex (0 none .. 1 centre), for the water ribbon. */
  canalMap: Float32Array;
  /** Irrigation canal centre-lines in world units (the carved ditches), for the canal ribbon. */
  canalPaths: { x: number; z: number }[][];
  /** World width of the carved canal ditch, for the water ribbon (derived from the carve). */
  readonly canalWidth: number;
  waterLevel = 2.2;
  mesh: THREE.Mesh;
  group = new THREE.Group();
  private skirt: THREE.Mesh | null = null;

  private textures: GroundTextures;
  private pbrExtra: THREE.Texture[] = [];
  private profile: HistoricalMapProfile;
  /** Biome aridity (0 humid .. 1 desert); tints sand and reduces vegetation. */
  private arid = 0;
  /** Vegetation density (0 dry .. 1 jungle); tints the grass green. */
  private veg = 0;

  constructor(size: number, resolution: number, seed: number, profile: HistoricalMapProfile, layout?: TerrainLayout) {
    this.size = size;
    this.resolution = resolution;
    this.profile = profile;
    this.textures = getGroundTextures();
    this.arid = profile.climate.aridity;
    this.veg = profile.vegetation.density;
    const field = generateHeightField(resolution, seed, profile, layout);
    this.heightMap = field.heightMap;
    this.moistureMap = field.moistureMap;
    this.terraceMap = field.terraceMap;
    this.canalMap = field.canalMap;
    this.canalPaths = field.canalPaths.map((path) =>
      path.map((p) => ({ x: (p.x / this.resolution) * this.size, z: (p.z / this.resolution) * this.size })),
    );
    this.canalWidth = ((2 * (CANAL_WIDTH_CELLS + 0.5)) / this.resolution) * this.size;
    this.waterLevel = field.waterLevel;
    this.mesh = this.buildMesh();
    this.group.add(this.mesh);
    this.buildSkirt();
  }

  /**
   * Low-detail terrain apron around the playable map. The camera may look
   * slightly past the edge (0 A.D.-style focus clamp); this keeps the sky from
   * showing there without adding any gameplay surface.
   */
  private buildSkirt(): void {
    const width = this.size * 0.6;
    const n = this.resolution + 1;
    const color = this.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const sides: { inner: (i: number) => number; x: (i: number) => number; z: (i: number) => number }[] = [
      { inner: (i) => i, x: (i) => (i / this.resolution) * this.size, z: () => 0 },
      {
        inner: (i) => this.resolution * n + i,
        x: (i) => (i / this.resolution) * this.size,
        z: () => this.size,
      },
      { inner: (i) => i * n, x: () => 0, z: (i) => (i / this.resolution) * this.size },
      {
        inner: (i) => i * n + this.resolution,
        x: () => this.size,
        z: (i) => (i / this.resolution) * this.size,
      },
    ];

    for (const side of sides) {
      const base = positions.length / 3;
      for (let i = 0; i <= this.resolution; i++) {
        const src = side.inner(i);
        const x = side.x(i);
        const z = side.z(i);
        const y = this.mesh.geometry.getAttribute('position').getY(src);
        const dx = x === 0 ? -width : x === this.size ? width : 0;
        const dz = z === 0 ? -width : z === this.size ? width : 0;
        positions.push(x, y, z, x + dx, y, z + dz);
        colors.push(color.getX(src), color.getY(src), color.getZ(src));
        colors.push(color.getX(src), color.getY(src), color.getZ(src));
      }
      for (let i = 0; i < this.resolution; i++) {
        const a = base + i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, c, b, d);
      }
    }

    // Fill the four diagonal corner quadrants (the side strips only cover
    // the axis-aligned bands).
    const corners = [
      { src: 0, x: 0, z: 0, dx: -1, dz: -1 },
      { src: this.resolution, x: this.size, z: 0, dx: 1, dz: -1 },
      { src: this.resolution * n, x: 0, z: this.size, dx: -1, dz: 1 },
      { src: this.resolution * n + this.resolution, x: this.size, z: this.size, dx: 1, dz: 1 },
    ];
    for (const c of corners) {
      const base = positions.length / 3;
      const y = this.mesh.geometry.getAttribute('position').getY(c.src);
      const cr = color.getX(c.src);
      const cg = color.getY(c.src);
      const cb = color.getZ(c.src);
      positions.push(
        c.x,
        y,
        c.z,
        c.x + c.dx * width,
        y,
        c.z,
        c.x,
        y,
        c.z + c.dz * width,
        c.x + c.dx * width,
        y,
        c.z + c.dz * width,
      );
      for (let i = 0; i < 4; i++) colors.push(cr, cg, cb);
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.skirt = new THREE.Mesh(geo, mat);
    this.skirt.receiveShadow = false;
    this.skirt.castShadow = false;
    this.group.add(this.skirt);
  }

  private idx(x: number, z: number): number {
    return z * (this.resolution + 1) + x;
  }

  /** Bilinear sample of a per-vertex map at world coordinates (clamped to the map). */
  private sampleMap(map: Float32Array, wx: number, wz: number): number {
    const x = Math.min(this.resolution, Math.max(0, (wx / this.size) * this.resolution));
    const z = Math.min(this.resolution, Math.max(0, (wz / this.size) * this.resolution));
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const x1 = Math.min(x0 + 1, this.resolution);
    const z1 = Math.min(z0 + 1, this.resolution);
    const fx = x - x0;
    const fz = z - z0;
    const h00 = map[this.idx(x0, z0)];
    const h10 = map[this.idx(x1, z0)];
    const h01 = map[this.idx(x0, z1)];
    const h11 = map[this.idx(x1, z1)];
    const a = h00 + (h10 - h00) * fx;
    const b = h01 + (h11 - h01) * fx;
    return a + (b - a) * fz;
  }

  /** Interpolate terrain height in world coordinates. */
  getHeight(wx: number, wz: number): number {
    return this.sampleMap(this.heightMap, wx, wz);
  }

  /** Is the point navigable water? */
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

  /** Interpolated moisture (0 dry .. 1 humid) at world coordinates. */
  getMoisture(wx: number, wz: number): number {
    return this.sampleMap(this.moistureMap, wx, wz);
  }

  /** Interpolated agricultural terracing strength (0 none .. ~0.55 shelf). */
  getTerrace(wx: number, wz: number): number {
    return this.sampleMap(this.terraceMap, wx, wz);
  }

  /** Interpolated irrigation canal strength (0 none .. 1 centre). */
  getCanal(wx: number, wz: number): number {
    return this.sampleMap(this.canalMap, wx, wz);
  }

  /** Carved irrigation canal centre-lines in world units, for the canal ribbon. */
  getCanalPaths(): { x: number; z: number }[][] {
    return this.canalPaths;
  }

  /** Approximate slope magnitude (0 flat .. 1 steep) from the heightfield. */
  getSlope(wx: number, wz: number): number {
    return terrainSlope((x, z) => this.getHeight(x, z), wx, wz, 2);
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

        // Slope
        const hx = this.heightMap[this.idx(Math.min(x + 1, this.resolution), z)];
        const hz = this.heightMap[this.idx(x, Math.min(z + 1, this.resolution))];
        const slope = Math.abs(h - hx) + Math.abs(h - hz);

        const moist = this.moistureMap[i];
        const col = this.biomeColor(h, slope, moist, waterLevel);
        const terrace = this.terraceMap[i];
        if (terrace > 0) {
          _cTerraced.setHSL(0.11, 0.42, 0.46);
          col.lerp(_cTerraced, terrace * 0.5);
        }
        const canal = this.canalMap[i];
        if (canal > 0) {
          _cCanalBed.setHSL(0.09, 0.35, 0.28);
          col.lerp(_cCanalBed, canal * 0.55);
        }
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
        snowLine: { value: this.profile.elevation.snowLine },
        temperature: { value: this.profile.climate.temperature },
        groundTint: { value: new THREE.Color(this.profile.groundTint ?? '#ffffff') },
        floodplain: { value: this.profile.water.wetland ? 1 : 0 },
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
        uniform float snowLine;
        uniform float temperature;
        uniform vec3 groundTint;
        uniform float floodplain;
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
${FOW_DIM_GLSL}

        void main() {
          // local fractal detail (two octaves to break repetition)
          float detail = fbm(vUv * 6.0 + vWorldPos.xz * 0.02);
          float detail2 = fbm(vUv * 15.0 - vWorldPos.xz * 0.04);
          vec3 col = vColor;

          // real slope (normal pointing up)
          float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);

          // blend with textures: grass by default, sand only on the coast,
          // rock at height and on slopes, snow at summits, soil in dry areas
          float sandAmt = max(1.0 - smoothstep(waterLevel + 0.2, waterLevel + 1.8, vHeight), arid * (1.0 - smoothstep(6.0, 10.0, vHeight)));
          float rockAmt = clamp(smoothstep(4.5, 9.0, vHeight) * 0.7 + smoothstep(0.25, 0.6, slope) * 0.85, 0.0, 1.0);
          float snowAmt = smoothstep(snowLine - 4.0, snowLine + 0.5, vHeight);
          float dirtAmt = (1.0 - smoothstep(0.6, 2.8, vHeight)) * 0.4;
          vec3 ground = texture(grass, vUv * 2.0).rgb;
          ground = mix(ground, texture(dirt, vUv * 2.4 + 3.0).rgb, max(dirtAmt, arid * 0.4));
          ground = mix(ground, texture(sand, vUv * 3.0).rgb, clamp(sandAmt + arid * 0.45, 0.0, 1.0));
          ground = mix(ground, texture(rock, vUv * 2.6).rgb, rockAmt);
          ground = mix(ground, texture(snow, vUv * 2.2).rgb, snowAmt);
          ground = (ground - 0.5) * 1.12 + 0.5; // contrast
          col = mix(col, ground, 0.75);
          col *= groundTint;
          // vegetation: tints the grass green in humid biomes (jungle/andes)
          col = mix(col, col * vec3(0.68, 1.08, 0.52), veg * 0.8);
          // Floodplain: the low, flat ground next to a river reads green even in a
          // desert region (the Supe valley below the Caral terrace).
          float flood = (1.0 - smoothstep(waterLevel + 0.3, waterLevel + 5.5, vHeight)) * (1.0 - smoothstep(0.4, 0.8, slope)) * floodplain;
          col = mix(col, vec3(0.28, 0.42, 0.16), flood * (1.0 - arid * 0.25) * 0.75);
          // temperature: cool regions read bluish, hot regions warmer
          float tempTint = clamp(abs(temperature - 0.5) * 0.6, 0.0, 0.3);
          vec3 tempColor = temperature < 0.5 ? vec3(0.86, 0.94, 1.06) : vec3(1.06, 0.98, 0.86);
          col = mix(col, col * tempColor, tempTint);
          col = mix(col, col * (0.84 + 0.32 * detail2), 0.35);

          // slope-based AO
          float slopeAO = 0.82 + 0.18 * (1.0 - smoothstep(0.0, 0.55, slope));
          col *= slopeAO;
          // micro-variation
          col *= 0.9 + 0.2 * detail;

          // micro-relief: analytic normal + PBR normal maps
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

          // directional sun lighting + ambient (terrain relief)
          N = normalize(N + vec3(bump.x, 0.0, bump.y));
          float ndl = max(dot(N, sunDir), 0.0);
          vec3 lit = col * (ambientColor + sunColor * ndl * cloudShadow * 1.15);
          // weak specular highlight modulated by roughness
          vec3 V = normalize(cameraPos - vWorldPos);
          vec3 Hv = normalize(sunDir + V);
          float shin = mix(12.0, 90.0, 1.0 - clamp(rough, 0.0, 1.0));
          float spec = pow(max(dot(N, Hv), 0.0), shin) * (1.0 - clamp(rough, 0.0, 1.0)) * 0.22;
          lit += sunColor * spec * cloudShadow;
          lit *= 0.7 + 0.35 * ndl * cloudShadow;
          // received directional shadows (units and buildings)
          #include <terrain_shadow_hook>

          // atmospheric fog (aerial perspective)
          float dist = distance(cameraPos, vWorldPos);
          float fogAmt = 1.0 - exp(-fogDensity * fogDensity * dist * dist * 2.2);

          // map edge fade toward the fog color
          float halfSize = mapSize * 0.5;
          vec2 edge = vec2(abs(vWorldPos.x - halfSize), abs(vWorldPos.z - halfSize));
          float edgeAmt = smoothstep(mapSize * 0.47, mapSize * 0.5, max(edge.x, edge.y));
          vec3 outCol = mix(lit, fogColor, clamp(max(fogAmt, edgeAmt), 0.0, 0.30));

          // fog of war glued to the relief: unexplored black, explored dimmed, visible clear
          float fw = fowEnabled > 0.5 ? texture(fowMap, vWorldPos.xz / mapSize).r : 1.0;
          outCol *= fowDim(fw);

          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    // receive directional shadows: manual sampling of the VSM shadow map
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
    // Sand near the water
    if (h < waterLevel + 0.55) {
      _cBase.setRGB(0.78, 0.7, 0.5);
      _cBase.multiplyScalar(0.92 + Math.max(0, h - waterLevel) * 0.08);
      return _cBase;
    }
    // Grass: vibrant green, more lush with humidity
    const hue = 0.3 + (1 - moist) * 0.035;
    _cBase.setHSL(hue, 0.5 + moist * 0.18, 0.33 + moist * 0.1 + Math.min(0.05, h * 0.003));
    _cDirt.setHSL(0.08, 0.4, 0.36);
    _cRock.setHSL(0.07, 0.1, 0.46);
    _cSnow.setHSL(0.6, 0.05, 0.92);
    _cSand.setHSL(0.1, 0.42, 0.6);

    _cBase.lerp(_cDirt, (1 - Math.min(1, moist * 1.8)) * 0.55);
    // Coastal desert: shifts to sand/soil
    _cBase.lerp(_cSand, this.arid * 0.7);
    _cBase.lerp(_cRock, smoothstep(1.8, 4.5, slope));
    _cBase.lerp(_cSnow, smoothstep(this.profile.elevation.snowLine - 5.5, this.profile.elevation.snowLine, h));
    return _cBase;
  }

  /** Place a seed of trees/props after generating. */
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

  /** Aerial-perspective density (0 = off; region atmosphere). */
  setFogDensity(density: number): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.fogDensity.value = density;
  }

  setSunLight(sunDir: THREE.Vector3, color: THREE.Color): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.sunDir.value.copy(sunDir);
    mat.uniforms.sunColor.value.copy(color);
  }

  /** Connect the fog-of-war map to the terrain shader. */
  setFow(texture: THREE.Texture, enabled: boolean): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.fowMap.value = texture;
    mat.uniforms.fowEnabled.value = enabled ? 1 : 0;
  }

  camera: THREE.Camera | null = null;

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (this.skirt) {
      this.skirt.geometry.dispose();
      (this.skirt.material as THREE.Material).dispose();
      this.skirt = null;
    }
    this.pbrExtra.forEach((t) => t.dispose());
    this.pbrExtra = [];
    this.group.removeFromParent();
  }
}
