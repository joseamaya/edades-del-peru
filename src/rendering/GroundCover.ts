import * as THREE from 'three';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import {
  GROUND_COVER_INSTANCE_BUDGET,
  GROUND_COVER_SPECIES,
  groundCoverCount,
  planGroundCover,
  type GroundCoverPlacement,
  type GroundCoverQuery,
  type GroundCoverSpecies,
  type GroundCoverWeights,
} from '../model/defs/groundCover';
import { RNG } from '../util/rng';
import { FOW_DIM_GLSL } from './fowGlsl';
import type { FowUniforms } from './FowMaterial';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

const CHUNK_SIZE = 24;
const FADE_START = 0.45;
const FADE_END = 0.75;

const COLORS: Record<GroundCoverSpecies, readonly string[]> = {
  grass: ['#8ea05a', '#9aac64', '#7d9148', '#a6b76d'],
  ichu: ['#d0c184', '#c7b777', '#b9a96a', '#d8ca91'],
  fern: ['#3f6a3a', '#4d7a42', '#365c34'],
  pebble: ['#8a8378', '#9b9488', '#746e64'],
  gravel: ['#9a9488', '#aaa396', '#858076'],
};

/**
 * Instanced low ground cover: ichu/grass tufts, ferns and gravel/pebbles.
 * Deterministic from the terrain splat, moisture and slope; one draw call per
 * species. Instances fade/cull by 24 m chunk in the vertex shader and bend
 * slightly with the wind. Visual only: no entities, no obstacles, no gameplay.
 */
export class GroundCover {
  readonly group = new THREE.Group();
  readonly instanceBudget: number;
  readonly instanceCount: number;
  readonly chunkCount: number;
  readonly speciesCounts: Record<GroundCoverSpecies, number>;
  enabled = true;

  private readonly meshes = new Map<GroundCoverSpecies, THREE.InstancedMesh>();
  private readonly entries = new Map<GroundCoverSpecies, GroundCoverPlacement[]>();
  private readonly materials: THREE.Material[] = [];
  private readonly timeUniform = { value: 0 };
  private readonly sunDirUniform = { value: new THREE.Vector3(0, 1, 0) };
  private readonly sunColorUniform = { value: new THREE.Color(1, 1, 1) };
  private readonly skyColorUniform = { value: new THREE.Color(0.8, 0.85, 0.9) };
  private readonly groundColorUniform = { value: new THREE.Color(0.25, 0.22, 0.18) };
  private readonly hemiIntensityUniform = { value: 1 };
  private readonly fadeStart: number;
  private readonly fadeEnd: number;

  constructor(
    private readonly terrain: {
      size: number;
      getHeight(x: number, z: number): number;
      getSlope(x: number, z: number): number;
      getMoisture(x: number, z: number): number;
      isWater(x: number, z: number): boolean;
      isBeach(x: number, z: number): boolean;
      getSplatWeights(x: number, z: number): GroundCoverWeights;
    },
    profile: HistoricalMapProfile,
    seed: number,
    query: Pick<GroundCoverQuery, 'isExcluded'>,
    private readonly fow: FowUniforms,
  ) {
    this.group.name = 'ground-cover';
    this.instanceBudget = GROUND_COVER_INSTANCE_BUDGET;
    this.fadeStart = terrain.size * FADE_START;
    this.fadeEnd = terrain.size * FADE_END;
    const chunkSize = CHUNK_SIZE;
    const count = groundCoverCount(terrain.size, profile.vegetation.density, this.instanceBudget);
    const placements = planGroundCover(profile, seed, count, {
      size: terrain.size,
      getHeight: (x, z) => terrain.getHeight(x, z),
      getSlope: (x, z) => terrain.getSlope(x, z),
      getMoisture: (x, z) => terrain.getMoisture(x, z),
      isWater: (x, z) => terrain.isWater(x, z),
      isBeach: (x, z) => terrain.isBeach(x, z),
      getSplatWeights: (x, z) => terrain.getSplatWeights(x, z),
      isExcluded: (x, z) => query.isExcluded(x, z),
    });

    const chunks = new Set<string>();
    const counts = Object.fromEntries(GROUND_COVER_SPECIES.map((id) => [id, 0])) as Record<GroundCoverSpecies, number>;
    const bySpecies = new Map<GroundCoverSpecies, GroundCoverPlacement[]>();
    for (const p of placements) {
      counts[p.species]++;
      chunks.add(`${Math.floor(p.x / chunkSize)}:${Math.floor(p.z / chunkSize)}`);
      const list = bySpecies.get(p.species);
      if (list) list.push(p);
      else bySpecies.set(p.species, [p]);
    }
    this.instanceCount = placements.length;
    this.chunkCount = chunks.size;
    this.speciesCounts = counts;

    for (const id of GROUND_COVER_SPECIES) {
      const list = bySpecies.get(id);
      if (!list?.length) continue;
      this.entries.set(id, list);
      const material = this.makeMaterial();
      const mesh = new THREE.InstancedMesh(coverGeometry(id), material, list.length);
      mesh.name = `cover_${id}`;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      const chunkCenters = new Float32Array(list.length * 2);
      const color = new THREE.Color();
      const palette = COLORS[id];
      const rng = new RNG((seed ^ (id.length * 2654435761) ^ 0x9e3779b9) >>> 0);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        _pos.set(p.x, this.terrain.getHeight(p.x, p.z), p.z);
        _e.set(0, p.rotY, 0);
        _q.setFromEuler(_e);
        _scale.setScalar(p.scale);
        _m.compose(_pos, _q, _scale);
        mesh.setMatrixAt(i, _m);
        chunkCenters[i * 2] = (Math.floor(p.x / chunkSize) + 0.5) * chunkSize;
        chunkCenters[i * 2 + 1] = (Math.floor(p.z / chunkSize) + 0.5) * chunkSize;
        color.set(palette[Math.floor(rng.float() * palette.length)]);
        mesh.setColorAt(i, color);
      }
      mesh.geometry.setAttribute('aChunkCenter', new THREE.InstancedBufferAttribute(chunkCenters, 2));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.meshes.set(id, mesh);
      this.materials.push(material);
      this.group.add(mesh);
    }
  }

  private makeMaterial(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uCoverTime: this.timeUniform,
        uCoverFadeStart: { value: this.fadeStart },
        uCoverFadeEnd: { value: this.fadeEnd },
        uSunDir: this.sunDirUniform,
        uSunColor: this.sunColorUniform,
        uSkyColor: this.skyColorUniform,
        uGroundColor: this.groundColorUniform,
        uHemiIntensity: this.hemiIntensityUniform,
        uFowMap: this.fow.fowMap,
        uFowEnabled: this.fow.fowEnabled,
        uFowMapSize: this.fow.mapSize,
      },
      side: THREE.DoubleSide,
      vertexShader: `
        attribute vec2 aChunkCenter;
        uniform float uCoverTime;
        uniform float uCoverFadeStart;
        uniform float uCoverFadeEnd;
        varying vec3 vColor;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        varying float vCoverFade;

        void main() {
          vec3 transformed = position;
          float coverPhase = instanceMatrix[3].x * 0.63 + instanceMatrix[3].z * 0.41;
          transformed.x += sin(uCoverTime * 1.7 + coverPhase) * 0.035 * max(0.0, position.y);
          transformed.z += cos(uCoverTime * 1.3 + coverPhase) * 0.02 * max(0.0, position.y);
          vec4 world = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vWorldPos = world.xyz;
          vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          vColor = instanceColor;
          float coverDist = distance(aChunkCenter, cameraPosition.xz);
          vCoverFade = 1.0 - smoothstep(uCoverFadeStart, uCoverFadeEnd, coverDist);
          gl_Position = projectionMatrix * viewMatrix * world;
          if (coverDist > uCoverFadeEnd) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uGroundColor;
        uniform float uHemiIntensity;
        uniform sampler2D uFowMap;
        uniform float uFowEnabled;
        uniform float uFowMapSize;
        varying vec3 vColor;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        varying float vCoverFade;
        ${FOW_DIM_GLSL}

        void main() {
          vec3 n = normalize(vNormalW);
          if (!gl_FrontFacing) n = -n;
          float ndl = max(dot(n, normalize(uSunDir)), 0.0);
          vec3 hemi = mix(uGroundColor, uSkyColor, n.y * 0.5 + 0.5) * uHemiIntensity;
          vec3 lit = vColor * (hemi * 0.7 + uSunColor * ndl * 0.4);
          if (uFowEnabled > 0.5) {
            float fowValue = texture2D(uFowMap, vWorldPos.xz / uFowMapSize).r;
            lit *= fowDim(fowValue);
          }
          gl_FragColor = vec4(lit, 1.0);
          if (vCoverFade < 0.999) {
            float coverDither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            if (coverDither > vCoverFade) discard;
          }
        }`,
    });
    material.userData.fow = this.fow;
    return material;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.group.visible = on;
  }

  update(time: number): void {
    this.timeUniform.value = time;
  }

  /** Match the scene sun and hemisphere light used by the terrain. */
  setLighting(
    sunDir: THREE.Vector3,
    sunColor: THREE.Color,
    sky: THREE.Color,
    ground: THREE.Color,
    intensity: number,
  ): void {
    this.sunDirUniform.value.copy(sunDir);
    this.sunColorUniform.value.copy(sunColor);
    this.skyColorUniform.value.copy(sky);
    this.groundColorUniform.value.copy(ground);
    this.hemiIntensityUniform.value = intensity;
  }

  /** Remove instances under a new building (or any circular keep-out). */
  excludeCircle(x: number, z: number, radius: number): void {
    const r2 = radius * radius;
    this.excludeWhere((px, pz) => {
      const dx = px - x;
      const dz = pz - z;
      return dx * dx + dz * dz < r2;
    });
  }

  /** Remove instances matching a keep-out test (fields, roads, site footprints). */
  excludeWhere(test: (x: number, z: number) => boolean): void {
    let changed = false;
    for (const [id, list] of this.entries) {
      const mesh = this.meshes.get(id);
      if (!mesh) continue;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!test(p.x, p.z)) continue;
        _m.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, _m);
        changed = true;
      }
      if (changed) mesh.instanceMatrix.needsUpdate = true;
    }
    if (changed) this.group.updateMatrixWorld();
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
    this.materials.forEach((m) => m.dispose());
    this.materials.length = 0;
    this.meshes.clear();
    this.entries.clear();
    this.group.removeFromParent();
  }
}

function coverGeometry(id: GroundCoverSpecies): THREE.BufferGeometry {
  if (id === 'pebble') return pebbleGeometry(0.18, 0.09);
  if (id === 'gravel') return pebbleGeometry(0.09, 0.045);
  if (id === 'ichu') return tuftGeometry(10, 0.72, 0.09, 0.3);
  if (id === 'fern') return tuftGeometry(8, 0.5, 0.16, 0.7);
  return tuftGeometry(7, 0.5, 0.13, 0.26);
}

/** A tuft of tapered blades (two triangles each), rooted at y=0. */
function tuftGeometry(blades: number, height: number, width: number, spread: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + i * 0.7;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const perpX = -dirZ;
    const perpZ = dirX;
    const bx = dirX * 0.02;
    const bz = dirZ * 0.02;
    const tx = dirX * spread;
    const tz = dirZ * spread;
    const bw = width / 2;
    const tw = bw * 0.15;
    const bl = [bx + perpX * bw, 0, bz + perpZ * bw];
    const br = [bx - perpX * bw, 0, bz - perpZ * bw];
    const tl = [tx + perpX * tw, height, tz + perpZ * tw];
    const tr = [tx - perpX * tw, height, tz - perpZ * tw];
    positions.push(...bl, ...br, ...tr, ...bl, ...tr, ...tl);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function pebbleGeometry(radius: number, y: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 0);
  geo.scale(1.25, 0.75, 1);
  geo.translate(0, y, 0);
  return geo;
}
