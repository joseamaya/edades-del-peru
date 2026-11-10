import * as THREE from 'three';
import { TERRAIN_LOD_BLOCK, TERRAIN_LOD_DISTANCE, buildTerrainLodIndex, terrainIndexCapacity } from './terrainLod';
import { getGroundTextures, GroundTextures } from './Textures';
import { getGroundPBR } from './Biomes';
import { buildTerrainSplat, TERRAIN_SPLAT_SIZE, type TerrainSplat } from './terrainSplat';
import { TerrainData } from '../sim/TerrainData';
import type { GroundCoverWeights } from '../model/defs/groundCover';
import { smoothstep } from '../util/math';
import { fbm2 } from '../util/noise';
import { FOW_DIM_GLSL } from './fowGlsl';
import type { GroundPbrSlot, HistoricalMapProfile } from '../model/defs/profiles';
import {
  TERRAIN_PALETTES,
  terrainBandWeights,
  type TerrainPalette,
  type TerrainPaletteId,
} from '../model/defs/terrainPalettes';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import type { AuthoredSiteDef, SiteTerrainStyle } from '../model/defs/sites';

// Palette hex values are authored as display-space colours; keep their numeric
// components so the terrain keeps the same brightness as the old HSL palette.
function paletteColor(hex: string): THREE.Color {
  const value = parseInt(hex.replace('#', ''), 16);
  return new THREE.Color(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

// Scratch colors reused in biome generation (avoids ~200k allocations).
const _cBase = new THREE.Color();
const _cTerraced = new THREE.Color();
const _cCanalBed = new THREE.Color();

/** 1x1 filler surface: neutral normal, constant roughness, mid height. */
function flatSurfaceTex(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([128, 128, 204, 128]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
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
  /** Per LOD block: 1 = full detail, 0 = coarse fan (see terrainLod.ts). */
  private lodFine!: Uint8Array;
  private readonly lodCamera = new THREE.Vector3(Infinity, Infinity, Infinity);
  private lodEnabled = true;
  /** LOD block size in cells; 1 (no LOD) when the resolution is not a multiple of TERRAIN_LOD_BLOCK. */
  private lodBlock = TERRAIN_LOD_BLOCK;
  private skirt: THREE.Mesh | null = null;

  private textures: GroundTextures;
  private pbrExtra: THREE.Texture[] = [];
  private profile: HistoricalMapProfile;
  private readonly siteTerrain?: SiteTerrainStyle;
  private readonly palette: TerrainPalette;
  private readonly bandColors: {
    valley: THREE.Color;
    slope: THREE.Color;
    loma: THREE.Color;
    summit: THREE.Color;
  };
  private readonly suppressSnow: boolean;
  private readonly valleyHaze: boolean;
  /** CPU-authored per-match material weights (grass/dirt/sand/rock). */
  private readonly splat: TerrainSplat;
  /** GPU copy of `splat`, sampled by the terrain shader. */
  private readonly splatTexture: THREE.DataTexture;
  /** Untouched weights, used as the base for wear/path painting. */
  private readonly splatBase: Uint8Array;

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
    const paletteId = style?.palette ?? (profile.region as TerrainPaletteId);
    this.palette = TERRAIN_PALETTES[paletteId] ?? TERRAIN_PALETTES.central_coast;
    this.bandColors = {
      valley: paletteColor(this.palette.bands.valley),
      slope: paletteColor(this.palette.bands.slope),
      loma: paletteColor(this.palette.bands.loma),
      summit: paletteColor(this.palette.bands.summit),
    };
    this.suppressSnow = site?.terrain.suppressSnow ?? false;
    this.valleyHaze = site?.terrain.valleyHaze ?? false;
    this.textures = getGroundTextures();
    this.data = new TerrainData(size, resolution, seed, profile, layout, site);
    this.heightMap = this.data.heightMap;
    this.moistureMap = this.data.moistureMap;
    this.terraceMap = this.data.terraceMap;
    this.canalMap = this.data.canalMap;
    this.canalPaths = this.data.canalPaths;
    this.canalWidth = this.data.canalWidth;
    this.waterLevel = this.data.waterLevel;
    this.splat = buildTerrainSplat(this.data, profile, { size: TERRAIN_SPLAT_SIZE, seed });
    this.splatBase = new Uint8Array(this.splat.data);
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

  isRiver(wx: number, wz: number): boolean {
    return this.data.isRiver(wx, wz);
  }

  isSea(wx: number, wz: number): boolean {
    return this.data.isSea(wx, wz);
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

  /** Current splat weights at a world point (grass, dirt, sand, rock; 0..1). */
  getSplatWeights(wx: number, wz: number): GroundCoverWeights {
    const size = this.splat.size;
    const tx = Math.max(0, Math.min(size - 1, Math.floor((wx / this.size) * size)));
    const tz = Math.max(0, Math.min(size - 1, Math.floor((wz / this.size) * size)));
    const i = (tz * size + tx) * 4;
    const d = this.splat.data;
    return { grass: d[i] / 255, dirt: d[i + 1] / 255, sand: d[i + 2] / 255, rock: d[i + 3] / 255 };
  }

  private buildMesh(): THREE.Mesh {
    const n = this.resolution + 1;
    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    const uvs = new Float32Array(n * n * 2);
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

        const col = this.biomeColor(h, slope, waterLevel);
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

    // Start fully detailed (normals are computed on the full grid and kept); update() then swaps in
    // the distance LOD index.
    if (this.resolution % TERRAIN_LOD_BLOCK !== 0) {
      this.lodBlock = 1;
      this.lodEnabled = false;
    }
    this.lodFine = new Uint8Array((this.resolution / this.lodBlock) ** 2).fill(1);
    const lodIndex = new Uint32Array(terrainIndexCapacity(this.resolution));
    const count = buildTerrainLodIndex(this.resolution, this.lodFine, lodIndex, this.lodBlock);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const indexAttr = new THREE.BufferAttribute(lodIndex, 1);
    indexAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setIndex(indexAttr);
    geo.setDrawRange(0, count);
    geo.computeVertexNormals();

    const tex = this.textures;
    const style = this.siteTerrain;
    const pbrSlot = (key: GroundPbrSlot): string => style?.pbr[key] ?? this.profile.groundPbr?.[key] ?? key;
    const pbr = {
      grass: getGroundPBR(pbrSlot('grass')),
      dirt: getGroundPBR(pbrSlot('dirt')),
      sand: getGroundPBR(pbrSlot('sand')),
      rock: getGroundPBR(pbrSlot('rock')),
      snow: getGroundPBR(pbrSlot('snow')),
    };
    const flatSurface = flatSurfaceTex();
    const albedo = (slot: keyof typeof pbr, fallback: THREE.Texture): THREE.Texture => pbr[slot]?.albedo ?? fallback;
    const surface = (slot: keyof typeof pbr): THREE.Texture => pbr[slot]?.surface ?? flatSurface;
    this.pbrExtra = [flatSurface];
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        grass: { value: albedo('grass', tex.grass) },
        dirt: { value: albedo('dirt', tex.dirt) },
        sand: { value: albedo('sand', tex.sand) },
        rock: { value: albedo('rock', tex.rock) },
        snow: { value: albedo('snow', tex.snow) },
        grassSurface: { value: surface('grass') },
        dirtSurface: { value: surface('dirt') },
        sandSurface: { value: surface('sand') },
        rockSurface: { value: surface('rock') },
        snowSurface: { value: surface('snow') },
        splatMap: { value: this.splatTexture },
        flatNormals: { value: style?.flatNormals ? 1 : 0 },
        terrainDetail: { value: 1 },
        waterLevel: { value: waterLevel },
        time: { value: 0 },
        sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
        sunColor: { value: new THREE.Color(1, 0.96, 0.88) },
        ambientColor: { value: new THREE.Color(0.08, 0.09, 0.1) },
        skyColor: { value: new THREE.Color(0xcdd6e6) },
        groundColor: { value: new THREE.Color(0x55664a) },
        hemiIntensity: { value: 0.4 },
        fogColor: { value: new THREE.Color(0.78, 0.85, 0.92) },
        fogDensity: { value: 0.0 },
        cloudShadow: { value: 1.0 },
        cameraPos: { value: new THREE.Vector3() },
        mapSize: { value: this.size },
        fowMap: { value: null as THREE.Texture | null },
        fowEnabled: { value: 0 },
        snowLine: { value: this.profile.elevation.snowLine },
        grassTint: { value: paletteColor(this.palette.materials.grass) },
        dirtTint: { value: paletteColor(this.palette.materials.dirt) },
        sandTint: { value: paletteColor(this.palette.materials.sand) },
        rockTint: { value: paletteColor(this.palette.materials.rock) },
        snowTint: { value: paletteColor(this.palette.materials.snow) },
        textureMix: { value: this.palette.textureMix },
        groundTint: { value: paletteColor(this.profile.groundTint ?? '#ffffff') },
        fogCapBoost: { value: this.palette.fogCapBoost ?? 0 },
        suppressSnow: { value: this.suppressSnow ? 1 : 0 },
        valleyHaze: { value: this.valleyHaze ? 1 : 0 },
        seasonDry: { value: 0 },
        seasonWet: { value: 0 },
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
        uniform sampler2D grassSurface;
        uniform sampler2D dirtSurface;
        uniform sampler2D sandSurface;
        uniform sampler2D rockSurface;
        uniform sampler2D snowSurface;
        uniform sampler2D splatMap;
        uniform float flatNormals;
        uniform float terrainDetail;
        uniform float waterLevel;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 ambientColor;
        uniform vec3 skyColor;
        uniform vec3 groundColor;
        uniform float hemiIntensity;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float cloudShadow;
        uniform vec3 cameraPos;
        uniform float mapSize;
        uniform sampler2D fowMap;
        uniform float fowEnabled;
        uniform float snowLine;
        uniform vec3 grassTint;
        uniform vec3 dirtTint;
        uniform vec3 sandTint;
        uniform vec3 rockTint;
        uniform vec3 snowTint;
        uniform float textureMix;
        uniform vec3 groundTint;
        uniform float fogCapBoost;
        uniform float suppressSnow;
        uniform float valleyHaze;
        uniform float seasonDry;
        uniform float seasonWet;
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
          float shore = (1.0 - smoothstep(0.0, 1.4, abs(vHeight - waterLevel))) * (1.0 - smoothstep(0.35, 0.7, slope));
          float grassWeight = splat.r;
          float dirtWeight = splat.g;
          float sandWeight = splat.b;
          float rockWeight = splat.a;
          float snowWeight = snowAmt;

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

          // Packed surface: R/G normal.xy, B roughness, A height.
          vec4 grassSurfaceTex = texture2D(grassSurface, uvGrassNear);
          vec4 dirtSurfaceTex = texture2D(dirtSurface, uvDirtNear);
          vec4 sandSurfaceTex = texture2D(sandSurface, uvSandNear);
          vec4 rockSurfaceTex = texture2D(rockSurface, uvRockNear);
          vec4 snowSurfaceTex = texture2D(snowSurface, uvSnowNear);

          // Height blend: a weightless material cannot appear, while taller
          // materials keep a crisper edge.
          const float HEIGHT_STRENGTH = 0.9;
          float grassHeightScore = grassWeight * (1.0 + grassSurfaceTex.a * HEIGHT_STRENGTH);
          float dirtHeightScore = dirtWeight * (1.0 + dirtSurfaceTex.a * HEIGHT_STRENGTH);
          float sandHeightScore = sandWeight * (1.0 + sandSurfaceTex.a * HEIGHT_STRENGTH);
          float rockHeightScore = rockWeight * (1.0 + rockSurfaceTex.a * HEIGHT_STRENGTH);
          float snowHeightScore = snowWeight * (1.0 + snowSurfaceTex.a * HEIGHT_STRENGTH);
          float heightSum = max(1e-4, grassHeightScore + dirtHeightScore + sandHeightScore + rockHeightScore + snowHeightScore);
          grassWeight = grassHeightScore / heightSum;
          dirtWeight = dirtHeightScore / heightSum;
          sandWeight = sandHeightScore / heightSum;
          rockWeight = rockHeightScore / heightSum;
          snowWeight = snowHeightScore / heightSum;

          vec4 grassTex = texture2D(grass, uvGrassNear);
          vec4 dirtTex = texture2D(dirt, uvDirtNear);
          vec4 sandTex = texture2D(sand, uvSandNear);
          vec4 rockTex = texture2D(rock, uvRockNear);
          vec4 snowTex = texture2D(snow, uvSnowNear);

          vec3 geometricNormal = normalize(vNormal);
          float rockTriplanarWeight = smoothstep(0.40, 0.52, slope);
          if (rockTriplanarWeight > 0.0) {
            rockTex.rgb = mix(rockTex.rgb, triplanarAlbedo(rock, vWorldPos, geometricNormal, 0.075), rockTriplanarWeight);
          }

          vec3 groundNear =
            grassTex.rgb * grassTint * grassWeight +
            dirtTex.rgb * dirtTint * dirtWeight +
            sandTex.rgb * sandTint * sandWeight +
            rockTex.rgb * rockTint * rockWeight +
            snowTex.rgb * snowTint * snowWeight;
          float aoNear = grassTex.a * grassWeight + dirtTex.a * dirtWeight + sandTex.a * sandWeight + rockTex.a * rockWeight + snowTex.a * snowWeight;
          vec3 groundFar = groundNear;
          float aoFar = aoNear;
          if (terrainDetail > 0.5) {
            vec2 uvGrassFar = uvFar;
            vec2 uvDirtFar = uvFar * 0.87 + 11.0;
            vec2 uvSandFar = uvFar * 1.19 + 23.0;
            vec2 uvRockFar = uvFar * 0.93 + 31.0;
            vec2 uvSnowFar = uvFar * 1.11 + 41.0;
            vec4 grassFarTex = texture2D(grass, uvGrassFar);
            vec4 dirtFarTex = texture2D(dirt, uvDirtFar);
            vec4 sandFarTex = texture2D(sand, uvSandFar);
            vec4 rockFarTex = texture2D(rock, uvRockFar);
            vec4 snowFarTex = texture2D(snow, uvSnowFar);
            if (rockTriplanarWeight > 0.0) {
              rockFarTex.rgb = mix(rockFarTex.rgb, triplanarAlbedo(rock, vWorldPos, geometricNormal, 0.029), rockTriplanarWeight);
            }
            groundFar =
              grassFarTex.rgb * grassTint * grassWeight +
              dirtFarTex.rgb * dirtTint * dirtWeight +
              sandFarTex.rgb * sandTint * sandWeight +
              rockFarTex.rgb * rockTint * rockWeight +
              snowFarTex.rgb * snowTint * snowWeight;
            aoFar = grassFarTex.a * grassWeight + dirtFarTex.a * dirtWeight + sandFarTex.a * sandWeight + rockFarTex.a * rockWeight + snowFarTex.a * snowWeight;
          }
          vec3 ground = mix(groundNear, groundFar, macro * 0.65 * terrainDetail);
          ground *= mix(1.0, mix(aoNear, aoFar, macro * 0.65 * terrainDetail), 0.7);
          ground = (ground - 0.5) * 1.12 + 0.5; // contrast
          col = mix(col, ground, textureMix);
          col *= groundTint;
          col = mix(col, col * vec3(0.55, 0.52, 0.45), shore * 0.6);
          col = mix(col, col * (0.9 + 0.2 * detail2), 0.25);

          // slope-based AO
          float slopeAO = 0.82 + 0.18 * (1.0 - smoothstep(0.0, 0.55, slope));
          col *= slopeAO;
          // micro-variation
          col *= 0.92 + 0.16 * detail;

          // micro-relief: analytic normal + packed surface normal
          vec3 N = normalize(vNormal);
          vec2 nu = vWorldPos.xz * 0.45;
          float nC = fbm(nu);
          float nX = fbm(nu + vec2(0.06, 0.0));
          float nZ = fbm(nu + vec2(0.0, 0.06));
          float bumpAmt = (1.0 - smoothstep(0.0, 0.5, slope)) * 0.6;
          vec2 bump = vec2((nC - nX) * bumpAmt, (nC - nZ) * bumpAmt);
          float rough = 0.9;

          vec2 normalBump =
            (grassSurfaceTex.rg * 2.0 - 1.0) * grassWeight +
            (dirtSurfaceTex.rg * 2.0 - 1.0) * dirtWeight +
            (sandSurfaceTex.rg * 2.0 - 1.0) * sandWeight +
            (rockSurfaceTex.rg * 2.0 - 1.0) * rockWeight +
            (snowSurfaceTex.rg * 2.0 - 1.0) * snowWeight;
          normalBump *= 1.0 - flatNormals;
          bump += normalBump * 0.8;
          rough =
            grassSurfaceTex.b * grassWeight + dirtSurfaceTex.b * dirtWeight +
            sandSurfaceTex.b * sandWeight + rockSurfaceTex.b * rockWeight +
            snowSurfaceTex.b * snowWeight;
          rough = mix(rough, 0.22, shore * 0.75);

          vec3 rockTriplanarNormal = vec3(0.0);
          float rockTriplanarBlend = 0.0;
          if (flatNormals < 0.5 && rockTriplanarWeight > 0.001 && rockWeight > 0.001) {
            rockTriplanarNormal = triplanarNormal(rockSurface, vWorldPos, geometricNormal, 0.075);
            rockTriplanarBlend = rockTriplanarWeight * rockWeight;
          }

          // directional sun lighting + ambient (terrain relief)
          N = normalize(N + vec3(bump.x, 0.0, bump.y));
          if (rockTriplanarBlend > 0.001) N = normalize(mix(N, rockTriplanarNormal, rockTriplanarBlend));
          float ndl = max(dot(N, sunDir), 0.0);
          vec3 hemi = mix(groundColor, skyColor, 0.5 + 0.5 * N.y) * hemiIntensity;
          vec3 lit = col * (ambientColor + hemi + sunColor * ndl * cloudShadow * 1.15);
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
          float fogCap = 0.30 + fogCapBoost * lomaMask;
          vec3 outCol = mix(lit, fogColor, clamp(max(fogAmt, edgeAmt), 0.0, fogCap));
          // Season grade: the drought bleaches the ground warm and flat, the flood cools it.
          outCol = mix(outCol, outCol * vec3(1.07, 0.99, 0.84), seasonDry);
          outCol = mix(outCol, outCol * vec3(0.97, 1.03, 0.97), seasonWet);
          // Low morning haze pools over the Supe floodplain and separates it
          // from the dry terrace without washing out the fields.
          float valleyMask = (1.0 - smoothstep(waterLevel + 1.0, waterLevel + 6.0, vHeight)) * (1.0 - smoothstep(0.08, 0.42, slope));
          float valleyHazeAmt = valleyHaze * valleyMask;
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

  private biomeColor(h: number, slope: number, waterLevel: number): THREE.Color {
    const w = terrainBandWeights(h, slope, waterLevel, this.profile.elevation.snowLine, this.suppressSnow);
    const c = this.bandColors;
    _cBase.setRGB(
      c.valley.r * w.valley + c.slope.r * w.slope + c.loma.r * w.loma + c.summit.r * w.summit,
      c.valley.g * w.valley + c.slope.g * w.slope + c.loma.g * w.loma + c.summit.g * w.summit,
      c.valley.b * w.valley + c.slope.b * w.slope + c.loma.b * w.loma + c.summit.b * w.summit,
    );
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

  /**
   * Re-index the mesh so blocks far from the camera are drawn coarse (see terrainLod.ts); the frame
   * loop calls it after the camera moved. Only runs when the camera has moved a couple of units, and
   * only uploads the indices in use.
   */
  updateLod(cam: THREE.Vector3, force = false): void {
    if (this.lodBlock === 1) return;
    if (!force && this.lodCamera.distanceToSquared(cam) < 4) return;
    this.lodCamera.copy(cam);
    const blocks = this.resolution / TERRAIN_LOD_BLOCK;
    const cell = this.size / this.resolution;
    const d2 = TERRAIN_LOD_DISTANCE * TERRAIN_LOD_DISTANCE;
    const n = this.resolution + 1;
    let changed = false;
    for (let bz = 0; bz < blocks; bz++) {
      for (let bx = 0; bx < blocks; bx++) {
        const vx = bx * TERRAIN_LOD_BLOCK + TERRAIN_LOD_BLOCK / 2;
        const vz = bz * TERRAIN_LOD_BLOCK + TERRAIN_LOD_BLOCK / 2;
        const dx = vx * cell - cam.x;
        const dy = this.heightMap[vz * n + vx] - cam.y;
        const dz = vz * cell - cam.z;
        const fine = !this.lodEnabled || dx * dx + dy * dy + dz * dz < d2 ? 1 : 0;
        if (this.lodFine[bz * blocks + bx] !== fine) {
          this.lodFine[bz * blocks + bx] = fine;
          changed = true;
        }
      }
    }
    if (!changed && !force) return;
    const geo = this.mesh.geometry;
    const index = geo.getIndex() as THREE.BufferAttribute;
    const count = buildTerrainLodIndex(this.resolution, this.lodFine, index.array as Uint32Array);
    geo.setDrawRange(0, count);
    index.clearUpdateRanges();
    index.addUpdateRange(0, count);
    index.needsUpdate = true;
  }

  /** Draw the whole terrain at full detail (e.g. for captures that need exact geometry). */
  setLodEnabled(on: boolean): void {
    this.lodEnabled = on && this.lodBlock > 1;
    if (this.camera) this.updateLod(this.camera.position, true);
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

  /** Share the scene hemisphere light with the terrain shader. */
  setHemisphere(sky: THREE.Color, ground: THREE.Color, intensity: number): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.skyColor.value.copy(sky);
    mat.uniforms.groundColor.value.copy(ground);
    mat.uniforms.hemiIntensity.value = intensity;
  }

  /** Connect the fog-of-war map to the terrain shader. */
  setFow(texture: THREE.Texture, enabled: boolean): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.fowMap.value = texture;
    mat.uniforms.fowEnabled.value = enabled ? 1 : 0;
  }

  camera: THREE.Camera | null = null;

  /** Paint a soft, noisy dirt footprint around a building. */
  paintWear(x: number, z: number, radius: number, strength = 0.9): void {
    const pad = radius * 1.35;
    this.paintSplatRegion(
      { minX: x - pad, maxX: x + pad, minZ: z - pad, maxZ: z + pad },
      (wx, wz) => Math.hypot(wx - x, wz - z),
      radius,
      strength,
    );
  }

  /** Restore the original splat under a removed building. */
  clearWear(x: number, z: number, radius: number, strength = 1): void {
    const pad = radius * 1.35;
    this.paintSplatRegion(
      { minX: x - pad, maxX: x + pad, minZ: z - pad, maxZ: z + pad },
      (wx, wz) => Math.hypot(wx - x, wz - z),
      radius,
      strength,
      'clear',
    );
  }

  /** Paint a dirt/gravel path under a polyline (settlement and mission roads). */
  paintPath(points: { x: number; z: number }[], width: number, strength = 0.8): void {
    if (points.length < 2) return;
    const radius = Math.max(0.35, width / 2);
    const pad = radius * 1.35;
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const length = Math.hypot(to.x - from.x, to.z - from.z);
      const steps = Math.max(1, Math.ceil(length / 2));
      for (let step = 0; step < steps; step++) {
        const t0 = step / steps;
        const t1 = (step + 1) / steps;
        const a = { x: from.x + (to.x - from.x) * t0, z: from.z + (to.z - from.z) * t0 };
        const b = { x: from.x + (to.x - from.x) * t1, z: from.z + (to.z - from.z) * t1 };
        const vx = b.x - a.x;
        const vz = b.z - a.z;
        const len2 = Math.max(1e-4, vx * vx + vz * vz);
        this.paintSplatRegion(
          {
            minX: Math.min(a.x, b.x) - pad,
            maxX: Math.max(a.x, b.x) + pad,
            minZ: Math.min(a.z, b.z) - pad,
            maxZ: Math.max(a.z, b.z) + pad,
          },
          (wx, wz) => {
            const t = Math.max(0, Math.min(1, ((wx - a.x) * vx + (wz - a.z) * vz) / len2));
            return Math.hypot(wx - (a.x + vx * t), wz - (a.z + vz * t));
          },
          radius,
          strength,
        );
      }
    }
  }

  /** Splat before any drought, so the drying is computed from it (not accumulated frame after frame). */
  private preDrought: Uint8Array | null = null;
  /** Paint before the summer flood (sierra rains), restored when the season ends or the drought takes over. */
  private preWet: Uint8Array | null = null;
  private wetApplied = false;
  /** Current drought strength; a running drought owns the paint and blocks the flood. */
  private droughtLevel = 0;

  /**
   * Dry the valley (0 = as painted, 1 = full drought): green ground turns to sand and dry earth in
   * irregular patches, the wettest ground last. Purely visual; the farms' yield is handled by the game.
   */
  setDrought(level: number): void {
    const f = Math.max(0, Math.min(1, level));
    this.droughtLevel = f;
    const uniforms = (this.mesh.material as THREE.ShaderMaterial).uniforms;
    uniforms.seasonDry.value = f;
    if (f > 0) uniforms.seasonWet.value = 0;
    const out = this.splat.data;
    if (!this.preDrought) {
      if (f === 0) return;
      // The flood paint is a season, not a new baseline: undo it before the drought reads the ground.
      if (this.wetApplied) this.restoreWetPaint();
      this.preDrought = new Uint8Array(out);
    }
    const src = this.preDrought;
    const size = this.splat.size;
    const cell = this.size / size;
    for (let tz = 0; tz < size; tz++) {
      const wz = (tz + 0.5) * cell;
      for (let tx = 0; tx < size; tx++) {
        const wx = (tx + 0.5) * cell;
        const i = (tz * size + tx) * 4;
        // Patches dry at different moments; the moist floodplain holds out longest.
        const patch = fbm2(wx * 0.06 + 3, wz * 0.06 - 5, 3);
        const moist = this.data.getMoisture(wx, wz);
        const dry = Math.max(0, Math.min(1, f * 1.6 - patch * 0.5 - moist * 0.35));
        const grass = src[i]! / 255;
        const lost = grass * dry * 0.95;
        const g = grass - lost;
        const d = src[i + 1]! / 255 + lost * 0.35;
        const sd = src[i + 2]! / 255 + lost * 0.65;
        const r = src[i + 3]! / 255;
        writeSplat(out, i, g, d, sd, r);
      }
    }
    this.splatTexture.needsUpdate = true;
  }

  /**
   * Summer flood (0 = as painted, 1 = full wet season): the floodplain and the riverbanks green up.
   * The lomas also take the fog-fed green of the wet months because the event tints both; that verdor is
   * a winter-fog cue, not part of the summer flood. Purely visual; the drought wins.
   */
  setWetSeason(level: number): void {
    if (this.droughtLevel > 0) return;
    const f = Math.max(0, Math.min(1, level));
    (this.mesh.material as THREE.ShaderMaterial).uniforms.seasonWet.value = f;
    const out = this.splat.data;
    if (f === 0) {
      if (this.wetApplied) this.restoreWetPaint();
      return;
    }
    if (!this.wetApplied) this.preWet = new Uint8Array(out);
    this.wetApplied = true;
    const src = this.preWet;
    if (!src) return;
    const size = this.splat.size;
    const cell = this.size / size;
    for (let tz = 0; tz < size; tz++) {
      const wz = (tz + 0.5) * cell;
      for (let tx = 0; tx < size; tx++) {
        const wx = (tx + 0.5) * cell;
        const i = (tz * size + tx) * 4;
        const patch = fbm2(wx * 0.05 + 11, wz * 0.05 + 7, 3);
        const moist = this.data.getMoisture(wx, wz);
        const grass = src[i]! / 255;
        const dirt = src[i + 1]! / 255;
        const sand = src[i + 2]! / 255;
        const rock = src[i + 3]! / 255;
        const wet = f * (0.25 + moist * 0.75);
        // The lomas answer to the winter fog, not only to the river: green the rock patches.
        const loma = Math.max(0, patch - 0.08) * 2;
        const g = Math.min(1, grass + sand * 0.8 * wet + dirt * 0.6 * wet + rock * 0.5 * wet * loma);
        const d = dirt * (1 - 0.2 * wet);
        const sd = sand * (1 - 0.35 * wet);
        const r = rock * (1 - Math.min(1, 0.5 * wet * loma));
        writeSplat(out, i, g, d, sd, r);
      }
    }
    this.splatTexture.needsUpdate = true;
  }

  private restoreWetPaint(): void {
    if (this.preWet) {
      this.splat.data.set(this.preWet);
      this.splatTexture.needsUpdate = true;
    }
    this.wetApplied = false;
  }

  private paintSplatRegion(
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    distance: (wx: number, wz: number) => number,
    radius: number,
    strength: number,
    mode: 'wear' | 'clear' = 'wear',
  ): void {
    const size = this.splat.size;
    const worldSize = this.size;
    const cell = worldSize / size;
    const x0 = Math.max(0, Math.floor(bounds.minX / cell));
    const x1 = Math.min(size - 1, Math.ceil(bounds.maxX / cell));
    const z0 = Math.max(0, Math.floor(bounds.minZ / cell));
    const z1 = Math.min(size - 1, Math.ceil(bounds.maxZ / cell));
    const base = this.splatBase;
    const out = this.splat.data;
    let changed = false;
    for (let tz = z0; tz <= z1; tz++) {
      const wz = (tz + 0.5) * cell;
      for (let tx = x0; tx <= x1; tx++) {
        const wx = (tx + 0.5) * cell;
        const jitter = (fbm2(wx * 0.45 + 11, wz * 0.45 - 7, 2) - 0.5) * radius * 0.45;
        const edge = 1 - smoothstep(radius * 0.55, radius, distance(wx, wz) + jitter);
        const weight = Math.max(0, Math.min(1, strength * edge));
        if (weight <= 0.001) continue;
        const i = (tz * size + tx) * 4;
        if (mode === 'clear') {
          const keep = 1 - weight;
          out[i] = Math.round(base[i] + (out[i] - base[i]) * keep);
          out[i + 1] = Math.round(base[i + 1] + (out[i + 1] - base[i + 1]) * keep);
          out[i + 2] = Math.round(base[i + 2] + (out[i + 2] - base[i + 2]) * keep);
          out[i + 3] = Math.round(base[i + 3] + (out[i + 3] - base[i + 3]) * keep);
          changed = true;
          continue;
        }
        const grass = (out[i] / 255) * (1 - weight);
        const dirt = Math.min(1, out[i + 1] / 255 + weight);
        const sand = (out[i + 2] / 255) * (1 - weight * 0.65);
        const rock = (out[i + 3] / 255) * (1 - weight * 0.5);
        const sum = grass + dirt + sand + rock;
        const inv = sum > 0 ? 1 / sum : 1;
        out[i] = Math.round(grass * inv * 255);
        out[i + 1] = Math.round(dirt * inv * 255);
        out[i + 2] = Math.round(sand * inv * 255);
        out[i + 3] = Math.round(rock * inv * 255);
        changed = true;
      }
    }
    if (changed) this.splatTexture.needsUpdate = true;
  }

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

/** Normalise and store one splat texel (grass, dirt, sand, rock). */
function writeSplat(out: Uint8Array, i: number, g: number, d: number, sd: number, r: number): void {
  const sum = Math.max(1e-6, g + d + sd + r);
  out[i] = Math.round((g / sum) * 255);
  out[i + 1] = Math.round((d / sum) * 255);
  out[i + 2] = Math.round((sd / sum) * 255);
  out[i + 3] = Math.round((r / sum) * 255);
}
