import { generateHeightField, CANAL_WIDTH_CELLS } from './heightField';
import { terrainSlope } from '../util/math';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import { sampleAuthoredGround, sampleAuthoredHeight, type AuthoredHeightField } from '../model/defs/authoredTerrain';
import type { AuthoredSiteDef, SiteTerrainStyle } from '../model/defs/sites';

function authoredHeightField(
  resolution: number,
  worldSize: number,
  profile: HistoricalMapProfile,
  authored: AuthoredHeightField,
  style: SiteTerrainStyle,
): ReturnType<typeof generateHeightField> {
  const n = resolution + 1;
  const heightMap = new Float32Array(n * n);
  const moistureMap = new Float32Array(n * n);
  const terraceMap = new Float32Array(n * n);
  const canalMap = new Float32Array(n * n);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const wx = (x / resolution) * worldSize;
      const wz = (z / resolution) * worldSize;
      const h = sampleAuthoredHeight(authored, wx, wz);
      const i = z * n + x;
      heightMap[i] = h;
      const wet = Math.max(0, Math.min(1, (style.moisture.valleyHeight - h) / style.moisture.valleyRange));
      const bank = Math.max(
        0,
        Math.min(1, (worldSize * style.moisture.bankStart - wx) / (worldSize * style.moisture.bankRange)),
      );
      const noise = Math.sin(wx * 0.21 + wz * 0.13) * 0.04 + Math.sin(wz * 0.37 - 1.2) * 0.025;
      moistureMap[i] = Math.max(0, Math.min(1, wet * 0.82 + bank * 0.28 + noise));
    }
  }
  return { heightMap, moistureMap, terraceMap, canalMap, canalPaths: [], waterLevel: profile.water.level };
}

/** Pure height/moisture/terrace/canal grid; rendering builds on top of it. */
export class TerrainData {
  readonly size: number;
  readonly resolution: number;
  readonly heightMap: Float32Array;
  readonly moistureMap: Float32Array;
  readonly terraceMap: Float32Array;
  readonly canalMap: Float32Array;
  readonly canalPaths: { x: number; z: number }[][];
  readonly canalWidth: number;
  readonly waterLevel: number;
  private readonly authored: AuthoredHeightField | null;

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
    const authored = site?.heightField;
    const style = site?.terrain;
    this.authored = authored && style ? authored : null;
    const field =
      authored && style
        ? authoredHeightField(resolution, size, profile, authored, style)
        : generateHeightField(resolution, seed, profile, layout);
    this.heightMap = field.heightMap;
    this.moistureMap = field.moistureMap;
    this.terraceMap = field.terraceMap;
    this.canalMap = field.canalMap;
    this.canalPaths = field.canalPaths.map((path) =>
      path.map((p) => ({ x: (p.x / this.resolution) * this.size, z: (p.z / this.resolution) * this.size })),
    );
    this.canalWidth = ((2 * (CANAL_WIDTH_CELLS + 0.5)) / this.resolution) * this.size;
    this.waterLevel = field.waterLevel;
  }

  private idx(x: number, z: number): number {
    return z * (this.resolution + 1) + x;
  }

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

  /** Painted ground weights of an authored site (grass, dirt, sand, rock), or null for procedural maps. */
  getAuthoredGround(wx: number, wz: number): [number, number, number, number] | null {
    return this.authored ? sampleAuthoredGround(this.authored, wx, wz) : null;
  }

  getHeight(wx: number, wz: number): number {
    return this.sampleMap(this.heightMap, wx, wz);
  }

  isWater(wx: number, wz: number): boolean {
    return this.getHeight(wx, wz) < this.waterLevel - 0.15;
  }

  isBeach(wx: number, wz: number): boolean {
    const h = this.getHeight(wx, wz);
    return h >= this.waterLevel - 0.15 && h < this.waterLevel + 0.9;
  }

  isBuildable(wx: number, wz: number): boolean {
    return this.getHeight(wx, wz) > this.waterLevel + 0.4;
  }

  getMoisture(wx: number, wz: number): number {
    return this.sampleMap(this.moistureMap, wx, wz);
  }

  getTerrace(wx: number, wz: number): number {
    return this.sampleMap(this.terraceMap, wx, wz);
  }

  getCanal(wx: number, wz: number): number {
    return this.sampleMap(this.canalMap, wx, wz);
  }

  getCanalPaths(): { x: number; z: number }[][] {
    return this.canalPaths;
  }

  getSlope(wx: number, wz: number): number {
    return terrainSlope((x, z) => this.getHeight(x, z), wx, wz, 2);
  }
}
