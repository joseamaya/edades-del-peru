import * as THREE from 'three';
import { getGroundTextures, GroundTextures } from './Textures';
import { getGroundPBR } from './Biomes';
import { buildTerrainSplat, TERRAIN_SPLAT_SIZE, type TerrainSplat } from './terrainSplat';
import { smoothstep } from '../util/math';
import { TerrainData } from '../sim/TerrainData';
import { FOW_DIM_GLSL } from './fowGlsl';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import type { AuthoredSiteDef, SiteTerrainStyle } from '../model/defs/sites';

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
  readonly data: TerrainData;
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
  private readonly siteTerrain?: SiteTerrainStyle;
  private readonly terrainPreset: number;
  private readonly suppressSnow: boolean;
  private readonly valleyHaze: boolean;
  /** CPU-authored per-match material weights (grass/dirt/sand/rock). */
  private readonly splat: TerrainSplat;
  /** GPU copy of `splat`, sampled by the terrain shader. */
  private readonly splatTexture: THREE.DataTexture;
  /** Biome aridity (0 humid .. 1 desert); tints sand and reduces vegetation. */
  private arid = 0;
  /** Vegetation density (0 dry .. 1 jungle); tints the grass green. */
  private veg = 0;

  constructor(
    size: number,
    resolution: number,
    seed: number,
    profile: HistoricalMapProfile,
    layout?: TerrainLayout,
    site?: AuthoredSiteDef,
  ) {
    this.size = size;
    this.resolution = resolution;
    this.profile = profile;
    const style = site?.terrain;
    this.siteTerrain = style;
    this.terrainPreset = style?.preset === 'caral' ? 1 : 0;
    this.suppressSnow = site?.terrain.suppressSnow ?? false;
    this.valleyHaze = site?.terrain.valleyHaze ?? false;
    this.textures = getGroundTextures();
    this.arid = profile.climate.aridity;
    this.veg = profile.vegetation.density;
    this.data = new TerrainData(size, resolution, seed, profile, layout, site);
    this.heightMap = this.data.heightMap;
    this.moistureMap = this.data.moistureMap;
    this.terraceMap = this.data.terraceMap;
    this.canalMap = this.data.canalMap;
    this.canalPaths = this.data.canalPaths;
    this.canalWidth = this.data.canalWidth;
    this.waterLevel = this.data.waterLevel;
    this.splat = buildTerrainSplat(this.data, profile, { size: TERRAIN_SPLAT_SIZE, seed });
    const splatTexture = new THREE.DataTexture(this.splat.data, this.splat.size, this.splat.size, THREE.RGBAFormat);
    splatTexture.minFilter = THREE.LinearFilter;
    splatTexture.magFilter = THREE.LinearFilter;
    splatTexture.wrapS = THREE.ClampToEdgeWrapping;
    splatTexture.wrapT = THREE.ClampToEdgeWrapping;
    splatTexture.colorSpace = THREE.NoColorSpace;
    splatTexture.needsUpdate = true;
    this.splatTexture = splatTexture;
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
    const width = this.size * 4;
    const n = this.resolution + 1;
    const color = this.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const fog = (this.mesh.material as THREE.ShaderMaterial).uniforms.fogColor.value as THREE.Color;
    const far = [fog.r, fog.g, fog.b];
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
        colors.push(far[0], far[1], far[2]);
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
      colors.push(cr, cg, cb, far[0], far[1], far[2], far[0], far[1], far[2], far[0], far[1], far[2]);
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    // Unlit apron: the skirt's normals face away from the camera, so a lit
    // material renders the edge as a black void. Fade the outer ring to the
    // terrain's own atmospheric colour so the seam disappears.
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
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

  /** Interpolate terrain height in world coordinates. */
  getHeight(wx: number, wz: number): number {
    return this.data.getHeight(wx, wz);
  }

  /** Is the point navigable water? */
  isWater(wx: number, wz: number): boolean {
    return this.data.isWater(wx, wz);
  }

  isBeach(wx: number, wz: number): boolean {
    return this.data.isBeach(wx, wz);
  }

  isBuildable(wx: number, wz: number): boolean {
    return this.data.isBuildable(wx, wz);
  }

  /** Interpolated moisture (0 dry .. 1 humid) at world coordinates. */
  getMoisture(wx: number, wz: number): number {
    return this.data.getMoisture(wx, wz);
  }

  /** Interpolated agricultural terracing strength (0 none .. ~0.55 shelf). */
  getTerrace(wx: number, wz: number): number {
    return this.data.getTerrace(wx, wz);
  }

  /** Interpolated irrigation canal strength (0 none .. 1 centre). */
  getCanal(wx: number, wz: number): number {
    return this.data.getCanal(wx, wz);
  }

  /** Carved irrigation canal centre-lines in world units, for the canal ribbon. */
  getCanalPaths(): { x: number; z: number }[][] {
    return this.data.getCanalPaths();
  }

  /** Approximate slope magnitude (0 flat .. 1 steep) from the heightfield. */
  getSlope(wx: number, wz: number): number {
    return this.data.getSlope(wx, wz);
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
    const style = this.siteTerrain;
    const pbr = {
      grass: getGroundPBR(style?.pbr.grass ?? 'grass'),
      dirt: getGroundPBR(style?.pbr.dirt ?? 'dirt'),
      sand: getGroundPBR(style?.pbr.sand ?? 'sand'),
      rock: getGroundPBR(style?.pbr.rock ?? 'rock'),
      snow: getGroundPBR(style?.pbr.snow ?? 'snow'),
    };
    const anyPbr = Object.values(pbr).some((x) => !!x);
    const flatN = flatTex(128, 128, 255);
    const flatR = flatTex(200, 200, 200);
    const diff = (slot: keyof typeof pbr, fallback: THREE.Texture): THREE.Texture => pbr[slot]?.diffuse ?? fallback;
    // Caral's photographic normals are crack/dune maps; at RTS tiling they
    // read as a repeating floral relief. Keep the diffuse detail and use the
    // analytic micro-relief instead.
    const nrm = (slot: keyof typeof pbr): THREE.Texture => (style?.flatNormals ? flatN : pbr[slot]?.normal) ?? flatN;
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
        splatMap: { value: this.splatTexture },
        heightBias: { value: new THREE.Vector4(0.06, 0.22, 0.12, 0.78) },
        heightSnow: { value: 0.62 },
        terrainDetail: { value: 1 },
        usePbr: { value: style?.flatNormals ? 0 : anyPbr ? 1 : 0 },
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
        terrainPreset: { value: this.terrainPreset },
        suppressSnow: { value: this.suppressSnow ? 1 : 0 },
        valleyHaze: { value: this.valleyHaze ? 1 : 0 },
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
        uniform sampler2D splatMap;
        uniform vec4 heightBias;
        uniform float heightSnow;
        uniform float terrainDetail;
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
        uniform float terrainPreset;
        uniform float suppressSnow;
        uniform float valleyHaze;
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
        vec3 sampleNormalMap(sampler2D tex, vec2 uv) {
          vec2 s = texture2D(tex, uv).rg * 2.0 - 1.0;
          return vec3(s, sqrt(max(0.0, 1.0 - dot(s, s))));
        }

        vec3 triplanarAlbedo(sampler2D tex, vec3 p, vec3 n, float scale) {
          vec3 w = pow(abs(n), vec3(4.0));
          w /= max(1e-4, w.x + w.y + w.z);
          vec3 x = texture2D(tex, p.zy * scale).rgb;
          vec3 y = texture2D(tex, p.xz * scale).rgb;
          vec3 z = texture2D(tex, p.xy * scale).rgb;
          return x * w.x + y * w.y + z * w.z;
        }

        vec3 triplanarNormal(sampler2D tex, vec3 p, vec3 n, float scale) {
          vec3 w = pow(abs(n), vec3(4.0));
          w /= max(1e-4, w.x + w.y + w.z);
          vec3 nx = sampleNormalMap(tex, p.zy * scale);
          vec3 ny = sampleNormalMap(tex, p.xz * scale);
          vec3 nz = sampleNormalMap(tex, p.xy * scale);
          nx = vec3(nx.xy + n.zy, abs(nx.z) * n.x);
          ny = vec3(ny.xy + n.xz, abs(ny.z) * n.y);
          nz = vec3(nz.xy + n.xy, abs(nz.z) * n.z);
          return normalize(nx.zyx * w.x + ny.xzy * w.y + nz.xyz * w.z);
        }

        void main() {
          // local fractal detail (two octaves to break repetition)
          float detail = fbm(vUv * 6.0 + vWorldPos.xz * 0.02);
          float detail2 = fbm(vUv * 15.0 - vWorldPos.xz * 0.04);
          vec3 col = vColor;

          // real slope (normal pointing up)
          float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);

          // CPU splatmap: grass, dirt, sand and rock. Snow stays procedural so
          // it follows the heightfield without another texture.
          vec4 splat = texture2D(splatMap, clamp(vWorldPos.xz / mapSize, vec2(0.001), vec2(0.999)));
          float snowAmt = (1.0 - suppressSnow) * smoothstep(snowLine - 4.0, snowLine + 0.5, vHeight);
          float grassWeight = splat.r;
          float dirtWeight = splat.g;
          float sandWeight = splat.b;
          float rockWeight = splat.a;
          float snowWeight = snowAmt;

          // Height-biased blend: a weightless material cannot appear, while
          // taller materials keep a crisper edge. The uniforms are the contract
          // #302 fills with real per-material height maps.
          const float HEIGHT_BIAS_STRENGTH = 0.9;
          float grassHeightScore = grassWeight * (1.0 + heightBias.x * HEIGHT_BIAS_STRENGTH);
          float dirtHeightScore = dirtWeight * (1.0 + heightBias.y * HEIGHT_BIAS_STRENGTH);
          float sandHeightScore = sandWeight * (1.0 + heightBias.z * HEIGHT_BIAS_STRENGTH);
          float rockHeightScore = rockWeight * (1.0 + heightBias.w * HEIGHT_BIAS_STRENGTH);
          float snowHeightScore = snowWeight * (1.0 + heightSnow * HEIGHT_BIAS_STRENGTH);
          float heightSum = max(1e-4, grassHeightScore + dirtHeightScore + sandHeightScore + rockHeightScore + snowHeightScore);
          grassWeight = grassHeightScore / heightSum;
          dirtWeight = dirtHeightScore / heightSum;
          sandWeight = sandHeightScore / heightSum;
          rockWeight = rockHeightScore / heightSum;
          snowWeight = snowHeightScore / heightSum;

          // Two non-integer scales plus a low-frequency macro mask hide the
          // tile grid without stochastic sampling.
          vec2 worldXZ = vWorldPos.xz;
          vec2 uvNear = worldXZ * 0.075;
          vec2 uvFar = worldXZ * 0.029 + 17.0;
          float macro = 1.0;
          if (terrainDetail > 0.5) macro = smoothstep(0.15, 0.85, fbm(worldXZ * 0.012 + 7.0));

          vec2 uvGrassNear = uvNear;
          vec2 uvDirtNear = uvNear * 1.13 + 3.0;
          vec2 uvSandNear = uvNear * 0.91 + 7.0;
          vec2 uvRockNear = uvNear * 1.07 + 13.0;
          vec2 uvSnowNear = uvNear * 1.21 + 19.0;

          vec3 grassNear = texture2D(grass, uvGrassNear).rgb;
          vec3 dirtNear = texture2D(dirt, uvDirtNear).rgb;
          vec3 sandNear = texture2D(sand, uvSandNear).rgb;
          vec3 rockNear = texture2D(rock, uvRockNear).rgb;
          vec3 snowNear = texture2D(snow, uvSnowNear).rgb;

          vec3 geometricNormal = normalize(vNormal);
          float rockTriplanarWeight = smoothstep(0.40, 0.52, slope);
          if (rockTriplanarWeight > 0.0) {
            rockNear = mix(rockNear, triplanarAlbedo(rock, vWorldPos, geometricNormal, 0.075), rockTriplanarWeight);
          }

          vec3 groundNear = grassNear * grassWeight + dirtNear * dirtWeight + sandNear * sandWeight + rockNear * rockWeight + snowNear * snowWeight;
          vec3 groundFar = groundNear;
          if (terrainDetail > 0.5) {
            vec2 uvGrassFar = uvFar;
            vec2 uvDirtFar = uvFar * 0.87 + 11.0;
            vec2 uvSandFar = uvFar * 1.19 + 23.0;
            vec2 uvRockFar = uvFar * 0.93 + 31.0;
            vec2 uvSnowFar = uvFar * 1.11 + 41.0;
            vec3 grassFar = texture2D(grass, uvGrassFar).rgb;
            vec3 dirtFar = texture2D(dirt, uvDirtFar).rgb;
            vec3 sandFar = texture2D(sand, uvSandFar).rgb;
            vec3 rockFar = texture2D(rock, uvRockFar).rgb;
            vec3 snowFar = texture2D(snow, uvSnowFar).rgb;
            if (rockTriplanarWeight > 0.0) {
              rockFar = mix(rockFar, triplanarAlbedo(rock, vWorldPos, geometricNormal, 0.029), rockTriplanarWeight);
            }
            groundFar = grassFar * grassWeight + dirtFar * dirtWeight + sandFar * sandWeight + rockFar * rockWeight + snowFar * snowWeight;
          }
          vec3 ground = mix(groundNear, groundFar, macro * 0.65 * terrainDetail);
          ground = (ground - 0.5) * 1.12 + 0.5; // contrast
          col = mix(col, ground, 0.75);
          col *= groundTint;
          // vegetation: tints the grass green in humid biomes (jungle/andes)
          col = mix(col, col * vec3(0.68, 1.08, 0.52), veg * 0.8);
          // Floodplain: the low, flat ground next to a river reads green even in a
          // desert region (the Supe valley below the Caral terrace).
          float flood = (1.0 - smoothstep(waterLevel + 0.3, waterLevel + 5.5, vHeight)) * (1.0 - smoothstep(0.4, 0.8, slope)) * floodplain;
          col = mix(col, vec3(0.28, 0.42, 0.16), flood * (1.0 - arid * 0.25) * 0.75);
          // Authored Caral basin: separate the wet valley floor, the pale desert
          // terrace and the dry lomas. The source texture is a warm monochrome,
          // so the landform reads only when height bands carry different hues.
          if (terrainPreset > 0.5 && terrainPreset < 1.5) {
            float flatness = 1.0 - smoothstep(0.12, 0.38, slope);
            float valleyFloor = (1.0 - smoothstep(waterLevel + 2.0, waterLevel + 4.2, vHeight)) * flatness;
            float terraceBand = smoothstep(waterLevel + 4.0, waterLevel + 5.4, vHeight) *
              (1.0 - smoothstep(9.4, 11.5, vHeight));
            float lomaBand = smoothstep(10.0, 13.0, vHeight);
            float lomaHigh = smoothstep(20.0, 34.0, vHeight);
            float lomaGrass = smoothstep(9.5, 11.0, vHeight) *
              (1.0 - smoothstep(15.0, 18.0, vHeight)) *
              flatness;
            col = mix(col, vec3(0.20, 0.31, 0.10), valleyFloor * 0.55);
            col = mix(col, vec3(0.53, 0.45, 0.31), (1.0 - flatness) * 0.55);
            col = mix(col, vec3(0.56, 0.49, 0.34), terraceBand * 0.22);
            col = mix(col, vec3(0.34, 0.28, 0.15), lomaGrass * 0.40);
            col = mix(col, vec3(0.28, 0.22, 0.14), lomaBand * 0.65);
            col = mix(col, vec3(0.42, 0.34, 0.24), lomaHigh * 0.35);
          }
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

          vec3 rockTriplanarNormal = vec3(0.0);
          float rockTriplanarBlend = 0.0;
          if (usePbr > 0.5) {
            vec2 normalBump =
              (texture(grassN, uvGrassNear).rg * 2.0 - 1.0) * grassWeight +
              (texture(dirtN, uvDirtNear).rg * 2.0 - 1.0) * dirtWeight +
              (texture(sandN, uvSandNear).rg * 2.0 - 1.0) * sandWeight +
              (texture(rockN, uvRockNear).rg * 2.0 - 1.0) * rockWeight +
              (texture(snowN, uvSnowNear).rg * 2.0 - 1.0) * snowWeight;
            bump += normalBump * 0.8;
            rough = (
              texture(grassR, uvGrassNear).r * grassWeight + texture(dirtR, uvDirtNear).r * dirtWeight +
              texture(sandR, uvSandNear).r * sandWeight + texture(rockR, uvRockNear).r * rockWeight +
              texture(snowR, uvSnowNear).r * snowWeight
            );
            if (rockTriplanarWeight > 0.001 && rockWeight > 0.001) {
              rockTriplanarNormal = triplanarNormal(rockN, vWorldPos, geometricNormal, 0.075);
              rockTriplanarBlend = rockTriplanarWeight * rockWeight;
            }
          }

          // directional sun lighting + ambient (terrain relief)
          N = normalize(N + vec3(bump.x, 0.0, bump.y));
          if (rockTriplanarBlend > 0.001) N = normalize(mix(N, rockTriplanarNormal, rockTriplanarBlend));
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
          float lomaMask = smoothstep(10.0, 20.0, vHeight);
          float fogCap = 0.30 + 0.08 * terrainPreset * lomaMask;
          vec3 outCol = mix(lit, fogColor, clamp(max(fogAmt, edgeAmt), 0.0, fogCap));
          // Low morning haze pools over the Supe floodplain and separates it
          // from the dry terrace without washing out the fields.
          float valleyHazeAmt = valleyHaze * flood * (1.0 - smoothstep(0.08, 0.42, slope));
          outCol = mix(outCol, fogColor, valleyHazeAmt * 0.09);

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
    if (!this.suppressSnow)
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

  /** Low quality samples one texture scale and skips triplanar rock. */
  setLowDetail(low: boolean): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.terrainDetail.value = low ? 0 : 1;
  }

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
    this.splatTexture.dispose();
    this.group.removeFromParent();
  }
}
